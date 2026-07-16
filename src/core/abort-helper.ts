/**
 * AbortSignal helper utilities.
 */

/**
 * Throw a DOMException if the given AbortSignal is already aborted.
 * Used at checkpoints throughout the rendering pipeline to support
 * cancellable renders.
 *
 * @param signal - The AbortSignal to check. If undefined or not aborted, this is a no-op.
 * @throws {DOMException} With name 'AbortError' if the signal has been aborted.
 */
export const throwIfAborted = (signal?: AbortSignal): void => {
    if (signal?.aborted) {
        throw new DOMException('The operation was aborted.', 'AbortError');
    }
};
