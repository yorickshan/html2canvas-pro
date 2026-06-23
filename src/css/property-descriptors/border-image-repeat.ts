import { IPropertyListDescriptor, PropertyDescriptorParsingType } from '../property-descriptor';
import { CSSValue, isIdentToken, nonWhiteSpace } from '../syntax/parser';
import { Context } from '../../core/context';

export enum BORDER_IMAGE_REPEAT {
    STRETCH = 0,
    REPEAT = 1,
    ROUND = 2,
    SPACE = 3
}

export interface BorderImageRepeat {
    horizontal: BORDER_IMAGE_REPEAT;
    vertical: BORDER_IMAGE_REPEAT;
}

const parseRepeatValue = (value: string): BORDER_IMAGE_REPEAT => {
    switch (value) {
        case 'repeat':
            return BORDER_IMAGE_REPEAT.REPEAT;
        case 'round':
            return BORDER_IMAGE_REPEAT.ROUND;
        case 'space':
            return BORDER_IMAGE_REPEAT.SPACE;
        case 'stretch':
        default:
            return BORDER_IMAGE_REPEAT.STRETCH;
    }
};

export const borderImageRepeat: IPropertyListDescriptor<BorderImageRepeat> = {
    name: 'border-image-repeat',
    initialValue: 'stretch',
    prefix: false,
    type: PropertyDescriptorParsingType.LIST,
    parse: (_context: Context, tokens: CSSValue[]): BorderImageRepeat => {
        const filtered = tokens.filter(nonWhiteSpace);
        const values: BORDER_IMAGE_REPEAT[] = [];

        for (const token of filtered) {
            if (isIdentToken(token)) {
                values.push(parseRepeatValue(token.value));
            }
        }

        const horizontal = values[0] ?? BORDER_IMAGE_REPEAT.STRETCH;
        const vertical = values[1] ?? horizontal;

        return { horizontal, vertical };
    }
};
