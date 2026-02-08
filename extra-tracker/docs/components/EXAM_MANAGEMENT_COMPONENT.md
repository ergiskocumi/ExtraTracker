# Exam Management Component - Documentazione Tecnica

**Silvi - Exam Planning & Study Organization**  
*Versione 1.0 - Febbraio 2026*

---

## 📑 Indice

1. [Introduzione](#introduzione)
2. [Data Model](#data-model)
3. [Backend API](#backend-api)
4. [Frontend Architecture](#frontend-architecture)
5. [Business Logic](#business-logic)
6. [API Endpoints](#api-endpoints)

---

## Introduzione

### Panoramica

Il componente **Exam Management** gestisce il ciclo di vita completo degli esami:

- **Creazione Esami**: Titolo, descrizione, data scadenza
- **Associazione Decks**: Collegamento mazzi di studio all'esame
- **Tracciamento Progresso**: Percentuale padronanza, carte da ripassare
- **Gestione Scadenze**: Badge urgenti, notifiche scadenza imminente
- **Stati Esame**: Active, Urgent, Completed, Passed, Failed, Archived
- **Statistiche**: Deck count, total cards, mastery percent, card distribution

### Relazioni con Altri Componenti

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         EXAM MANAGEMENT ARCHITECTURE                         │
└─────────────────────────────────────────────────────────────────────────────┘

     ┌──────────────┐              examId               ┌──────────────┐
     │    Exam      │◄──────────────────────────────────►│    Deck      │
     │ Management   │                                    │ Flashcards   │
     └──────┬───────┘                                    └──────┬───────┘
            │                                                   │
            │ user                                              │ cards
            │                                                   ▼
            ▼                                            ┌──────────────┐
     ┌──────────────┐                                    │Study Session │
     │     Auth     │                                    │              │
     │     User     │                                    └──────────────┘
     └──────────────┘                                           ▲
                                                                  │
     ┌──────────────┐                                   aggregated stats
     │    Folder    │
     │ Organization │
     └──────────────┘
```

---

## Data Model

### Exam Schema (MongoDB)

```javascript
// server/models/Exam.js

const outcomeSchema = new mongoose.Schema({
    grade: {
        type: Number,
        default: null,
        min: [0, 'Il voto non può essere negativo'],
    },
    date: {
        type: Date,
        default: null,
    },
    notes: {
        type: String,
        default: '',
        trim: true,
        maxlength: [1000, 'Le note non possono superare 1000 caratteri'],
    },
    difficulties: [{  // Tag difficoltà segnalate (per recovery plan)
        type: String,
        trim: true,
    }],
}, { _id: false });

const examSchema = new mongoose.Schema({
    title: { 
        type: String, 
        required: [true, 'Il titolo è obbligatorio'],
        trim: true,
        maxlength: [120, 'Il titolo non può superare 120 caratteri'],
    },
    description: {
        type: String,
        default: '',
        trim: true,
        maxlength: [1000, 'La descrizione non può superare 1000 caratteri'],
    },
    deadline: {
        type: Date,
        required: [true, 'La data dell\'esame è obbligatoria'],
    },
    status: {
        type: String,
        enum: ['active', 'passed', 'failed', 'archived', 'completed'],
        default: 'active',
    },
    outcome: {
        type: outcomeSchema,
        default: null,
    },
}, { timestamps: true });

// Indici per performance
examSchema.index({ user: 1, deadline: 1 });

// Multi-tenancy plugin
examSchema.plugin(multiTenancyPlugin, {
    tenantField: 'user',
    required: true,
});

// Serialization
examSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.user;
    }
});
```

### TypeScript Types

```typescript
// src/features/study/types/exam.ts

export type ExamStatus = 'active' | 'passed' | 'failed' | 'archived' | 'completed';

export interface ExamOutcome {
    grade?: number;
    date: string;
    notes?: string;
    difficulties?: string[];  // Per recovery plan
}

export interface Exam {
    id: string;
    title: string;
    description?: string;
    deadline: string;  // ISO date
    status: ExamStatus;
    outcome?: ExamOutcome | null;
    createdAt?: string;
    updatedAt?: string;
}

export interface CreateExamPayload {
    title: string;
    description?: string;
    deadline: string;
}

export interface UpdateExamPayload {
    title?: string;
    description?: string;
    deadline?: string;
    status?: ExamStatus;
    outcome?: ExamOutcome | null;
}
```

---

## Backend API

### Controller

```javascript
// server/controllers/examsController.js

const Exam = require('../models/Exam');
const Deck = require('../models/Deck');

// ============================================
// GET /api/exams - Tutti gli esami
// ============================================
const getAllExams = asyncHandler(async (req, res) => {
    const userId = req.tenantScope.userId;
    
    const exams = await Exam.find({ user: userId })
        .sort({ createdAt: -1 });
    
    res.json({ success: true, data: exams });
});

// ============================================
// GET /api/exams/:id - Singolo esame
// ============================================
const getExamById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.tenantScope.userId;

    const exam = await Exam.findOne({ _id: id, user: userId });
    if (!exam) {
        throw AppError.notFound('Esame non trovato');
    }

    res.json({ success: true, data: exam });
});

// ============================================
// POST /api/exams - Crea esame
// ============================================
const createExam = asyncHandler(async (req, res) => {
    const { title, description, deadline, status, outcome } = req.body;
    const userId = req.tenantScope.userId;

    if (!title?.trim()) {
        throw AppError.validation('Il titolo è obbligatorio');
    }
    if (!deadline) {
        throw AppError.validation('La data dell\'esame è obbligatoria');
    }

    const exam = await Exam.create({
        title: title.trim(),
        description: description?.trim() || '',
        deadline: new Date(deadline),
        status: status || 'active',
        outcome: outcome || null,
        user: userId,
    });

    res.status(201).json({ success: true, data: exam });
});

// ============================================
// PATCH /api/exams/:id - Aggiorna esame
// ============================================
const updateExam = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, description, deadline, status, outcome } = req.body;
    const userId = req.tenantScope.userId;

    const exam = await Exam.findOne({ _id: id, user: userId });
    if (!exam) {
        throw AppError.notFound('Esame non trovato');
    }

    if (title !== undefined) {
        if (!title.trim()) throw AppError.validation('Il titolo non può essere vuoto');
        exam.title = title.trim();
    }
    if (description !== undefined) {
        exam.description = description?.trim() || '';
    }
    if (deadline !== undefined) {
        exam.deadline = new Date(deadline);
    }
    if (status !== undefined) {
        exam.status = status;
    }
    if (outcome !== undefined) {
        exam.outcome = outcome;
    }

    await exam.save();
    res.json({ success: true, data: exam });
});

