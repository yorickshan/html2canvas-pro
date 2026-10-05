import { strictEqual } from 'assert';
import { Validator, createDefaultValidator, createStrictValidator } from '../validator';

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
            const result = strictValidator.validateUrl('data:image/png;base64,iVBORw0KGgo=', 'image');
            strictEqual(result.valid, false);
            strictEqual(result.error, 'Data URLs are not allowed');
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

    describe('Data URL policy', () => {
        it('should reject data URLs when allowDataUrls is false', () => {
            const validator = new Validator({ allowDataUrls: false });
            const result = validator.validateUrl('data:text/html,<h1>hi</h1>', 'image');
            strictEqual(result.valid, false);
            strictEqual(result.error, 'Data URLs are not allowed');
        });

        it('should still accept blob URLs when data URLs are disallowed', () => {
            const validator = new Validator({ allowDataUrls: false });
            const result = validator.validateUrl('blob:http://example.com/uuid', 'general');
            strictEqual(result.valid, true);
            strictEqual(result.sanitized, 'blob:http://example.com/uuid');
        });
    });

    describe('Proxy context behavior', () => {
        it('should accept valid proxy URLs', () => {
            const validator = createDefaultValidator();
            const result = validator.validateUrl('https://8.8.8.8/proxy', 'proxy');
            strictEqual(result.valid, true);
            strictEqual(result.sanitized, 'https://8.8.8.8/proxy');
        });

        it('should allow localhost proxy when allowLocalhostProxy is set (dev/test)', () => {
            const validator = new Validator({ allowLocalhostProxy: true });
            const result = validator.validateUrl('http://127.0.0.1:9876/proxy', 'proxy');
            strictEqual(result.valid, true);
        });

        it('should skip private IP checks when allowLocalhostProxy is set', () => {
            const validator = new Validator({ allowLocalhostProxy: true });
            const localhost = validator.validateUrl('http://localhost:8081/proxy', 'proxy');
            strictEqual(localhost.valid, true);

            const privateIp = validator.validateUrl('http://10.0.0.5/proxy', 'proxy');
            strictEqual(privateIp.valid, true);
        });

        it('should apply allowLocalhostProxy bypass to ::1 too', () => {
            const validator = new Validator({ allowLocalhostProxy: true });
            const result = validator.validateUrl('http://[::1]/proxy', 'proxy');
            strictEqual(result.valid, true);
        });
    });

    describe('Invalid URL error messages', () => {
        it('should report Unknown error when URL constructor throws a non-Error', () => {
            const originalUrl = global.URL;
            class ThrowingUrl {
                constructor() {
                    throw 'boom-not-an-error';
                }
            }
            (global as any).URL = ThrowingUrl;
            try {
                const validator = createDefaultValidator();
                const result = validator.validateUrl('http://example.com', 'image');
                strictEqual(result.valid, false);
                strictEqual(result.error, 'Invalid URL format: Unknown error');
            } finally {
                (global as any).URL = originalUrl;
            }
        });

        it('should include the Error message when URL constructor throws an Error', () => {
            const originalUrl = global.URL;
            class ThrowingUrl {
                constructor() {
                    throw new Error('custom parse failure');
                }
            }
            (global as any).URL = ThrowingUrl;
            try {
                const validator = createDefaultValidator();
                const result = validator.validateUrl('http://example.com', 'image');
                strictEqual(result.valid, false);
                strictEqual(result.error, 'Invalid URL format: custom parse failure');
            } finally {
                (global as any).URL = originalUrl;
            }
        });
    });

    describe('Private IP classification (SSRF)', () => {
        const validator = createDefaultValidator();

        const rejectProxy = (host: string) => {
            const result = validator.validateUrl(`http://${host}/proxy`, 'proxy');
            strictEqual(result.valid, false, `expected ${host} to be rejected`);
        };

        const acceptProxy = (host: string) => {
            const result = validator.validateUrl(`http://${host}/proxy`, 'proxy');
            strictEqual(result.valid, true, `expected ${host} to be accepted`);
        };

        it('should reject remaining private/reserved IPv4 ranges via proxy context', () => {
            rejectProxy('0.1.2.3'); // 0.0.0.0/8
            rejectProxy('100.64.0.1'); // CGNAT lower bound
            rejectProxy('100.127.255.254'); // CGNAT upper bound
            rejectProxy('192.0.0.1'); // IETF protocol assignments
            rejectProxy('192.0.2.1'); // TEST-NET-1
            rejectProxy('198.18.0.1'); // network benchmark lower
            rejectProxy('198.19.255.254'); // network benchmark upper
            rejectProxy('198.51.100.7'); // TEST-NET-2
            rejectProxy('203.0.113.9'); // TEST-NET-3
            rejectProxy('224.0.0.1'); // multicast
            rejectProxy('239.255.255.255'); // multicast upper
            rejectProxy('240.0.0.1'); // reserved
            rejectProxy('255.255.255.255'); // broadcast
        });

        it('should accept public addresses just outside private ranges', () => {
            acceptProxy('100.63.0.1'); // below CGNAT
            acceptProxy('100.128.0.1'); // above CGNAT
            acceptProxy('172.32.0.1'); // above 172.16/12
            acceptProxy('198.20.0.1'); // outside 198.18/15
            acceptProxy('198.51.101.1'); // outside TEST-NET-2
            acceptProxy('203.0.114.1'); // outside TEST-NET-3
            acceptProxy('8.8.4.4');
        });

        it('should reject ULA, link-local and multicast IPv6 hosts via proxy context', () => {
            rejectProxy('[fc00::1]');
            rejectProxy('[fd12:3456:789a::1]');
            rejectProxy('[fe80::1]');
            rejectProxy('[febf:ffff::1]');
            rejectProxy('[ff02::1]');
            rejectProxy('[::]');
        });

        it('should accept public and non-link-local IPv6 hosts via proxy context', () => {
            acceptProxy('[2001:db8::1]');
            acceptProxy('[fec0::1]'); // deprecated site-local, not matched by the fe80::/10 check
            acceptProxy('[::ffff:102:304]'); // IPv4-mapped canonicalized by URL
        });

        it('should classify IPv6 helper paths directly', () => {
            const v = validator as any;
            // full loopback/unspecified forms (URL canonicalizes these to ::1 / ::)
            strictEqual(v.isPrivateIPv6('0:0:0:0:0:0:0:1'), true);
            strictEqual(v.isPrivateIPv6('0:0:0:0:0:0:0:0'), true);
            // zone IDs are stripped before matching (both raw and URL-encoded forms)
            strictEqual(v.isPrivateIPv6('fe80::1%eth0'), true);
            strictEqual(v.isPrivateIPv6('fe80::1%25eth0'), true);
            // expansion succeeds: fc00::/7, fe80::/10, ff00::/8 boundaries
            strictEqual(v.isPrivateIPv6('fc00::1'), true);
            strictEqual(v.isPrivateIPv6('fdff::1'), true);
            strictEqual(v.isPrivateIPv6('fbff::1'), false); // below fc00
            strictEqual(v.isPrivateIPv6('fe00::1'), false); // fe but second byte 0x00 not in 0x80-0xbf
            strictEqual(v.isPrivateIPv6('fe80::1'), true);
            strictEqual(v.isPrivateIPv6('febf::1'), true); // upper link-local boundary
            strictEqual(v.isPrivateIPv6('fec0::1'), false);
            strictEqual(v.isPrivateIPv6('ff02::1'), true);
            strictEqual(v.isPrivateIPv6('2001:db8::1'), false);
            // "fc::1" expands to 0000:...:00fc:0001 -> first byte 0x00, public
            strictEqual(v.isPrivateIPv6('fc::1'), false);
            // compressed expansion with both left and right groups
            strictEqual(v.isPrivateIPv6('fd12::a'), true);
        });

        it('should fall back to prefix matching when expansion fails', () => {
            const v = validator as any;
            strictEqual(v.isPrivateIPv6('1::2::3'), false); // double :: -> unclassifiable, public fallback
            strictEqual(v.isPrivateIPv6('fc00::1::2'), true); // fc prefix fallback
            strictEqual(v.isPrivateIPv6('fdab::1::2'), true); // fd prefix fallback
            strictEqual(v.isPrivateIPv6('fe80::1::2'), true); // fe8x prefix fallback
            strictEqual(v.isPrivateIPv6('ff02::1::3'), true); // ff prefix fallback
            strictEqual(v.isPrivateIPv6('1234::1::5'), false); // no matching prefix
        });

        it('should reject malformed IPv6 input in expandIPv6', () => {
            const v = validator as any;
            strictEqual(v.expandIPv6('1:2:3'), null); // too few groups without ::
            strictEqual(v.expandIPv6('1:2:3:4:5:6:7:8:9::'), null); // more than 8 groups
            strictEqual(v.expandIPv6('1:2:3::4:5'), '0001:0002:0003:0000:0000:0000:0004:0005');
            strictEqual(v.expandIPv6('1:2:3:4:5:6:7:8'), '0001:0002:0003:0004:0005:0006:0007:0008');
            strictEqual(v.expandIPv6(null), null); // non-string input hits the catch guard
        });

        it('should route IPv6 hostnames through the IPv6 classifier', () => {
            const v = validator as any;
            strictEqual(v.isPrivateIP('fe80::1'), true);
            strictEqual(v.isPrivateIP('8.8.8.8'), false);
        });
    });

    describe('Element validation with DOM', () => {
        const validator = createDefaultValidator();

        it('should accept a real attached HTMLElement', () => {
            const el = document.createElement('div');
            const result = validator.validateElement(el);
            strictEqual(result.valid, true);
            strictEqual(result.error, undefined);
        });

        it('should reject a real element detached from its document', () => {
            const el = document.createElement('div');
            Object.defineProperty(el, 'ownerDocument', { value: null, configurable: true });
            const result = validator.validateElement(el);
            strictEqual(result.valid, false);
            strictEqual(result.error, 'Element must be attached to a document');
        });

        it('should reject numbers as elements', () => {
            const result = validator.validateElement(42 as any);
            strictEqual(result.valid, false);
            strictEqual(result.error, 'Element must be an object');
        });

        it('should reject element-like objects without ownerDocument', () => {
            const result = validator.validateElement({ nodeType: 1 } as any);
            strictEqual(result.valid, false);
            strictEqual(result.error, 'Element must be attached to a document (ownerDocument required)');
        });

        it('should reject elements whose document has no defaultView', () => {
            const result = validator.validateElement({ ownerDocument: {} } as any);
            strictEqual(result.valid, false);
            strictEqual(result.error, 'Document must be attached to a window (ownerDocument.defaultView required)');
        });

        it('should accept element-like objects with ownerDocument.defaultView', () => {
            const result = validator.validateElement({
                ownerDocument: { defaultView: window }
            } as any);
            strictEqual(result.valid, true);
            strictEqual(result.error, undefined);
        });
    });

    describe('Options validation edge cases', () => {
        it('should ignore null, non-string and empty proxy values', () => {
            const validator = createDefaultValidator();
            strictEqual(validator.validateOptions({ proxy: null }).valid, true);
            strictEqual(validator.validateOptions({ proxy: 123 as any }).valid, true);
            strictEqual(validator.validateOptions({ proxy: '' }).valid, true);
        });

        it('should validate a string proxy and report failures with a Proxy prefix', () => {
            const validator = createDefaultValidator();
            const good = validator.validateOptions({ proxy: 'http://8.8.8.8/proxy' });
            strictEqual(good.valid, true);

            const bad = validator.validateOptions({ proxy: 'http://localhost/proxy' });
            strictEqual(bad.valid, false);
            strictEqual(bad.error?.startsWith('Proxy:'), true);
            strictEqual(bad.error?.includes('Localhost'), true);
        });

        it('should default missing width or height when only one is provided', () => {
            const validator = createDefaultValidator();
            const widthOnly = validator.validateOptions({ width: 1024 });
            strictEqual(widthOnly.valid, true);

            const heightOnly = validator.validateOptions({ height: 768 });
            strictEqual(heightOnly.valid, true);

            const nullWidth = validator.validateOptions({ width: null as any, height: 600 });
            strictEqual(nullWidth.valid, true); // null coalesces to default 800
        });

        it('should reject invalid dimensions provided via options', () => {
            const validator = createDefaultValidator();
            const result = validator.validateOptions({ height: 40000 });
            strictEqual(result.valid, false);
            strictEqual(result.error?.startsWith('Dimensions:'), true);
        });

        it('should validate cspNonce via options', () => {
            const validator = createDefaultValidator();
            const good = validator.validateOptions({ cspNonce: 'AbCdEfGhIjKlMnOpQrSt' });
            strictEqual(good.valid, true);

            const bad = validator.validateOptions({ cspNonce: 'short' });
            strictEqual(bad.valid, false);
            strictEqual(bad.error?.startsWith('CSP nonce:'), true);
        });

        it('should reject non-numeric imageTimeout via options', () => {
            const validator = createDefaultValidator();
            const result = validator.validateOptions({ imageTimeout: null as any });
            strictEqual(result.valid, false);
            strictEqual(result.error, 'Image timeout: Image timeout must be a number');
        });

        it('should run customValidator and merge its errors', () => {
            const failing = new Validator({
                customValidator: () => ({ valid: false, error: 'nope' })
            });
            const result = failing.validateOptions({});
            strictEqual(result.valid, false);
            strictEqual(result.error, 'Custom validation: nope');

            const passing = new Validator({
                customValidator: () => ({ valid: true })
            });
            strictEqual(passing.validateOptions({}).valid, true);
        });

        it('should pass the raw options object to customValidator', () => {
            let received: unknown;
            const validator = new Validator({
                customValidator: (value, type) => {
                    received = value;
                    strictEqual(type, 'options');
                    return { valid: true };
                }
            });
            const options = { scale: 1 };
            validator.validateOptions(options);
            strictEqual(received, options);
        });
    });

    describe('Image timeout configuration', () => {
        it('should skip the maximum check when maxImageTimeout is disabled', () => {
            const validator = new Validator({ maxImageTimeout: undefined });
            const result = validator.validateImageTimeout(99999999);
            strictEqual(result.valid, true);
            strictEqual(result.sanitized, 99999999);
        });
    });
});
