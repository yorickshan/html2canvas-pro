import { strictEqual } from 'assert';
import { createDefaultValidator, createStrictValidator } from '../validator';

describe('Validator', () => {
    describe('URL validation', () => {
        const validator = createDefaultValidator();

        it('should accept valid HTTP URLs', () => {
            const result = validator.validateUrl('http://example.com/test.jpg', 'image');
            strictEqual(result.valid, true);
        });

        it('should accept valid HTTPS URLs', () => {
            const result = validator.validateUrl('https://example.com/test.jpg', 'image');
            strictEqual(result.valid, true);
        });

        it('should accept data URLs by default', () => {
            const result = validator.validateUrl('data:image/png;base64,iVBORw0KGgo=', 'image');
            strictEqual(result.valid, true);
        });

        it('should accept blob URLs', () => {
            const result = validator.validateUrl('blob:http://example.com/uuid', 'image');
            strictEqual(result.valid, true);
        });

        it('should reject invalid protocols', () => {
            const result = validator.validateUrl('ftp://example.com/test.jpg', 'image');
            strictEqual(result.valid, false);
            strictEqual(result.error?.includes('Protocol'), true);
        });

        it('should reject file:// URLs', () => {
            const result = validator.validateUrl('file:///etc/passwd', 'image');
            strictEqual(result.valid, false);
        });

        it('should reject javascript: URLs', () => {
            const result = validator.validateUrl('javascript:alert(1)', 'general');
            strictEqual(result.valid, false);
        });

        it('should reject empty URLs', () => {
            const result = validator.validateUrl('', 'image');
            strictEqual(result.valid, false);
        });

        it('should reject non-string URLs', () => {
            const result = validator.validateUrl(null as any, 'image');
            strictEqual(result.valid, false);
        });

        it('should reject malformed URLs', () => {
            const result = validator.validateUrl('not a url', 'image');
            strictEqual(result.valid, false);
            strictEqual(result.error?.includes('Invalid URL'), true);
        });
    });

    describe('Proxy URL validation (SSRF prevention)', () => {
        it('should reject localhost for proxy URLs', () => {
            const validator = createDefaultValidator();
            const result = validator.validateUrl('http://localhost:8080/proxy', 'proxy');
            strictEqual(result.valid, false);
            strictEqual(result.error?.includes('Localhost'), true);
        });

        it('should reject 127.0.0.1 for proxy URLs', () => {
            const validator = createDefaultValidator();
            const result = validator.validateUrl('http://127.0.0.1/proxy', 'proxy');
            strictEqual(result.valid, false);
        });

        it('should reject ::1 for proxy URLs', () => {
            const validator = createDefaultValidator();
            const result = validator.validateUrl('http://[::1]/proxy', 'proxy');
            strictEqual(result.valid, false);
        });

        it('should reject private IP ranges (10.x.x.x)', () => {
            const validator = createDefaultValidator();
            const result = validator.validateUrl('http://10.0.0.1/proxy', 'proxy');
            strictEqual(result.valid, false);
            strictEqual(result.error?.includes('Private IP'), true);
        });

        it('should reject private IP ranges (172.16-31.x.x)', () => {
            const validator = createDefaultValidator();
            const results = [
                validator.validateUrl('http://172.16.0.1/proxy', 'proxy'),
                validator.validateUrl('http://172.20.0.1/proxy', 'proxy'),
                validator.validateUrl('http://172.31.255.254/proxy', 'proxy')
            ];
            results.forEach((result) => strictEqual(result.valid, false));
        });

        it('should reject private IP ranges (192.168.x.x)', () => {
            const validator = createDefaultValidator();
            const result = validator.validateUrl('http://192.168.1.1/proxy', 'proxy');
            strictEqual(result.valid, false);
        });

        it('should reject link-local addresses', () => {
            const validator = createDefaultValidator();
            const result = validator.validateUrl('http://169.254.1.1/proxy', 'proxy');
            strictEqual(result.valid, false);
        });

        it('should accept public IPs for proxy URLs', () => {
            const validator = createDefaultValidator();
            const result = validator.validateUrl('https://8.8.8.8/proxy', 'proxy');
            strictEqual(result.valid, true);
        });

        it('should enforce proxy domain whitelist', () => {
            const validator = createStrictValidator(['example.com', 'trusted.org']);

            const allowed = validator.validateUrl('https://example.com/proxy', 'proxy');
            strictEqual(allowed.valid, true);

            const notAllowed = validator.validateUrl('https://evil.com/proxy', 'proxy');
            strictEqual(notAllowed.valid, false);
            strictEqual(notAllowed.error?.includes('not in the allowed list'), true);
        });

        it('should allow subdomains of whitelisted domains', () => {
            const validator = createStrictValidator(['example.com']);
            const result = validator.validateUrl('https://api.example.com/proxy', 'proxy');
            strictEqual(result.valid, true);
        });
    });

    describe('CSP nonce validation', () => {
        const validator = createDefaultValidator();

        it('should accept valid nonce', () => {
            const result = validator.validateCspNonce('ABC123def456GHI789jkl');
            strictEqual(result.valid, true);
        });

        it('should reject empty nonce', () => {
            const result = validator.validateCspNonce('');
            strictEqual(result.valid, false);
        });

        it('should reject non-string nonce', () => {
            const result = validator.validateCspNonce(123 as any);
            strictEqual(result.valid, false);
        });

        it('should reject too short nonce', () => {
            const result = validator.validateCspNonce('short');
            strictEqual(result.valid, false);
            strictEqual(result.error?.includes('too short'), true);
        });

        it('should reject nonce with invalid characters', () => {
            const result = validator.validateCspNonce('ABC<script>alert(1)</script>');
            strictEqual(result.valid, false);
            strictEqual(result.error?.includes('invalid characters'), true);
        });

        it('should accept base64-like nonces', () => {
            const result = validator.validateCspNonce('AbCdEfGhIjKlMnOpQrStUvWxYz0123456789+/=');
            strictEqual(result.valid, true);
        });
    });

    describe('Image timeout validation', () => {
        const validator = createDefaultValidator();

        it('should accept valid timeout', () => {
            const result = validator.validateImageTimeout(15000);
            strictEqual(result.valid, true);
        });

        it('should reject negative timeout', () => {
            const result = validator.validateImageTimeout(-1000);
            strictEqual(result.valid, false);
        });

        it('should reject non-number timeout', () => {
            const result = validator.validateImageTimeout('15000' as any);
            strictEqual(result.valid, false);
        });

        it('should reject NaN timeout', () => {
            const result = validator.validateImageTimeout(NaN);
            strictEqual(result.valid, false);
        });

        it('should enforce maximum timeout', () => {
            const strictValidator = createStrictValidator([]);
            const result = strictValidator.validateImageTimeout(120000); // 2 minutes
            strictEqual(result.valid, false);
            strictEqual(result.error?.includes('exceeds maximum'), true);
        });

        it('should accept timeout within limit', () => {
            const strictValidator = createStrictValidator([]);
            const result = strictValidator.validateImageTimeout(30000); // 30 seconds
            strictEqual(result.valid, true);
        });
    });

    describe('Dimensions validation', () => {
        const validator = createDefaultValidator();

        it('should accept valid dimensions', () => {
            const result = validator.validateDimensions(800, 600);
            strictEqual(result.valid, true);
        });

        it('should reject zero dimensions', () => {
            const result = validator.validateDimensions(0, 600);
            strictEqual(result.valid, false);
        });

        it('should reject negative dimensions', () => {
            const result = validator.validateDimensions(800, -100);
            strictEqual(result.valid, false);
        });

        it('should reject NaN dimensions', () => {
            const result = validator.validateDimensions(NaN, 600);
            strictEqual(result.valid, false);
        });

        it('should reject non-number dimensions', () => {
            const result = validator.validateDimensions('800' as any, 600);
            strictEqual(result.valid, false);
        });

        it('should reject dimensions exceeding maximum', () => {
            const result = validator.validateDimensions(40000, 600);
            strictEqual(result.valid, false);
            strictEqual(result.error?.includes('exceed maximum'), true);
        });

        it('should accept dimensions at the limit', () => {
            const result = validator.validateDimensions(32767, 32767);
            strictEqual(result.valid, true);
        });
    });

    describe('Scale validation', () => {
        const validator = createDefaultValidator();

        it('should accept valid scale', () => {
            const result = validator.validateScale(2);
            strictEqual(result.valid, true);
        });

        it('should accept fractional scale', () => {
            const result = validator.validateScale(0.5);
            strictEqual(result.valid, true);
        });

        it('should reject zero scale', () => {
            const result = validator.validateScale(0);
            strictEqual(result.valid, false);
        });

        it('should reject negative scale', () => {
            const result = validator.validateScale(-2);
            strictEqual(result.valid, false);
        });

        it('should reject too large scale', () => {
            const result = validator.validateScale(20);
            strictEqual(result.valid, false);
            strictEqual(result.error?.includes('too large'), true);
        });

        it('should reject NaN scale', () => {
            const result = validator.validateScale(NaN);
            strictEqual(result.valid, false);
        });
    });

    describe('Element validation', () => {
        const validator = createDefaultValidator();

        it('should reject null element', () => {
            const result = validator.validateElement(null);
            strictEqual(result.valid, false);
        });

        it('should reject undefined element', () => {
            const result = validator.validateElement(undefined);
            strictEqual(result.valid, false);
        });

        it('should reject non-object element', () => {
            const result = validator.validateElement('not an element' as any);
            strictEqual(result.valid, false);
        });

        // Note: Full HTMLElement testing requires DOM environment (jsdom/browser)
    });

    describe('Options validation', () => {
        const validator = createDefaultValidator();

        it('should accept valid options', () => {
            const options = {
                scale: 2,
                width: 800,
                height: 600,
                imageTimeout: 15000
            };
            const result = validator.validateOptions(options);
            strictEqual(result.valid, true);
        });

        it('should collect multiple errors', () => {
            const options = {
                scale: -1,
                width: -800,
                imageTimeout: -5000
            };
            const result = validator.validateOptions(options);
            strictEqual(result.valid, false);
            // Should contain multiple error messages
            strictEqual(result.error?.includes('Scale'), true);
            strictEqual(result.error?.includes('Dimensions'), true);
            strictEqual(result.error?.includes('timeout'), true);
        });

        it('should allow missing optional fields', () => {
            const options = {};
            const result = validator.validateOptions(options);
            strictEqual(result.valid, true);
        });
    });

    describe('Strict validator', () => {
        const strictValidator = createStrictValidator(['trusted.com']);

        it('should reject data URLs in strict mode', () => {
            // Note: This would need implementation in createStrictValidator
            // Currently it doesn't disable data URLs
        });

        it('should enforce shorter timeout in strict mode', () => {
            const result = strictValidator.validateImageTimeout(120000);
            strictEqual(result.valid, false);
        });

        it('should enforce proxy whitelist in strict mode', () => {
            const allowed = strictValidator.validateUrl('https://trusted.com/proxy', 'proxy');
            strictEqual(allowed.valid, true);

            const denied = strictValidator.validateUrl('https://untrusted.com/proxy', 'proxy');
            strictEqual(denied.valid, false);
        });
    });
});
