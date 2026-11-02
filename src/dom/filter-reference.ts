/**
 * CSS `filter: url(#id)` references for the surface compositor.
 *
 * The referenced <filter> is resolved while the cloned DOM is still available
 * and copied into a detached, self-contained form: its region is converted to
 * user space around the element's border box, and presentation properties a
 * stylesheet may set are inlined. The copy is later serialized into an SVG
 * image together with the composited surface, so it must not depend on the
 * document it came from.
 */

export interface FilterRegion {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface FilterReference {
    /** Detached copy with a userSpaceOnUse region relative to the border box. */
    readonly element: SVGFilterElement;
    readonly region: FilterRegion;
    /** How far (CSS px) the filter region reaches beyond the border box. */
    readonly outset: number;
}

export type FilterReferences = ReadonlyMap<string, FilterReference>;

const SVG_NS = 'http://www.w3.org/2000/svg';
const XLINK_NS = 'http://www.w3.org/1999/xlink';

// The filter region defaults of the Filter Effects spec (objectBoundingBox).
const REGION_DEFAULTS: Record<keyof FilterRegion, string> = { x: '-10%', y: '-10%', width: '120%', height: '120%' };

// Properties a stylesheet may set on filter primitives. Rules do not apply
// inside the serialized SVG image, so their computed values are inlined.
const PRESENTATION_PROPERTIES = ['color-interpolation-filters', 'flood-color', 'flood-opacity', 'lighting-color'];

const REFERENCE_RE = /^(["']?)(#[^"'\s()]+)\1$/;
const URL_RE = /url\(\s*([^)]*?)\s*\)/g;

/** The `#id` of a same-document url() body (`"#id"`, `'#id'` or `#id`), or null. */
export const parseFilterReference = (body: string): string | null => {
    const match = REFERENCE_RE.exec(body.trim());
    return match ? (match[2] as string) : null;
};

/**
 * Resolve every same-document url() reference of a computed filter value.
 * References that cannot be expressed in the serialized SVG are left out, so
 * the compositor rejects the chain and the subtree keeps the legacy renderer.
 */
export function resolveFilterReferences(
    element: Element,
    filter: string | null,
    box: { width: number; height: number }
): FilterReferences | undefined {
    if (!filter || filter.indexOf('url(') === -1) return undefined;
    const references = new Map<string, FilterReference>();
    const seen = new Set<string>();
    for (const match of filter.matchAll(URL_RE)) {
        const ref = parseFilterReference(match[1] as string);
        if (!ref || seen.has(ref)) continue;
        seen.add(ref);
        const reference = resolveFilterReference(element.ownerDocument, ref, box);
        if (reference) references.set(ref, reference);
    }
    return references;
}

function resolveFilterReference(
    document: Document,
    ref: string,
    box: { width: number; height: number }
): FilterReference | null {
    const source = document.getElementById(ref.slice(1));
    if (!source || source.namespaceURI !== SVG_NS || source.localName !== 'filter') return null;
    if (!isSelfContained(source)) return null;
    const region = filterRegion(source, box);
    if (!region) return null;

    const copy = source.cloneNode(true) as SVGFilterElement;
    inlinePresentation(source, copy);
    copy.removeAttribute('id');
    copy.setAttribute('filterUnits', 'userSpaceOnUse');
    (Object.keys(region) as Array<keyof FilterRegion>).forEach((name) => copy.setAttribute(name, String(region[name])));
    const outset = Math.max(
        0,
        -region.x,
        -region.y,
        region.x + region.width - box.width,
        region.y + region.height - box.height
    );
    return { element: copy, region, outset: Math.ceil(outset) };
}

const hasHref = (node: Element): boolean => node.hasAttribute('href') || node.hasAttributeNS(XLINK_NS, 'href');

function isSelfContained(source: Element): boolean {
    // Bounding-box primitive units and inherited (href) filters would need the
    // referencing element's geometry or another resource inside the image.
    if (source.getAttribute('primitiveUnits') === 'objectBoundingBox' || hasHref(source)) return false;
    for (const primitive of Array.from(source.querySelectorAll('*'))) {
        // feImage loads a resource the serialized SVG image cannot reach.
        if (primitive.localName === 'feImage' || hasHref(primitive)) return false;
        // Percentage subregions are relative to the viewport, which differs inside the image.
        for (const name of ['x', 'y', 'width', 'height']) {
            if ((primitive.getAttribute(name) ?? '').indexOf('%') !== -1) return false;
        }
    }
    return true;
}

function filterRegion(source: Element, box: { width: number; height: number }): FilterRegion | null {
    const boundingBox = source.getAttribute('filterUnits') !== 'userSpaceOnUse';
    const read = (name: keyof FilterRegion, size: number): number | null => {
        const raw = (source.getAttribute(name) ?? (boundingBox ? REGION_DEFAULTS[name] : '')).trim();
        if (raw === '') return null; // user-space defaults are viewport percentages
        const percentage = raw.endsWith('%');
        const value = Number(percentage ? raw.slice(0, -1) : raw.replace(/px$/, ''));
        if (!Number.isFinite(value)) return null;
        if (boundingBox) return (percentage ? value / 100 : value) * size;
        return percentage ? null : value;
    };
    const x = read('x', box.width);
    const y = read('y', box.height);
    const width = read('width', box.width);
    const height = read('height', box.height);
    // A zero or negative region disables rendering of the element; keep the legacy path.
    if (x === null || y === null || width === null || height === null || width <= 0 || height <= 0) return null;
    return { x, y, width, height };
}

function inlinePresentation(source: Element, copy: Element): void {
    const view = source.ownerDocument.defaultView;
    if (!view) return;
    const sources = [source, ...Array.from(source.querySelectorAll('*'))];
    const copies = [copy, ...Array.from(copy.querySelectorAll('*'))];
    sources.forEach((node, index) => {
        const style = view.getComputedStyle(node);
        for (const property of PRESENTATION_PROPERTIES) {
            const value = style.getPropertyValue(property);
            if (value) copies[index]?.setAttribute(property, value);
        }
    });
}
