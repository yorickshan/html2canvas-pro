import { describe, it, expect } from 'vitest';
import { isDebugging, DebuggerType } from '../debugger';

describe('isDebugging', () => {
    it('returns true when element has matching data attribute', () => {
        const el = document.createElement('div');
        el.setAttribute('data-html2canvas-debug', 'all');
        expect(isDebugging(el, DebuggerType.ALL)).toBe(true);
    });

    it('returns true for clone debug type', () => {
        const el = document.createElement('div');
        el.setAttribute('data-html2canvas-debug', 'clone');
        expect(isDebugging(el, DebuggerType.CLONE)).toBe(true);
    });

    it('returns true for parse debug type', () => {
        const el = document.createElement('div');
        el.setAttribute('data-html2canvas-debug', 'parse');
        expect(isDebugging(el, DebuggerType.PARSE)).toBe(true);
    });

    it('returns true for render debug type', () => {
        const el = document.createElement('div');
        el.setAttribute('data-html2canvas-debug', 'render');
        expect(isDebugging(el, DebuggerType.RENDER)).toBe(true);
    });

    it('returns false when element has no debug attribute', () => {
        const el = document.createElement('div');
        expect(isDebugging(el, DebuggerType.ALL)).toBe(false);
    });

    it('returns false when debug type does not match', () => {
        const el = document.createElement('div');
        el.setAttribute('data-html2canvas-debug', 'clone');
        expect(isDebugging(el, DebuggerType.RENDER)).toBe(false);
    });

    it('returns true for any type when ALL is set', () => {
        const el = document.createElement('div');
        el.setAttribute('data-html2canvas-debug', 'all');
        expect(isDebugging(el, DebuggerType.CLONE)).toBe(true);
        expect(isDebugging(el, DebuggerType.PARSE)).toBe(true);
        expect(isDebugging(el, DebuggerType.RENDER)).toBe(true);
    });

    it('returns false for unknown debug attribute value', () => {
        const el = document.createElement('div');
        el.setAttribute('data-html2canvas-debug', 'unknown');
        expect(isDebugging(el, DebuggerType.ALL)).toBe(false);
    });

    it('returns false when getAttribute is not a function', () => {
        const el = {} as Element;
        expect(isDebugging(el, DebuggerType.ALL)).toBe(false);
    });
});

describe('DebuggerType const enum', () => {
    it('has distinct numeric values', () => {
        expect(DebuggerType.NONE).not.toBe(DebuggerType.ALL);
        expect(DebuggerType.ALL).not.toBe(DebuggerType.CLONE);
        expect(DebuggerType.CLONE).not.toBe(DebuggerType.PARSE);
        expect(DebuggerType.PARSE).not.toBe(DebuggerType.RENDER);
    });

    it('NONE is 0', () => {
        expect(DebuggerType.NONE).toBe(0);
    });

    it('ALL is 1', () => {
        expect(DebuggerType.ALL).toBe(1);
    });
});
