import { describe, it, expect } from 'vitest';
import { display, DISPLAY } from '../display';
import { Parser } from '../../syntax/parser';

const parse = (value: string) => display.parse(null!, Parser.parseValues(value));

describe('display', () => {
    it('block', () => {
        expect(parse('block') & DISPLAY.BLOCK).toBeTruthy();
    });

    it('inline', () => {
        expect(parse('inline') & DISPLAY.INLINE).toBeTruthy();
    });

    it('flex', () => {
        expect(parse('flex') & DISPLAY.FLEX).toBeTruthy();
    });

    it('-webkit-flex alias', () => {
        expect(parse('-webkit-flex') & DISPLAY.FLEX).toBeTruthy();
    });

    it('grid', () => {
        expect(parse('grid') & DISPLAY.GRID).toBeTruthy();
    });

    it('inline-block', () => {
        const result = parse('inline-block');
        expect(result & DISPLAY.INLINE_BLOCK).toBeTruthy();
    });

    it('inline-flex', () => {
        const result = parse('inline-flex');
        expect(result & DISPLAY.INLINE_FLEX).toBeTruthy();
    });

    it('inline-grid', () => {
        const result = parse('inline-grid');
        expect(result & DISPLAY.INLINE_GRID).toBeTruthy();
    });

    it('none', () => {
        expect(parse('none')).toBe(DISPLAY.NONE);
    });

    it('table', () => {
        expect(parse('table') & DISPLAY.TABLE).toBeTruthy();
    });

    it('list-item', () => {
        expect(parse('list-item') & DISPLAY.LIST_ITEM).toBeTruthy();
    });

    it('unknown display value returns NONE', () => {
        expect(parse('unknown-display')).toBe(DISPLAY.NONE);
    });

    it('flow-root', () => {
        expect(parse('flow-root') & DISPLAY.FLOW_ROOT).toBeTruthy();
    });
});
