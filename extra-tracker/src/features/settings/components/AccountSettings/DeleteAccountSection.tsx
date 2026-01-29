/**
 * DeleteAccountSection - Sezione per l'eliminazione dell'account
 * 
 * Questo componente gestisce l'eliminazione permanente dell'account.
 * È una funzionalità critica che richiede:
 * - Conferma esplicita dell'utente (digitare "DELETE")
 * - Password per sicurezza aggiuntiva
 * - Warning chiari sui rischi
 * 
 * @component
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, AlertTriangle, Shield } from 'lucide-react';
import { SettingsInput, SettingsPasswordInput } from '../fields';
import { SettingsError, SettingsSuccess } from '../feedback';
import { ANIMATION_CONFIG, DELETE_CONFIRMATION_TEXT } from './constants';
import { validateDeleteForm, getResetDeleteFormState } from './utils';

interface DeleteAccountSectionProps {
    /** Indica se l'operazione di eliminazione è in corso */
    isLoading: boolean;
    
    /** Messaggio di errore (se presente) */
    error: string | null;
    
    /** Indica se l'eliminazione è stata completata con successo */
    success: boolean;
    
    /** Callback per eliminare l'account */
    onDelete: (password: string, confirmation: string) => Promise<boolean>;
}

/**
 * Componente per la sezione di eliminazione account
 * 
 * Mostra un'interfaccia chiara con warning visivi per prevenire
 * eliminazioni accidentali. Richiede conferma esplicita e password.
 */
