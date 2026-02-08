import { describe, expect, it } from 'vitest';
import {timeToMinutes, calculateDurationInHours, generateTimeSlots } from './dateUtils'; // importo tutte le funzioni da testare nel file 


describe('timeToMinutes', () => {
    // Casi validi
    it('converte correttamente l\'orario in minuti (Boundary values)', () => {
        expect(timeToMinutes('00:00')).toBe(0);
        expect(timeToMinutes('00:01')).toBe(1);
        expect(timeToMinutes('12:00')).toBe(720);
        expect(timeToMinutes('23:58')).toBe(1438);
        expect(timeToMinutes('23:59')).toBe(1439);
    });

    // Casi di errore (Robustezza del Formato)
    it('lancia errore per formati non validi o incompleti', () => {
        const invalidFormats = [
            '',             // Vuoto
            ' ',            // Spazio
            '12:0',         // Minuti incompleti
            '1:00',         // Ore incomplete
            '12:000',       // Troppe cifre minuti
            '123:00',       // Troppe cifre ore
            '12.00',        // Separatore errato
            '12-00',        // Separatore errato
            '12 00',        // Separatore errato
            '12:00:00',     // Troppi segmenti
            'ab:cd',        // Lettere
            '12:0a',        // Alfanumerico
            '🕐:00',        // Emoji
        ];

        invalidFormats.forEach(format => {
            expect(() => timeToMinutes(format)).toThrow(/Formato non valido/);
        });
    });

    it('accetta spazi bianchi laterali (trimming automatico)', () => {
        expect(timeToMinutes(' 12:00')).toBe(720);
        expect(timeToMinutes('12:00 ')).toBe(720);
    });

    // casi di errore (Logica e Range) 
    it('lancia errore per orari fuori range (00:00 - 23:59)', () => {
        expect(() => timeToMinutes('24:00')).toThrow("Le ore devono essere tra 00 e 23");
        expect(() => timeToMinutes('25:00')).toThrow("Le ore devono essere tra 00 e 23");
        expect(() => timeToMinutes('12:60')).toThrow("I minuti devono essere tra 00 e 59");
        expect(() => timeToMinutes('12:99')).toThrow("I minuti devono essere tra 00 e 59");
    });

    // Casi estremi di tipo (per JS/TS bypass)
    it('gestisce input non stringa in modo sicuro', () => {
        expect(() => timeToMinutes(null as any)).toThrow();
        expect(() => timeToMinutes(undefined as any)).toThrow();
        expect(() => timeToMinutes(1200 as any)).toThrow();
    });
});

//! TEST FUNZIONALITA' CALCOLA DURATA IN ORE 
describe('calculateDurationInHours', () => {
    // Caso Standard
    it('calcola la durata nello stesso giorno', () => {
        // 09:00 -> 17:00 = 8 ore
        expect(calculateDurationInHours('09:00', '17:00')).toBe(8);
        
        // 09:30 -> 11:00 = 1.5 ore
        expect(calculateDurationInHours('09:30', '11:00')).toBe(1.5);
    });

    // Caso Midnight Crossing (Il tuo problema)
    it('gestisce correttamente il passaggio alla notte successiva', () => {
        // 23:00 -> 01:00 = 2 ore
        // Calcolo interno: (60 + 1440) - 1380 = 120min = 2h
        expect(calculateDurationInHours('23:00', '01:00')).toBe(2);

        // 22:00 -> 06:00 = 8 ore
        expect(calculateDurationInHours('22:00', '06:00')).toBe(8);
        
        // 18:00 -> 02:30 = 8.5 ore
        expect(calculateDurationInHours('18:00', '02:30')).toBe(8.5);
    });

    // Casi Limite
    it('restituisce 0 se inizio e fine coincidono', () => {
        expect(calculateDurationInHours('12:00', '12:00')).toBe(0);
    });
    
    // Opzionale: Testiamo che non accetti turni > 24 ore (limite di questa logica)
    // Se faccio 09:00 -> 08:00 il sistema capisce 23 ore, che è corretto per questa logica.
    it('calcola quasi 24 ore se la fine è un minuto prima dell\'inizio', () => {
        // 09:00 -> 08:59 = 23 ore e 59 minuti
        expect(calculateDurationInHours('09:00', '08:59')).toBeCloseTo(23.98, 2);
    });

});

//! FUNZIONE per GENERARE GLI SLOT TEMPORALI
describe('generateTimeSlots', () => {
    it('genera correttamente gli slot di 30 minuti per 24 ore', () => {
        const slots = generateTimeSlots();
        expect(slots).toHaveLength(48); // 24 ore * 2 slot/ora = 48 slot
        expect(slots[0]).toBe('00:00');
        expect(slots[1]).toBe('00:30');
        expect(slots[46]).toBe('23:00');
        expect(slots[47]).toBe('23:30');
    });

    it('tutti gli slot devono seguire il formato HH:MM', () => {
        const slots = generateTimeSlots();
        const timeRegex = /^\d{2}:\d{2}$/;
        slots.forEach(slot => {
            expect(slot).toMatch(timeRegex);
        });
    });

    it('non devono esserci duplicati negli slot generati', () => {
        const slots = generateTimeSlots();
        const uniqueSlots = new Set(slots);
        expect(uniqueSlots.size).toBe(slots.length);
    });

    it('gli slot devono essere in ordine cronologico', () => {
        const slots = generateTimeSlots();
        const minutes = slots.map(timeToMinutes);
        for (let i = 0; i < minutes.length - 1; i++) {
            expect(minutes[i+1]).toBeGreaterThan(minutes[i]);
        }
    });

    it('deve contenere esattamente due slot per ogni ora', () => {
        const slots = generateTimeSlots();
        for (let hour = 0; hour < 24; hour++) {
            const hourStr = hour.toString().padStart(2, '0');
            const slotsForHour = slots.filter(s => s.startsWith(`${hourStr}:`));
            expect(slotsForHour).toHaveLength(2);
            expect(slotsForHour).toContain(`${hourStr}:00`);
            expect(slotsForHour).toContain(`${hourStr}:30`);
        }
    });
});
