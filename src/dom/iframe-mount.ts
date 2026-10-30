/**
 * Mounts the cloned document into a hidden iframe and waits for it to become
 * paintable.
 *
 * Extracted from DocumentCloner so the cloner only owns node-cloning strategy;
 * this module owns the iframe lifecycle: container creation, document.write,
 * Trusted Types, load polling, webfont/image readiness, the onclone hook and
 * WebKit scroll-anchoring compensation.
 */

import { Bounds } from '../css/layout/bounds';
import { Context } from '../core/context';
import {
    CLONE_READY_TIMEOUT_MS,
    IFRAME_LOAD_WATCHDOG_MS,
    IFRAME_READY_POLL_MS,
    STYLESHEET_READY_POLL_MS,
    STYLESHEET_READY_TIMEOUT_MS
} from '../core/constants';
import { throwIfAborted } from '../core/abort-helper';
import { IGNORE_ATTRIBUTE } from './slot-cloner';

export interface CloneMountOptions {
    /** Cloned <html> root to adopt into the iframe document. */
    documentElement: HTMLElement;
    /** Clone of the render target; must exist before mounting. */
    clonedReferenceElement: HTMLElement | undefined;
    /** nodeName of the original render target, for error messages. */
    referenceElementName: string;
    /** [clonedNode, scrollLeft, scrollTop] pairs captured during cloning. */
    scrolledElements: [Element, number, number][];
    /** Consumer hook, invoked with the cloned document before measuring. */
    onclone?: (document: Document, element: HTMLElement) => void;
    /** Mount the iframe inside a shadow root instead of <body>. */
    container?: HTMLElement | ShadowRoot;
    /**
     * Aborting rejects the mount (iframe poll, font/image waits) with an
     * AbortError instead of waiting out the readiness windows.
     */
    signal?: AbortSignal;
}

/**
 * Trusted Types factory (trustedTypes object) for document.write in strict CSP environments.
 */
type TrustedTypesFactoryLike = {
    getPolicy?: (name: string) => unknown;
    createPolicy: (name: string, config: object) => unknown;
};

type TrustedTypePolicyLike = { createHTML: (s: string) => string };

// Named policies cannot be created twice and lookups are realm-scoped, so
// cache one policy per trustedTypes factory instead of attempting
// createPolicy on every render (a second attempt throws TypeError).
const trustedTypePolicies = new WeakMap<TrustedTypesFactoryLike, TrustedTypePolicyLike | null>();

/**
 * Resolve the Trusted Types policy used for writing the clone document.
 * Returns null when Trusted Types are unavailable or the policy could not be
 * created — document.write is not a Trusted Types sink, so the plain string
 * stays functional in both cases.
 * @internal – exported for testing only.
 */
export const resolveTrustedTypesPolicy = (ownerWindow: Window | null): TrustedTypePolicyLike | null => {
    const factory = ownerWindow && (ownerWindow as Window & { trustedTypes?: TrustedTypesFactoryLike }).trustedTypes;
    if (!factory) {
        return null;
    }
    if (trustedTypePolicies.has(factory)) {
        return trustedTypePolicies.get(factory) ?? null;
    }
    let policy: TrustedTypePolicyLike | null = null;
    try {
        const existing = factory.getPolicy?.('html2canvas-pro') as TrustedTypePolicyLike | undefined;
        policy =
            existing ??
            (factory.createPolicy('html2canvas-pro', { createHTML: (s: string) => s }) as TrustedTypePolicyLike);
    } catch (e) {
        // Duplicate policy name or refused creation: cache the failure so
        // subsequent renders skip the attempt instead of throwing again.
        policy = null;
    }
    trustedTypePolicies.set(factory, policy);
    return policy;
};

