import { deepEqual } from 'assert';
import { FLAG_ID, FLAG_INTEGER, FLAG_NUMBER, FLAG_UNRESTRICTED, Tokenizer, TokenType } from '../tokenizer';

const tokenize = (value: string) => {
    const tokenizer = new Tokenizer();
    tokenizer.write(value);
    return tokenizer.read();
};

describe('tokenizer', () => {
    describe('<ident>', () => {
        it('auto', () => deepEqual(tokenize('auto'), [{ type: TokenType.IDENT_TOKEN, value: 'auto' }]));
        it('url', () => deepEqual(tokenize('url'), [{ type: TokenType.IDENT_TOKEN, value: 'url' }]));
        it('auto test', () =>
            deepEqual(tokenize('auto        test'), [
                { type: TokenType.IDENT_TOKEN, value: 'auto' },
                { type: TokenType.WHITESPACE_TOKEN },
                { type: TokenType.IDENT_TOKEN, value: 'test' }
            ]));
        it('hyphen', () => deepEqual(tokenize('a-b'), [{ type: TokenType.IDENT_TOKEN, value: 'a-b' }]));
        it('custom property', () =>
            deepEqual(tokenize('--a'), [
                { type: TokenType.DELIM_TOKEN, value: '-' },
                { type: TokenType.IDENT_TOKEN, value: '-a' }
            ]));
        it('single hyphen prefix', () => deepEqual(tokenize('-a'), [{ type: TokenType.IDENT_TOKEN, value: '-a' }]));
        it('escaped hyphen prefix', () => deepEqual(tokenize('-\\61'), [{ type: TokenType.IDENT_TOKEN, value: '-a' }]));
        it('non-ascii', () => deepEqual(tokenize('über'), [{ type: TokenType.IDENT_TOKEN, value: 'über' }]));
        it('escaped start', () => deepEqual(tokenize('\\61 bc'), [{ type: TokenType.IDENT_TOKEN, value: 'abc' }]));
        it('underscore', () => deepEqual(tokenize('_a'), [{ type: TokenType.IDENT_TOKEN, value: '_a' }]));
    });
    describe('<url-token>', () => {
        it('url(test.jpg)', () =>
            deepEqual(tokenize('url(test.jpg)'), [{ type: TokenType.URL_TOKEN, value: 'test.jpg' }]));
        it('url("test.jpg")', () =>
            deepEqual(tokenize('url("test.jpg")'), [{ type: TokenType.URL_TOKEN, value: 'test.jpg' }]));
        it("url('test.jpg')", () =>
            deepEqual(tokenize("url('test.jpg')"), [{ type: TokenType.URL_TOKEN, value: 'test.jpg' }]));
        it('whitespace padding', () =>
            deepEqual(tokenize('url( test.jpg )'), [{ type: TokenType.URL_TOKEN, value: 'test.jpg' }]));
        it('empty', () => deepEqual(tokenize('url()'), [{ type: TokenType.URL_TOKEN, value: '' }]));
        it('eof after open paren', () => deepEqual(tokenize('url('), [{ type: TokenType.URL_TOKEN, value: '' }]));
        it('eof after trailing whitespace', () =>
            deepEqual(tokenize('url(test.jpg '), [{ type: TokenType.URL_TOKEN, value: 'test.jpg' }]));
        it('quoted with whitespace', () =>
            deepEqual(tokenize('url("a b.jpg")'), [{ type: TokenType.URL_TOKEN, value: 'a b.jpg' }]));
        it('escaped code point', () =>
            deepEqual(tokenize('url(\\61 b)'), [{ type: TokenType.URL_TOKEN, value: 'ab' }]));
        it('bad url: junk after quoted string', () =>
            deepEqual(tokenize('url("test.jpg"junk)'), [{ type: TokenType.BAD_URL_TOKEN }]));
        it('bad url: unterminated quoted string', () =>
            deepEqual(tokenize('url("te\nst)'), [{ type: TokenType.BAD_URL_TOKEN }]));
        it('bad url: quote in unquoted url', () =>
            deepEqual(tokenize('url(test".jpg)'), [{ type: TokenType.BAD_URL_TOKEN }]));
        it('bad url: parenthesis in unquoted url', () =>
            deepEqual(tokenize('url(te(st.jpg)'), [{ type: TokenType.BAD_URL_TOKEN }]));
        it('bad url: non-printable in unquoted url', () =>
            deepEqual(tokenize('url(te\x01st.jpg)'), [{ type: TokenType.BAD_URL_TOKEN }]));
        it('bad url: junk after unquoted whitespace', () =>
            deepEqual(tokenize('url( test.jpg junk)'), [{ type: TokenType.BAD_URL_TOKEN }]));
        it('bad url: newline in unquoted url', () =>
            deepEqual(tokenize('url(te\nst)'), [{ type: TokenType.BAD_URL_TOKEN }]));
    });
    describe('<string-token>', () => {
        it('empty', () => deepEqual(tokenize('""'), [{ type: TokenType.STRING_TOKEN, value: '' }]));
        it('contents', () => deepEqual(tokenize('"abc"'), [{ type: TokenType.STRING_TOKEN, value: 'abc' }]));
        it('single quotes', () => deepEqual(tokenize("'abc'"), [{ type: TokenType.STRING_TOKEN, value: 'abc' }]));
        it('escaped quote', () => deepEqual(tokenize('"a\\"b"'), [{ type: TokenType.STRING_TOKEN, value: 'a"b' }]));
        it('escaped backslash', () =>
            deepEqual(tokenize('"a\\\\b"'), [{ type: TokenType.STRING_TOKEN, value: 'a\\b' }]));
        it('escaped newline continuation', () =>
            deepEqual(tokenize('"a\\\nb"'), [{ type: TokenType.STRING_TOKEN, value: 'ab' }]));
        it('unterminated at eof', () => deepEqual(tokenize('"abc'), [{ type: TokenType.STRING_TOKEN, value: 'abc' }]));
        it('trailing backslash at eof', () =>
            deepEqual(tokenize('"a\\'), [{ type: TokenType.STRING_TOKEN, value: 'a\\' }]));
        it('newline terminates as bad string', () =>
            deepEqual(tokenize('"a\nb"'), [
                { type: TokenType.BAD_STRING_TOKEN },
                { type: TokenType.WHITESPACE_TOKEN },
                { type: TokenType.IDENT_TOKEN, value: 'b' },
                { type: TokenType.STRING_TOKEN, value: '' }
            ]));
        it('slices very long strings', () => {
            const tokens = tokenize(`"${'a'.repeat(50001)}"`);
            deepEqual(tokens.length, 1);
            deepEqual(tokens[0]?.type, TokenType.STRING_TOKEN);
            deepEqual((tokens[0] as { value: string }).value.length, 50001);
        });
    });
    describe('<number-token>', () => {
        it('integer', () =>
            deepEqual(tokenize('12'), [{ type: TokenType.NUMBER_TOKEN, number: 12, flags: FLAG_INTEGER }]));
        it('positive integer', () =>
            deepEqual(tokenize('+12'), [{ type: TokenType.NUMBER_TOKEN, number: 12, flags: FLAG_INTEGER }]));
        it('negative integer', () =>
            deepEqual(tokenize('-12'), [{ type: TokenType.NUMBER_TOKEN, number: -12, flags: FLAG_INTEGER }]));
        it('float', () =>
            deepEqual(tokenize('1.5'), [{ type: TokenType.NUMBER_TOKEN, number: 1.5, flags: FLAG_NUMBER }]));
        it('negative float', () =>
            deepEqual(tokenize('-.5'), [{ type: TokenType.NUMBER_TOKEN, number: -0.5, flags: FLAG_NUMBER }]));
        it('positive float', () =>
            deepEqual(tokenize('+.5'), [{ type: TokenType.NUMBER_TOKEN, number: 0.5, flags: FLAG_NUMBER }]));
        it('exponent', () =>
            deepEqual(tokenize('1e2'), [{ type: TokenType.NUMBER_TOKEN, number: 100, flags: FLAG_NUMBER }]));
        it('uppercase exponent', () =>
            deepEqual(tokenize('1E2'), [{ type: TokenType.NUMBER_TOKEN, number: 100, flags: FLAG_NUMBER }]));
        it('signed exponent', () =>
            deepEqual(tokenize('1e+2'), [{ type: TokenType.NUMBER_TOKEN, number: 100, flags: FLAG_NUMBER }]));
        it('negative exponent', () =>
            deepEqual(tokenize('1e-2'), [{ type: TokenType.NUMBER_TOKEN, number: 0.01, flags: FLAG_NUMBER }]));
        it('float exponent', () =>
            deepEqual(tokenize('1.5e2'), [{ type: TokenType.NUMBER_TOKEN, number: 150, flags: FLAG_NUMBER }]));
        it('trailing e is a dimension unit', () =>
            deepEqual(tokenize('1.5e'), [
                { type: TokenType.DIMENSION_TOKEN, number: 1.5, flags: FLAG_NUMBER, unit: 'e' }
            ]));
    });
    describe('<percentage-token>', () => {
        it('integer', () =>
            deepEqual(tokenize('12%'), [{ type: TokenType.PERCENTAGE_TOKEN, number: 12, flags: FLAG_INTEGER }]));
        it('float', () =>
            deepEqual(tokenize('-1.5%'), [{ type: TokenType.PERCENTAGE_TOKEN, number: -1.5, flags: FLAG_NUMBER }]));
    });
    describe('<dimension-token>', () => {
        it('integer', () =>
            deepEqual(tokenize('12px'), [
                { type: TokenType.DIMENSION_TOKEN, number: 12, flags: FLAG_INTEGER, unit: 'px' }
            ]));
        it('float', () =>
            deepEqual(tokenize('1.5em'), [
                { type: TokenType.DIMENSION_TOKEN, number: 1.5, flags: FLAG_NUMBER, unit: 'em' }
            ]));
        it('negative', () =>
            deepEqual(tokenize('-3s'), [
                { type: TokenType.DIMENSION_TOKEN, number: -3, flags: FLAG_INTEGER, unit: 's' }
            ]));
        it('dot start', () =>
            deepEqual(tokenize('.5s'), [
                { type: TokenType.DIMENSION_TOKEN, number: 0.5, flags: FLAG_NUMBER, unit: 's' }
            ]));
        it('escaped unit', () =>
            deepEqual(tokenize('1\\70 x'), [
                { type: TokenType.DIMENSION_TOKEN, number: 1, flags: FLAG_INTEGER, unit: 'px' }
            ]));
        it('plus start', () =>
            deepEqual(tokenize('+12px'), [
                { type: TokenType.DIMENSION_TOKEN, number: 12, flags: FLAG_INTEGER, unit: 'px' }
            ]));
    });
    describe('<hash-token>', () => {
        it('ident hash', () =>
            deepEqual(tokenize('#a1'), [{ type: TokenType.HASH_TOKEN, value: 'a1', flags: FLAG_ID }]));
        it('unrestricted hash', () =>
            deepEqual(tokenize('#123'), [{ type: TokenType.HASH_TOKEN, value: '123', flags: FLAG_UNRESTRICTED }]));
        it('lone hyphen', () =>
            deepEqual(tokenize('#-'), [{ type: TokenType.HASH_TOKEN, value: '-', flags: FLAG_UNRESTRICTED }]));
        it('escape right after number sign is not a hash', () =>
            deepEqual(tokenize('#\\61'), [
                { type: TokenType.DELIM_TOKEN, value: '#' },
                { type: TokenType.IDENT_TOKEN, value: 'a' }
            ]));
        it('escaped name inside hash', () =>
            deepEqual(tokenize('#a\\31 b'), [{ type: TokenType.HASH_TOKEN, value: 'a1b', flags: FLAG_ID }]));
        it('bare number sign', () => deepEqual(tokenize('#'), [{ type: TokenType.DELIM_TOKEN, value: '#' }]));
    });
    describe('<at-keyword-token>', () => {
        it('media', () => deepEqual(tokenize('@media'), [{ type: TokenType.AT_KEYWORD_TOKEN, value: 'media' }]));
        it('hyphenated', () => deepEqual(tokenize('@-a'), [{ type: TokenType.AT_KEYWORD_TOKEN, value: '-a' }]));
        it('bare commercial at', () => deepEqual(tokenize('@'), [{ type: TokenType.DELIM_TOKEN, value: '@' }]));
        it('followed by number', () =>
            deepEqual(tokenize('@9'), [
                { type: TokenType.DELIM_TOKEN, value: '@' },
                { type: TokenType.NUMBER_TOKEN, number: 9, flags: FLAG_INTEGER }
            ]));
    });
    describe('match tokens', () => {
        it('suffix match', () => deepEqual(tokenize('$='), [{ type: TokenType.SUFFIX_MATCH_TOKEN }]));
        it('substring match', () => deepEqual(tokenize('*='), [{ type: TokenType.SUBSTRING_MATCH_TOKEN }]));
        it('dash match', () => deepEqual(tokenize('|='), [{ type: TokenType.DASH_MATCH_TOKEN }]));
        it('column', () => deepEqual(tokenize('||'), [{ type: TokenType.COLUMN_TOKEN }]));
        it('include match', () => deepEqual(tokenize('~='), [{ type: TokenType.INCLUDE_MATCH_TOKEN }]));
        it('prefix match', () => deepEqual(tokenize('^='), [{ type: TokenType.PREFIX_MATCH_TOKEN }]));
        it('lone delim fallbacks', () =>
            deepEqual(tokenize('$ * | ~ ^'), [
                { type: TokenType.DELIM_TOKEN, value: '$' },
                { type: TokenType.WHITESPACE_TOKEN },
                { type: TokenType.DELIM_TOKEN, value: '*' },
                { type: TokenType.WHITESPACE_TOKEN },
                { type: TokenType.DELIM_TOKEN, value: '|' },
                { type: TokenType.WHITESPACE_TOKEN },
                { type: TokenType.DELIM_TOKEN, value: '~' },
                { type: TokenType.WHITESPACE_TOKEN },
                { type: TokenType.DELIM_TOKEN, value: '^' }
            ]));
    });
    describe('<cdc-token> & <cdo-token>', () => {
        it('cdo', () => deepEqual(tokenize('<!--'), [{ type: TokenType.CDO_TOKEN }]));
        it('cdc', () => deepEqual(tokenize('-->'), [{ type: TokenType.CDC_TOKEN }]));
        it('lone less-than sign', () => deepEqual(tokenize('<'), [{ type: TokenType.DELIM_TOKEN, value: '<' }]));
        it('incomplete cdo', () =>
            deepEqual(tokenize('<!-'), [
                { type: TokenType.DELIM_TOKEN, value: '<' },
                { type: TokenType.DELIM_TOKEN, value: '!' },
                { type: TokenType.DELIM_TOKEN, value: '-' }
            ]));
    });
    describe('simple tokens', () => {
        it('comma', () => deepEqual(tokenize(','), [{ type: TokenType.COMMA_TOKEN }]));
        it('colon', () => deepEqual(tokenize(':'), [{ type: TokenType.COLON_TOKEN }]));
        it('semicolon', () => deepEqual(tokenize(';'), [{ type: TokenType.SEMICOLON_TOKEN }]));
        it('parentheses', () =>
            deepEqual(tokenize('()'), [
                { type: TokenType.LEFT_PARENTHESIS_TOKEN },
                { type: TokenType.RIGHT_PARENTHESIS_TOKEN }
            ]));
        it('square brackets', () =>
            deepEqual(tokenize('[]'), [
                { type: TokenType.LEFT_SQUARE_BRACKET_TOKEN },
                { type: TokenType.RIGHT_SQUARE_BRACKET_TOKEN }
            ]));
        it('curly brackets', () =>
            deepEqual(tokenize('{}'), [
                { type: TokenType.LEFT_CURLY_BRACKET_TOKEN },
                { type: TokenType.RIGHT_CURLY_BRACKET_TOKEN }
            ]));
        it('misc delims', () =>
            deepEqual(tokenize('& !'), [
                { type: TokenType.DELIM_TOKEN, value: '&' },
                { type: TokenType.WHITESPACE_TOKEN },
                { type: TokenType.DELIM_TOKEN, value: '!' }
            ]));
    });
    describe('<comment>', () => {
        it('skips comment before token', () =>
            deepEqual(tokenize('/*c*/a'), [{ type: TokenType.IDENT_TOKEN, value: 'a' }]));
        it('skips comment between tokens', () =>
            deepEqual(tokenize('a/*x*/b'), [
                { type: TokenType.IDENT_TOKEN, value: 'a' },
                { type: TokenType.IDENT_TOKEN, value: 'b' }
            ]));
        it('unterminated comment consumes rest', () =>
            deepEqual(tokenize('a/*unterminated'), [{ type: TokenType.IDENT_TOKEN, value: 'a' }]));
        it('nested asterisks', () => deepEqual(tokenize('/*a*b*/c'), [{ type: TokenType.IDENT_TOKEN, value: 'c' }]));
    });
    describe('<whitespace-token>', () => {
        it('collapses mixed whitespace', () =>
            deepEqual(tokenize('\t\n x'), [
                { type: TokenType.WHITESPACE_TOKEN },
                { type: TokenType.IDENT_TOKEN, value: 'x' }
            ]));
        it('trailing whitespace', () =>
            deepEqual(tokenize('a \t\n'), [
                { type: TokenType.IDENT_TOKEN, value: 'a' },
                { type: TokenType.WHITESPACE_TOKEN }
            ]));
        it('carriage return and form feed are delims', () =>
            deepEqual(tokenize('\r\f'), [
                { type: TokenType.DELIM_TOKEN, value: '\r' },
                { type: TokenType.DELIM_TOKEN, value: '\f' }
            ]));
    });
    describe('<unicode-range-token>', () => {
        it('single code point', () =>
            deepEqual(tokenize('U+26'), [{ type: TokenType.UNICODE_RANGE_TOKEN, start: 0x26, end: 0x26 }]));
        it('lowercase prefix', () =>
            deepEqual(tokenize('u+26'), [{ type: TokenType.UNICODE_RANGE_TOKEN, start: 0x26, end: 0x26 }]));
        it('explicit range', () =>
            deepEqual(tokenize('U+0-7f'), [{ type: TokenType.UNICODE_RANGE_TOKEN, start: 0x0, end: 0x7f }]));
        it('question mark range', () =>
            deepEqual(tokenize('U+2??'), [{ type: TokenType.UNICODE_RANGE_TOKEN, start: 0x200, end: 0x2ff }]));
        it('all question marks', () =>
            deepEqual(tokenize('U+??????'), [{ type: TokenType.UNICODE_RANGE_TOKEN, start: 0x0, end: 0xffffff }]));
        it('non-hex after plus', () =>
            deepEqual(tokenize('U+x'), [
                { type: TokenType.IDENT_TOKEN, value: 'U' },
                { type: TokenType.DELIM_TOKEN, value: '+' },
                { type: TokenType.IDENT_TOKEN, value: 'x' }
            ]));
        it('dangling plus', () =>
            deepEqual(tokenize('U+'), [
                { type: TokenType.IDENT_TOKEN, value: 'U' },
                { type: TokenType.DELIM_TOKEN, value: '+' }
            ]));
    });
    describe('delim fallbacks', () => {
        it('plus before ident', () =>
            deepEqual(tokenize('+a'), [
                { type: TokenType.DELIM_TOKEN, value: '+' },
                { type: TokenType.IDENT_TOKEN, value: 'a' }
            ]));
        it('dot before ident', () =>
            deepEqual(tokenize('.a'), [
                { type: TokenType.DELIM_TOKEN, value: '.' },
                { type: TokenType.IDENT_TOKEN, value: 'a' }
            ]));
        it('empty input', () => deepEqual(tokenize(''), []));
    });
    describe('pool', () => {
        it('reuses released tokenizers', () => {
            const first = Tokenizer.get();
            Tokenizer.release(first);
            deepEqual(Tokenizer.get(), first);
        });
        it('does not reuse active tokenizers', () => {
            const first = Tokenizer.get();
            deepEqual(Tokenizer.get() !== first, true);
            Tokenizer.release(first);
        });
    });
});
