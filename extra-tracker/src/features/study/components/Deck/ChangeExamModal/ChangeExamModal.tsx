/**
 * ChangeExamModal - Modal per cambiare l'esame associato a un deck
 * 
 * Questo componente fornisce un'interfaccia user-friendly per permettere
 * all'utente di cambiare rapidamente l'esame associato a un mazzo senza
 * dover navigare nelle impostazioni del deck.
 * 
 * FUNZIONALITÀ:
 * - Carica automaticamente tutti gli esami disponibili
 * - Mostra l'esame corrente
 * - Permette di selezionare un nuovo esame da un dropdown
 * - Valida che l'esame selezionato sia valido
 * - Mostra feedback visivo durante le operazioni
 * - Gestisce gli errori in modo elegante
 * 
 * DESIGN:
 * - Modal moderno con glassmorphism
 * - Animazioni fluide per migliorare l'UX
 * - Feedback chiaro per ogni azione
 * - Responsive e accessibile
 * 
 * @component
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { studyService } from '../../../services/studyService';
import examService from '../../../services/examService';
import type { Exam } from '../../../types/exam';
import { emitToast } from '../../../../../shared/components/toast';
import { getErrorMessage } from '../../../../../utils/errorMessage';
import type { ChangeExamModalProps } from './types';
import { USER_MESSAGES, ANIMATION_CONFIG } from './constants';

/**
 * Componente principale per il modal di cambio esame
 * 
 * Gestisce tutto il flusso di cambio esame:
 * 1. Carica gli esami disponibili all'apertura
 * 2. Mostra l'esame corrente
 * 3. Permette la selezione di un nuovo esame
 * 4. Valida e salva il cambio
 * 5. Fornisce feedback all'utente
 * 
 * @param props - Le props del componente (vedi ChangeExamModalProps)
 * @returns Il componente ChangeExamModal renderizzato
 * 
 * @example
 * ```tsx
 * <ChangeExamModal
 *   isOpen={isModalOpen}
 *   deck={selectedDeck}
 *   onExamChanged={(updatedDeck) => {
 *     setDecks(prev => prev.map(d => d.id === updatedDeck.id ? updatedDeck : d));
 *   }}
 *   onClose={() => setIsModalOpen(false)}
 * />
 * ```
 */