export const createIFrameContainer = (
    ownerDocument: Document,
    bounds: Bounds,
    customContainer?: HTMLElement | ShadowRoot
): HTMLIFrameElement => {
    const cloneIframeContainer = ownerDocument.createElement('iframe');

    cloneIframeContainer.className = 'html2canvas-container';
    cloneIframeContainer.style.visibility = 'hidden';
    cloneIframeContainer.style.position = 'fixed';
    cloneIframeContainer.style.left = '-10000px';
    cloneIframeContainer.style.top = '0px';
    cloneIframeContainer.width = bounds.width.toString();
    cloneIframeContainer.height = bounds.height.toString();
    // The clone is laid out at the iframe's content box. Page CSS that styles
    // every iframe (`iframe { width: 100% }` for responsive embeds, a
    // `max-width: 100%` reset) wins over the width/height attributes and would
    // lay the clone out at another size, so the content box is pinned with
    // !important inline declarations, which no page rule overrides.
    const contentBox: [string, string][] = [
        ['width', `${bounds.width}px`],
        ['height', `${bounds.height}px`],
        ['min-width', '0px'],
        ['max-width', 'none'],
        ['min-height', '0px'],
        ['max-height', 'none'],
        ['box-sizing', 'content-box'],
        ['padding', '0px'],
        ['border', '0']
    ];
    for (const [property, value] of contentBox) {
        cloneIframeContainer.style.setProperty(property, value, 'important');
    }
    cloneIframeContainer.scrolling = 'no'; // ios won't scroll without it
    cloneIframeContainer.setAttribute(IGNORE_ATTRIBUTE, 'true');

    // Use custom container if provided, otherwise use body
    const container = customContainer || ownerDocument.body;
    container.appendChild(cloneIframeContainer);

    return cloneIframeContainer;
};

const imageReady = (img: HTMLImageElement): Promise<Event | void | string> => {
    return new Promise((resolve) => {
        if (img.complete) {
            resolve();
            return;
        }
        if (!img.src) {
            resolve();
            return;
        }
        img.onload = resolve;
        img.onerror = resolve;
    });
};

const imagesReady = (document: HTMLDocument): Promise<unknown[]> => {
    return Promise.all([].slice.call(document.images, 0).map(imageReady));
};

/**
 * Whether every CSS rule of the sheet (and of the @import chains it pulls
 * in) has been applied. A sheet is "attached" as soon as its rules are
 * readable; an external @import inside it may still be loading, which shows
 * up as an inaccessible CSSImportRule.sheet. `cssRules` can throw for
 * cross-origin sheets without a CORS-approved response — those rules cannot
 * be inspected, so the sheet counts as ready rather than blocking the render
 * forever.
 */
const isSheetFullyApplied = (sheet: CSSStyleSheet | null, depth = 0): boolean => {
    if (!sheet || depth > MAX_IMPORT_DEPTH) {
        return true;
    }
    let rules: CSSRuleList | undefined;
    try {
        rules = sheet.cssRules;
    } catch (_e) {
        // SecurityError: cross-origin sheet. Inspectable or not, the browser
        // has fetched it by the time cssRules exists.
        return true;
    }
    if (!rules) {
        return true;
    }
    for (let i = 0; i < rules.length; i++) {
        const rule = rules[i];
        if (rule && typeof CSSImportRule !== 'undefined' && rule instanceof CSSImportRule) {
            // An import whose inner sheet is still null (or whose own rules
            // are not applied yet) means the chain is still loading.
            if (!rule.styleSheet || !isSheetFullyApplied(rule.styleSheet, depth + 1)) {
                return false;
            }
        }
    }
    return true;
};

const MAX_IMPORT_DEPTH = 32;

/** Collect every <link> in the document, including links inside shadow roots. */
const collectLinks = (root: ParentNode, out: HTMLLinkElement[]): void => {
    const links = root.querySelectorAll('link');
    for (let i = 0; i < links.length; i++) {
        const link = links[i];
        if (link) {
            out.push(link);
        }
    }
    // Shadow roots are not reachable via querySelectorAll.
    const ownerDocument = (root as Node).ownerDocument ?? (root as Document);
    const walker = ownerDocument.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    let current = walker.nextNode();
    while (current) {
        const shadowRoot = (current as Element).shadowRoot;
        if (shadowRoot) {
            collectLinks(shadowRoot, out);
        }
        current = walker.nextNode();
    }
};

/**
 * Wait until every external stylesheet of the clone has been applied or
 * definitively failed, or the readiness budget expires.
 *
 * The clone is mounted by adoptNode() into an already-closed document
 * (close() must precede adoptNode for Chrome uppercase class-name matching,
 * see the mount sequence below), so the cloned <link rel="stylesheet">
 * elements are inserted after the document finished loading: they neither
 * delay the iframe load event nor change readyState, and the iframeLoader
 * readiness poll cannot observe them. On a cold cache the first capture
 * could then measure the clone before its external CSS arrived and render
 * an unstyled layout (issue #245). Inline <style> clones apply
 * synchronously and document-level adopted stylesheets are serialised at
 * clone time, so neither needs this wait.
 *
 * Readiness is polled rather than purely event-driven because a <style>
 * clone serialised from `createStyleClone` re-fetches its external @import
 * rules without firing link load/error events, and shadow-root links are
 * equally event-hostile in some engines. The poll covers both; link events
 * remain as the settle path for plain <link> fetches.
 * @internal – exported for testing only.
 */
