import type { Bounds as BoundsType } from '../bounds';
const actual = await vi.importActual<typeof import('../bounds')>('../bounds');
export const { Bounds } = actual;
export const parseBounds = (): BoundsType => {
    return new Bounds(0, 0, 200, 50);
};
