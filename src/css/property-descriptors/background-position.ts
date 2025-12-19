import { PropertyDescriptorParsingType, IPropertyListDescriptor } from '../IPropertyDescriptor';
import { CSSValue, parseFunctionArgs } from '../syntax/parser';
import {
    isLengthPercentage,
    isCalcFunction,
    evaluateCalcToLengthPercentage,
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
                return values
                    .map((value) => {
                        if (isCalcFunction(value)) {
                            // For calc() at parse time, we can't know the container size
                            // So we evaluate with 0 context which will work for px-only calc()
                            // Percentage-based calc() will need special handling
                            return evaluateCalcToLengthPercentage(value, 0);
                        }
                        return isLengthPercentage(value) ? value : null;
                    })
                    .filter((v): v is NonNullable<typeof v> => v !== null);
            })
            .map(parseLengthPercentageTuple);
    }
};