export const stylesheetsReady = (
    documentClone: Document,
    logger?: { warn: (msg: string) => void },
    signal?: AbortSignal
): Promise<void> => {
    if (signal?.aborted) {
        return Promise.resolve();
    }
    const pending: Promise<void>[] = [];
    const links: HTMLLinkElement[] = [];
    collectLinks(documentClone, links);
    for (const link of links) {
        if (link.sheet) {
            continue;
        }
        // Alternate stylesheets are fetched lazily and may never fire load;
        // disabled links never apply. Neither affects the rendered layout.
        const rel = (link.getAttribute('rel') ?? '').trim().toLowerCase().split(/\s+/);
        if (!rel.includes('stylesheet') || rel.includes('alternate') || link.disabled || !link.getAttribute('href')) {
            continue;
        }
        pending.push(
            new Promise<void>((resolve) => {
                const href = link.href;
                const settle = (): void => {
                    link.removeEventListener('load', settle);
                    link.removeEventListener('error', settle);
                    signal?.removeEventListener('abort', onAbort);
                    clearInterval(timer);
                    resolve();
                };
                const onAbort = (): void => settle();
                // The load may have completed between listing the links and
                // registering the listeners below.
                if (link.sheet) {
                    resolve();
                    return;
                }
                link.addEventListener('load', settle);
                link.addEventListener('error', settle);
                signal?.addEventListener('abort', onAbort, { once: true });
                // Poll as a safety net: link load events are reliable for
                // plain links, but the deadline is enforced here either way.
                let elapsed = 0;
                const timer = setInterval(() => {
                    elapsed += STYLESHEET_READY_POLL_MS;
                    if (link.sheet) {
                        settle();
                    } else if (elapsed >= STYLESHEET_READY_TIMEOUT_MS) {
                        logger?.warn(
                            `Stylesheet ${href} did not finish loading within ${
                                STYLESHEET_READY_TIMEOUT_MS / 1000
                            }s; continuing with a possibly unstyled clone`
                        );
                        settle();
                    }
                }, STYLESHEET_READY_POLL_MS);
            })
        );
    }
    // Style elements re-fetched over external @import: sheet exists, rules
    // inside it may still be missing. Wait for those chains via polling.
    const styleElements = documentClone.getElementsByTagName('style');
    for (let i = 0; i < styleElements.length; i++) {
        const style = styleElements[i];
        const sheet = style?.sheet;
        if (!sheet || !style?.textContent?.includes('@import')) {
            continue;
        }
        if (isSheetFullyApplied(sheet)) {
            continue;
        }
        pending.push(
            new Promise<void>((resolve) => {
                let elapsed = 0;
                const timer = setInterval(() => {
                    elapsed += STYLESHEET_READY_POLL_MS;
                    const currentSheet = style.sheet;
                    if ((currentSheet && isSheetFullyApplied(currentSheet)) || elapsed >= STYLESHEET_READY_TIMEOUT_MS) {
                        if (elapsed >= STYLESHEET_READY_TIMEOUT_MS && !isSheetFullyApplied(currentSheet ?? null)) {
                            logger?.warn(
                                `@import chain in an inline <style> did not finish loading within ${
                                    STYLESHEET_READY_TIMEOUT_MS / 1000
                                }s; continuing with a possibly unstyled clone`
                            );
                        }
                        clearInterval(timer);
                        resolve();
                    }
                }, STYLESHEET_READY_POLL_MS);
            })
        );
    }
    if (pending.length === 0) {
        return Promise.resolve();
    }
    return Promise.all(pending).then(() => undefined);
};

