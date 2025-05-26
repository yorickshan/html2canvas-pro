import { IPropertyListDescriptor } from '../IPropertyDescriptor';
export declare const enum OBJECT_FIT {
    FILL = 0,
    CONTAIN = 2,
    COVER = 4,
    NONE = 8,
    SCALE_DOWN = 16
}
export type ObjectFit = number;
export declare const objectFit: IPropertyListDescriptor<ObjectFit>;
