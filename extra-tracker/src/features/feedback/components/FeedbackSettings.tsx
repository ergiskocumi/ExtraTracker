/**
 * 📝 FEEDBACK SETTINGS - Tab Feedback nelle Impostazioni
 *
 * Contenitore con:
 * - Bottone "Segnala problema" che apre FeedbackModal
 * - Lista dei propri feedback (MyFeedbackList)
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Plus } from 'lucide-react';
import { FeedbackModal } from './FeedbackModal';
import { MyFeedbackList } from './MyFeedbackList';

export const FeedbackSettings: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const handleSuccess = () => {
        // Trigger refresh della lista
        setRefreshTrigger((prev) => prev + 1);
    };

    return (
        <div className="space-y-8">
            {/* Header Section */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-lg font-semibold text-white">
                            Segnala un problema
                        </h3>
                        <p className="text-sm text-white/60 mt-1">
                            Hai trovato un bug o vuoi suggerire un miglioramento? Faccelo sapere!
                        </p>
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-medium transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Nuovo Feedback
                    </motion.button>
                </div>

                {/* Info Card */}
                <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
                    <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-blue-500/15">
                            <MessageSquare className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <h4 className="font-medium text-white text-sm">
                                Come funziona?
                            </h4>
                            <ul className="mt-2 space-y-1 text-sm text-white/60">
                                <li className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
                                    Descrivi il problema o la tua idea
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
                                    Puoi allegare screenshot per aiutarci a capire meglio
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
                                    Ti terremo aggiornato sullo stato della segnalazione
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* Divider */}
            <div className="border-t border-white/10" />

            {/* My Feedbacks Section */}
            <div className="space-y-4">
                <div>
                    <h3 className="text-lg font-semibold text-white">
                        I miei feedback
                    </h3>
                    <p className="text-sm text-white/60 mt-1">
                        Traccia lo stato delle tue segnalazioni
                    </p>
                </div>

                <MyFeedbackList refreshTrigger={refreshTrigger} />
            </div>

            {/* Modal */}
            <FeedbackModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={handleSuccess}
            />
        </div>
    );
};