export function DeleteAccountSection({ 
    isLoading, 
    error, 
    success, 
    onDelete 
}: DeleteAccountSectionProps) {
    // Stato locale per il form di eliminazione
    const [password, setPassword] = useState('');
    const [confirmation, setConfirmation] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteErrors, setDeleteErrors] = useState<{ password?: string; confirmation?: string }>({});

    /**
     * Gestisce l'invio del form di eliminazione
     * 
     * Valida i campi, mostra errori se necessario, e chiama
     * il callback onDelete solo se la validazione passa.
     */
    const handleDelete = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Valida il form prima di procedere
        const errors = validateDeleteForm(password, confirmation);
        if (Object.keys(errors).length > 0) {
            setDeleteErrors(errors);
            return;
        }

        // Chiama il callback per eliminare l'account
        const deleteSuccess = await onDelete(password, confirmation);
        if (deleteSuccess) {
            // Reset del form dopo eliminazione riuscita
            const resetState = getResetDeleteFormState();
            setPassword(resetState.password);
            setConfirmation(resetState.confirmation);
            setShowDeleteConfirm(false);
            setDeleteErrors(resetState.deleteErrors);
        }
    };

    /**
     * Resetta il form quando l'utente annulla
     */
    const handleCancel = () => {
        const resetState = getResetDeleteFormState();
        setPassword(resetState.password);
        setConfirmation(resetState.confirmation);
        setShowDeleteConfirm(false);
        setDeleteErrors(resetState.deleteErrors);
    };

    /**
     * Rimuove l'errore di un campo quando l'utente inizia a digitare
     */
    const clearFieldError = (field: 'password' | 'confirmation') => {
        setDeleteErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[field];
            return newErrors;
        });
    };

    // Determina se il pulsante di eliminazione è abilitato
    const isDeleteEnabled = confirmation === DELETE_CONFIRMATION_TEXT && password.trim().length > 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
                duration: ANIMATION_CONFIG.DURATION_LONG, 
                delay: ANIMATION_CONFIG.DELAY_LONG,
                ease: ANIMATION_CONFIG.EASING_SMOOTH 
            }}
            className="group relative overflow-hidden rounded-3xl 
                       border-2 border-red-500/30 
                       bg-red-500/10
                       backdrop-blur-2xl backdrop-saturate-150
                       shadow-[0_8px_32px_0_rgba(239,68,68,0.2),inset_0_1px_0_0_rgba(255,255,255,0.08)]
                       p-8 transition-all duration-500
                       hover:border-red-500/40 hover:shadow-[0_12px_48px_0_rgba(239,68,68,0.25),inset_0_1px_0_0_rgba(255,255,255,0.12)]"
        >
            {/* Overlay gradient per feedback visivo */}
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/[0.05] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            
            <div className="relative flex items-start gap-6 mb-8">
                {/* Icona con animazione */}
                <motion.div
                    whileHover={{ scale: 1.05, rotate: -5 }}
                    className="flex-shrink-0 p-4 rounded-2xl 
                               bg-red-500/20
                               border border-red-500/30
                               backdrop-blur-sm"
                >
                    <AlertTriangle className="w-7 h-7 text-red-400" strokeWidth={2.5} />
                </motion.div>
                
                <div className="flex-1 min-w-0">
                    <h3 className="text-2xl font-bold text-red-300 mb-2 tracking-tight">
                        Zona pericolosa
                    </h3>
                    <p className="text-[15px] text-white/70 leading-relaxed">
                        Eliminare il tuo account è un'azione permanente e irreversibile. Tutti i tuoi dati, 
                        esami, progetti e attività verranno eliminati definitivamente.
                    </p>
                </div>
            </div>

            {/* Mostra il pulsante iniziale o il form di conferma */}
            {!showDeleteConfirm ? (
                <motion.button
                    onClick={() => setShowDeleteConfirm(true)}
                    whileHover={{ scale: 1.01, y: -1 }}
                    whileTap={{ scale: 0.99 }}
                    className="w-full px-6 py-4 rounded-2xl
                               bg-red-500/25
                               border border-red-500/35
                               text-red-100 font-bold text-[15px]
                               backdrop-blur-sm
                               hover:bg-red-500/30
                               hover:border-red-400/45
                               hover:text-white
                               transition-all duration-300
                               flex items-center justify-center gap-3"
                >
                    <Trash2 className="w-5 h-5" strokeWidth={2.5} />
                    <span>Elimina account</span>
                </motion.button>
            ) : (
                <motion.form
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ 
                        duration: ANIMATION_CONFIG.DURATION_STANDARD, 
                        ease: ANIMATION_CONFIG.EASING_SMOOTH 
                    }}
                    onSubmit={handleDelete}
                    className="space-y-5"
                >
                    {/* Warning box con informazioni critiche */}
                    <DeleteWarningBox />

                    {/* Campo password */}
                    <SettingsPasswordInput
                        label="Password account"
                        name="password"
                        value={password}
                        onChange={(e) => {
                            setPassword(e.target.value);
                            clearFieldError('password');
                        }}
                        error={deleteErrors.password}
                        icon={Shield}
                        autoComplete="current-password"
                    />

                    {/* Campo conferma */}
                    <SettingsInput
                        label="Conferma eliminazione"
                        name="confirmation"
                        value={confirmation}
                        onChange={(e) => {
                            setConfirmation(e.target.value);
                            clearFieldError('confirmation');
                        }}
                        error={deleteErrors.confirmation}
                        icon={AlertTriangle}
                        placeholder="Scrivi DELETE per confermare"
                        autoComplete="off"
                        hint="Digita DELETE per confermare l'eliminazione"
                    />

                    {/* Messaggi di stato (errore o successo) */}
                    <AnimatePresence>
                        {error && (
                            <SettingsError
                                message={error}
                                title="Errore nell'eliminazione"
                            />
                        )}
                        {success && (
                            <SettingsSuccess
                                message="Account eliminato con successo"
                                title="Account rimosso"
                            />
                        )}
                    </AnimatePresence>

                    {/* Pulsanti di azione */}
                    <div className="flex items-center gap-3 pt-2">
                        <motion.button
                            type="button"
                            onClick={handleCancel}
                            whileHover={{ scale: 1.01, y: -1 }}
                            whileTap={{ scale: 0.99 }}
                            className="flex-1 px-5 py-3.5 rounded-xl
                                       bg-gray-800/40 border border-white/10
                                       text-white/80 font-semibold text-[14px]
                                       hover:bg-gray-700/50 hover:border-white/15 hover:text-white
                                       transition-all duration-300"
                        >
                            Annulla
                        </motion.button>
                        <motion.button
                            type="submit"
                            disabled={isLoading || !isDeleteEnabled}
                            whileHover={isDeleteEnabled ? { scale: 1.01, y: -1 } : {}}
                            whileTap={isDeleteEnabled ? { scale: 0.99 } : {}}
                            className={`flex-1 px-5 py-3.5 rounded-xl
                                       bg-red-500/30
                                       border border-red-500/40
                                       text-red-100 font-bold text-[14px]
                                       backdrop-blur-sm
                                       hover:bg-red-500/35
                                       hover:border-red-400/50
                                       hover:text-white
                                       disabled:opacity-40 disabled:cursor-not-allowed
                                       transition-all duration-300
                                       flex items-center justify-center gap-2.5`}
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center gap-2.5">
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                                    />
                                    <span>Eliminazione...</span>
                                </span>
                            ) : (
                                <>
                                    <Trash2 className="w-4 h-4" strokeWidth={2.5} />
                                    <span>Elimina definitivamente</span>
                                </>
                            )}
                        </motion.button>
                    </div>
                </motion.form>
            )}
        </motion.div>
    );
}

/**
 * Componente per il warning box nella sezione di eliminazione
 */
function DeleteWarningBox() {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-5 rounded-2xl 
                       bg-red-500/15
                       border border-red-500/25
                       backdrop-blur-sm"
        >
            <div className="flex items-start gap-4">
                <div className="flex-shrink-0 p-2 rounded-xl bg-red-500/20 border border-red-500/30">
                    <Shield className="w-5 h-5 text-red-400" strokeWidth={2.5} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-red-300 mb-2 tracking-tight">
                        Attenzione!
                    </p>
                    <p className="text-[14px] text-white/70 leading-relaxed">
                        Questa azione non può essere annullata. Assicurati di aver esportato i tuoi dati 
                        prima di procedere.
                    </p>
                </div>
            </div>
        </motion.div>
    );
}
