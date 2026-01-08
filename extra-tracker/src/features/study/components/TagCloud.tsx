/**
 * 🏷️ TAG CLOUD - Sidebar con tag colorati
 * 
 * Componente per visualizzare e filtrare per tag.
 * Supporta:
 * - Tag colorati con contatori
 * - Click per filtrare
 * - Creazione rapida di tag
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Tag as TagIcon, Plus, X } from 'lucide-react';
import { tagsService, type Tag } from '../services/tagsService';
import { emitToast } from '../../../shared/components/toast';

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
                    <button
                        onClick={() => setIsCreating(true)}
                        className="p-1 rounded hover:bg-white/10 transition-colors"
                    >
                        <Plus className="w-3.5 h-3.5 text-white/60" />
                    </button>
                )}
            </div>

            {/* Creazione nuovo tag */}
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
                        className="w-full px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:border-violet-500/50 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
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
                                <button
                                    key={color}
                                    onClick={() => setNewTagColor(color)}
                                    className={`
                                        w-6 h-6 rounded-full border-2 transition-all
                                        ${newTagColor === color ? 'border-white scale-110' : 'border-white/20'}
                                    `}
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
                            className="flex-1 px-3 py-1.5 text-xs font-medium bg-violet-500/20 text-violet-300 rounded-lg hover:bg-violet-500/30 transition-colors"
                        >
                            Crea
                        </button>
                        <button
                            onClick={() => {
                                setIsCreating(false);
                                setNewTagName('');
                            }}
                            className="px-3 py-1.5 text-xs font-medium bg-white/5 text-white/60 rounded-lg hover:bg-white/10 transition-colors"
                        >
                            Annulla
                        </button>
                    </div>
                </motion.div>
            )}

            {/* Lista tag */}
            <div className="space-y-1 max-h-[300px] overflow-y-auto">
                {tags.length === 0 ? (
                    <p className="px-3 text-xs text-white/40">Nessun tag</p>
                ) : (
                    tags.map((tag) => {
                        const isSelected = selectedTags.includes(tag.name);
                        return (
                            <button
                                key={tag.id}
                                onClick={() => onTagToggle(tag.name)}
                                className={`
                                    w-full flex items-center gap-2 px-3 py-2 rounded-lg
                                    transition-colors touch-manipulation min-h-[36px]
                                    ${isSelected
                                        ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                                        : 'hover:bg-white/5 text-white/70 hover:text-white'
                                    }
                                `}
                            >
                                <div
                                    className="w-3 h-3 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: tag.color }}
                                />
                                <span className="flex-1 text-sm text-left truncate">
                                    {tag.name}
                                </span>
                                {tag.count !== undefined && tag.count > 0 && (
                                    <span className="text-xs text-white/40 px-1.5 py-0.5 rounded bg-white/5">
                                        {tag.count}
                                    </span>
                                )}
                            </button>
                        );
                    })
                )}
            </div>
        </div>
    );
};
