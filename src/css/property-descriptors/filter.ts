import { PropertyDescriptorParsingType, IPropertyListDescriptor } from '../property-descriptor';
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
        if (tokens.length === 1 && tokens[0].type === TokenType.IDENT_TOKEN && tokens[0].value === 'none') {
            return null;
        }

        const parts: string[] = [];
        for (const token of tokens) {
            if (token.type === TokenType.FUNCTION) {
                const fn = token as CSSFunction;
                // Reconstruct the function string from its name + values
                const renderedArgs = renderFilterArgs(fn.values);
                // Canvas API supports the same CSS filter string format
                switch (fn.name) {
                    case 'blur':
                        parts.push(`blur(${renderedArgs}px)`);
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
                        parts.push(`hue-rotate(${renderedArgs}deg)`);
                        break;
                    case 'drop-shadow':
                        parts.push(`drop-shadow(${renderedArgs})`);
                        break;
                    default:
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
            continue;
        }
        if (v.type === TokenType.DIMENSION_TOKEN) {
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
    return parts.join(' ');
};
