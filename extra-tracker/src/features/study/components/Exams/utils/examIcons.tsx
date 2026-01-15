import React from 'react';
import {
    BookOpen,
    Calculator,
    Code,
    Atom,
    FlaskConical,
    Microscope,
    Brain,
    Palette,
    Music,
    Languages,
    Globe,
    TrendingUp,
    Heart,
    Building,
    Wrench,
    Scale,
    GraduationCap,
    Scroll,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

export interface SubjectConfig {
    name: string;
    icon: React.ElementType;
    keywords: string[];
    color: string;
    bgColor: string;
    borderColor: string;
}

// ============================================
// SUBJECT CONFIGURATIONS
// ============================================

export const SUBJECTS: SubjectConfig[] = [
    {
        name: 'Matematica',
        icon: Calculator,
        keywords: ['matematica', 'math', 'calcolo', 'algebra', 'geometria', 'analisi', 'statistica', 'trigonometria', 'calcolo', 'derivata', 'integrale', 'π', 'pi greco'],
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/20',
        borderColor: 'border-blue-500/40',
    },
    {
        name: 'Informatica',
        icon: Code,
        keywords: ['informatica', 'programmazione', 'coding', 'javascript', 'python', 'java', 'react', 'node', 'html', 'css', 'sql', 'algoritmo', 'software', 'web', 'app', 'developer', 'code', 'programming', 'computer science', 'cs', 'it'],
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/20',
        borderColor: 'border-emerald-500/40',
    },
    {
        name: 'Fisica',
        icon: Atom,
        keywords: ['fisica', 'physics', 'meccanica', 'termodinamica', 'elettromagnetismo', 'quantistica', 'relatività', 'energia', 'forza', 'moto', 'onda', 'particella'],
        color: 'text-purple-400',
        bgColor: 'bg-purple-500/20',
        borderColor: 'border-purple-500/40',
    },
    {
        name: 'Chimica',
        icon: FlaskConical,
        keywords: ['chimica', 'chemistry', 'reazione', 'molecola', 'atomo', 'composto', 'elemento', 'periodico', 'organica', 'inorganica', 'biochimica'],
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/20',
        borderColor: 'border-amber-500/40',
    },
    {
        name: 'Biologia',
        icon: Microscope,
        keywords: ['biologia', 'biology', 'cellula', 'dna', 'genetica', 'anatomia', 'fisiologia', 'ecologia', 'evoluzione', 'organismo', 'tessuto', 'organo'],
        color: 'text-green-400',
        bgColor: 'bg-green-500/20',
        borderColor: 'border-green-500/40',
    },
    {
        name: 'Medicina',
        icon: Heart,
        keywords: ['medicina', 'medicine', 'medico', 'anatomia', 'fisiologia', 'patologia', 'farmacologia', 'chirurgia', 'diagnosi', 'terapia', 'clinica', 'ospedale'],
        color: 'text-red-400',
        bgColor: 'bg-red-500/20',
        borderColor: 'border-red-500/40',
    },
    {
        name: 'Storia',
        icon: Scroll,
        keywords: ['storia', 'history', 'storico', 'antica', 'medievale', 'moderna', 'contemporanea', 'guerra', 'rivoluzione', 'impero', 'civiltà', 'evento'],
        color: 'text-orange-400',
        bgColor: 'bg-orange-500/20',
        borderColor: 'border-orange-500/40',
    },
    {
        name: 'Letteratura',
        icon: BookOpen,
        keywords: ['letteratura', 'literature', 'poesia', 'romanzo', 'narrativa', 'poeta', 'scrittore', 'autore', 'libro', 'testo', 'opera', 'genere'],
        color: 'text-indigo-400',
        bgColor: 'bg-indigo-500/20',
        borderColor: 'border-indigo-500/40',
    },
    {
        name: 'Lingue',
        icon: Languages,
        keywords: ['lingua', 'language', 'inglese', 'francese', 'spagnolo', 'tedesco', 'grammatica', 'vocabolario', 'traduzione', 'conversazione', 'esame', 'certificazione'],
        color: 'text-cyan-400',
        bgColor: 'bg-cyan-500/20',
        borderColor: 'border-cyan-500/40',
    },
    {
        name: 'Economia',
        icon: TrendingUp,
        keywords: ['economia', 'economics', 'finanza', 'marketing', 'management', 'business', 'commercio', 'mercato', 'investimento', 'banca', 'azienda', 'imprenditoria'],
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/20',
        borderColor: 'border-emerald-500/40',
    },
    {
        name: 'Filosofia',
        icon: Brain,
        keywords: ['filosofia', 'philosophy', 'filosofo', 'etica', 'logica', 'metafisica', 'epistemologia', 'pensiero', 'ragionamento', 'teoria'],
        color: 'text-violet-400',
        bgColor: 'bg-violet-500/20',
        borderColor: 'border-violet-500/40',
    },
    {
        name: 'Arte',
        icon: Palette,
        keywords: ['arte', 'art', 'pittura', 'scultura', 'disegno', 'storia dell\'arte', 'artista', 'creativo', 'estetica', 'museo', 'galleria'],
        color: 'text-pink-400',
        bgColor: 'bg-pink-500/20',
        borderColor: 'border-pink-500/40',
    },
    {
        name: 'Musica',
        icon: Music,
        keywords: ['musica', 'music', 'musicale', 'strumento', 'composizione', 'teoria musicale', 'armonia', 'melodia', 'ritmo', 'concerto', 'orchestra'],
        color: 'text-rose-400',
        bgColor: 'bg-rose-500/20',
        borderColor: 'border-rose-500/40',
    },
    {
        name: 'Geografia',
        icon: Globe,
        keywords: ['geografia', 'geography', 'geografico', 'mappa', 'territorio', 'paese', 'continente', 'clima', 'ambiente', 'risorse', 'popolazione'],
        color: 'text-teal-400',
        bgColor: 'bg-teal-500/20',
        borderColor: 'border-teal-500/40',
    },
    {
        name: 'Architettura',
        icon: Building,
        keywords: ['architettura', 'architecture', 'edificio', 'progetto', 'design', 'costruzione', 'urbanistica', 'piano', 'struttura', 'spazio'],
        color: 'text-slate-400',
        bgColor: 'bg-slate-500/20',
        borderColor: 'border-slate-500/40',
    },
    {
        name: 'Ingegneria',
        icon: Wrench,
        keywords: ['ingegneria', 'engineering', 'ingegnere', 'meccanica', 'elettronica', 'civile', 'industriale', 'progetto', 'tecnologia', 'innovazione'],
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/20',
        borderColor: 'border-blue-500/40',
    },
    {
        name: 'Giurisprudenza',
        icon: Scale,
        keywords: ['diritto', 'law', 'giurisprudenza', 'legge', 'legale', 'codice', 'tribunale', 'avvocato', 'giudice', 'processo', 'contratto', 'norma'],
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/20',
        borderColor: 'border-amber-500/40',
    },
    {
        name: 'Psicologia',
        icon: Brain,
        keywords: ['psicologia', 'psychology', 'psicologo', 'mentale', 'comportamento', 'cognizione', 'emozione', 'personalità', 'terapia', 'clinica'],
        color: 'text-purple-400',
        bgColor: 'bg-purple-500/20',
        borderColor: 'border-purple-500/40',
    },
    {
        name: 'Scienze',
        icon: FlaskConical,
        keywords: ['scienze', 'science', 'scientifico', 'sperimentale', 'ricerca', 'metodo', 'ipotesi', 'teoria', 'osservazione'],
        color: 'text-cyan-400',
        bgColor: 'bg-cyan-500/20',
        borderColor: 'border-cyan-500/40',
    },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Rileva la materia dall'esame basandosi sul titolo e descrizione
 */
export function detectSubject(examTitle: string, examDescription?: string): SubjectConfig {
    const searchText = `${examTitle} ${examDescription || ''}`.toLowerCase();
    
    // Cerca la materia con più keyword match
    let bestMatch: SubjectConfig | null = null;
    let maxMatches = 0;

    for (const subject of SUBJECTS) {
        const matches = subject.keywords.filter(keyword => 
            searchText.includes(keyword.toLowerCase())
        ).length;

        if (matches > maxMatches) {
            maxMatches = matches;
            bestMatch = subject;
        }
    }

    // Se non trova match, usa default
    return bestMatch || {
        name: 'Generale',
        icon: GraduationCap,
        keywords: [],
        color: 'text-primary-400',
        bgColor: 'bg-primary-500/20',
        borderColor: 'border-primary-500/40',
    };
}

/**
 * Ottiene l'icona per un esame
 */
export function getExamIcon(examTitle: string, examDescription?: string): React.ElementType {
    const subject = detectSubject(examTitle, examDescription);
    return subject.icon;
}

/**
 * Ottiene i colori per un esame
 */
export function getExamColors(examTitle: string, examDescription?: string) {
    const subject = detectSubject(examTitle, examDescription);
    return {
        color: subject.color,
        bgColor: subject.bgColor,
        borderColor: subject.borderColor,
    };
}