// ============================================
// DELETE /api/exams/:id - Elimina esame
// ============================================
const deleteExam = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.tenantScope.userId;

    const exam = await Exam.findOne({ _id: id, user: userId });
    if (!exam) {
        throw AppError.notFound('Esame non trovato');
    }

    // IMPORTANTE: Rimuovi examId dai deck associati
    await Deck.updateMany(
        { user: userId, examId: id },
        { $unset: { examId: 1 } }
    );

    await exam.deleteOne();

    res.json({ success: true, message: 'Esame eliminato' });
});
```

### Routes

```javascript
// server/routes/exams.js

const express = require('express');
const router = express.Router();

// Middleware
const { requireAuth } = require('../middleware/auth');
const { tenantContext } = require('../middleware/tenantContext');
const examsController = require('../controllers/examsController');

// Proteggi tutte le routes
router.use(requireAuth);
router.use(tenantContext({ required: true }));

// CRUD Endpoints
router.get('/', examsController.getAllExams);
router.post('/', examsController.createExam);
router.get('/:id', examsController.getExamById);
router.patch('/:id', examsController.updateExam);
router.delete('/:id', examsController.deleteExam);

module.exports = router;
```

---

## Frontend Architecture

### Service Layer

```typescript
// src/features/study/services/examService.ts

import { apiClient, type ApiResponse } from '../../../shared/services/apiClient';
import type { Exam, CreateExamPayload, UpdateExamPayload } from '../types/exam';

const unwrap = <T>(response: ApiResponse<T>, fallbackMessage: string): T => {
    if (!response.success || response.data === undefined) {
        throw new Error(response.error?.message || response.message || fallbackMessage);
    }
    return response.data;
};

