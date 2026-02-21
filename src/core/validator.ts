/**
 * Input Validator
 *
 * Provides validation and sanitization for user inputs to prevent security vulnerabilities
 * including SSRF, XSS, and injection attacks.
 */

/**
 * Validation result
 */
export interface ValidationResult {
    valid: boolean;
    error?: string;
    sanitized?: any;
    /**
     * Indicates if runtime validation is recommended
     * (e.g., for proxy URLs to prevent DNS rebinding attacks)
     */
    requiresRuntimeCheck?: boolean;
}

/**
 * Validator configuration
 */
export interface ValidatorConfig {
    /**
     * Allowed proxy domains for SSRF prevention
     * If empty, no domain restrictions
     */
    allowedProxyDomains?: string[];

    /**
     * Maximum allowed image timeout in milliseconds
     */
    maxImageTimeout?: number;

    /**
     * Whether to allow data URLs
     */
    allowDataUrls?: boolean;

    /**
     * Custom validation function
     */
    customValidator?: (value: any, type: string) => ValidationResult;
}

/**
 * Input Validator
 *
 * Validates and sanitizes user inputs for security and correctness.
 */
export class Validator {
    private readonly config: ValidatorConfig;

    constructor(config: ValidatorConfig = {}) {
        this.config = {
            maxImageTimeout: 300000, // 5 minutes default
            allowDataUrls: true,
            ...config
        };
    }

    /**
     * Validate a URL
     *
     * @param url - URL to validate
     * @param context - Context for validation (e.g., 'proxy', 'image')
     * @returns Validation result
     */
    validateUrl(url: string, context: 'proxy' | 'image' | 'general' = 'general'): ValidationResult {
        if (!url || typeof url !== 'string') {
            return {
                valid: false,
                error: 'URL must be a non-empty string'
            };
        }

        // Check for data URLs
        if (url.startsWith('data:')) {
            if (!this.config.allowDataUrls) {
                return {
                    valid: false,
                    error: 'Data URLs are not allowed'
                };
            }
            return { valid: true, sanitized: url };
        }

        // Check for blob URLs
        if (url.startsWith('blob:')) {
            return { valid: true, sanitized: url };
        }

        // Validate URL format
        try {
            const parsedUrl = new URL(url);

            // Only allow http and https protocols
            if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
                return {
                    valid: false,
                    error: `Protocol ${parsedUrl.protocol} is not allowed. Only http and https are permitted.`
                };
            }

            // For proxy URLs, check domain whitelist
            if (context === 'proxy' && this.config.allowedProxyDomains && this.config.allowedProxyDomains.length > 0) {
                const hostname = parsedUrl.hostname.toLowerCase();
                const isAllowed = this.config.allowedProxyDomains.some((domain) => {
                    const normalizedDomain = domain.toLowerCase();
                    return hostname === normalizedDomain || hostname.endsWith('.' + normalizedDomain);
                });

                if (!isAllowed) {
                    return {
                        valid: false,
                        error: `Proxy domain ${parsedUrl.hostname} is not in the allowed list`
                    };
                }
            }

            // Check for localhost/private IPs to prevent SSRF
            if (context === 'proxy') {
                const hostname = parsedUrl.hostname.toLowerCase();

                // Check for localhost
                if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
                    return {
                        valid: false,
                        error: 'Localhost is not allowed for proxy URLs'
                    };
                }

                // Check for private IP ranges (simplified check)
                if (this.isPrivateIP(hostname)) {
                    return {
                        valid: false,
                        error: 'Private IP addresses are not allowed for proxy URLs'
                    };
                }

                // Check for link-local addresses
                if (hostname.startsWith('169.254.') || hostname.startsWith('fe80:')) {
                    return {
                        valid: false,
                        error: 'Link-local addresses are not allowed for proxy URLs'
                    };
                }

                // For proxy URLs, mark that runtime validation is recommended
                // to prevent DNS rebinding attacks
                return {
                    valid: true,
                    sanitized: url,
                    requiresRuntimeCheck: true
                };
            }

