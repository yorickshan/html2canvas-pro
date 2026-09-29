export const SMALL_IMAGE = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

/**
 * Indexed access where the shape/arity is guaranteed by construction (the CSS
 * grammar or a preceding length check). Throws on the impossible case instead
 * of silently propagating `undefined`.
 */
export const at = <T>(items: readonly T[], index: number): T => {
    const value = items[index];
    if (value === undefined) {
        throw new Error(`Missing element at index ${index}`);
    }
    return value;
};
