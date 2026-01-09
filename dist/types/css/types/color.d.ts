import { ITypeDescriptor } from '../ITypeDescriptor';
import { Context } from '../../core/context';
export type Color = number;
export declare const color: ITypeDescriptor<Color>;
export declare const parseColor: (context: Context, value: string) => Color;
export declare const COLORS: {
    [key: string]: Color;
};
