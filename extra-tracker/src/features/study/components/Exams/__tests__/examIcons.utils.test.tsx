import { describe, expect, it } from 'vitest';
import {
    detectSubject,
    getExamColors,
    getExamIcon,
} from '../utils/examIcons';

describe('examIcons utilities', () => {
    it('detects Matematica from title keywords', () => {
        const subject = detectSubject('Analisi Matematica 1');
        expect(subject.name).toBe('Matematica');
        expect(subject.color).toBe('text-blue-400');
    });

    it('detects Informatica from description keywords (case-insensitive)', () => {
        const subject = detectSubject('Esame finale', 'Corso di PROGRAMMING e javascript moderno');
        expect(subject.name).toBe('Informatica');
    });

    it('falls back to Generale when no keyword matches', () => {
        const subject = detectSubject('ZXQW QWZX', 'QWZX ZXQW');
        expect(subject.name).toBe('Generale');
        expect(subject.color).toBe('text-primary-400');
    });

    it('resolves ties by keeping first matching subject in config order', () => {
        const subject = detectSubject('math e coding');
        expect(subject.name).toBe('Matematica');
    });

    it('getExamIcon returns the same icon resolved by detectSubject', () => {
        const subject = detectSubject('Corso di chimica organica');
        const icon = getExamIcon('Corso di chimica organica');
        expect(icon).toBe(subject.icon);
    });

    it('getExamColors returns subject visual palette', () => {
        const colors = getExamColors('Introduzione alla psicologia clinica');
        expect(colors).toEqual({
            color: 'text-purple-400',
            bgColor: 'bg-purple-500/20',
            borderColor: 'border-purple-500/40',
        });
    });
});