const examService = {
    async getAll(): Promise<Exam[]> {
        const response = await apiClient.get<Exam[]>('/exams');
        return unwrap(response, 'Errore nel recupero degli esami');
    },

    async getById(id: string): Promise<Exam> {
        const response = await apiClient.get<Exam>(`/exams/${id}`);
        return unwrap(response, `Errore nel recupero esame ${id}`);
    },

    async create(payload: CreateExamPayload): Promise<Exam> {
        const response = await apiClient.post<Exam>('/exams', payload);
        return unwrap(response, 'Errore nella creazione dell\'esame');
    },

    async update(id: string, payload: UpdateExamPayload): Promise<Exam> {
        const response = await apiClient.patch<Exam>(`/exams/${id}`, payload);
        return unwrap(response, `Errore nell'aggiornamento esame ${id}`);
    },

    async delete(id: string): Promise<void> {
        const response = await apiClient.delete<null>(`/exams/${id}`);
        unwrap(response, `Errore nell'eliminazione esame ${id}`);
    },
};

export default examService;
```

### ExamCard Component

```tsx
// src/features/study/components/Exams/ExamCard.tsx

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    Calendar,
    Layers,
    Target,
    ArrowRight,
    Clock,
    CheckCircle,
    XCircle,
    Archive,
    AlertCircle,
    Sparkles,
} from 'lucide-react';
import type { Exam } from '../../types/exam';
import type { Deck } from '../../services/studyService';

interface ExamCardProps {
    exam: Exam;
    deckCount: number;
    totalCards: number;
    dueCards: number;
    masteryPercent: number;
    decks?: Deck[];
    onClick: () => void;
    onDelete?: (examId: string) => void;
    onReactivate?: (examId: string) => void;
}

