import { PropertyDescriptorParsingType, IPropertyListDescriptor } from '../property-descriptor';
import { at } from '../../core/util';
import { CSSValue, CSSFunction } from '../syntax/parser';
import { TokenType } from '../syntax/tokenizer';
import { Context } from '../../core/context';

export type FilterValue = string | null;

export const filter: IPropertyListDescriptor<FilterValue> = {
    name: 'filter',
    initialValue: 'none',
    prefix: false,
    type: PropertyDescriptorParsingType.LIST,
    parse: (_context: Context, tokens: CSSValue[]): FilterValue => {
        if (tokens.length === 1) {
            const first = at(tokens, 0);
            if (first.type === TokenType.IDENT_TOKEN && first.value === 'none') {
                return null;
            }
        }

        const parts: string[] = [];
        for (const token of tokens) {
            if (token.type === TokenType.URL_TOKEN) {
                // url(#svgfilter) references: url() tokenises as a URL token,
                // not a function — carry it through so the legacy renderer
                // hands the reference to ctx.filter (native SVG support).
                parts.push(`url("${token.value}")`);
                continue;
            }
            if (token.type === TokenType.FUNCTION) {
                const fn = token as CSSFunction;
                // Reconstruct the function string from its name + values
                const renderedArgs = renderFilterArgs(fn.values);
                // Canvas API supports the same CSS filter string format
                switch (fn.name) {
                    case 'blur':
                        parts.push(`blur(${renderedArgs})`);
                        break;
                    case 'brightness':
                    case 'contrast':
                    case 'invert':
                    case 'opacity':
                    case 'saturate':
                    case 'sepia':
                        parts.push(`${fn.name}(${renderedArgs})`);
                        break;
                    case 'grayscale':
                        parts.push(`grayscale(${renderedArgs})`);
                        break;
                    case 'hue-rotate':
                        parts.push(`hue-rotate(${renderedArgs})`);
                        break;
                    case 'drop-shadow':
                        parts.push(`drop-shadow(${renderedArgs})`);
                        break;
                    default:
                        // Pass url() references and unknown functions through
                        // verbatim: the surface compositor rejects chains it
                        // cannot express (falling back to the legacy path),
                        // and the legacy path feeds ctx.filter, which applies
                        // SVG references natively where supported.
                        parts.push(`${fn.name}(${renderedArgs})`);
                        break;
                }
            }
        }

        return parts.length > 0 ? parts.join(' ') : null;
    }
};

/**
 * Render filter function arguments back into a CSS string suitable for Canvas API.
 * Canvas 2D `ctx.filter` accepts the same CSS filter function strings.
 */
const renderFilterArgs = (values: CSSValue[]): string => {
    const parts: string[] = [];
    for (const v of values) {
        if (v.type === TokenType.WHITESPACE_TOKEN) {
            parts.push(' ');
            continue;
        }
        if (v.type === TokenType.FUNCTION) {
            parts.push(`${v.name}(${renderFilterArgs(v.values)})`);
        } else if (v.type === TokenType.COMMA_TOKEN) {
            parts.push(',');
        } else if (v.type === TokenType.DELIM_TOKEN) {
            parts.push(v.value);
        } else if (v.type === TokenType.DIMENSION_TOKEN) {
            parts.push(`${v.number}${v.unit}`);
        } else if (v.type === TokenType.NUMBER_TOKEN) {
            parts.push(`${v.number}`);
        } else if (v.type === TokenType.PERCENTAGE_TOKEN) {
            parts.push(`${v.number}%`);
        } else if (v.type === TokenType.IDENT_TOKEN) {
            parts.push(v.value);
        } else if (v.type === TokenType.HASH_TOKEN) {
            parts.push(`#${v.value}`);
        }
    }
    return parts.join('').trim();
};
