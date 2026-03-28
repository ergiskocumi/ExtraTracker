/**
 * 🏷️ TAG CLOUD - Sidebar con tag colorati
 * 
 * Design migliorato con:
 * - Tag colorati con cerchi e badge
 * - Creazione rapida con color picker
 * - Micro-interazioni e animazioni
 * - Empty state accattivante
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tag as TagIcon, Plus } from 'lucide-react';
import { tagsService, type Tag } from '../../services/tagsService';
import { emitToast } from '../../../../shared/components/toast';
import { classList, studyOrgBadgeClass, studyOrgButtonClass, studyOrgFieldClass } from '../utils/studyButtonClasses';

interface TagCloudProps {
    tags: Tag[];
    selectedTags: string[];
    onTagToggle: (tagName: string) => void;
    onRefresh: () => void;
}

export const TagCloud: React.FC<TagCloudProps> = ({
    tags,
    selectedTags,
    onTagToggle,
    onRefresh,
}) => {
    const [isCreating, setIsCreating] = useState(false);
    const [newTagName, setNewTagName] = useState('');
    const [newTagColor, setNewTagColor] = useState('#888888');

    const handleCreateTag = async () => {
        if (!newTagName.trim()) return;

        try {
            await tagsService.createTag({
                name: newTagName.trim(),
                color: newTagColor,
            });
            emitToast.success('Tag creato');
            setNewTagName('');
            setIsCreating(false);
            onRefresh();
        } catch (err: any) {
            emitToast.error(err.message || 'Errore nella creazione del tag');
        }
    };

    const presetColors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
        '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52BE80',
    ];

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between px-3">
                <h3 className="text-xs font-bold text-white/50 uppercase tracking-wider">
                    Tag
                </h3>
                {!isCreating && (
                    <motion.button
                        whileHover={{ scale: 1.1, rotate: 90 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setIsCreating(true)}
                        className={studyOrgButtonClass('create', 'p-1.5 rounded-full')}
                    >
                        <Plus className="w-3.5 h-3.5" />
                    </motion.button>
                )}
            </div>

            {/* Creazione nuovo tag */}
            <AnimatePresence>
                {isCreating && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="px-3 space-y-2"
                    >
                        <input
                            type="text"
                            value={newTagName}
                            onChange={(e) => setNewTagName(e.target.value)}
                            placeholder="Nome tag..."
                            className={studyOrgFieldClass('default', 'w-full px-3 py-2 text-sm rounded-lg')}
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleCreateTag();
                                } else if (e.key === 'Escape') {
                                    setIsCreating(false);
                                    setNewTagName('');
                                }
                            }}
                        />
                        <div className="flex items-center gap-2">
                            <div className="flex-1 flex items-center gap-1.5 flex-wrap">
                                {presetColors.map((color) => (
                                    <motion.button
                                        key={color}
                                        whileHover={{ scale: 1.15 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => setNewTagColor(color)}
                                        className={classList(
                                            studyOrgButtonClass('base', 'study-org-color-chip w-6 h-6 rounded-full border-2 transition-all'),
                                            newTagColor === color && 'study-org-color-chip--selected scale-110'
                                        )}
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                            </div>
                            <input
                                type="color"
                                value={newTagColor}
                                onChange={(e) => setNewTagColor(e.target.value)}
                                className="w-8 h-8 rounded border border-white/20 cursor-pointer"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleCreateTag}
                                className={studyOrgButtonClass('create', 'flex-1 px-3 py-1.5 text-xs font-medium rounded-lg')}
                            >
                                Crea
                            </button>
                            <button
                                onClick={() => {
                                    setIsCreating(false);
                                    setNewTagName('');
                                }}
                                className={studyOrgButtonClass('cancel', 'px-3 py-1.5 text-xs font-medium rounded-lg')}
                            >
                                Annulla
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Lista tag */}
            <div className="space-y-1 max-h-[300px] overflow-y-auto">
                {tags.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="px-3 py-4 text-center"
                    >
                        <TagIcon className="w-8 h-8 mx-auto mb-2 text-white/20" />
                        <p className="text-xs text-white/40 mb-2">Nessun tag ancora</p>
                        <button
                            onClick={() => setIsCreating(true)}
                            className={studyOrgButtonClass('text', 'text-xs')}
                        >
                            Crea il tuo primo tag →
                        </button>
                    </motion.div>
                ) : (
                    tags.map((tag) => {
                        const isSelected = selectedTags.includes(tag.name);
                        return (
                            <motion.button
                                key={tag.id}
                                whileHover={{ x: 4 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => onTagToggle(tag.name)}
                                className={studyOrgButtonClass(
                                    isSelected ? 'tagSelected' : 'tag',
                                    'w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 touch-manipulation min-h-[40px]'
                                )}
                            >
                                <motion.div
                                    whileHover={{ scale: 1.1 }}
                                    className="w-3 h-3 rounded-full flex-shrink-0 border border-white/20"
                                    style={{ backgroundColor: tag.color }}
                                />
                                <span className="flex-1 text-sm text-left truncate font-medium">
                                    {tag.name}
                                </span>
                                {tag.count !== undefined && tag.count > 0 && (
                                    <motion.span
                                        initial={{ scale: 0.8 }}
                                        animate={{ scale: 1 }}
                                        className={studyOrgBadgeClass('subtle', 'text-xs px-1.5 py-0.5 rounded-full')}
                                    >
                                        {tag.count}
                                    </motion.span>
                                )}
                            </motion.button>
                        );
                    })
                )}
            </div>
        </div>
    );
};
