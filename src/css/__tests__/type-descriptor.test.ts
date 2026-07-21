import { describe, it, expect } from 'vitest';
import { Context } from '../../core/context';
import type { ITypeDescriptor } from '../type-descriptor';
import type { CSSValue } from '../syntax/parser';

describe('ITypeDescriptor interface contract', () => {
    it('can be implemented with name, parse, and optional format', () => {
        const desc: ITypeDescriptor<number> = {
            name: 'test-type',
            parse: (_ctx: Context, _value: CSSValue) => 42
        };

        expect(desc.name).toBe('test-type');
        expect(typeof desc.parse).toBe('function');
    });

    it('parse method receives context and CSSValue', () => {
        let capturedContext: Context | null = null;
        let capturedValue: CSSValue | null = null;

        const desc: ITypeDescriptor<string> = {
            name: 'capture-test',
            parse: (ctx: Context, value: CSSValue) => {
                capturedContext = ctx;
                capturedValue = value;
                return '';
            }
        };

        const mockCtx = {} as Context;
        const mockValue = { type: 0, value: 'test' } as CSSValue;

        desc.parse(mockCtx, mockValue);
        expect(capturedContext).toBe(mockCtx);
        expect(capturedValue).toBe(mockValue);
    });
});
