/**
 * Shared numeric constants used across html2canvas-pro.
 * Centralising magic numbers for maintainability.
 */

/** Maximum entries in the CSS parse cache per descriptor (LRU). */
export const PARSE_CACHE_MAX_PER_DESCRIPTOR = 200;

/** Maximum cached background-image patterns per render session (LRU). */
export const PATTERN_CACHE_MAX = 50;

/** Maximum size of the image-resource cache (entries). */
export const DEFAULT_IMAGE_CACHE_SIZE = 100;

/** Maximum allowed image-resource cache size. */
export const MAX_IMAGE_CACHE_SIZE = 10_000;

/** Default image-load timeout in milliseconds. */
export const DEFAULT_IMAGE_TIMEOUT_MS = 15_000;

/** Z-axis mask offset used during box-shadow rendering. */
export const SHADOW_MASK_OFFSET = 10_000;

/** Polling interval (ms) when waiting for the cloned iframe to become ready. */
export const IFRAME_READY_POLL_MS = 50;

/** Deferred resolution delay (ms) for inline XML images that may fail to parse. */
export const INLINE_IMAGE_RESOLVE_DELAY_MS = 500;

/** Maximum characters logged for image/resource keys. */
export const RESOURCE_KEY_LOG_LENGTH = 256;
