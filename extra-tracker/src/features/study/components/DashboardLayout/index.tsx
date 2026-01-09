import React from 'react';
import { DashboardSidebar } from './DashboardSidebar';
import { DashboardHeader } from './DashboardHeader';
import type { Folder, Tag } from '../../services/foldersService';

interface DashboardLayoutProps {
    isSidebarOpen: boolean;
    onSidebarClose: () => void;
    folders: Folder[];
    tags: Tag[];
    selectedFolderId: string | null;
    selectedTags: string[];
    folderStats: Map<string, {
        totalCards: number;
        dueCards: number;
        masteryPercent: number;
        totalDecks: number;
    }>;
    onFolderSelect: (folderId: string | null) => void;
    onTagToggle: (tagName: string) => void;
    onDeckDrop: (deckId: string, folderId: string | null) => void;
    onRefresh: () => void;
    onCreateDeck: () => void;
    children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
    isSidebarOpen,
    onSidebarClose,
    folders,
    tags,
    selectedFolderId,
    selectedTags,
    folderStats,
    onFolderSelect,
    onTagToggle,
    onDeckDrop,
    onRefresh,
    onCreateDeck,
    children,
}) => {
    return (
        <div className="min-h-screen flex">
            <DashboardSidebar
                isOpen={isSidebarOpen}
                onClose={onSidebarClose}
                folders={folders}
                tags={tags}
                selectedFolderId={selectedFolderId}
                selectedTags={selectedTags}
                folderStats={folderStats}
                onFolderSelect={onFolderSelect}
                onTagToggle={onTagToggle}
                onDeckDrop={onDeckDrop}
                onRefresh={onRefresh}
            />

            {/* Main Content */}
            <div className="flex-1 min-h-screen px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
                <div className="max-w-6xl mx-auto">
                    {/* Header */}
                    <header className="mb-4 sm:mb-6 md:mb-8">
                        <DashboardHeader onCreateDeck={onCreateDeck} />
                    </header>
                    {children}
                </div>
            </div>
        </div>
    );
};
