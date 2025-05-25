import { IPropertyValueDescriptor } from '../IPropertyDescriptor';
export type Matrix = [number, number, number, number, number, number];
export type Transform = Matrix | null;
export declare const transform: IPropertyValueDescriptor<Transform>;
