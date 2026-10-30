import html2canvas from '../index';

import { CanvasRenderer } from '../render/canvas/canvas-renderer';
import { DocumentCloner } from '../dom/document-cloner';
import { COLORS } from '../css/types/color';

vi.mock('../core/logger');
vi.mock('../css/layout/bounds');
vi.mock('../dom/document-cloner');
vi.mock('../dom/node-parser', () => {
    return {
        isBodyElement: () => false,
        isHTMLElement: () => false,
        parseTree: vi.fn().mockImplementation(() => {
            return { styles: {}, restoreTree: vi.fn() };
        })
    };
});

vi.mock('../render/stacking-context');
vi.mock('../render/canvas/canvas-renderer');

describe('html2canvas', () => {
    const element = {
        ownerDocument: {
            defaultView: {
                document: {
                    createElement: () => ({ href: '' })
                },
                location: { href: 'http://localhost/' },
                pageXOffset: 12,
                pageYOffset: 34,
                innerWidth: 800,
                innerHeight: 600
            }
        }
    } as unknown as HTMLElement;

    it('should render with an element', async () => {
        DocumentCloner.destroy = vi.fn().mockReturnValue(true);
        await html2canvas(element);
        expect(CanvasRenderer).toHaveBeenLastCalledWith(
            expect.objectContaining({
                cache: expect.any(Object),
                logger: expect.any(Object),
                windowBounds: expect.objectContaining({ left: 12, top: 34 })
            }),
            expect.objectContaining({
                backgroundColor: 0xffffffff,
                scale: 1,
                height: 50,
                width: 200,
                x: 0,
                y: 0,
                canvas: undefined
            })
        );
        expect(DocumentCloner.destroy).toBeCalled();
    });

    it('should have transparent background with backgroundColor: null', async () => {
        await html2canvas(element, { backgroundColor: null });
        expect(CanvasRenderer).toHaveBeenLastCalledWith(
            expect.anything(),
            expect.objectContaining({
                backgroundColor: COLORS.TRANSPARENT
            })
        );
    });

    it('should use existing canvas when given as option', async () => {
        const canvas = {} as HTMLCanvasElement;
        await html2canvas(element, { canvas });
        expect(CanvasRenderer).toHaveBeenLastCalledWith(
            expect.anything(),
            expect.objectContaining({
                canvas
            })
        );
    });

    it('should not remove cloned window when removeContainer: false', async () => {
        DocumentCloner.destroy = vi.fn();
        await html2canvas(element, { removeContainer: false });
        expect(CanvasRenderer).toHaveBeenLastCalledWith(
            expect.anything(),
            expect.objectContaining({
                backgroundColor: 0xffffffff,
                scale: 1,
                height: 50,
                width: 200,
                x: 0,
                y: 0,
                canvas: undefined
            })
        );
        expect(DocumentCloner.destroy).not.toBeCalled();
    });

    it('should propagate a mount rejection (cleanup is owned by the mount itself)', async () => {
        // The mount removes its own iframe when it rejects (load watchdog /
        // abort), because renderElement never receives the reference. This
        // test only pins the rejection reaching the caller; the removal is
        // verified by the mount-failure tests in iframe-mount.test.ts.
        const mock = await import('../dom/document-cloner');
        const original = mock.DocumentCloner.prototype.toIFrame;
        mock.DocumentCloner.prototype.toIFrame = vi
            .fn()
            .mockRejectedValue(new Error('Cloned iframe did not fire its load event'));

        try {
            await expect(html2canvas(element)).rejects.toThrow('did not fire its load event');
        } finally {
            mock.DocumentCloner.prototype.toIFrame = original;
        }
    });

    it('should emit onProgress milestones through the pipeline', async () => {
        const onProgress = vi.fn();
        await html2canvas(element, { onProgress });

        expect(onProgress).toHaveBeenCalled();
        const events = onProgress.mock.calls as Array<[string, number]>;
        expect(events.map(([phase]) => phase)).toEqual(['clone', 'clone', 'parse', 'layout', 'render', 'render']);
        const progresses = events.map(([, progress]) => progress);
        expect(progresses).toEqual([10, 30, 50, 60, 90, 100]);
    });

    it('should survive a throwing onProgress callback', async () => {
        const onProgress = vi.fn(() => {
            throw new Error('consumer bug');
        });
        await html2canvas(element, { onProgress });
        expect(onProgress).toHaveBeenCalled();
    });
});
