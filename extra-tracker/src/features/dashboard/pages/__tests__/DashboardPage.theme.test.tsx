import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardPage } from '../DashboardPage';
import { useSettings } from '../../../settings/context/SettingsContext';
import { studyService } from '../../../study/services/studyService';
import examService from '../../../study/services/examService';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
    return {
        ...actual,
        useNavigate: () => navigateMock,
    };
});

vi.mock('../../../settings/context/SettingsContext', () => ({
    useSettings: vi.fn(),
}));

vi.mock('../../../study/services/studyService', () => ({
    studyService: {
        getDashboard: vi.fn(),
    },
}));

vi.mock('../../../study/services/examService', () => ({
    default: {
        getAll: vi.fn(),
    },
}));

const mockedUseSettings = vi.mocked(useSettings);
const mockedGetDashboard = vi.mocked(studyService.getDashboard);
const mockedGetAllExams = vi.mocked(examService.getAll);

describe('DashboardPage theme contract', () => {
    beforeEach(() => {
        navigateMock.mockReset();

        mockedUseSettings.mockReturnValue({
            profile: { firstName: 'Ergis' },
        } as unknown as ReturnType<typeof useSettings>);

        mockedGetDashboard.mockResolvedValue({
            decks: [
                {
                    id: 'deck-1',
                    title: 'Anatomia',
                    dueCount: 5,
                    examId: 'exam-1',
                    tags: [],
                    cards: [],
                    totalCards: 24,
                    createdAt: '2026-02-10T12:00:00.000Z',
                    updatedAt: '2026-02-11T12:00:00.000Z',
                },
            ],
            dueCardCount: 5,
        });

        mockedGetAllExams.mockResolvedValue([
            {
                id: 'exam-1',
                title: 'Anatomia I',
                deadline: '2026-03-10T08:00:00.000Z',
                status: 'active',
            },
        ] as any);
    });

    it('renders dashboard semantic classes for panel/card/cta in light tuning', async () => {
        const { container } = render(<DashboardPage />);

        await screen.findByText('Anatomia');

        expect(container.querySelector('.dashboard-greeting')).toBeInTheDocument();
        expect(container.querySelector('.dashboard-hero-title')).toBeInTheDocument();
        expect(container.querySelector('.dashboard-greeting-subtitle')).toBeInTheDocument();
        expect(container.querySelector('.dashboard-caption-text')).toBeInTheDocument();
        expect(container.querySelector('.dashboard-section-title')).toBeInTheDocument();
        expect(container.querySelector('.dashboard-panel')).toBeInTheDocument();
        expect(container.querySelector('.dashboard-panel--recent')).toBeInTheDocument();
        expect(container.querySelector('.dashboard-panel--exams')).toBeInTheDocument();
        expect(container.querySelector('.dashboard-deck-card')).toBeInTheDocument();
        expect(container.querySelector('.dashboard-deck-title')).toBeInTheDocument();
        expect(container.querySelector('.dashboard-due-badge')).toBeInTheDocument();
        expect(container.querySelector('.dashboard-badge-label')).toBeInTheDocument();
        expect(container.querySelector('.dashboard-deck-exam-pill')).toBeInTheDocument();
        expect(container.querySelector('.dashboard-card-cta')).toBeInTheDocument();
        expect(container.querySelector('.dashboard-exam-row')).toBeInTheDocument();
        expect(container.querySelector('.dashboard-urgency-badge')).toBeInTheDocument();
        expect(container.querySelector('.dashboard-exam-days-value')).toBeInTheDocument();
        expect(container.querySelector('.dashboard-exam-progress-track')).toBeInTheDocument();
        expect(container.querySelector('.dashboard-exam-progress-fill')).toBeInTheDocument();
        expect(container.querySelector('.dashboard-main-cta-title')).toBeInTheDocument();

        const mainCta = screen.getByRole('button', { name: /Vai agli Esami/i });
        expect(mainCta).toHaveClass('dashboard-main-cta');
    });

    it('navigates to study session when deck CTA is clicked', async () => {
        render(<DashboardPage />);

        const cta = await screen.findByRole('button', { name: /Ripassa Ora/i });
        cta.click();

        await waitFor(() => {
            expect(navigateMock).toHaveBeenCalledWith('/study/deck-1/session?mode=flashcard');
        });
    });
});