            return { valid: true, sanitized: url };
        } catch (e) {
            return {
                valid: false,
                error: `Invalid URL format: ${e instanceof Error ? e.message : 'Unknown error'}`
            };
        }
    }

    /**
     * Check if a hostname is a private IP address
     */
    private isPrivateIP(hostname: string): boolean {
        // IPv4 private ranges
        const privateIPv4Patterns = [
            /^0\./, // 0.0.0.0/8 (This network)
            /^10\./, // 10.0.0.0/8 (Private)
            /^100\.(6[4-9]|[7-9][0-9]|1[0-1][0-9]|12[0-7])\./, // 100.64.0.0/10 (CGNAT)
            /^127\./, // 127.0.0.0/8 (Loopback)
            /^169\.254\./, // 169.254.0.0/16 (Link-local)
            /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12 (Private)
            /^192\.0\.0\./, // 192.0.0.0/24 (IETF Protocol Assignments)
            /^192\.0\.2\./, // 192.0.2.0/24 (TEST-NET-1)
            /^192\.168\./, // 192.168.0.0/16 (Private)
            /^198\.(1[8-9])\./, // 198.18.0.0/15 (Network benchmark)
            /^198\.51\.100\./, // 198.51.100.0/24 (TEST-NET-2)
            /^203\.0\.113\./, // 203.0.113.0/24 (TEST-NET-3)
            /^2(2[4-9]|3[0-9])\./, // 224.0.0.0/4 (Multicast)
            /^24[0-9]\./, // 240.0.0.0/4 (Reserved)
            /^255\.255\.255\.255$/ // 255.255.255.255/32 (Broadcast)
        ];

        // Check IPv4
        if (privateIPv4Patterns.some((pattern) => pattern.test(hostname))) {
            return true;
        }

        // IPv6 private ranges and special addresses
        if (hostname.includes(':')) {
            return this.isPrivateIPv6(hostname);
        }

        return false;
    }

    /**
     * Check if an IPv6 address is private or special
     * Handles compressed IPv6 addresses (e.g., ::1, fc00::1)
     */
    private isPrivateIPv6(hostname: string): boolean {
        const normalizedHost = hostname.toLowerCase().trim();
        // Remove square brackets if present (e.g., [::1])
        const addr = normalizedHost.replace(/^\[|\]$/g, '');
        // Remove zone ID if present (e.g., fe80::1%eth0)
        const addrWithoutZone = addr.split('%')[0];
        // Loopback ::1 (also matches 0:0:0:0:0:0:0:1)
        if (/^(0:){7}1$/.test(addrWithoutZone) || addrWithoutZone === '::1') {
            return true;
        }
        // Unspecified address :: (also matches 0:0:0:0:0:0:0:0)
        if (/^(0:){7}0$/.test(addrWithoutZone) || addrWithoutZone === '::') {
            return true;
        }
        // Expand :: compression to check prefixes
        // This handles cases like fc00::1, fe80::, etc.
        const expandedAddr = this.expandIPv6(addrWithoutZone);
        if (!expandedAddr) {
            // If we can't expand it, fall back to prefix matching
            return this.isPrivateIPv6Prefix(addrWithoutZone);
        }
        // fc00::/7 (Unique Local Address)
        // Check if first byte is in range fc00-fdff
        const firstByte = parseInt(expandedAddr.substring(0, 2), 16);
        if (firstByte >= 0xfc && firstByte <= 0xfd) {
            return true;
        }
        // fe80::/10 (Link-local)
        // First 10 bits should be 1111 1110 10
        if (firstByte === 0xfe) {
            const secondByte = parseInt(expandedAddr.substring(2, 4), 16);
            // Check if bits 11-12 are 10 (0x80-0xbf)
            if (secondByte >= 0x80 && secondByte <= 0xbf) {
                return true;
            }
        }
        // ff00::/8 (Multicast)
        if (firstByte === 0xff) {
            return true;
        }
        return false;
    }

    /**
     * Expand compressed IPv6 address to full form
     * e.g., "::1" -> "0000:0000:0000:0000:0000:0000:0000:0001"
     */
    private expandIPv6(addr: string): string | null {
        try {
            // Handle :: compression
            if (addr.includes('::')) {
                const parts = addr.split('::');
                if (parts.length > 2) {
                    return null; // Invalid: more than one ::
                }
                const leftParts = parts[0] ? parts[0].split(':') : [];
                const rightParts = parts[1] ? parts[1].split(':') : [];
                const missingParts = 8 - leftParts.length - rightParts.length;
                if (missingParts < 0) {
                    return null; // Invalid
                }
                const middleParts = Array(missingParts).fill('0000');
                const allParts = [...leftParts, ...middleParts, ...rightParts];
                return allParts.map((p) => p.padStart(4, '0')).join(':');
            } else {
                // No compression, just normalize
                const parts = addr.split(':');
                if (parts.length !== 8) {
                    return null; // Invalid
                }
                return parts.map((p) => p.padStart(4, '0')).join(':');
            }
        } catch {
            return null;
        }
    }

    /**
     * Fallback prefix matching for IPv6 when expansion fails
     */
    private isPrivateIPv6Prefix(addr: string): boolean {
        // fc00::/7 (Unique Local Address)
        if (/^fc[0-9a-f]{0,2}:?/i.test(addr) || /^fd[0-9a-f]{0,2}:?/i.test(addr)) {
            return true;
        }
        // fe80::/10 (Link-local)
        if (/^fe[89ab][0-9a-f]:?/i.test(addr)) {
            return true;
        }
        // ff00::/8 (Multicast)
        if (/^ff[0-9a-f]{0,2}:?/i.test(addr)) {
            return true;
        }
        return false;
    }

    /**
     * Validate CSP nonce
     *
     * @param nonce - CSP nonce to validate
     * @returns Validation result
     */
    validateCspNonce(nonce: string): ValidationResult {
        if (!nonce || typeof nonce !== 'string') {
            return {
                valid: false,
                error: 'CSP nonce must be a non-empty string'
            };
        }

        // Basic format validation - nonce should be base64-like
        // Typical format: base64 string, often 32+ characters
        if (nonce.length < 16) {
            return {
                valid: false,
                error: 'CSP nonce is too short (minimum 16 characters recommended)'
            };
        }

        // Check for suspicious characters
        if (!/^[A-Za-z0-9+/=_-]+$/.test(nonce)) {
            return {
                valid: false,
                error: 'CSP nonce contains invalid characters'
            };
        }

        return { valid: true, sanitized: nonce };
    }

    /**
     * Validate image timeout
     *
     * @param timeout - Timeout in milliseconds
     * @returns Validation result
     */
    validateImageTimeout(timeout: number): ValidationResult {
        if (typeof timeout !== 'number' || isNaN(timeout)) {
            return {
                valid: false,
                error: 'Image timeout must be a number'
            };
        }

        if (timeout < 0) {
            return {
                valid: false,
                error: 'Image timeout cannot be negative'
            };
        }

        if (this.config.maxImageTimeout && timeout > this.config.maxImageTimeout) {
            return {
                valid: false,
                error: `Image timeout ${timeout}ms exceeds maximum allowed ${this.config.maxImageTimeout}ms`
            };
        }

        return { valid: true, sanitized: timeout };
    }

    /**
     * Validate window dimensions
     *
     * @param width - Window width
     * @param height - Window height
     * @returns Validation result
     */
    validateDimensions(width: number, height: number): ValidationResult {
        if (typeof width !== 'number' || typeof height !== 'number') {
            return {
                valid: false,
                error: 'Dimensions must be numbers'
            };
        }

        if (isNaN(width) || isNaN(height)) {
            return {
                valid: false,
                error: 'Dimensions cannot be NaN'
            };
        }

        if (width <= 0 || height <= 0) {
            return {
                valid: false,
                error: 'Dimensions must be positive'
            };
        }

        // Reasonable maximum to prevent memory issues
        const MAX_DIMENSION = 32767; // Common canvas limit
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
            return {
                valid: false,
                error: `Dimensions exceed maximum allowed (${MAX_DIMENSION}px)`
            };
        }

        return { valid: true, sanitized: { width, height } };
    }

    /**
     * Validate scale factor
     *
     * @param scale - Scale factor
     * @returns Validation result
     */
    validateScale(scale: number): ValidationResult {
        if (typeof scale !== 'number' || isNaN(scale)) {
            return {
                valid: false,
                error: 'Scale must be a number'
            };
        }

        if (scale <= 0) {
            return {
                valid: false,
                error: 'Scale must be positive'
            };
        }

        // Reasonable scale limits
        if (scale > 10) {
            return {
                valid: false,
                error: 'Scale factor too large (maximum 10x)'
            };
        }

        return { valid: true, sanitized: scale };
    }

    /**
     * Validate HTML element
     *
     * @param element - Element to validate
     * @returns Validation result
     */
    validateElement(element: any): ValidationResult {
        if (!element) {
            return {
                valid: false,
                error: 'Element is required'
            };
        }

        if (typeof element !== 'object') {
            return {
                valid: false,
                error: 'Element must be an object'
            };
        }

        // Check if it's an HTMLElement
        if (typeof HTMLElement !== 'undefined' && !(element instanceof HTMLElement)) {
            return {
                valid: false,
                error: 'Element must be an HTMLElement'
            };
        }

        // Check if element is attached to document
        if (!element.ownerDocument) {
            return {
                valid: false,
                error: 'Element must be attached to a document'
            };
        }

        return { valid: true };
    }

    /**
     * Validate entire options object
     *
     * @param options - Options to validate
     * @returns Validation result with all errors
     */
    validateOptions(options: any): ValidationResult {
        const errors: string[] = [];

        // Validate proxy URL if provided
        if (options.proxy !== undefined) {
            const proxyResult = this.validateUrl(options.proxy, 'proxy');
            if (!proxyResult.valid) {
                errors.push(`Proxy: ${proxyResult.error}`);
            }
            // Note: Proxy URLs are marked with requiresRuntimeCheck to prevent DNS rebinding
            // Consider implementing runtime IP validation in production environments
        }

        // Validate image timeout
        if (options.imageTimeout !== undefined) {
            const timeoutResult = this.validateImageTimeout(options.imageTimeout);
            if (!timeoutResult.valid) {
                errors.push(`Image timeout: ${timeoutResult.error}`);
            }
        }

        // Validate dimensions
        if (options.width !== undefined || options.height !== undefined) {
            const width = options.width ?? 800;
            const height = options.height ?? 600;
            const dimensionsResult = this.validateDimensions(width, height);
            if (!dimensionsResult.valid) {
                errors.push(`Dimensions: ${dimensionsResult.error}`);
            }
        }

        // Validate scale
        if (options.scale !== undefined) {
            const scaleResult = this.validateScale(options.scale);
            if (!scaleResult.valid) {
                errors.push(`Scale: ${scaleResult.error}`);
            }
        }

        // Validate CSP nonce
        if (options.cspNonce !== undefined) {
            const nonceResult = this.validateCspNonce(options.cspNonce);
            if (!nonceResult.valid) {
                errors.push(`CSP nonce: ${nonceResult.error}`);
            }
        }

        // Custom validation
        if (this.config.customValidator) {
            const customResult = this.config.customValidator(options, 'options');
            if (!customResult.valid) {
                errors.push(`Custom validation: ${customResult.error}`);
            }
        }

        if (errors.length > 0) {
            return {
                valid: false,
                error: errors.join('; ')
            };
        }

        return { valid: true };
    }
}

/**
 * Create a default validator instance
 */
export function createDefaultValidator(): Validator {
    return new Validator({
        allowDataUrls: true,
        maxImageTimeout: 300000 // 5 minutes
    });
}

/**
 * Create a strict validator with security-focused settings
 */
export function createStrictValidator(allowedProxyDomains: string[]): Validator {
    return new Validator({
        allowedProxyDomains,
        allowDataUrls: false,
        maxImageTimeout: 60000 // 1 minute
    });
}
