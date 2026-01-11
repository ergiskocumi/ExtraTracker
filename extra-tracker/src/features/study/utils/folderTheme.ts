/**
 * 🎨 FOLDER THEME UTILITY
 * 
 * Genera temi visivi (colori, gradienti, icone) per le cartelle
 * basati sul loro nome e contenuto.
 */

// Palette di colori per categorie comuni
const CATEGORY_THEMES: Record<string, { gradient: string; icon: string; color: string }> = {
    programmazione: {
        gradient: 'linear-gradient(135deg, #6A0DAD 0%, #8A2BE2 100%)',
        icon: '🧩',
        color: '#8A2BE2',
    },
    matematica: {
        gradient: 'linear-gradient(135deg, #00B4D8 0%, #0077B6 100%)',
        icon: '📚',
        color: '#0077B6',
    },
    fisica: {
        gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
        icon: '⚛️',
        color: '#059669',
    },
    chimica: {
        gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
        icon: '🧪',
        color: '#D97706',
    },
    storia: {
        gradient: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
        icon: '📜',
        color: '#B91C1C',
    },
    inglese: {
        gradient: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
        icon: '🇬🇧',
        color: '#2563EB',
    },
    javascript: {
        gradient: 'linear-gradient(135deg, #F7DF1E 0%, #F0DB4F 100%)',
        icon: '📌',
        color: '#F0DB4F',
    },
    python: {
        gradient: 'linear-gradient(135deg, #3776AB 0%, #306998 100%)',
        icon: '🐍',
        color: '#306998',
    },
    java: {
        gradient: 'linear-gradient(135deg, #ED8B00 0%, #F89820 100%)',
        icon: '☕',
        color: '#F89820',
    },
};

// Icone per cartelle generiche
const GENERIC_ICONS = ['📁', '📂', '🗂️', '📋', '📑', '📊', '📈', '📉'];

/**
 * Genera un tema per una cartella basato sul nome
 */
export function getFolderTheme(folderName: string, hasDecks: boolean = false): {
    gradient: string;
    icon: string;
    color: string;
    glowColor: string;
} {
    const normalized = folderName.toLowerCase().trim();
    
    // Cerca match esatto o parziale
    for (const [key, theme] of Object.entries(CATEGORY_THEMES)) {
        if (normalized.includes(key) || key.includes(normalized)) {
            return {
                ...theme,
                icon: hasDecks ? '🧩' : theme.icon, // Icona dinamica se ha mazzi
                glowColor: theme.color + '40', // 25% opacity per glow
            };
        }
    }
    
    // Genera tema deterministico basato sul nome
    const hash = normalized.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const gradients = [
        'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
        'linear-gradient(135deg, #F093FB 0%, #F5576C 100%)',
        'linear-gradient(135deg, #4FACFE 0%, #00F2FE 100%)',
        'linear-gradient(135deg, #43E97B 0%, #38F9D7 100%)',
        'linear-gradient(135deg, #FA709A 0%, #FEE140 100%)',
        'linear-gradient(135deg, #30CFD0 0%, #330867 100%)',
        'linear-gradient(135deg, #A8EDEA 0%, #FED6E3 100%)',
        'linear-gradient(135deg, #FF9A9E 0%, #FECFEF 100%)',
    ];
    const colors = [
        '#764BA2', '#F5576C', '#00F2FE', '#38F9D7',
        '#FEE140', '#330867', '#FED6E3', '#FECFEF',
    ];
    
    const gradient = gradients[hash % gradients.length];
    const color = colors[hash % colors.length];
    const icon = hasDecks ? '🧩' : GENERIC_ICONS[hash % GENERIC_ICONS.length];
    
    return {
        gradient,
        icon,
        color,
        glowColor: color + '40',
    };
}
