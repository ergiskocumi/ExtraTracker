import React from 'react';
import { DashboardSidebar } from './DashboardSidebar';
import { DashboardHeader } from './DashboardHeader';
import type { Folder, Tag } from '../../services/foldersService';
import type { Goal } from '../../../goals/types';
import type { Deck } from '../../services/studyService';

interface DashboardLayoutProps {
    isSidebarOpen: boolean;
    onSidebarClose: () => void;
    onSidebarToggle?: () => void;
    folders: Folder[];
    tags: Tag[];
    exams?: Goal[]; // Esami (goals con category='learning')
    decks?: Deck[]; // Mazzi per calcolare statistiche
    selectedFolderId: string | null;
    selectedExamId?: string | null;
    selectedTags: string[];
    folderStats: Map<string, {
        totalCards: number;
        dueCards: number;
        masteryPercent: number;
        totalDecks: number;
    }>;
    onFolderSelect: (folderId: string | null) => void;
    onExamSelect?: (examId: string | null) => void;
    onDeckClick?: (deckId: string) => void;
    onTagToggle: (tagName: string) => void;
    onDeckDrop: (deckId: string, folderId: string | null) => void;
    onRefresh: () => void;
    onCreateDeck: () => void;
    onCreateExam?: () => void;
    selectedExamName?: string | null; // Nome dell'esame selezionato
    onBackToExams?: () => void; // Callback per tornare agli esami
    children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
    isSidebarOpen,
    onSidebarClose,
    onSidebarToggle,
    folders,
    tags,
    exams = [],
    decks = [],
    selectedFolderId,
    selectedExamId = null,
    selectedTags,
    folderStats,
    onFolderSelect,
    onExamSelect,
    onDeckClick,
    onTagToggle,
    onDeckDrop,
    onRefresh,
    onCreateDeck,
    onCreateExam,
    selectedExamName,
    onBackToExams,
    children,
}) => {
    // Trova il nome della cartella selezionata
    const selectedFolderName = selectedFolderId 
        ? folders.find(f => f.id === selectedFolderId)?.name || null
        : null;

    return (
        <div className="min-h-screen">
            {/* Floating Sidebar */}
            <DashboardSidebar
                isOpen={isSidebarOpen}
                onClose={onSidebarClose}
                onToggle={onSidebarToggle}
                folders={folders}
                tags={tags}
                exams={exams}
                decks={decks}
                selectedFolderId={selectedFolderId}
                selectedExamId={selectedExamId}
                selectedTags={selectedTags}
                folderStats={folderStats}
                onFolderSelect={onFolderSelect}
                onExamSelect={onExamSelect}
                onDeckClick={onDeckClick}
                onTagToggle={onTagToggle}
                onDeckDrop={onDeckDrop}
                onRefresh={onRefresh}
                onCreateExam={onCreateExam}
            />

            {/* Main Content - Full Width */}
            <div className="min-h-screen px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
                <div className="max-w-6xl mx-auto">
                    {/* Header */}
                    <header className="mb-4 sm:mb-6 md:mb-8">
                        <DashboardHeader 
                            onCreateDeck={onCreateDeck} 
                            selectedFolderName={selectedFolderName}
                            onBackToAll={() => onFolderSelect(null)}
                            selectedExamName={selectedExamName}
                            onBackToExams={onBackToExams}
                        />
                    </header>
                    {children}
                </div>
            </div>
        </div>
    );
};
