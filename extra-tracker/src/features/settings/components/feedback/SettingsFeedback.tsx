/**
 * 💬 SETTINGS FEEDBACK - Componenti per feedback visivi standardizzati
 * 
 * Componenti unificati per mostrare messaggi di successo, errore, warning e info
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    CheckCircle2, 
    AlertCircle, 
    AlertTriangle, 
    Info,
    X
} from 'lucide-react';

export type FeedbackType = 'success' | 'error' | 'warning' | 'info';

interface BaseFeedbackProps {
    type: FeedbackType;
    message: string;
    title?: string;
    onDismiss?: () => void;
    className?: string;
}

const feedbackConfig: Record<FeedbackType, {
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    iconColor: string;
    bgColor: string;
    borderColor: string;
    textColor: string;
}> = {
    success: {
        icon: CheckCircle2,
        iconColor: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/30',
        textColor: 'text-emerald-300',
    },
    error: {
        icon: AlertCircle,
        iconColor: 'text-red-400',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/30',
        textColor: 'text-red-300',
    },
    warning: {
        icon: AlertTriangle,
        iconColor: 'text-amber-400',
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/30',
        textColor: 'text-amber-300',
    },
    info: {
        icon: Info,
        iconColor: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/30',
        textColor: 'text-blue-300',
    },
};

/**
 * Componente base per feedback
 */
export const SettingsFeedback: React.FC<BaseFeedbackProps> = ({
    type,
    message,
    title,
    onDismiss,
    className = '',
}) => {
    const config = feedbackConfig[type];
    const Icon = config.icon;

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`rounded-xl border ${config.borderColor} ${config.bgColor} p-4 flex items-start gap-3 ${className}`}
        >
            <Icon className={`w-5 h-5 ${config.iconColor} flex-shrink-0 mt-0.5`} />
            <div className="flex-1 min-w-0">
                {title && (
                    <h4 className={`text-sm font-semibold ${config.textColor} mb-1`}>
                        {title}
                    </h4>
                )}
                <p className={`text-sm ${config.textColor}`}>
                    {message}
                </p>
            </div>
            {onDismiss && (
                <button
                    onClick={onDismiss}
                    className={`flex-shrink-0 p-1 rounded-lg hover:bg-white/5 transition-colors ${config.textColor} hover:opacity-80`}
                    aria-label="Chiudi"
                >
                    <X className="w-4 h-4" />
                </button>
            )}
        </motion.div>
    );
};

/**
 * Feedback di successo
 */
export const SettingsSuccess: React.FC<Omit<BaseFeedbackProps, 'type'>> = (props) => (
    <SettingsFeedback type="success" {...props} />
);

/**
 * Feedback di errore
 */
export const SettingsError: React.FC<Omit<BaseFeedbackProps, 'type'>> = (props) => (
    <SettingsFeedback type="error" {...props} />
);

/**
 * Feedback di warning
 */
export const SettingsWarning: React.FC<Omit<BaseFeedbackProps, 'type'>> = (props) => (
    <SettingsFeedback type="warning" {...props} />
);

/**
 * Feedback informativo
 */
export const SettingsInfo: React.FC<Omit<BaseFeedbackProps, 'type'>> = (props) => (
    <SettingsFeedback type="info" {...props} />
);

/**
 * Container per mostrare feedback multipli
 */
interface SettingsFeedbackContainerProps {
    children: React.ReactNode;
    className?: string;
}

export const SettingsFeedbackContainer: React.FC<SettingsFeedbackContainerProps> = ({
    children,
    className = '',
}) => {
    return (
        <AnimatePresence mode="wait">
            <div className={`space-y-3 ${className}`}>
                {children}
            </div>
        </AnimatePresence>
    );
};