export const ExamCard: React.FC<ExamCardProps> = ({
    exam, deckCount, totalCards, dueCards, masteryPercent,
    decks = [], onClick, onDelete, onReactivate
}) => {
    // Calcola giorni alla scadenza
    const deadlineDate = new Date(exam.deadline);
    const daysUntil = Math.ceil(
        (deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    const isUrgent = daysUntil <= 7 && daysUntil >= 0;
    const isOverdue = daysUntil < 0;
    
    // Distribuzione carte per status
    const distribution = useMemo(() => {
        const examDecks = decks.filter(d => d.examId === exam.id);
        const allCards = examDecks.flatMap(d => d.cards || []);
        
        return {
            new: allCards.filter(c => c.status === 'new').length,
            learning: allCards.filter(c => c.status === 'learning').length,
            review: allCards.filter(c => c.status === 'review').length,
            mastered: allCards.filter(c => c.status === 'mastered').length,
        };
    }, [decks, exam.id]);
    
    // Configurazione status badge
    const statusConfig = useMemo(() => {
        switch (exam.status) {
            case 'passed':
                return { 
                    label: 'Superato', 
                    icon: CheckCircle, 
                    color: 'text-emerald-400',
                    bgColor: 'bg-emerald-500/20',
                    borderColor: 'border-emerald-500/40'
                };
            case 'failed':
                return { 
                    label: 'Non Superato', 
                    icon: XCircle, 
                    color: 'text-rose-400',
                    bgColor: 'bg-rose-500/20',
                    borderColor: 'border-rose-500/40'
                };
            case 'archived':
                return { 
                    label: 'Archiviato', 
                    icon: Archive, 
                    color: 'text-slate-400',
                    bgColor: 'bg-slate-500/20',
                    borderColor: 'border-slate-500/40'
                };
            default:
                if (isOverdue) return { 
                    label: 'Scaduto', 
                    icon: AlertCircle, 
                    color: 'text-red-400',
                    bgColor: 'bg-red-500/20',
                    borderColor: 'border-red-500/40'
                };
                if (isUrgent) return { 
                    label: 'Urgente', 
                    icon: AlertCircle, 
                    color: 'text-orange-400',
                    bgColor: 'bg-orange-500/20',
                    borderColor: 'border-orange-500/40'
                };
                return { 
                    label: 'In Corso', 
                    icon: Sparkles, 
                    color: 'text-primary-400',
                    bgColor: 'bg-primary-500/20',
                    borderColor: 'border-primary-500/40'
                };
        }
    }, [exam.status, isOverdue, isUrgent]);
    
    const isCompleted = ['passed', 'failed', 'archived', 'completed'].includes(exam.status);
    const StatusIcon = statusConfig.icon;
    
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.01, y: -2 }}
            whileTap={{ scale: 0.99 }}
            onClick={onClick}
            className={`
                relative rounded-2xl border overflow-hidden cursor-pointer
                transition-all duration-300
                ${isUrgent || isOverdue
                    ? 'border-orange-500/40 bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent shadow-lg shadow-orange-500/10'
                    : isCompleted
                        ? 'border-white/10 bg-gradient-to-br from-white/5 to-transparent opacity-80'
                        : 'border-primary-500/30 bg-gradient-to-br from-primary-500/10 via-primary-500/5 to-transparent'
                }
                hover:border-primary-500/50 hover:shadow-xl hover:shadow-primary-500/15
                backdrop-blur-sm
            `}
        >
            {/* Header con Icona, Titolo e Stato */}
            <div className="p-5 pb-4">
                <div className="flex items-start gap-4 mb-4">
                    {/* Icona Esame */}
                    <div className={`
                        p-3 rounded-xl flex-shrink-0 border-2
                        ${statusConfig.bgColor} ${statusConfig.borderColor}
                    `}>
                        <StatusIcon className={`w-6 h-6 ${statusConfig.color}`} />
                    </div>
                    
                    {/* Titolo e Descrizione */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-white text-lg truncate leading-tight">
                                {exam.title}
                            </h3>
                        </div>
                        
                        {/* Stato Badge */}
                        <div className="flex items-center gap-2">
                            <span className={`
                                px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide
                                ${statusConfig.bgColor} ${statusConfig.color} border ${statusConfig.borderColor}
                                flex items-center gap-1
                            `}>
                                <StatusIcon className="w-3 h-3" />
                                {statusConfig.label}
                            </span>
                            
                            {dueCards > 0 && !isCompleted && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                                    {dueCards} da ripassare
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                
                {/* Descrizione */}
                {exam.description && (
                    <p className="text-sm text-white/50 line-clamp-2 leading-relaxed mb-4">
                        {exam.description}
                    </p>
                )}
                
                {/* Mini Distribuzione Carte (se ci sono carte) */}
                {totalCards > 0 && (
                    <div className="mb-4">
                        <div className="flex items-center justify-between text-xs mb-2">
                            <span className="text-white/40 flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5" />
                                {totalCards} carte
                            </span>
                            <span className={`
                                font-medium
                                ${masteryPercent >= 80 ? 'text-emerald-400' : masteryPercent >= 50 ? 'text-amber-400' : 'text-white/60'}
                            `}>
                                {masteryPercent}% padronanza
                            </span>
                        </div>
                        
                        {/* Barra Distribuzione */}
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden flex">
                            {distribution.new > 0 && (
                                <div 
                                    className="h-full bg-blue-500"
                                    style={{ width: `${(distribution.new/totalCards)*100}%` }}
                                    title={`${distribution.new} nuove`}
                                />
                            )}
                            {distribution.learning > 0 && (
                                <div 
                                    className="h-full bg-amber-500"
                                    style={{ width: `${(distribution.learning/totalCards)*100}%` }}
                                    title={`${distribution.learning} in apprendimento`}
                                />
                            )}
                            {distribution.review > 0 && (
                                <div 
                                    className="h-full bg-orange-500"
                                    style={{ width: `${(distribution.review/totalCards)*100}%` }}
                                    title={`${distribution.review} da ripassare`}
                                />
                            )}
                            {distribution.mastered > 0 && (
                                <div 
                                    className="h-full bg-emerald-500"
                                    style={{ width: `${(distribution.mastered/totalCards)*100}%` }}
                                    title={`${distribution.mastered} padroneggiate`}
                                />
                            )}
                        </div>
                    </div>
                )}
                
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 border border-white/10">
                        <Layers className="w-4 h-4 text-primary-400" />
                        <div>
                            <p className="text-lg font-bold text-white leading-none">{deckCount}</p>
                            <p className="text-[10px] text-white/50 uppercase tracking-wide">Mazzi</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 border border-white/10">
                        <Target className="w-4 h-4 text-emerald-400" />
                        <div>
                            <p className="text-lg font-bold text-white leading-none">{masteryPercent}%</p>
                            <p className="text-[10px] text-white/50 uppercase tracking-wide">Padronanza</p>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Footer con Scadenza */}
            <div className="px-5 py-3 border-t border-white/10 bg-white/[0.03]">
                <div className="flex items-center justify-between">
                    {/* Scadenza */}
                    <div className="flex items-center gap-2.5">
                        <div className={`
                            p-1.5 rounded-lg
                            ${isOverdue
                                ? 'bg-red-500/20 border border-red-500/30'
                                : isUrgent
                                    ? 'bg-orange-500/20 border border-orange-500/30'
                                    : 'bg-white/5 border border-white/10'
                            }
                        `}>
                            <Calendar className={`w-3.5 h-3.5 ${isOverdue ? 'text-red-400' : isUrgent ? 'text-orange-400' : 'text-white/60'}`} />
                        </div>
                        <div>
                            <p className="text-[10px] text-white/40 uppercase tracking-wide">Scadenza</p>
                            <p className={`text-sm font-semibold ${isOverdue ? 'text-red-400' : isUrgent ? 'text-orange-400' : 'text-white/80'}`}>
                                {isOverdue 
                                    ? `Scaduto (${Math.abs(daysUntil)}gg fa)`
                                    : daysUntil === 0 
                                        ? 'Oggi!'
                                        : daysUntil === 1 
                                            ? 'Domani'
                                            : `${daysUntil} giorni`
                                }
                            </p>
                        </div>
                    </div>

                    {/* Freccia */}
                    <div className={`
                        p-2 rounded-lg transition-colors
                        ${isUrgent || isOverdue
                            ? 'bg-orange-500/10 border border-orange-500/30'
                            : 'bg-primary-500/10 border border-primary-500/30'
                        }
                    `}>
                        <ArrowRight className={`w-4 h-4 ${isUrgent || isOverdue ? 'text-orange-400' : 'text-primary-400'}`} />
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
```

### ExamsView - Lista e Filtri

```tsx
// src/features/study/components/Exams/ExamsView.tsx (estratti chiave)

export const ExamsView: React.FC<ExamsViewProps> = ({
    decks, onCreateExam, onExamClick, onDeckUpdate, ...
}) => {
    const [exams, setExams] = useState<Exam[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<ExamSortOption>('recent');
    const [filter, setFilter] = useState<ExamFilterOption>('all');
    
    // Carica esami
    useEffect(() => {
        loadExams();
    }, []);
    
    const loadExams = async () => {
        try {
            setIsLoading(true);
            const allExams = await examService.getAll();
            setExams(allExams);
        } catch (err: any) {
            setError(err.message || 'Errore nel caricamento degli esami');
        } finally {
            setIsLoading(false);
        }
    };
    
    // Calcola statistiche per esame (aggrega dati dai deck)
    const getExamStats = (examId: string) => {
        const examDecks = decks.filter(d => d.examId === examId);
        
        // Conteggio mazzi
        const deckCount = examDecks.length;
        
        // Conteggio totale carte
        const totalCards = examDecks.reduce(
            (sum, deck) => sum + (deck.totalCards ?? deck.cards?.length ?? 0), 
            0
        );
        
        // Carte da ripassare (in scadenza)
        const dueCards = examDecks.reduce(
            (sum, deck) => sum + (deck.dueCount ?? 0), 
            0
        );
        
        // Carte padroneggiate
        let masteredCards = 0;
        examDecks.forEach(deck => {
            masteredCards += deck.cards?.filter(c => c.status === 'mastered').length ?? 0;
        });
        
        // Percentuale padronanza
        const masteryPercent = totalCards > 0 
            ? Math.round((masteredCards / totalCards) * 100) 
            : 0;
        
        return { deckCount, totalCards, dueCards, masteryPercent };
    };
    
    // Filtra e ordina esami
    const filteredAndSortedExams = useMemo(() => {
        let filtered = [...exams];
        const now = Date.now();
        
        // Filtro per ricerca
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(exam =>
                exam.title.toLowerCase().includes(query) ||
                exam.description?.toLowerCase().includes(query)
            );
        }
        
        // Filtro per stato/scadenza
        if (filter === 'urgent') {
            filtered = filtered.filter(exam => {
                if (exam.status !== 'active') return false;
                const deadline = new Date(exam.deadline).getTime();
                const daysUntil = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
                return daysUntil <= 7 && daysUntil >= 0;
            });
        } else if (filter === 'upcoming') {
            filtered = filtered.filter(exam => {
                if (exam.status !== 'active') return false;
                const deadline = new Date(exam.deadline).getTime();
                const daysUntil = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
                return daysUntil > 7;
            });
        } else if (filter === 'completed') {
            filtered = filtered.filter(exam => 
                ['completed', 'passed', 'failed', 'archived'].includes(exam.status)
            );
        } else if (filter === 'all') {
            filtered = filtered.filter(exam => exam.status === 'active');
        }
        
        // Ordinamento
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'recent':
                    // Ordina per data di creazione (più recente prima)
                    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                    return bTime - aTime;
                case 'deadline':
                    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
                case 'name':
                    return a.title.localeCompare(b.title);
                case 'mastery': {
                    const aStats = getExamStats(a.id);
                    const bStats = getExamStats(b.id);
                    return bStats.masteryPercent - aStats.masteryPercent;
                }
                case 'cards': {
                    const aStats = getExamStats(a.id);
                    const bStats = getExamStats(b.id);
                    return bStats.totalCards - aStats.totalCards;
                }
                default:
                    return 0;
            }
        });
        
        return filtered;
    }, [exams, searchQuery, filter, sortBy, decks]);
    
    // Render
    return (
        <div className="space-y-6">
            <ExamsFilters 
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                sortBy={sortBy}
                onSortChange={setSortBy}
                filter={filter}
                onFilterChange={setFilter}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAndSortedExams.map(exam => {
                    const stats = getExamStats(exam.id);
                    return (
                        <ExamCard
                            key={exam.id}
                            exam={exam}
                            {...stats}
                            onClick={() => onExamClick(exam.id)}
                        />
                    );
                })}
            </div>
        </div>
    );
};
```

---

## Business Logic

### Calcolo Statistiche Aggregated

Le statistiche di un esame sono calcolate aggregando i dati di tutti i deck associati:

```typescript
// Calcolo statistiche esame
const getExamStats = (examId: string, decks: Deck[]) => {
    // Filtra deck associati all'esame
    const examDecks = decks.filter(d => d.examId === examId);
    
    // Conteggio mazzi
    const deckCount = examDecks.length;
    
    // Conteggio totale carte
    const totalCards = examDecks.reduce(
        (sum, deck) => sum + (deck.totalCards || deck.cards?.length || 0), 
        0
    );
    
    // Carte da ripassare (in scadenza)
    const dueCards = examDecks.reduce(
        (sum, deck) => sum + (deck.dueCount || 0), 
        0
    );
    
    // Carte padroneggiate
    const masteredCards = examDecks.reduce((sum, deck) => {
        return sum + (deck.cards?.filter(c => c.status === 'mastered').length || 0);
    }, 0);
    
    // Percentuale padronanza
    const masteryPercent = totalCards > 0 
        ? Math.round((masteredCards / totalCards) * 100) 
        : 0;
    
    return { deckCount, totalCards, dueCards, masteryPercent };
};
```

### Filtraggio per Scadenza

```typescript
// Logica filtri scadenza
const now = Date.now();

