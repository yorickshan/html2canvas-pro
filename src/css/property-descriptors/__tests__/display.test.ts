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

    it('remaining keywords map to their flags', () => {
        const cases: [string, DISPLAY][] = [
            ['-webkit-box', DISPLAY.BLOCK],
            ['run-in', DISPLAY.RUN_IN],
            ['flow', DISPLAY.FLOW],
            ['-ms-grid', DISPLAY.GRID],
            ['ruby', DISPLAY.RUBY],
            ['subgrid', DISPLAY.SUBGRID],
            ['table-row-group', DISPLAY.TABLE_ROW_GROUP],
            ['table-header-group', DISPLAY.TABLE_HEADER_GROUP],
            ['table-footer-group', DISPLAY.TABLE_FOOTER_GROUP],
            ['table-row', DISPLAY.TABLE_ROW],
            ['table-cell', DISPLAY.TABLE_CELL],
            ['table-column-group', DISPLAY.TABLE_COLUMN_GROUP],
            ['table-column', DISPLAY.TABLE_COLUMN],
            ['table-caption', DISPLAY.TABLE_CAPTION],
            ['ruby-base', DISPLAY.RUBY_BASE],
            ['ruby-text', DISPLAY.RUBY_TEXT],
            ['ruby-base-container', DISPLAY.RUBY_BASE_CONTAINER],
            ['ruby-text-container', DISPLAY.RUBY_TEXT_CONTAINER],
            ['contents', DISPLAY.CONTENTS],
            ['inline-list-item', DISPLAY.INLINE_LIST_ITEM],
            ['inline-table', DISPLAY.INLINE_TABLE],
            ['inline-flex', DISPLAY.INLINE_FLEX],
            ['inline-grid', DISPLAY.INLINE_GRID]
        ];
        for (const [value, flag] of cases) {
            expect(parse(value) & flag).toBeTruthy();
        }
    });

    it('combines multiple idents and ignores non-ident tokens', () => {
        expect(parse('block') & DISPLAY.BLOCK).toBeTruthy();
        expect(parse('10px')).toBe(DISPLAY.NONE);
    });
});
