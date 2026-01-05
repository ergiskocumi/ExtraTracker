/**
 * 🔍 SETTINGS SEARCH - Ricerca avanzata nelle impostazioni
 * 
 * Permette di cercare velocemente qualsiasi impostazione
 */

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Search, ArrowRight } from 'lucide-react';

interface SearchableItem {
    id: string;
    label: string;
    description: string;
    category: 'profile' | 'preferences' | 'security' | 'account';
    keywords: string[];
}

const searchableItems: SearchableItem[] = [
    // Profile
    { id: 'firstName', label: 'Nome', description: 'Il tuo nome', category: 'profile', keywords: ['nome', 'name', 'first'] },
    { id: 'lastName', label: 'Cognome', description: 'Il tuo cognome', category: 'profile', keywords: ['cognome', 'surname', 'last'] },
    { id: 'displayName', label: 'Nome visualizzato', description: 'Come vuoi essere chiamato', category: 'profile', keywords: ['display', 'visualizzato', 'nickname'] },
    { id: 'phone', label: 'Telefono', description: 'Numero di telefono', category: 'profile', keywords: ['telefono', 'phone', 'cellulare'] },
    { id: 'company', label: 'Azienda', description: 'Nome azienda', category: 'profile', keywords: ['azienda', 'company', 'lavoro'] },
    { id: 'bio', label: 'Bio', description: 'Descrizione personale', category: 'profile', keywords: ['bio', 'descrizione', 'about'] },
    
    // Preferences
    { id: 'language', label: 'Lingua', description: 'Lingua dell\'interfaccia', category: 'preferences', keywords: ['lingua', 'language', 'idioma'] },
    { id: 'theme', label: 'Tema', description: 'Tema scuro o chiaro', category: 'preferences', keywords: ['tema', 'theme', 'dark', 'light'] },
    { id: 'currency', label: 'Valuta', description: 'Valuta predefinita', category: 'preferences', keywords: ['valuta', 'currency', 'euro', 'dollar'] },
    { id: 'timeFormat', label: 'Formato ora', description: 'Formato 12h o 24h', category: 'preferences', keywords: ['ora', 'time', 'formato'] },
    { id: 'defaultView', label: 'Vista predefinita', description: 'Pagina iniziale', category: 'preferences', keywords: ['vista', 'view', 'dashboard', 'home'] },
    
    // Security
    { id: 'password', label: 'Password', description: 'Cambia password', category: 'security', keywords: ['password', 'sicurezza', 'security'] },
    
    // Account
    { id: 'export', label: 'Esporta dati', description: 'Scarica i tuoi dati', category: 'account', keywords: ['export', 'esporta', 'dati', 'data'] },
    { id: 'delete', label: 'Elimina account', description: 'Rimuovi account permanentemente', category: 'account', keywords: ['delete', 'elimina', 'rimuovi', 'account'] },
];

interface SettingsSearchProps {
    onSelect: (category: string, itemId?: string) => void;
    isOpen: boolean;
    onClose: () => void;
}

export const SettingsSearch = ({ onSelect, isOpen, onClose }: SettingsSearchProps) => {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    const filteredItems = query.trim()
        ? searchableItems.filter(item =>
            item.label.toLowerCase().includes(query.toLowerCase()) ||
            item.description.toLowerCase().includes(query.toLowerCase()) ||
            item.keywords.some(kw => kw.toLowerCase().includes(query.toLowerCase()))
        )
        : [];

    const groupedResults = filteredItems.reduce((acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
    }, {} as Record<string, SearchableItem[]>);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            if (e.key === 'Escape') {
                onClose();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => Math.min(prev + 1, filteredItems.length - 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => Math.max(prev - 1, 0));
            } else if (e.key === 'Enter' && filteredItems[selectedIndex]) {
                e.preventDefault();
                const item = filteredItems[selectedIndex];
                onSelect(item.category, item.id);
                setQuery('');
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, filteredItems, selectedIndex, onSelect, onClose]);

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-2xl rounded-3xl border border-white/[0.15] bg-white/[0.06] backdrop-blur-xl shadow-2xl overflow-hidden card"
            >
                {/* Search Input */}
                <div className="flex items-center gap-3 p-4 border-b border-white/[0.1]">
                    <Search className="w-5 h-5 text-white/50" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setSelectedIndex(0);
                        }}
                        placeholder="Cerca impostazioni... (es. password, tema, lingua)"
                        className="flex-1 bg-transparent text-white placeholder-white/40 focus:outline-none text-lg"
                    />
                    <div className="flex items-center gap-2 text-xs text-white/40">
                        <kbd className="px-2 py-1 rounded bg-white/[0.1] border border-white/[0.1]">Esc</kbd>
                        <span>per chiudere</span>
                    </div>
                </div>

                {/* Results */}
                <div className="max-h-96 overflow-y-auto custom-scrollbar">
                    {query.trim() && filteredItems.length === 0 ? (
                        <div className="p-8 text-center">
                            <p className="text-white/60">Nessun risultato trovato</p>
                            <p className="text-sm text-white/40 mt-2">Prova con altri termini</p>
                        </div>
                    ) : query.trim() && filteredItems.length > 0 ? (
                        <div className="p-2">
                            {Object.entries(groupedResults).map(([category, items]) => (
                                <div key={category} className="mb-4">
                                    <p className="text-xs font-semibold text-white/40 uppercase tracking-wider px-3 py-2">
                                        {category === 'profile' && 'Profilo'}
                                        {category === 'preferences' && 'Preferenze'}
                                        {category === 'security' && 'Sicurezza'}
                                        {category === 'account' && 'Account'}
                                    </p>
                                    {items.map((item) => {
                                        const globalIndex = filteredItems.indexOf(item);
                                        const isSelected = globalIndex === selectedIndex;
                                        
                                        return (
                                            <motion.button
                                                key={item.id}
                                                onClick={() => {
                                                    onSelect(item.category, item.id);
                                                    setQuery('');
                                                    onClose();
                                                }}
                                                onMouseEnter={() => setSelectedIndex(globalIndex)}
                                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${
                                                    isSelected
                                                        ? 'bg-primary-500/20 border border-primary-500/30'
                                                        : 'hover:bg-white/[0.05]'
                                                }`}
                                            >
                                                <div className="flex-1">
                                                    <p className="text-sm font-semibold text-white">{item.label}</p>
                                                    <p className="text-xs text-white/60 mt-0.5">{item.description}</p>
                                                </div>
                                                {isSelected && (
                                                    <ArrowRight className="w-4 h-4 text-primary-400" />
                                                )}
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-8 text-center">
                            <Search className="w-12 h-12 text-white/20 mx-auto mb-4" />
                            <p className="text-white/60 mb-2">Cerca nelle impostazioni</p>
                            <p className="text-sm text-white/40">
                                Inizia a digitare per cercare qualsiasi impostazione
                            </p>
                            <div className="mt-6 flex flex-wrap gap-2 justify-center">
                                {['password', 'tema', 'lingua', 'esporta'].map((suggestion) => (
                                    <button
                                        key={suggestion}
                                        onClick={() => setQuery(suggestion)}
                                        className="px-3 py-1.5 rounded-lg bg-white/[0.05] text-white/60 hover:bg-white/[0.1] hover:text-white text-sm transition-colors"
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
};
