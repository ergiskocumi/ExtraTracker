import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGoals } from './context/GoalsContext';
import { GOAL_CATEGORIES, GOAL_TYPES } from './types';
import type { GoalCategory, GoalType, CreateGoalDTO, CreateMilestoneDTO } from './types';
import {
    FiX,
    FiArrowRight,
    FiArrowLeft,
    FiCheck,
    FiTarget,
    FiRefreshCw,
    FiCalendar,
    FiPlus,
    FiTrash2,
    FiFlag,
    FiZap,
    FiLayers,
    FiAward
} from 'react-icons/fi';

interface GoalWizardProps {
    onClose: () => void;
}

type WizardStep = 'category' | 'type' | 'details' | 'milestones' | 'confirm';

// Template per categoria con più opzioni
interface GoalTemplate {
    title: string;
    type: GoalType;
    target?: number;
    unit?: string;
    description?: string;
    suggestedMilestones?: string[];
}

export const GoalWizard = ({ onClose }: GoalWizardProps) => {
    const { addGoal } = useGoals();
    
    const [step, setStep] = useState<WizardStep>('category');
    const [category, setCategory] = useState<GoalCategory | null>(null);
    const [type, setType] = useState<GoalType | null>(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [targetValue, setTargetValue] = useState('');
    const [unit, setUnit] = useState('');
    const [frequency, setFrequency] = useState('1');
    const [deadline, setDeadline] = useState(() => {
        const date = new Date();
        date.setMonth(date.getMonth() + 3);
        return date.toISOString().split('T')[0];
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Milestones state
    const [milestones, setMilestones] = useState<CreateMilestoneDTO[]>([]);
    const [newMilestoneTitle, setNewMilestoneTitle] = useState('');

    // Auto-advance function
    const autoAdvance = useCallback((nextStep: WizardStep, delay: number = 400) => {
        setTimeout(() => setStep(nextStep), delay);
    }, []);

    // Milestone handlers
    const addMilestone = () => {
        const trimmedTitle = newMilestoneTitle.trim();
        if (!trimmedTitle) return;
        if (milestones.length >= 20) return;
        
        setMilestones([...milestones, { title: trimmedTitle, weight: 1 }]);
        setNewMilestoneTitle('');
    };

    const removeMilestone = (index: number) => {
        setMilestones(milestones.filter((_, i) => i !== index));
    };

    const handleMilestoneKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addMilestone();
        }
    };

    // Type icons
    const getTypeIcon = (goalType: string): React.ReactElement => {
        const icons: Record<string, React.ReactElement> = {
            target: <FiTarget className="w-6 h-6" />,
            habit: <FiRefreshCw className="w-6 h-6" />,
            milestone: <FiFlag className="w-6 h-6" />,
            challenge: <FiZap className="w-6 h-6" />,
            project: <FiLayers className="w-6 h-6" />,
        };
        return icons[goalType] || <FiTarget className="w-6 h-6" />;
    };

    // Extended templates per categoria
    const getTemplates = (cat: GoalCategory): GoalTemplate[] => {
        const templates: Record<GoalCategory, GoalTemplate[]> = {
            finance: [
                { title: 'Risparmiare per le vacanze', type: 'target', target: 3000, unit: '€', description: 'Mettere da parte soldi per le prossime vacanze' },
                { title: 'Fondo di emergenza', type: 'target', target: 10000, unit: '€', description: 'Costruire un fondo per imprevisti' },
                { title: 'Investire regolarmente', type: 'habit', description: 'Investire una somma fissa ogni mese' },
                { title: 'Sfida risparmio 30 giorni', type: 'challenge', target: 500, unit: '€', description: 'Risparmiare ogni giorno per 30 giorni' },
                { title: 'Budget mensile', type: 'project', description: 'Creare e seguire un budget dettagliato', suggestedMilestones: ['Analisi spese', 'Definire categorie', 'Impostare limiti', 'Review settimanale'] },
                { title: 'Estinguere debito', type: 'milestone', description: 'Piano per estinguere un debito', suggestedMilestones: ['Lista debiti', 'Prioritizzare', 'Piano pagamenti', 'Prima rata'] },
            ],
            health: [
                { title: 'Workout quotidiano', type: 'habit', description: 'Allenarsi ogni giorno' },
                { title: 'Perdere peso', type: 'target', target: 10, unit: 'kg', description: 'Raggiungere il peso forma' },
                { title: 'Correre 100km', type: 'target', target: 100, unit: 'km', description: 'Accumulare chilometri di corsa' },
                { title: 'Sfida 30 giorni fitness', type: 'challenge', description: '30 giorni consecutivi di allenamento' },
                { title: 'Preparare una maratona', type: 'project', description: 'Prepararsi per una maratona', suggestedMilestones: ['Piano allenamento', '5km', '10km', '21km', '42km'] },
                { title: 'Bere 2L acqua/giorno', type: 'habit', description: 'Idratarsi correttamente' },
                { title: 'Dormire 8 ore', type: 'habit', description: 'Migliorare la qualità del sonno' },
                { title: 'Smettere di fumare', type: 'milestone', suggestedMilestones: ['Decisione', '1 settimana', '1 mese', '3 mesi', '6 mesi'] },
            ],
            learning: [
                { title: 'Leggere 12 libri', type: 'target', target: 12, unit: 'libri', description: 'Un libro al mese' },
                { title: 'Studio quotidiano', type: 'habit', description: 'Studiare ogni giorno' },
                { title: 'Completare corso online', type: 'project', target: 100, unit: '%', suggestedMilestones: ['Iscrizione', '25% completato', '50% completato', '75% completato', 'Certificato'] },
                { title: 'Imparare una lingua', type: 'milestone', description: 'Raggiungere la fluenza', suggestedMilestones: ['A1 Base', 'A2 Elementare', 'B1 Intermedio', 'B2 Avanzato'] },
                { title: 'Sfida 100 giorni coding', type: 'challenge', description: 'Programmare per 100 giorni consecutivi' },
                { title: 'Podcast educativi', type: 'habit', description: 'Ascoltare podcast formativi' },
                { title: 'Prendere certificazione', type: 'target', target: 100, unit: '%' },
            ],
            career: [
                { title: 'Ottenere promozione', type: 'milestone', suggestedMilestones: ['Definire obiettivi', 'Feedback manager', 'Completare progetti', 'Negoziazione'] },
                { title: 'Networking settimanale', type: 'habit', description: 'Espandere la rete professionale' },
                { title: 'Nuovi contatti professionali', type: 'target', target: 50, unit: 'contatti' },
                { title: 'Side project', type: 'project', description: 'Sviluppare un progetto personale', suggestedMilestones: ['Idea', 'MVP', 'Beta', 'Lancio'] },
                { title: 'Sfida produttività', type: 'challenge', description: 'Settimana di massima produttività' },
                { title: 'Mentorship', type: 'habit', description: 'Sessioni regolari con mentor' },
                { title: 'Portfolio aggiornato', type: 'milestone', suggestedMilestones: ['Raccolta lavori', 'Design', 'Contenuti', 'Pubblicazione'] },
            ],
            personal: [
                { title: 'Meditazione quotidiana', type: 'habit', description: 'Praticare la mindfulness' },
                { title: 'Nuovo hobby', type: 'milestone', description: 'Imparare qualcosa di nuovo', suggestedMilestones: ['Ricerca', 'Prima lezione', 'Pratica base', 'Livello intermedio'] },
                { title: 'Progetto hobbistico', type: 'project', target: 100, unit: '%' },
                { title: 'Sfida decluttering', type: 'challenge', description: 'Riorganizzare casa in 30 giorni' },
                { title: 'Journal quotidiano', type: 'habit', description: 'Scrivere ogni giorno' },
                { title: 'Viaggiare di più', type: 'target', target: 5, unit: 'viaggi' },
            ],
            relationships: [
                { title: 'Chiamare famiglia settimanalmente', type: 'habit', description: 'Mantenere i contatti familiari' },
                { title: 'Date night settimanale', type: 'habit', description: 'Tempo di qualità con il partner' },
                { title: 'Nuove amicizie', type: 'target', target: 5, unit: 'amici' },
                { title: 'Organizzare eventi sociali', type: 'target', target: 12, unit: 'eventi' },
                { title: 'Migliorare comunicazione', type: 'milestone', suggestedMilestones: ['Ascolto attivo', 'Espressione emozioni', 'Gestione conflitti', 'Empatia'] },
                { title: 'Sfida gratitudine', type: 'challenge', description: 'Esprimere gratitudine ogni giorno per 30 giorni' },
            ],
            creativity: [
                { title: 'Creare ogni giorno', type: 'habit', description: 'Produrre qualcosa di creativo quotidianamente' },
                { title: 'Completare opera artistica', type: 'project', suggestedMilestones: ['Concept', 'Bozza', 'Sviluppo', 'Rifinitura', 'Completamento'] },
                { title: 'Sfida Inktober', type: 'challenge', description: '30 giorni di disegni' },
                { title: 'Imparare strumento musicale', type: 'milestone', suggestedMilestones: ['Prima nota', 'Scale base', 'Primo brano', 'Repertorio'] },
                { title: 'Scrivere un libro', type: 'project', target: 50000, unit: 'parole', suggestedMilestones: ['Outline', 'Primo capitolo', 'Prima bozza', 'Revisione', 'Completato'] },
                { title: 'Portfolio creativo', type: 'target', target: 20, unit: 'opere' },
            ],
            mindfulness: [
                { title: 'Meditazione mattutina', type: 'habit', description: 'Iniziare la giornata con calma' },
                { title: 'Ore di meditazione', type: 'target', target: 100, unit: 'ore' },
                { title: 'Sfida digital detox', type: 'challenge', description: '7 giorni senza social media' },
                { title: 'Yoga quotidiano', type: 'habit', description: 'Praticare yoga ogni giorno' },
                { title: 'Percorso mindfulness', type: 'milestone', suggestedMilestones: ['Respirazione', 'Body scan', 'Meditazione guidata', 'Pratica autonoma'] },
                { title: 'Gratitude journal', type: 'habit', description: 'Scrivere 3 cose positive ogni giorno' },
                { title: 'Ritiro meditazione', type: 'project', suggestedMilestones: ['Ricerca', 'Prenotazione', 'Preparazione', 'Partecipazione'] },
            ],
        };
        return templates[cat] || [];
    };

    // Validation state
    const [submitError, setSubmitError] = useState<string | null>(null);

    // Validate form before submit
    const validateForm = (): string | null => {
        if (!category) return 'Seleziona una categoria';
        if (!type) return 'Seleziona un tipo di obiettivo';
        if (!title.trim()) return 'Inserisci un titolo';
        if (!deadline) return 'Seleziona una scadenza';
        
        if ((type === 'target' || type === 'challenge') && !targetValue) {
            return 'Inserisci un valore target';
        }
        
        if ((type === 'target' || type === 'challenge') && Number(targetValue) <= 0) {
            return 'Il valore target deve essere maggiore di 0';
        }

        if ((type === 'target' || type === 'challenge') && !unit.trim()) {
            return 'Specifica un\'unità di misura per questo obiettivo';
        }
        
        if (type === 'habit' && (!frequency || Number(frequency) < 1)) {
            return 'Seleziona una frequenza valida';
        }
        
        return null;
    };

    // Submit
    const handleSubmit = async () => {
        setSubmitError(null);
        
        const validationError = validateForm();
        if (validationError) {
            setSubmitError(validationError);
            return;
        }

        const goalData: CreateGoalDTO = {
            title: title.trim(),
            category: category!,
            type: type!,
            deadline,
            description: description.trim() || undefined,
            ...(milestones.length > 0 && { milestones }),
            ...((type === 'target' || type === 'challenge') && targetValue && {
                targetValue: Number(targetValue),
                unit: unit.trim() || undefined,
            }),
            ...(type === 'habit' && frequency && {
                frequency: Number(frequency),
            }),
        };

        setIsSubmitting(true);
        try {
            await addGoal(goalData);
            onClose();
        } catch (error: unknown) {
            const errorMessage = error instanceof Error 
                ? error.message 
                : 'Errore nella creazione dell\'obiettivo. Verifica di essere autenticato.';
            setSubmitError(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Navigation
    const goNext = () => {
        setSubmitError(null);
        if (step === 'category' && category) setStep('type');
        else if (step === 'type' && type) setStep('details');
        else if (step === 'details' && title) setStep('milestones');
        else if (step === 'milestones') setStep('confirm');
    };

    const goBack = () => {
        setSubmitError(null);
        if (step === 'type') setStep('category');
        else if (step === 'details') setStep('type');
        else if (step === 'milestones') setStep('details');
        else if (step === 'confirm') setStep('milestones');
    };

    const applyTemplate = (template: GoalTemplate) => {
        setTitle(template.title);
        setType(template.type);
        if (template.description) setDescription(template.description);
        if (template.target) setTargetValue(String(template.target));
        if (template.unit) setUnit(template.unit);
        if (template.suggestedMilestones) {
            setMilestones(template.suggestedMilestones.map(title => ({ title, weight: 1 })));
        }
        // Auto-advance to details
        autoAdvance('details', 300);
    };

    const stepIndex = ['category', 'type', 'details', 'milestones', 'confirm'].indexOf(step);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            {/* Dark frosted glass backdrop */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" />
            
            <motion.div
                initial={{ scale: 0.95, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.95, y: 20, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-3xl max-h-[85vh] overflow-hidden rounded-[2rem] shadow-2xl"
                style={{
                    background: 'linear-gradient(145deg, rgba(30,30,35,0.95) 0%, rgba(15,15,20,0.98) 100%)',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255,255,255,0.05)'
                }}
            >
                {/* Subtle gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-black/20 pointer-events-none rounded-[2rem]" />
                
                {/* Header - Glassmorphism style */}
                <div 
                    className="relative z-10 px-8 py-6 border-b border-white/[0.06]"
                    style={{ background: 'rgba(255,255,255,0.02)' }}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-semibold text-white tracking-tight">
                                Nuovo Obiettivo
                            </h2>
                            <p className="text-sm text-white/50 mt-0.5">
                                {step === 'category' && 'Scegli una categoria'}
                                {step === 'type' && 'Seleziona il tipo di obiettivo'}
                                {step === 'details' && 'Inserisci i dettagli'}
                                {step === 'milestones' && 'Aggiungi milestone (opzionale)'}
                                {step === 'confirm' && 'Conferma e crea'}
                            </p>
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.1, rotate: 90 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={onClose}
                            className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                        >
                            <FiX className="w-5 h-5 text-white/60" />
                        </motion.button>
                    </div>

                    {/* Progress indicator - iOS style dots */}
                    <div className="flex items-center justify-center gap-2 mt-5">
                        {['category', 'type', 'details', 'milestones', 'confirm'].map((s, idx) => (
                            <motion.div
                                key={s}
                                initial={false}
                                animate={{
                                    width: stepIndex === idx ? 24 : 8,
                                    backgroundColor: stepIndex >= idx ? 'rgb(99, 102, 241)' : 'rgba(255,255,255,0.1)'
                                }}
                                className="h-2 rounded-full transition-all duration-300"
                            />
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="relative z-10 p-8 overflow-y-auto max-h-[calc(85vh-180px)]">
                    <AnimatePresence mode="wait">
                        {/* STEP 1: Category */}
                        {step === 'category' && (
                            <motion.div
                                key="category"
                                initial={{ opacity: 0, x: 30 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -30 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-3"
                            >
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {Object.entries(GOAL_CATEGORIES).map(([key, data]) => (
                                        <motion.button
                                            key={key}
                                            whileHover={{ scale: 1.02, y: -2 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => {
                                                setCategory(key as GoalCategory);
                                                autoAdvance('type');
                                            }}
                                            className={`relative p-4 rounded-2xl transition-all text-center group ${
                                                category === key
                                                    ? 'bg-primary-500/20 ring-2 ring-primary-500/50'
                                                    : 'bg-white/[0.03] hover:bg-white/[0.06]'
                                            }`}
                                            style={{
                                                boxShadow: category === key 
                                                    ? '0 4px 20px rgba(99, 102, 241, 0.15)' 
                                                    : 'inset 0 1px 0 rgba(255,255,255,0.03)'
                                            }}
                                        >
                                            <div className={`text-3xl mb-2 transform group-hover:scale-110 transition-transform`}>
                                                {data.emoji}
                                            </div>
                                            <span className={`text-sm font-medium ${category === key ? 'text-white' : 'text-white/70'}`}>
                                                {data.label}
                                            </span>
                                        </motion.button>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 2: Type */}
                        {step === 'type' && category && (
                            <motion.div
                                key="type"
                                initial={{ opacity: 0, x: 30 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -30 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-6"
                            >
                                {/* Goal Types Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {Object.entries(GOAL_TYPES).map(([key, data]) => (
                                        <motion.button
                                            key={key}
                                            whileHover={{ scale: 1.01, y: -2 }}
                                            whileTap={{ scale: 0.99 }}
                                            onClick={() => {
                                                setType(key as GoalType);
                                                autoAdvance('details');
                                            }}
                                            className={`relative p-4 rounded-2xl transition-all text-left ${
                                                type === key
                                                    ? 'ring-2 ring-primary-500/50'
                                                    : 'bg-white/[0.03] hover:bg-white/[0.06]'
                                            }`}
                                            style={{
                                                background: type === key 
                                                    ? `linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(99, 102, 241, 0.05) 100%)`
                                                    : undefined,
                                                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)'
                                            }}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2.5 rounded-xl bg-gradient-to-br ${data.color} bg-opacity-20`}>
                                                    {getTypeIcon(key)}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-lg">{data.emoji}</span>
                                                        <span className="font-medium text-white">{data.label}</span>
                                                    </div>
                                                    <p className="text-xs text-white/50 mt-0.5">{data.description}</p>
                                                </div>
                                            </div>
                                        </motion.button>
                                    ))}
                                </div>

                                {/* Quick Templates - shown after type selection */}
                                {type && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        transition={{ delay: 0.1 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="flex items-center gap-2 mb-3">
                                            <FiAward className="w-4 h-4 text-primary-400" />
                                            <h4 className="text-sm font-medium text-white/70">Template rapidi</h4>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            {getTemplates(category)
                                                .filter(t => t.type === type)
                                                .slice(0, 4)
                                                .map((template, idx) => (
                                                    <motion.button
                                                        key={idx}
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: idx * 0.05 }}
                                                        onClick={() => applyTemplate(template)}
                                                        className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-primary-500/30 hover:bg-white/[0.04] transition-all text-left group"
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-sm text-white/80 group-hover:text-white transition-colors">{template.title}</span>
                                                            <FiArrowRight className="w-3.5 h-3.5 text-white/30 group-hover:text-primary-400 group-hover:translate-x-1 transition-all" />
                                                        </div>
                                                    </motion.button>
                                                ))}
                                        </div>
                                    </motion.div>
                                )}
                            </motion.div>
                        )}

                        {/* STEP 3: Details */}
                        {step === 'details' && type && (
                            <motion.div
                                key="details"
                                initial={{ opacity: 0, x: 30 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -30 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-5"
                            >
                                <div>
                                    <label className="block text-sm font-medium text-white/60 mb-2">
                                        Titolo <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="w-full px-4 py-3.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder-white/30 focus:border-primary-500/50 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                                        placeholder="es. Risparmiare €5000 per le vacanze"
                                        autoFocus
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-white/60 mb-2">
                                        Descrizione (opzionale)
                                    </label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder-white/30 focus:border-primary-500/50 focus:outline-none focus:ring-2 focus:ring-primary-500/20 resize-none transition-all"
                                        rows={2}
                                        placeholder="Aggiungi dettagli sul tuo obiettivo..."
                                    />
                                </div>

                                {(type === 'target' || type === 'challenge') && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-white/60 mb-2">
                                                Valore Target <span className="text-red-400">*</span>
                                            </label>
                                            <input
                                                type="number"
                                                value={targetValue}
                                                onChange={(e) => setTargetValue(e.target.value)}
                                                className="w-full px-4 py-3.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder-white/30 focus:border-primary-500/50 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                                                placeholder="1000"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-white/60 mb-2">
                                                Unità di misura
                                            </label>
                                            <input
                                                type="text"
                                                value={unit}
                                                onChange={(e) => setUnit(e.target.value)}
                                                className="w-full px-4 py-3.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder-white/30 focus:border-primary-500/50 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                                                placeholder="€, kg, ore..."
                                            />
                                        </div>
                                    </div>
                                )}

                                {type === 'habit' && (
                                    <div>
                                        <label className="block text-sm font-medium text-white/60 mb-2">
                                            Frequenza giornaliera
                                        </label>
                                        <div className="flex items-center gap-3">
                                            {[1, 2, 3, 4, 5].map((n) => (
                                                <motion.button
                                                    key={n}
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => setFrequency(String(n))}
                                                    className={`w-12 h-12 rounded-xl font-medium transition-all ${
                                                        frequency === String(n)
                                                            ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                                                            : 'bg-white/[0.03] text-white/60 hover:bg-white/[0.06]'
                                                    }`}
                                                >
                                                    {n}x
                                                </motion.button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-white/60 mb-2">
                                        Scadenza <span className="text-red-400">*</span>
                                    </label>
                                    <div className="relative">
                                        <FiCalendar className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 w-5 h-5" />
                                        <input
                                            type="date"
                                            value={deadline}
                                            onChange={(e) => setDeadline(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white focus:border-primary-500/50 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 4: Milestones */}
                        {step === 'milestones' && (
                            <motion.div
                                key="milestones"
                                initial={{ opacity: 0, x: 30 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -30 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-5"
                            >
                                {/* Info card */}
                                <div 
                                    className="p-4 rounded-2xl border border-white/[0.05]"
                                    style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(99, 102, 241, 0.02) 100%)' }}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 rounded-xl bg-primary-500/10 text-primary-400">
                                            <FiFlag className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="text-white font-medium">Suddividi in step più piccoli</h4>
                                            <p className="text-sm text-white/50 mt-0.5">
                                                Le milestone ti aiutano a tracciare i progressi. Questo step è opzionale.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Add Milestone Input */}
                                <div>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newMilestoneTitle}
                                            onChange={(e) => setNewMilestoneTitle(e.target.value)}
                                            onKeyDown={handleMilestoneKeyDown}
                                            className="flex-1 px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder-white/30 focus:border-primary-500/50 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                                            placeholder="es. Ricerca, Prima bozza..."
                                            maxLength={100}
                                        />
                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={addMilestone}
                                            disabled={!newMilestoneTitle.trim() || milestones.length >= 20}
                                            className="px-4 py-3 bg-primary-500/20 border border-primary-500/30 text-primary-400 rounded-xl hover:bg-primary-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                            <FiPlus className="w-5 h-5" />
                                        </motion.button>
                                    </div>
                                    <p className="text-xs text-white/40 mt-2">
                                        Premi Invio per aggiungere • {milestones.length}/20 milestone
                                    </p>
                                </div>

                                {/* Milestones List */}
                                {milestones.length > 0 ? (
                                    <div className="space-y-2">
                                        <AnimatePresence mode="popLayout">
                                            {milestones.map((milestone, index) => (
                                                <motion.div
                                                    key={`${milestone.title}-${index}`}
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: 20 }}
                                                    className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl group hover:bg-white/[0.04] transition-all"
                                                >
                                                    <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary-500/10 text-xs text-primary-400 font-semibold">
                                                        {index + 1}
                                                    </div>
                                                    <span className="flex-1 text-white/80 truncate text-sm">
                                                        {milestone.title}
                                                    </span>
                                                    <motion.button
                                                        whileHover={{ scale: 1.1 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={() => removeMilestone(index)}
                                                        className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-colors opacity-0 group-hover:opacity-100"
                                                    >
                                                        <FiTrash2 className="w-4 h-4" />
                                                    </motion.button>
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                    </div>
                                ) : (
                                    <div className="p-8 rounded-2xl border-2 border-dashed border-white/[0.06] text-center">
                                        <div className="w-12 h-12 rounded-full bg-white/[0.03] flex items-center justify-center mx-auto mb-3">
                                            <FiFlag className="w-6 h-6 text-white/30" />
                                        </div>
                                        <p className="text-white/50 text-sm">
                                            Nessuna milestone ancora
                                        </p>
                                        <p className="text-white/30 text-xs mt-1">
                                            Aggiungi milestone o salta questo step
                                        </p>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* STEP 5: Confirm */}
                        {step === 'confirm' && (
                            <motion.div
                                key="confirm"
                                initial={{ opacity: 0, x: 30 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -30 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-4"
                            >
                                <div 
                                    className="p-6 rounded-2xl border border-white/[0.06]"
                                    style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.01) 100%)' }}
                                >
                                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                        <FiCheck className="w-5 h-5 text-green-400" />
                                        Riepilogo Obiettivo
                                    </h3>
                                    
                                    <div className="space-y-4">
                                        {/* Category & Type */}
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.03] rounded-lg">
                                                <span className="text-lg">{category && GOAL_CATEGORIES[category].emoji}</span>
                                                <span className="text-sm text-white/70">{category && GOAL_CATEGORIES[category].label}</span>
                                            </div>
                                            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.03] rounded-lg">
                                                <span className="text-lg">{type && GOAL_TYPES[type].emoji}</span>
                                                <span className="text-sm text-white/70">{type && GOAL_TYPES[type].label}</span>
                                            </div>
                                        </div>

                                        {/* Title */}
                                        <div>
                                            <p className="text-xs text-white/40 mb-1">Titolo</p>
                                            <p className="text-lg text-white font-medium">{title}</p>
                                        </div>

                                        {description && (
                                            <div>
                                                <p className="text-xs text-white/40 mb-1">Descrizione</p>
                                                <p className="text-sm text-white/70">{description}</p>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-2 gap-4">
                                            {(type === 'target' || type === 'challenge') && targetValue && (
                                                <div>
                                                    <p className="text-xs text-white/40 mb-1">Target</p>
                                                    <p className="text-white font-medium">{targetValue} {unit}</p>
                                                </div>
                                            )}
                                            {type === 'habit' && (
                                                <div>
                                                    <p className="text-xs text-white/40 mb-1">Frequenza</p>
                                                    <p className="text-white font-medium">{frequency}x al giorno</p>
                                                </div>
                                            )}
                                            <div>
                                                <p className="text-xs text-white/40 mb-1">Scadenza</p>
                                                <p className="text-white font-medium">
                                                    {new Date(deadline).toLocaleDateString('it-IT', { 
                                                        day: 'numeric',
                                                        month: 'long', 
                                                        year: 'numeric' 
                                                    })}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Milestones */}
                                        {milestones.length > 0 && (
                                            <div>
                                                <p className="text-xs text-white/40 mb-2">
                                                    Milestone ({milestones.length})
                                                </p>
                                                <div className="flex flex-wrap gap-2">
                                                    {milestones.map((m, idx) => (
                                                        <span 
                                                            key={idx}
                                                            className="px-3 py-1 bg-white/[0.03] rounded-lg text-xs text-white/60"
                                                        >
                                                            {idx + 1}. {m.title}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer - iOS style actions */}
                <div 
                    className="relative z-10 px-8 py-5 border-t border-white/[0.06]"
                    style={{ background: 'rgba(255,255,255,0.01)' }}
                >
                    {/* Error message */}
                    <AnimatePresence>
                        {submitError && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl"
                            >
                                <p className="text-sm text-red-400 text-center">
                                    {submitError}
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    
                    <div className="flex items-center justify-between">
                        {step !== 'category' ? (
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={goBack}
                                className="flex items-center gap-2 px-5 py-2.5 bg-white/[0.03] border border-white/[0.06] text-white/70 rounded-xl font-medium hover:bg-white/[0.06] transition-all"
                            >
                                <FiArrowLeft className="w-4 h-4" />
                                Indietro
                            </motion.button>
                        ) : (
                            <div />
                        )}

                        {step === 'confirm' ? (
                            <motion.button
                                whileHover={{ scale: 1.02, boxShadow: '0 8px 30px rgba(99, 102, 241, 0.4)' }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-medium shadow-lg shadow-primary-500/20 transition-all disabled:opacity-50"
                            >
                                {isSubmitting ? (
                                    <span className="flex items-center gap-2">
                                        <motion.div 
                                            animate={{ rotate: 360 }}
                                            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                                            className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                                        />
                                        Creazione...
                                    </span>
                                ) : (
                                    <>
                                        <FiCheck className="w-4 h-4" />
                                        Crea Obiettivo
                                    </>
                                )}
                            </motion.button>
                        ) : (
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={goNext}
                                disabled={
                                    (step === 'category' && !category) ||
                                    (step === 'type' && !type) ||
                                    (step === 'details' && !title)
                                }
                                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-medium shadow-lg shadow-primary-500/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                Avanti
                                <FiArrowRight className="w-4 h-4" />
                            </motion.button>
                        )}
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};