const iframeLoader = (
    iframe: HTMLIFrameElement,
    logger?: { warn: (msg: string) => void },
    signal?: AbortSignal
): Promise<HTMLIFrameElement> => {
    return new Promise((resolve, reject) => {
        const cloneWindow = iframe.contentWindow;

        if (!cloneWindow) {
            return reject(`No window assigned for iframe`);
        }

        const documentClone = cloneWindow.document;
        let interval: ReturnType<typeof setInterval> | undefined;

        // The load event is assigned synchronously right after iframe
        // creation and always fires for a document.write mount — but a
        // browser quirk must degrade to an error, not a hung render.
        const watchdog = setTimeout(() => {
            if (interval) {
                clearInterval(interval);
            }
            reject(new Error(`Cloned iframe did not fire its load event within ${IFRAME_LOAD_WATCHDOG_MS}ms`));
        }, IFRAME_LOAD_WATCHDOG_MS);

        const onAbort = (): void => {
            if (interval) {
                clearInterval(interval);
            }
            clearTimeout(watchdog);
            reject(new DOMException('The operation was aborted.', 'AbortError'));
        };

        cloneWindow.onload = iframe.onload = () => {
            cloneWindow.onload = iframe.onload = null;
            const maxAttempts = Math.ceil(CLONE_READY_TIMEOUT_MS / IFRAME_READY_POLL_MS);
            let attempts = 0;
            interval = setInterval(() => {
                attempts++;
                if (signal?.aborted) {
                    onAbort();
                } else if (documentClone.body.childNodes.length > 0 && documentClone.readyState === 'complete') {
                    clearInterval(interval);
                    interval = undefined;
                    clearTimeout(watchdog);
                    resolve(iframe);
                } else if (attempts >= maxAttempts) {
                    clearInterval(interval);
                    interval = undefined;
                    // Resolve anyway to avoid hanging, but say so: a timeout
                    // here means the clone may be an empty document and the
                    // capture will come out blank.
                    logger?.warn(
                        `Cloned iframe did not become ready within ${CLONE_READY_TIMEOUT_MS / 1000} seconds; continuing with a possibly incomplete document`
                    );
                    resolve(iframe);
                }
            }, IFRAME_READY_POLL_MS);
        };

        if (signal) {
            if (signal.aborted) {
                onAbort();
            } else {
                signal.addEventListener('abort', onAbort, { once: true });
            }
        }
    });
};

/**
 * Reduce a doctype component to characters that are inert inside a
 * <!DOCTYPE ...> declaration. Doctype content is parsed as a declaration
 * token, never as HTML markup, but the fields originate from the captured
 * document — stripping markup delimiters and control characters here makes
 * that property locally verifiable (and keeps the sanitizer guarantee even
 * if a future serializer ever embeds the result elsewhere).
 */
