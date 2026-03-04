/**
 * WheelDatePicker – Selezione data a rotella stile iOS
 * Tre colonne: giorno, mese (italiano), anno. Stile tema progetto.
 */

import React, { useMemo, useCallback, useEffect } from 'react';
import Picker from 'react-mobile-picker';
import type { PickerValue } from 'react-mobile-picker';

const MONTHS_IT = [
    { value: '01', label: 'gen' }, { value: '02', label: 'feb' }, { value: '03', label: 'mar' },
    { value: '04', label: 'apr' }, { value: '05', label: 'mag' }, { value: '06', label: 'giu' },
    { value: '07', label: 'lug' }, { value: '08', label: 'ago' }, { value: '09', label: 'set' },
    { value: '10', label: 'ott' }, { value: '11', label: 'nov' }, { value: '12', label: 'dic' },
];

function getDaysInMonth(year: number, month: number): number {
    return new Date(year, month, 0).getDate();
}

function pad(n: number): string {
    return n < 10 ? `0${n}` : `${n}`;
}

export interface WheelDatePickerValue {
    [key: string]: string;
    day: string;
    month: string;
    year: string;
}

function valueToIso(v: WheelDatePickerValue): string {
    return `${v.year}-${v.month}-${v.day}`;
}

function isoToValue(iso: string): WheelDatePickerValue {
    if (!iso || iso.length < 10) {
        const d = new Date();
        d.setMonth(d.getMonth() + 3);
        d.setDate(10);
        return {
            day: pad(d.getDate()),
            month: pad(d.getMonth() + 1),
            year: String(d.getFullYear()),
        };
    }
    const [y, m, d] = iso.split('-');
    return { day: d!, month: m!, year: y! };
}

interface WheelDatePickerProps {
    value: string; // ISO YYYY-MM-DD
    onChange: (iso: string) => void;
    className?: string;
}

export const WheelDatePicker: React.FC<WheelDatePickerProps> = ({
    value,
    onChange,
    className = '',
}) => {
    const pickerValue = useMemo(() => isoToValue(value), [value]);

    const years = useMemo(() => {
        const current = new Date().getFullYear();
        return Array.from({ length: 6 }, (_, i) => String(current + i));
    }, []);

    const dayOptions = useMemo(() => {
        const y = parseInt(pickerValue.year, 10);
        const m = parseInt(pickerValue.month, 10) - 1;
        const max = getDaysInMonth(y, m + 1);
        return Array.from({ length: max }, (_, i) => pad(i + 1));
    }, [pickerValue.year, pickerValue.month]);

    const clampDay = useCallback((v: WheelDatePickerValue): WheelDatePickerValue => {
        const y = parseInt(v.year, 10);
        const m = parseInt(v.month, 10) - 1;
        const max = getDaysInMonth(y, m + 1);
        const dayNum = parseInt(v.day, 10);
        const clamped = Math.min(max, Math.max(1, dayNum));
        return { ...v, day: pad(clamped) };
    }, []);

    const handleChange = useCallback(
        (newVal: PickerValue) => {
            const typedValue: WheelDatePickerValue = {
                day: String(newVal.day),
                month: String(newVal.month),
                year: String(newVal.year),
            };
            const clamped = clampDay(typedValue);
            onChange(valueToIso(clamped));
        },
        [onChange, clampDay],
    );

    useEffect(() => {
        if (!dayOptions.includes(pickerValue.day)) {
            const clamped = clampDay(pickerValue);
            onChange(valueToIso(clamped));
        }
    }, [dayOptions, pickerValue, clampDay, onChange]);

    return (
        <div className={`wheel-date-picker ${className}`}>
            <Picker
                value={pickerValue}
                onChange={(newVal) => handleChange(newVal)}
                height={220}
                itemHeight={44}
                wheelMode="natural"
            >
                <Picker.Column key="day" name="day">
                    {dayOptions.map((d) => (
                        <Picker.Item key={d} value={d}>
                            {({ selected }) => (
                                <span
                                    className={`wheel-date-picker-item ${selected ? 'wheel-date-picker-item--selected' : ''}`}
                                >
                                    {parseInt(d, 10)}
                                </span>
                            )}
                        </Picker.Item>
                    ))}
                </Picker.Column>
                <Picker.Column key="month" name="month">
                    {MONTHS_IT.map(({ value: v, label }) => (
                        <Picker.Item key={v} value={v}>
                            {({ selected }) => (
                                <span
                                    className={`wheel-date-picker-item ${selected ? 'wheel-date-picker-item--selected' : ''}`}
                                >
                                    {label}
                                </span>
                            )}
                        </Picker.Item>
                    ))}
                </Picker.Column>
                <Picker.Column key="year" name="year">
                    {years.map((y) => (
                        <Picker.Item key={y} value={y}>
                            {({ selected }) => (
                                <span
                                    className={`wheel-date-picker-item ${selected ? 'wheel-date-picker-item--selected' : ''}`}
                                >
                                    {y}
                                </span>
                            )}
                        </Picker.Item>
                    ))}
                </Picker.Column>
            </Picker>
        </div>
    );
};
