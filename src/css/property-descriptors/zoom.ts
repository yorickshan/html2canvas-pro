import { PropertyDescriptorParsingType, IPropertyValueDescriptor } from '../property-descriptor';
import { CSSValue } from '../syntax/parser';
import { TokenType } from '../syntax/tokenizer';
import { Context } from '../../core/context';

export type Zoom = number;

export const zoom: IPropertyValueDescriptor<Zoom> = {
    name: 'zoom',
    initialValue: '1',
    type: PropertyDescriptorParsingType.VALUE,
    prefix: false,
    parse: (_context: Context, token: CSSValue): Zoom => {
        if (token.type === TokenType.PERCENTAGE_TOKEN) {
            return Math.max(0, token.number / 100);
        }
        if (token.type === TokenType.NUMBER_TOKEN) {
            return Math.max(0, token.number);
        }
        return 1;
    }
};
