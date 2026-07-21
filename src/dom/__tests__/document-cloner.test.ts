import { describe, it, expect } from 'vitest';
import { copyCSSStyles, serializeDoctype, DocumentCloner } from '../document-cloner';

describe('copyCSSStyles', () => {
    it('copies basic style properties', () => {
        const div = document.createElement('div');
        div.style.cssText = 'color: red; font-size: 16px;';
        const target = document.createElement('div');
        const result = copyCSSStyles(div.style, target);
        expect(result.style.color).toBe('red');
        expect(result.style.fontSize).toBe('16px');
    });

    it('ignores the "all" property', () => {
        const div = document.createElement('div');
        div.style.cssText = 'all: initial; color: red;';
        const target = document.createElement('div');
        const result = copyCSSStyles(div.style, target);
        expect(result.style.all).toBe('');
        expect(result.style.color).toBe('red');
    });

    it('ignores the "d" property (SVG path)', () => {
        const div = document.createElement('div');
        div.style.cssText = 'd: path("M0 0"); color: red;';
        const target = document.createElement('div');
        const result = copyCSSStyles(div.style, target);
        expect(result.style.color).toBe('red');
    });

    it('ignores the "content" property', () => {
        const div = document.createElement('div');
        div.style.cssText = 'content: "x"; color: red;';
        const target = document.createElement('div');
        const result = copyCSSStyles(div.style, target);
        expect(result.style.content).toBe('');
        expect(result.style.color).toBe('red');
    });

    it('skips CSS custom properties (--*)', () => {
        const div = document.createElement('div');
        div.style.setProperty('--my-var', '42');
        div.style.color = 'red';
        const target = document.createElement('div');
        const result = copyCSSStyles(div.style, target);
        // --my-var should be skipped, color should be copied
        expect(result.style.getPropertyValue('--my-var')).toBe('');
        expect(result.style.color).toBe('red');
    });

    it('preserves !important priority', () => {
        const div = document.createElement('div');
        div.style.setProperty('color', 'red', 'important');
        const target = document.createElement('div');
        const result = copyCSSStyles(div.style, target);
        expect(result.style.getPropertyPriority('color')).toBe('important');
    });
});

describe('serializeDoctype', () => {
    it('returns empty string for null doctype', () => {
        expect(serializeDoctype(null)).toBe('');
    });

    it('serializes HTML5 doctype', () => {
        const doctype = document.implementation.createDocumentType('html', '', '');
        const result = serializeDoctype(doctype);
        expect(result).toBe('<!DOCTYPE html>');
    });

    it('serializes doctype with publicId and systemId', () => {
        const doctype = document.implementation.createDocumentType(
            'html',
            '-//W3C//DTD HTML 4.01//EN',
            'http://www.w3.org/TR/html4/strict.dtd'
        );
        const result = serializeDoctype(doctype);
        expect(result).toContain('<!DOCTYPE html');
        expect(result).toContain('PUBLIC');
        expect(result).toContain('-//W3C//DTD HTML 4.01//EN');
    });
});

describe('DocumentCloner.destroy', () => {
    it('removes container from DOM and returns true', () => {
        const iframe = document.createElement('iframe');
        document.body.appendChild(iframe);
        expect(DocumentCloner.destroy(iframe)).toBe(true);
        expect(iframe.parentNode).toBeNull();
    });

    it('returns false when container has no parent', () => {
        const iframe = document.createElement('iframe');
        expect(DocumentCloner.destroy(iframe)).toBe(false);
    });
});
