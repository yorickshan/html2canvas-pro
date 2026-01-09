import { IPropertyListDescriptor } from '../IPropertyDescriptor';
import { LengthPercentageTuple } from '../types/length-percentage';
export type BackgroundPosition = BackgroundImagePosition[];
export type BackgroundImagePosition = LengthPercentageTuple;
export declare const backgroundPosition: IPropertyListDescriptor<BackgroundPosition>;
