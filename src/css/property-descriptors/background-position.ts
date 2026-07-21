import { PropertyDescriptorParsingType, IPropertyListDescriptor } from '../property-descriptor';
import { CSSValue, parseFunctionArgs } from '../syntax/parser';
import {
    parseOptionalCalcOrLength,
    LengthPercentageTuple,
    parseLengthPercentageTuple
} from '../types/length-percentage';
import { Context } from '../../core/context';
export type BackgroundPosition = BackgroundImagePosition[];

export type BackgroundImagePosition = LengthPercentageTuple;

export const backgroundPosition: IPropertyListDescriptor<BackgroundPosition> = {
    name: 'background-position',
    initialValue: '0% 0%',
    type: PropertyDescriptorParsingType.LIST,
    prefix: false,
    parse: (_context: Context, tokens: CSSValue[]): BackgroundPosition => {
        return parseFunctionArgs(tokens)
            .map((values: CSSValue[]) => {
                // Convert calc() to length-percentage tokens, keep other length-percentage as is
                return values.map(parseOptionalCalcOrLength).filter((v): v is NonNullable<typeof v> => v !== null);
            })
            .map(parseLengthPercentageTuple);
    }
};
