/**
 * 💀 SETTINGS SKELETON - Componente skeleton loading configurabile per tutte le sezioni settings
 *
 * Features:
 * - Configurazione flessibile tramite sezioni
 * - Animazioni staggered con delay progressivo
 * - Pattern visivi consistenti con bg-white/10
 */

import { motion } from 'framer-motion';
import { cn } from '../../../lib/utils';

export type SectionConfig =
    | { type: 'header'; iconSize?: 'sm' | 'md' | 'lg'; titleWidth?: number; subtitleWidth?: number }
    | { type: 'avatar' }
    | { type: 'grid'; fields: number; columns?: 1 | 2 | 3 }
    | { type: 'textarea' }
    | { type: 'row'; iconSize?: 'sm' | 'md' }
    | { type: 'card-row'; rows?: number }
    | { type: 'toggle-row'; rows?: number }
    | { type: 'session-row'; rows?: number }
    | { type: 'button-bar'; leftWidth?: number; buttonWidth?: number };

interface SettingsSkeletonProps {
    sections: SectionConfig[];
    className?: string;
    baseDelay?: number;
}

/**
 * Calcola il delay progressivo per ogni elemento
 */
const useStaggeredDelay = (baseDelay: number = 0) => {
    let currentDelay = baseDelay;
    return () => {
        const delay = currentDelay;
        currentDelay += 0.05;
        return delay;
    };
};

export const SettingsSkeleton = ({ sections, className, baseDelay = 0 }: SettingsSkeletonProps) => {
    const getDelay = useStaggeredDelay(baseDelay);

    return (
        <div className={cn('space-y-6 animate-pulse', className)}>
            {sections.map((section, sectionIndex) => (
                <SkeletonSection key={sectionIndex} config={section} getDelay={getDelay} />
            ))}
        </div>
    );
};

interface SkeletonSectionProps {
    config: SectionConfig;
    getDelay: () => number;
}

const SkeletonSection = ({ config, getDelay }: SkeletonSectionProps) => {
    switch (config.type) {
        case 'header':
            return <HeaderSection config={config} getDelay={getDelay} />;
        case 'avatar':
            return <AvatarSection getDelay={getDelay} />;
        case 'grid':
            return <GridSection config={config} getDelay={getDelay} />;
        case 'textarea':
            return <TextareaSection getDelay={getDelay} />;
        case 'row':
            return <RowSection config={config} getDelay={getDelay} />;
        case 'card-row':
            return <CardRowSection config={config} getDelay={getDelay} />;
        case 'toggle-row':
            return <ToggleRowSection config={config} getDelay={getDelay} />;
        case 'session-row':
            return <SessionRowSection config={config} getDelay={getDelay} />;
        case 'button-bar':
            return <ButtonBarSection config={config} getDelay={getDelay} />;
        default:
            return null;
    }
};

// ============================================
// HEADER SECTION (icon + title + subtitle)
// ============================================
const HeaderSection = ({
    config,
    getDelay,
}: {
    config: Extract<SectionConfig, { type: 'header' }>;
    getDelay: () => number;
}) => {
    const iconSizes = { sm: 'w-5 h-5', md: 'w-10 h-10', lg: 'w-12 h-12' };
    const iconRounded = { sm: 'rounded', md: 'rounded-lg', lg: 'rounded-xl' };
    const iconSize = config.iconSize || 'md';

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: getDelay() }}
            className="flex items-center gap-2"
        >
            <div className={cn(iconSizes[iconSize], iconRounded[iconSize], 'bg-white/10')} />
            <div className="h-5 w-48 bg-white/10 rounded" />
        </motion.div>
    );
};

// ============================================
// AVATAR SECTION (Profile page)
// ============================================
const AvatarSection = ({ getDelay }: { getDelay: () => number }) => {
    const delay = getDelay();
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
            className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08]"
        >
            <div className="w-20 h-20 rounded-full bg-white/10" />
            <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-white/10 rounded" />
                <div className="h-3 w-48 bg-white/10 rounded" />
            </div>
        </motion.div>
    );
};

// ============================================
// GRID SECTION (form fields)
// ============================================
const GridSection = ({
    config,
    getDelay,
}: {
    config: Extract<SectionConfig, { type: 'grid' }>;
    getDelay: () => number;
}) => {
    const gridCols = config.columns === 3 ? 'xl:grid-cols-3' : config.columns === 1 ? '' : 'md:grid-cols-2';

    return (
        <div className={cn('grid grid-cols-1 gap-4 md:gap-5', gridCols)}>
            {[...Array(config.fields)].map((_, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: getDelay() }}
                    className="space-y-2"
                >
                    <div className="h-4 w-20 bg-white/10 rounded" />
                    <div className="h-12 w-full bg-white/10 rounded-xl" />
                </motion.div>
            ))}
        </div>
    );
};

