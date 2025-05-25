import { IPropertyListDescriptor } from '../IPropertyDescriptor';
import { Color } from '../types/color';
import { Length } from '../types/length';
export type TextShadow = TextShadowItem[];
interface TextShadowItem {
    color: Color;
    offsetX: Length;
    offsetY: Length;
    blur: Length;
}
export declare const textShadow: IPropertyListDescriptor<TextShadow>;
export {};
