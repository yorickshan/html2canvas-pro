import { IPropertyListDescriptor } from '../IPropertyDescriptor';
export type BackgroundRepeat = BACKGROUND_REPEAT[];
export declare const enum BACKGROUND_REPEAT {
    REPEAT = 0,
    NO_REPEAT = 1,
    REPEAT_X = 2,
    REPEAT_Y = 3
}
export declare const backgroundRepeat: IPropertyListDescriptor<BackgroundRepeat>;
