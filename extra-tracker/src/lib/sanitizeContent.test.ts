import { describe, expect, it } from 'vitest';
import sanitizeContent, {
    isContentSafe,
    sanitizeContent as sanitizeContentNamed,
    sanitizeHTML,
} from './sanitizeContent';

describe('lib/sanitizeContent', () => {
    it('returns empty string for nullish/invalid input', () => {
        expect(sanitizeContentNamed('')).toBe('');
        expect(sanitizeContentNamed(null as any)).toBe('');
        expect(sanitizeContentNamed(undefined as any)).toBe('');
    });

    it('removes script/style blocks and dangerous inline patterns', () => {
        const dirty = `
            <script>alert('xss')</script>
            <style>body{display:none}</style>
            <a href="javascript:alert(1)" onclick="steal()">Click</a>
            safe text
        `;
        const clean = sanitizeContentNamed(dirty);

        expect(clean).not.toMatch(/<script/i);
        expect(clean).not.toMatch(/<style/i);
        expect(clean).not.toMatch(/javascript:/i);
        expect(clean).not.toMatch(/on\w+\s*=/i);
        expect(clean).toMatch(/safe text/i);
    });

    it('sanitizeHTML strips disallowed tags while preserving allowed structure', () => {
        const dirty = '<div><strong>Hello</strong><script>alert(1)</script></div>';
        const clean = sanitizeHTML(dirty);

        expect(clean).toContain('<div>');
        expect(clean).toContain('<strong>Hello</strong>');
        expect(clean).not.toContain('<script>');
    });

    it('sanitizeHTML enforces safe link attributes', () => {
        const html = '<a href="https://example.com">Example</a>';
        const clean = sanitizeHTML(html);

        expect(clean).toContain('target="_blank"');
        expect(clean).toContain('rel="noopener noreferrer"');
    });

    it('isContentSafe detects unsafe patterns', () => {
        expect(isContentSafe('plain safe text')).toBe(true);
        expect(isContentSafe('<script>alert(1)</script>')).toBe(false);
        expect(isContentSafe('<a href="javascript:alert(1)">x</a>')).toBe(false);
        expect(isContentSafe('<div onclick="hack()">x</div>')).toBe(false);
        expect(isContentSafe('data:text/html;base64,abcd')).toBe(false);
    });

    it('default export points to sanitizeContent', () => {
        expect(sanitizeContent).toBe(sanitizeContentNamed);
    });
});