export function ChangeExamModal({
    deck,
    onExamChanged,
    onClose,
    isOpen,
}: ChangeExamModalProps) {
    // ============================================
    // STATE MANAGEMENT
    // ============================================
    
    /**
     * Stato per l'esame selezionato nel dropdown.
     * Inizializzato con l'esame corrente del deck.
     */
    const [selectedExamId, setSelectedExamId] = useState<string | null>(
        deck.examId || null
    );
    
    /**
     * Lista degli esami disponibili per la selezione.
     * Viene popolata caricando tutti gli esami attivi.
     */
    const [availableExams, setAvailableExams] = useState<Exam[]>([]);
    
    /**
     * Flag per indicare se gli esami sono in fase di caricamento.
     * Mostra un indicatore di loading durante il fetch.
     */
    const [isLoadingExams, setIsLoadingExams] = useState(false);
    
    /**
     * Flag per indicare se l'operazione di salvataggio è in corso.
     * Disabilita i controlli durante il salvataggio per prevenire doppi click.
     */
    const [isSaving, setIsSaving] = useState(false);
    
    /**
     * Eventuale messaggio di errore da mostrare all'utente.
     * Null se non ci sono errori.
     */
    const [error, setError] = useState<string | null>(null);

    // ============================================
    // DATA LOADING
    // ============================================
    
    /**
     * Carica tutti gli esami disponibili dal backend.
     * 
     * Gli esami sono filtrati per status 'active'
     * 
     * Questa funzione viene chiamata quando il modal si apre
     * per assicurarsi di avere sempre i dati più aggiornati.
     */
    const loadAvailableExams = useCallback(async () => {
        try {
            setIsLoadingExams(true);
            setError(null);
            
            const allExams = await examService.getAll();
            const activeExams = allExams.filter((exam) => exam.status === 'active');
            
            setAvailableExams(activeExams);
            
            if (activeExams.length === 0) {
                setError(USER_MESSAGES.NO_EXAMS_AVAILABLE);
            }
        } catch (err: unknown) {
            console.error('Errore nel caricamento degli esami:', err);
            setError(getErrorMessage(err) || USER_MESSAGES.ERROR_GENERIC);
            emitToast.error('Errore nel caricamento degli esami');
        } finally {
            setIsLoadingExams(false);
        }
    }, []);

    // ============================================
    // LIFECYCLE HOOKS
    // ============================================
    
    /**
     * Effetto che carica gli esami quando il modal si apre.
     * 
     * Inoltre, resetta lo stato quando il modal si chiude o quando
     * cambia il deck, per assicurarsi che i dati siano sempre sincronizzati.
     */
    useEffect(() => {
        if (isOpen) {
            // Reset dello stato quando il modal si apre
            setSelectedExamId(deck.examId || null);
            setError(null);
            
            // Carica gli esami disponibili
            loadAvailableExams();
        }
    }, [isOpen, deck.examId, loadAvailableExams]);

    // ============================================
    // EVENT HANDLERS
    // ============================================
    
    /**
     * Gestisce il cambio di esame selezionato nel dropdown.
     * 
     * Aggiorna lo stato locale con l'ID dell'esame selezionato
     * e rimuove eventuali errori precedenti.
     * 
     * @param event - L'evento di cambio del select
     */
    const handleExamSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const newExamId = event.target.value || null;
        setSelectedExamId(newExamId);
        setError(null); // Rimuove eventuali errori precedenti
    };

    /**
     * Gestisce il salvataggio del cambio esame.
     * 
     * Valida che:
     * - Un esame sia stato selezionato
     * - L'esame selezionato sia diverso da quello corrente
     * 
     * Se la validazione passa, chiama il backend per aggiornare
     * l'examId del deck e notifica il componente padre tramite
     * il callback onExamChanged.
     */
    const handleSave = async () => {
        // Validazione: verifica che un esame sia stato selezionato
        if (!selectedExamId || selectedExamId.trim() === '') {
            setError(USER_MESSAGES.NO_EXAM_SELECTED);
            emitToast.error(USER_MESSAGES.NO_EXAM_SELECTED);
            return;
        }

        // Validazione: verifica che l'esame selezionato sia diverso da quello corrente
        if (selectedExamId === deck.examId) {
            setError(USER_MESSAGES.SAME_EXAM);
            emitToast.info(USER_MESSAGES.SAME_EXAM);
            return;
        }

        try {
            setIsSaving(true);
            setError(null);

            // Chiama il backend per aggiornare l'examId del deck
            const updatedDeck = await studyService.updateDeckOrganization(deck.id, {
                examId: selectedExamId,
            });

            // Notifica il componente padre del cambio
            onExamChanged(updatedDeck);

            // Mostra un messaggio di successo
            emitToast.success(USER_MESSAGES.SUCCESS, {
                title: USER_MESSAGES.SUCCESS_TITLE,
            });

            // Chiude il modal dopo il successo
            onClose?.();
        } catch (err: unknown) {
            console.error('Errore nel cambio esame:', err);
            const errorMessage = getErrorMessage(err) || USER_MESSAGES.ERROR_GENERIC;
            setError(errorMessage);
            emitToast.error(errorMessage);
        } finally {
            setIsSaving(false);
        }
    };

    /**
     * Gestisce la chiusura del modal.
     * 
     * Resetta lo stato e chiama il callback onClose se fornito.
     */
    const handleClose = () => {
        setSelectedExamId(deck.examId || null);
        setError(null);
        onClose?.();
    };

    // ============================================
    // COMPUTED VALUES
    // ============================================
    
    /**
     * Trova l'esame corrente per mostrarlo all'utente.
     * 
     * Cerca nell'array degli esami disponibili quello che corrisponde
     * all'examId del deck corrente.
     */
    const currentExam = availableExams.find((exam) => exam.id === deck.examId);

    /**
     * Determina se il pulsante di salvataggio deve essere abilitato.
     * 
     * Il pulsante è abilitato se:
     * - Un esame è stato selezionato
     * - L'esame selezionato è diverso da quello corrente
     * - Non è in corso un'operazione di salvataggio
     */
    const isSaveEnabled =
        selectedExamId !== null &&
        selectedExamId !== deck.examId &&
        !isSaving;

    // ============================================
    // RENDER
    // ============================================
    
    // Non renderizza nulla se il modal non è aperto
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {/* Backdrop con blur per mettere in evidenza il modal */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: ANIMATION_CONFIG.DURATION_STANDARD }}
                className="fixed inset-0 bg-theme-overlay backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={handleClose}
            >
                {/* Modal Container - Click sul contenuto non chiude il modal */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    transition={{
                        duration: ANIMATION_CONFIG.DURATION_LONG,
                        ease: ANIMATION_CONFIG.EASING_SMOOTH,
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-md rounded-3xl border border-theme-subtle
                               bg-theme-card
                               backdrop-blur-2xl backdrop-saturate-150
                               shadow-2xl
                               overflow-hidden"
                >
                    {/* Header del Modal */}
                    <div className="p-6 border-b border-theme-subtle">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-primary-500/20 border border-primary-500/30">
                                    <BookOpen className="w-5 h-5 text-primary-400" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-theme-primary">
                                        Cambia Esame
                                    </h2>
                                    <p className="text-sm text-theme-muted mt-0.5">
                                        Sposta il mazzo a un altro esame
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleClose}
                                className="p-2 rounded-lg hover:bg-theme-surface-hover transition-colors
                                           text-theme-muted hover:text-theme-primary"
                                aria-label="Chiudi modal"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Contenuto del Modal */}
                    <div className="p-6 space-y-6">
                        {/* Informazioni sul Deck */}
                        <div className="rounded-xl border border-theme-subtle bg-theme-surface p-4">
                            <p className="text-sm text-theme-muted mb-1">Mazzo</p>
                            <p className="font-semibold text-theme-primary">{deck.title}</p>
                        </div>

                        {/* Esame Corrente */}
                        {currentExam && (
                            <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
                                <p className="text-sm text-blue-300 mb-1 font-medium">
                                    Esame corrente
                                </p>
                                <p className="text-theme-primary font-semibold">{currentExam.title}</p>
                            </div>
                        )}

                        {/* Selezione Nuovo Esame */}
                        <div>
                            <label className="block text-sm font-medium text-theme-secondary mb-2">
                                Seleziona nuovo esame
                            </label>
                            {isLoadingExams ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-6 h-6 text-primary-400 animate-spin" />
                                </div>
                            ) : (
                                <select
                                    value={selectedExamId || ''}
                                    onChange={handleExamSelectChange}
                                    disabled={isSaving || availableExams.length === 0}
                                    className="w-full px-4 py-3 rounded-xl bg-theme-surface border border-theme-subtle
                                               text-theme-primary focus:outline-none focus:ring-2 focus:ring-primary-500
                                               disabled:opacity-50 disabled:cursor-not-allowed
                                               transition-all"
                                >
                                    {availableExams.length === 0 ? (
                                        <option value="">
                                            Nessun esame disponibile
                                        </option>
                                    ) : (
                                        availableExams.map((exam) => (
                                            <option key={exam.id} value={exam.id}>
                                                {exam.title}
                                            </option>
                                        ))
                                    )}
                                </select>
                            )}
                        </div>

                        {/* Messaggio di Errore */}
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-start gap-3 p-4 rounded-xl 
                                           bg-red-500/10 border border-red-500/30"
                            >
                                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-red-300">{error}</p>
                            </motion.div>
                        )}

                        {/* Pulsanti di Azione */}
                        <div className="flex items-center gap-3 pt-2">
                            <motion.button
                                type="button"
                                onClick={handleClose}
                                disabled={isSaving}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="flex-1 px-4 py-3 rounded-xl bg-theme-surface border border-theme-subtle
                                           text-theme-secondary font-semibold hover:bg-theme-surface-hover hover:text-theme-primary
                                           disabled:opacity-50 disabled:cursor-not-allowed
                                           transition-all"
                            >
                                Annulla
                            </motion.button>
                            <motion.button
                                type="button"
                                onClick={handleSave}
                                disabled={!isSaveEnabled}
                                whileHover={isSaveEnabled ? { scale: 1.02 } : {}}
                                whileTap={isSaveEnabled ? { scale: 0.98 } : {}}
                                className="flex-1 px-4 py-3 rounded-xl bg-primary-500 hover:bg-primary-600
                                           text-white font-semibold flex items-center justify-center gap-2
                                           disabled:opacity-50 disabled:cursor-not-allowed
                                           transition-all shadow-lg shadow-primary-500/30"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Salvataggio...</span>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-4 h-4" />
                                        <span>Cambia Esame</span>
                                    </>
                                )}
                            </motion.button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
