import { IPropertyListDescriptor, PropertyDescriptorParsingType } from '../property-descriptor';
import { CSSValue, isIdentToken, parseFunctionArgs } from '../syntax/parser';
import { isLengthPercentage, parseOptionalCalcOrLength, LengthPercentage } from '../types/length-percentage';
import { StringValueToken } from '../syntax/tokenizer';
import { Context } from '../../core/context';

export enum BACKGROUND_SIZE {
    AUTO = 'auto',
    CONTAIN = 'contain',
    COVER = 'cover'
}

export type BackgroundSizeInfo = LengthPercentage | StringValueToken;
export type BackgroundSize = BackgroundSizeInfo[][];

export const backgroundSize: IPropertyListDescriptor<BackgroundSize> = {
    name: 'background-size',
    initialValue: '0',
    prefix: false,
    type: PropertyDescriptorParsingType.LIST,
    parse: (_context: Context, tokens: CSSValue[]): BackgroundSize => {
        return parseFunctionArgs(tokens).map((values) =>
            values
                .map((value) => (isBackgroundSizeInfoToken(value) ? value : parseOptionalCalcOrLength(value)))
                .filter((v): v is NonNullable<typeof v> => v !== null)
        );
    }
};

const isBackgroundSizeInfoToken = (value: CSSValue): value is BackgroundSizeInfo =>
    isIdentToken(value) || isLengthPercentage(value);
