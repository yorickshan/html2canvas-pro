import { IPropertyValueDescriptor, PropertyDescriptorParsingType } from '../property-descriptor';
import { at } from '../../core/util';
import { CSSValue } from '../syntax/parser';
import { NumberValueToken, TokenType } from '../syntax/tokenizer';
import { Context } from '../../core/context';
import { angle } from '../types/angle';
export type Matrix = [number, number, number, number, number, number];
export type Transform = Matrix | null;

export const transform: IPropertyValueDescriptor<Transform> = {
    name: 'transform',
    initialValue: 'none',
    prefix: true,
    type: PropertyDescriptorParsingType.VALUE,
    parse: (_context: Context, token: CSSValue) => {
        if (token.type === TokenType.IDENT_TOKEN && token.value === 'none') {
            return null;
        }

        if (token.type === TokenType.FUNCTION) {
            const transformFunction = SUPPORTED_TRANSFORM_FUNCTIONS[token.name];
            if (typeof transformFunction === 'undefined') {
                throw new Error(`Attempting to parse an unsupported transform function "${token.name}"`);
            }
            return transformFunction(_context, token.values);
        }

        return null;
    }
};

const matrix = (_context: Context, args: CSSValue[]): Transform => {
    const values = args
        .filter((arg): arg is NumberValueToken => arg.type === TokenType.NUMBER_TOKEN)
        .map((arg) => arg.number);

    return values.length === 6 ? (values as Matrix) : null;
};

// doesn't support 3D transforms at the moment
const matrix3d = (_context: Context, args: CSSValue[]): Transform => {
    const values = args
        .filter((arg): arg is NumberValueToken => arg.type === TokenType.NUMBER_TOKEN)
        .map((arg) => arg.number);

    if (values.length !== 16) {
        return null;
    }

    // Row-major 3D matrix; only the 2D-relevant components are retained.
    return [at(values, 0), at(values, 1), at(values, 4), at(values, 5), at(values, 12), at(values, 13)];
};

const rotate = (context: Context, args: CSSValue[]): Transform => {
    if (args.length !== 1) {
        return null;
    }

    const arg = at(args, 0);
    let radians = 0;

    if (arg.type === TokenType.NUMBER_TOKEN && arg.number === 0) {
        radians = 0;
    } else if (arg.type === TokenType.DIMENSION_TOKEN) {
        radians = angle.parse(context, arg);
    } else {
        return null;
    }

    const cos = Math.cos(radians);
    const sin = Math.sin(radians);

    return [cos, sin, -sin, cos, 0, 0];
};

const SUPPORTED_TRANSFORM_FUNCTIONS: {
    [key: string]: (context: Context, args: CSSValue[]) => Transform;
} = {
    matrix: matrix,
    matrix3d: matrix3d,
    rotate: rotate
};
