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
import { CLONE_READY_TIMEOUT_MS, IFRAME_LOAD_WATCHDOG_MS, IFRAME_READY_POLL_MS } from '../core/constants';
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
    cloneIframeContainer.style.border = '0';
    cloneIframeContainer.width = bounds.width.toString();
    cloneIframeContainer.height = bounds.height.toString();
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
 * Serialise a document type declaration to an HTML string.
 * @internal – exported for testing only, not part of the public API.
 */
export const serializeDoctype = (doctype?: DocumentType | null): string => {
    let str = '';
    if (doctype) {
        str += '<!DOCTYPE ';
        if (doctype.name) {
            str += doctype.name;
        }
        if (doctype.internalSubset) {
            str += ' ' + doctype.internalSubset.replace(/"/g, '&quot;').replace(/>/g, '&gt;');
        }
        if (doctype.publicId) {
            str += ' PUBLIC "' + doctype.publicId.replace(/"/g, '&quot;') + '"';
            if (doctype.systemId) {
                str += ' "' + doctype.systemId.replace(/"/g, '&quot;') + '"';
            }
        } else if (doctype.systemId) {
            str += ' SYSTEM "' + doctype.systemId.replace(/"/g, '&quot;') + '"';
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
    // rawHTML is always a static, internally-generated string:
    // serializeDoctype(ownerDocument.doctype) + '<html></html>'
    // No user-controlled input — safe for document.write in the sandbox iframe.
    // The doctype comes from the source document, not the global one.
    const rawHTML = serializeDoctype(ownerDocument.doctype) + '<html></html>';
    try {
        const policy = resolveTrustedTypesPolicy(ownerDocument.defaultView);
        const html = policy ? policy.createHTML(rawHTML) : rawHTML;
        // CodeQL:no - rawHTML is a static internal string, never user-controlled
        documentClone.write(html);
    } catch (_e) {
        // CodeQL:no - rawHTML is a static internal string, never user-controlled
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

    return iframeLoad;
};