// Urgente: entro 7 giorni
const isUrgent = (exam: Exam) => {
    if (exam.status !== 'active') return false;
    const deadline = new Date(exam.deadline).getTime();
    const daysUntil = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
    return daysUntil <= 7 && daysUntil >= 0;
};

// Prossimi: dopo 7 giorni
const isUpcoming = (exam: Exam) => {
    if (exam.status !== 'active') return false;
    const deadline = new Date(exam.deadline).getTime();
    const daysUntil = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
    return daysUntil > 7;
};

// Scaduto: deadline passata
const isOverdue = (exam: Exam) => {
    const deadline = new Date(exam.deadline).getTime();
    return deadline < now;
};
```

### Formattazione Scadenza Human-Readable

```typescript
const formatDeadline = (deadline: string): string => {
    const deadlineDate = new Date(deadline);
    const daysUntil = Math.ceil(
        (deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysUntil < 0) {
        return `Scaduto (${Math.abs(daysUntil)}gg fa)`;
    }
    if (daysUntil === 0) return 'Oggi!';
    if (daysUntil === 1) return 'Domani';
    if (daysUntil <= 7) return `${daysUntil} giorni (urgente)`;
    return `${daysUntil} giorni`;
};
```

---

## API Endpoints

| Endpoint | Method | Descrizione |
|----------|--------|-------------|
| `/api/exams` | GET | Lista tutti gli esami dell'utente (ordinati per createdAt desc) |
| `/api/exams/:id` | GET | Dettaglio singolo esame con verifica ownership |
| `/api/exams` | POST | Crea nuovo esame (titolo, deadline required) |
| `/api/exams/:id` | PATCH | Aggiorna esame (titolo, deadline, status, outcome) |
| `/api/exams/:id` | DELETE | Elimina esame e **rimuove examId dai deck associati** |

---

## Sequence Diagrams

### Creazione Esame

```
┌──────┐     ┌──────────┐     ┌─────────────┐     ┌──────────┐
│ User │     │ Frontend │     │ Controller  │     │ MongoDB  │
└──┬───┘     └────┬─────┘     └──────┬──────┘     └────┬─────┘
   │              │                  │                  │
   │ Click "Crea" │                  │                  │
   │─────────────>│                  │                  │
   │              │ Apri modale      │                  │
   │              │ Form input       │                  │
   │ Submit       │                  │                  │
   │─────────────>│                  │                  │
   │              │ examService.create
   │              │─────────────────>│                  │
   │              │                  │ POST /api/exams  │
   │              │                  │ with JWT + CSRF  │
   │              │                  │─────────────────>│
   │              │                  │                  │ Exam.create()
   │              │                  │                  │ with userId
   │              │                  │<─────────────────│
   │              │                  │ 201 Created      │
   │              │<─────────────────│ { success, data }│
   │ Aggiorna UI  │                  │                  │
   │<─────────────│                  │                  │
```

### Eliminazione Esame

```
┌──────┐     ┌──────────┐     ┌─────────────┐     ┌──────────┐     ┌──────────┐
│ User │     │ Frontend │     │ Controller  │     │  Exam    │     │  Deck    │
└──┬───┘     └────┬─────┘     └──────┬──────┘     └────┬─────┘     └────┬─────┘
   │              │                  │                  │              │
   │ Menu → Elimina                │                  │              │
   │─────────────>│                  │                  │              │
   │              │ Conferma modale  │                  │              │
   │              │ "X deck saranno  │                  │              │
   │              │  disassociati"   │                  │              │
   │ Conferma     │                  │                  │              │
   │─────────────>│                  │                  │              │
   │              │ examService.delete
   │              │─────────────────>│                  │              │
   │              │                  │ Deck.updateMany()│              │
   │              │                  │─────────────────>│              │
   │              │                  │                  │ $unset examId│
   │              │                  │<─────────────────│              │
   │              │                  │ exam.deleteOne() │              │
   │              │                  │─────────────────>│              │
   │              │                  │<─────────────────│              │
   │              │                  │ 200 Success      │              │
   │ Rimozione UI │                  │                  │              │
   │ (optimistic) │                  │                  │              │
   │<─────────────│                  │                  │              │
```

---

## Glossario

| Termine | Definizione |
|---------|-------------|
| **Mastery Percent** | Percentuale carte padroneggiate (status = 'mastered') |
| **Due Cards** | Carte in scadenza per ripasso (nextReviewDate <= now) |
| **Exam Outcome** | Risultato esame: grade, date, notes, difficulties |
| **Urgent** | Scadenza entro 7 giorni |
| **Recovery Plan** | Piano di ripasso basato sulle difficulties segnalate |
| **Optimistic UI** | Aggiornamento UI prima della conferma server |

---

*Documento generato automaticamente da Kimi Code CLI.*  
*Ultimo aggiornamento: Febbraio 2026*