const sanitizeDoctypePart = (value: string): string => value.replace(/[<>&"'`\\]|[\u0000-\u001f\u007f]/g, '');

/**
 * Serialise a document type declaration to an HTML string.
 * @internal – exported for testing only, not part of the public API.
 */
export const serializeDoctype = (doctype?: DocumentType | null): string => {
    let str = '';
    if (doctype) {
        str += '<!DOCTYPE ';
        if (doctype.name) {
            str += sanitizeDoctypePart(doctype.name);
        }
        if (doctype.internalSubset) {
            str += ' ' + sanitizeDoctypePart(doctype.internalSubset);
        }
        if (doctype.publicId) {
            str += ' PUBLIC "' + sanitizeDoctypePart(doctype.publicId) + '"';
            if (doctype.systemId) {
                str += ' "' + sanitizeDoctypePart(doctype.systemId) + '"';
            }
        } else if (doctype.systemId) {
            str += ' SYSTEM "' + sanitizeDoctypePart(doctype.systemId) + '"';
        }
        str += '>';
    }
    return str;
};

const restoreOwnerScroll = (ownerDocument: Document | null, x: number, y: number) => {
    if (
        ownerDocument &&
        ownerDocument.defaultView &&
        (x !== ownerDocument.defaultView.pageXOffset || y !== ownerDocument.defaultView.pageYOffset)
    ) {
        ownerDocument.defaultView.scrollTo(x, y);
    }
};

const restoreNodeScroll = ([element, x, y]: [Element, number, number]) => {
    element.scrollLeft = x;
    element.scrollTop = y;
};

/**
 * Point the clone's relative URLs at the source document.
 * @internal – exported for testing only, not part of the public API.
 */
export const addBase = (targetELement: HTMLElement, baseUri: string) => {
    const baseNode = targetELement.ownerDocument.createElement('base');
    baseNode.href = baseUri;
    const headEle = targetELement.getElementsByTagName('head').item(0);
    headEle?.insertBefore(baseNode, headEle?.firstChild ?? null);
};

export const mountCloneInIFrame = (
    context: Context,
    ownerDocument: Document,
    windowSize: Bounds,
    mount: CloneMountOptions
): Promise<HTMLIFrameElement> => {
    const iframe: HTMLIFrameElement = createIFrameContainer(ownerDocument, windowSize, mount.container);

    if (!iframe.contentWindow) {
        throw new Error('Unable to find iframe window');
    }

    const scrollX = (ownerDocument.defaultView as Window).pageXOffset;
    const scrollY = (ownerDocument.defaultView as Window).pageYOffset;

    const cloneWindow = iframe.contentWindow;
    const documentClone: Document = cloneWindow.document;

    /* Chrome doesn't detect relative background-images assigned in inline <style> sheets when fetched through getComputedStyle
     if window url is about:blank, we can assign the url to current by writing onto the document
     */

    const iframeLoad = iframeLoader(iframe, context.logger, mount.signal).then(async () => {
        mount.scrolledElements.forEach(restoreNodeScroll);
        if (cloneWindow) {
            cloneWindow.scrollTo(windowSize.left, windowSize.top);
        }

        const onclone = mount.onclone;

        const referenceElement = mount.clonedReferenceElement;

        if (typeof referenceElement === 'undefined') {
            throw new Error(`Error finding the ${mount.referenceElementName} in the cloned document`);
        }

        throwIfAborted(mount.signal);
        await stylesheetWait;
        throwIfAborted(mount.signal);
        if (documentClone.fonts && documentClone.fonts.ready) {
            await documentClone.fonts.ready;
        }
        throwIfAborted(mount.signal);

        if (/(AppleWebKit)/g.test(navigator.userAgent)) {
            await imagesReady(documentClone);
            throwIfAborted(mount.signal);
        }

        if (typeof onclone === 'function') {
            await Promise.resolve().then(() => onclone(documentClone, referenceElement));
        }

        // onclone can change layout above the viewport and trigger browser scroll
        // anchoring. Reapply the requested offset after the callback so element
        // bounds stay aligned with the window bounds used by the renderer.
        cloneWindow.scrollTo(windowSize.left, windowSize.top);
        if (
            /AppleWebKit/g.test(navigator.userAgent) &&
            (cloneWindow.scrollY !== windowSize.top || cloneWindow.scrollX !== windowSize.left)
        ) {
            context.logger.warn('Unable to restore scroll position for cloned document');
            context.adjustWindowBounds(cloneWindow.scrollX - windowSize.left, cloneWindow.scrollY - windowSize.top);
        }

        return iframe;
    });
    /**
     * The base URI used for resolving relative URLs (e.g. background-image) in the clone.
     * Must come from the source document: the iframe document is about:blank, so
     * documentClone.baseURI would break getComputedStyle() for relative background URLs.
     */
    const baseUri = ownerDocument.baseURI;
    documentClone.open();
    // The only dynamic content is the doctype declaration, whose components
    // pass through sanitizeDoctypePart (markup delimiters stripped); the
    // remainder is the static '<html></html>' skeleton.
    const rawHTML = serializeDoctype(ownerDocument.doctype) + '<html></html>';
    try {
        const policy = resolveTrustedTypesPolicy(ownerDocument.defaultView);
        const html = policy ? policy.createHTML(rawHTML) : rawHTML;
        documentClone.write(html);
    } catch (_e) {
        documentClone.write(rawHTML);
    }
    // Chrome scrolls the parent document for some reason after the write to the cloned window???
    restoreOwnerScroll(ownerDocument, scrollX, scrollY);
    /**
     * IMPORTANT: documentClone.close() MUST be called BEFORE adoptNode().
     *
     * In Chrome, calling adoptNode() while the document is still "open"
     * (between document.open() and document.close()) causes CSS rules with
     * uppercase characters in class names (e.g. ".MyClass") to not match
     * correctly. Chrome's CSS engine only enters a fully-resolved matching
     * mode once the document is closed.
     *
     * Correct order: open() → write() → close() → adoptNode() → replaceChild()
     *
     * Timing: close() queues the iframe 'load' event; because JS is single-threaded,
     * the synchronous adoptNode() and replaceChild() below complete before that
     * event is dispatched. iframeLoader's setInterval will therefore see the body
     * already populated on its first tick.
     */
    documentClone.close();
    const adoptedNode = documentClone.adoptNode(mount.documentElement);
    addBase(adoptedNode, baseUri);
    documentClone.replaceChild(adoptedNode, documentClone.documentElement);

    // Registered synchronously after the links enter the document and before
    // any event can dispatch, so a stylesheet that is already cached (or that
    // 404s immediately) can never slip past the listeners while the iframe
    // load event is still queued.
    const stylesheetWait = stylesheetsReady(documentClone, context.logger, mount.signal);

    // The mount owns the iframe it created: when it rejects (load watchdog,
    // abort, readiness timeout) the container has already been appended to
    // the document, so it must be removed here — renderElement never receives
    // the reference and cannot clean it up. A style attribute set before the
    // removal would be pointless; the node is simply detached.
    return iframeLoad.catch((error: unknown) => {
        iframe.parentNode?.removeChild(iframe);
        throw error;
    });
};
