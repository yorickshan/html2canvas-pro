import { IPropertyListDescriptor } from '../IPropertyDescriptor';
export interface COUNTER_RESET {
    counter: string;
    reset: number;
}
export type CounterReset = COUNTER_RESET[];
export declare const counterReset: IPropertyListDescriptor<CounterReset>;