// ============================================
// TEXTAREA SECTION (bio field)
// ============================================
const TextareaSection = ({ getDelay }: { getDelay: () => number }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: getDelay() }}
            className="space-y-2"
        >
            <div className="h-4 w-16 bg-white/10 rounded" />
            <div className="h-32 w-full bg-white/10 rounded-xl" />
        </motion.div>
    );
};

// ============================================
// ROW SECTION (email card, 2FA card)
// ============================================
const RowSection = ({
    config,
    getDelay,
}: {
    config: Extract<SectionConfig, { type: 'row' }>;
    getDelay: () => number;
}) => {
    const iconSizes = { sm: 'w-10 h-10', md: 'w-12 h-12' };
    const iconRounded = { sm: 'rounded-lg', md: 'rounded-xl' };
    const iconSize = config.iconSize || 'sm';

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: getDelay() }}
            className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 flex items-center gap-3"
        >
            <div className={cn(iconSizes[iconSize], iconRounded[iconSize], 'bg-white/10')} />
            <div className="flex-1 space-y-2">
                <div className="h-3 w-20 bg-white/10 rounded" />
                <div className="h-4 w-40 bg-white/10 rounded" />
            </div>
        </motion.div>
    );
};

// ============================================
// CARD ROW SECTION (Privacy overview)
// ============================================
const CardRowSection = ({
    getDelay,
}: {
    config: Extract<SectionConfig, { type: 'card-row' }>;
    getDelay: () => number;
}) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: getDelay() }}
            className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6"
        >
            <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-white/10" />
                <div className="space-y-2">
                    <div className="h-5 w-48 bg-white/10 rounded" />
                    <div className="h-3 w-64 bg-white/10 rounded" />
                </div>
            </div>
        </motion.div>
    );
};

// ============================================
// TOGGLE ROW SECTION (Notifications, Privacy)
// ============================================
const ToggleRowSection = ({
    config,
    getDelay,
}: {
    config: Extract<SectionConfig, { type: 'toggle-row' }>;
    getDelay: () => number;
}) => {
    const rows = config.rows || 3;

    return (
        <div className="space-y-3">
            {[...Array(rows)].map((_, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: getDelay() }}
                    className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]"
                >
                    <div className="space-y-2">
                        <div className="h-4 w-32 bg-white/10 rounded" />
                        <div className="h-3 w-56 bg-white/10 rounded" />
                    </div>
                    <div className="w-12 h-6 rounded-full bg-white/10" />
                </motion.div>
            ))}
        </div>
    );
};

// ============================================
// SESSION ROW SECTION (Security sessions)
// ============================================
const SessionRowSection = ({
    config,
    getDelay,
}: {
    config: Extract<SectionConfig, { type: 'session-row' }>;
    getDelay: () => number;
}) => {
    const rows = config.rows || 3;

    return (
        <div className="space-y-3">
            {[...Array(rows)].map((_, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: getDelay() }}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/[0.05]"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-white/10" />
                        <div className="space-y-1">
                            <div className="h-4 w-32 bg-white/10 rounded" />
                            <div className="h-3 w-48 bg-white/10 rounded" />
                        </div>
                    </div>
                    <div className="h-8 w-24 bg-white/10 rounded-lg" />
                </motion.div>
            ))}
        </div>
    );
};

// ============================================
// BUTTON BAR SECTION (footer with submit)
// ============================================
const ButtonBarSection = ({
    config,
    getDelay,
}: {
    config: Extract<SectionConfig, { type: 'button-bar' }>;
    getDelay: () => number;
}) => {
    const leftWidth = config.leftWidth || 32;
    const buttonWidth = config.buttonWidth || 36;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: getDelay() }}
            className="flex items-center justify-between pt-4 border-t border-white/[0.08]"
        >
            <div className={cn('h-4 bg-white/10 rounded')} style={{ width: leftWidth * 4 }} />
            <div className={cn('h-12 bg-white/10 rounded-xl')} style={{ width: buttonWidth * 4 }} />
        </motion.div>
    );
};

export default SettingsSkeleton;
