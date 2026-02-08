import { describe, it, expect } from 'vitest';
import {
    preprocessMarkdown,
    plainTextToMarkdown,
    markdownOptions,
    markdownOptionsNoLatex,
    validateLaTeX,
    extractLaTeXFormulas,
    validateAllFormulas,
    hasLaTeX,
    fixIncompleteLaTeX,
    preprocessMathContent,
    wrapMathExpressions,
    containsMathExpressions,
} from '../CardContentRenderer/parser';

describe('CardContentRenderer parser - markdown', () => {
    it('normalizes markdown content', () => {
        const input = 'A\r\nB\rC\tD  \n\n\n\nE  ';
        const output = preprocessMarkdown(input);

        expect(output).toBe('A\nB\nC    D\n\nE');
    });

    it('returns empty string for empty markdown input', () => {
        expect(preprocessMarkdown('')).toBe('');
        expect(preprocessMarkdown('' as string)).toBe('');
    });

    it('converts single newlines to markdown line breaks but preserves lists/headings', () => {
        expect(plainTextToMarkdown('riga1\nriga2')).toBe('riga1  \nriga2');
        expect(plainTextToMarkdown('intro\n- item')).toBe('intro\n- item');
        expect(plainTextToMarkdown('intro\n# titolo')).toBe('intro\n# titolo');
        expect(plainTextToMarkdown('a\n\nb')).toBe('a\n\nb');
    });

    it('exposes markdown configurations', () => {
        expect(markdownOptions.remarkPlugins.length).toBeGreaterThan(0);
        expect(markdownOptions.rehypePlugins.length).toBeGreaterThan(0);
        expect(markdownOptionsNoLatex.remarkPlugins.length).toBe(1);
        expect(markdownOptionsNoLatex.rehypePlugins.length).toBe(0);
    });
});

describe('CardContentRenderer parser - latex validator', () => {
    it('accepts empty and valid formulas', () => {
        expect(validateLaTeX('').isValid).toBe(true);
        expect(validateLaTeX('x^2 + y^2 = z^2').isValid).toBe(true);
    });

    it('rejects unbalanced braces and parentheses', () => {
        const unmatchedClosing = validateLaTeX('x + }');
        expect(unmatchedClosing.isValid).toBe(false);
        expect(unmatchedClosing.errorMessage).toContain('senza corrispondente');

        const unmatchedOpening = validateLaTeX('\\frac{1}{2');
        expect(unmatchedOpening.isValid).toBe(false);
        expect(unmatchedOpening.errorMessage).toContain('non chiusa');

        const unmatchedParen = validateLaTeX('x + )');
        expect(unmatchedParen.isValid).toBe(false);
        expect(unmatchedParen.errorMessage).toContain('Parentesi ")"');
    });

    it('rejects common latex errors and problematic chars', () => {
        const incompleteFraction = validateLaTeX('\\frac{1}');
        expect(incompleteFraction.isValid).toBe(false);
        expect(incompleteFraction.errorMessage).toContain('Frazione incompleta');

        const incompleteCommand = validateLaTeX('\\alpha ');
        expect(incompleteCommand.isValid).toBe(false);
        expect(incompleteCommand.errorMessage).toContain('Comando senza argomento');

        const problematicChars = validateLaTeX('x < y > z');
        expect(problematicChars.isValid).toBe(false);
        expect(problematicChars.errorMessage).toContain('non supportati');
        expect(problematicChars.suggestion).toContain('\\lt');
        expect(problematicChars.suggestion).toContain('\\gt');
    });

    it('extracts inline and block formulas in order', () => {
        const content = 'Block $$E=mc^2$$ poi $x+1$ e $y$';
        const formulas = extractLaTeXFormulas(content);

        expect(formulas).toHaveLength(3);
        expect(formulas[0]).toMatchObject({ formula: 'E=mc^2', isBlock: true });
        expect(formulas[1]).toMatchObject({ formula: 'x+1', isBlock: false });
        expect(formulas[2]).toMatchObject({ formula: 'y', isBlock: false });
        expect(formulas[0].startIndex).toBeLessThan(formulas[1].startIndex);
    });

    it('validates all formulas in a text', () => {
        const report = validateAllFormulas('ok $x+1$ bad $\\frac{1}$');
        expect(report).toHaveLength(2);
        expect(report[0].validation.isValid).toBe(true);
        expect(report[1].validation.isValid).toBe(false);
    });

    it('detects latex presence', () => {
        expect(hasLaTeX('')).toBe(false);
        expect(hasLaTeX('plain text')).toBe(false);
        expect(hasLaTeX('formula $x+1$')).toBe(true);
    });

    it('fixes incomplete latex delimiters', () => {
        expect(fixIncompleteLaTeX(null as unknown as string)).toBe('');
        expect(fixIncompleteLaTeX('Eq $$x+1')).toBe('Eq $$x+1$$');
        expect(fixIncompleteLaTeX('Eq $$x+1\nNext line')).toBe('Eq $$x+1$$\nNext line');
        expect(fixIncompleteLaTeX('Value $x^2 test')).toBe('Value $x^2$ test');
        expect(fixIncompleteLaTeX('Ok $x$ and $$y$$')).toBe('Ok $x$ and $$y$$');
    });
});

describe('CardContentRenderer parser - math detector', () => {
    it('handles guards and passthrough cases', () => {
        expect(preprocessMathContent(null as unknown as string)).toBe('');
        expect(preprocessMathContent('Testo normale')).toBe('Testo normale');
        expect(preprocessMathContent('Già latex $x+1$')).toBe('Già latex $x+1$');
    });

    it('detects and wraps equations as block math', () => {
        const wrapped = preprocessMathContent('La formula V = (1+i)^n.');
        expect(wrapped).toContain('$$V = (1+i)^n$$');
    });

    it('terminates equation parsing on semicolon and explanatory clauses', () => {
        const semicolon = preprocessMathContent('M = a+b; testo finale');
        expect(semicolon).toContain('$$M = a+b$$');
        expect(semicolon).toContain('; testo finale');

        const explanatory = preprocessMathContent('M = a+b, dove n è il numero di periodi.');
        expect(explanatory).toContain('$$M = a+b$$');
        expect(explanatory).toContain(', dove n è il numero di periodi.');
    });

    it('continues equation parsing across comma when another equation follows', () => {
        const chained = preprocessMathContent('M = a+b, N = c+d.');
        expect(chained).toContain('$$M = a+b, N = c+d$$');
    });

    it('wraps isolated math expressions inline', () => {
        const isolated = preprocessMathContent('Il valore (1+i)^n cresce nel tempo');
        expect(isolated).toContain('$(1+i)^n$');
    });

    it('keeps non-significant equations unchanged', () => {
        const unchanged = preprocessMathContent('x=. testo');
        expect(unchanged).toContain('x=.');
        expect(unchanged).not.toContain('$$x=');
    });

    it('detects math patterns and supports legacy wrapper alias', () => {
        expect(containsMathExpressions('')).toBe(false);
        expect(containsMathExpressions('a_{n|i} + 1')).toBe(true);
        expect(containsMathExpressions('\\frac{1}{2}')).toBe(true);
        expect(containsMathExpressions('V = 10')).toBe(true);

        const legacy = wrapMathExpressions('V = a+b.');
        expect(legacy).toContain('$$V = a+b$$');
    });
});
