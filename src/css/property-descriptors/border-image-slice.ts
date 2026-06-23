import { IPropertyListDescriptor, PropertyDescriptorParsingType } from '../property-descriptor';
import { CSSValue, isIdentToken, nonWhiteSpace } from '../syntax/parser';
import { TokenType } from '../syntax/tokenizer';
import { Context } from '../../core/context';

export interface BorderImageSlice {
    top: number;
    right: number;
    bottom: number;
    left: number;
    fill: boolean;
    unit: 'number' | 'percent';
}

const fillSides = (sides: number[]): number[] => {
    const result = [...sides];
    if (result.length === 1) {
        result.push(result[0], result[0], result[0]);
    } else if (result.length === 2) {
        result.push(result[0], result[1]);
    } else if (result.length === 3) {
        result.push(result[1]);
    }
    return result.slice(0, 4);
};

export const borderImageSlice: IPropertyListDescriptor<BorderImageSlice> = {
    name: 'border-image-slice',
    initialValue: '100%',
    prefix: false,
    type: PropertyDescriptorParsingType.LIST,
    parse: (_context: Context, tokens: CSSValue[]): BorderImageSlice => {
        const filtered = tokens.filter(nonWhiteSpace);
        const values: number[] = [];
        let fill = false;
        let unit: 'number' | 'percent' = 'percent';

        for (const token of filtered) {
            if (isIdentToken(token) && token.value === 'fill') {
                fill = true;
                continue;
            }
            if (token.type === TokenType.NUMBER_TOKEN) {
                values.push(token.number);
                unit = 'number';
            } else if (token.type === TokenType.PERCENTAGE_TOKEN) {
                values.push(token.number);
                unit = 'percent';
            }
        }

        const [top, right, bottom, left] = fillSides(values.length > 0 ? values : [100]);

        return { top, right, bottom, left, fill, unit };
    }
};
