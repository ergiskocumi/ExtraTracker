import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QuickStats } from '../QuickStats';
import { WeeklyMiniChart } from '../WeeklyMiniChart';
import { QuickActions } from '../QuickActions';
import type { WorkLog } from '../../tracker/type';

vi.mock('../../../shared/hooks/useFormat', () => ({
    useFormat: () => ({
        formatHours: (hours: number) => `${hours.toFixed(1)}h`,
    }),
}));

const now = new Date();
const toDayString = (offset: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + offset);
    return d.toISOString().split('T')[0];
};

const logs: WorkLog[] = [
    {
        id: '1',
        projectId: 'p1',
        date: toDayString(-1),
        title: 'Planning',
        startTime: '09:00',
        endTime: '11:30',
    },
    {
        id: '2',
        projectId: 'p1',
        date: toDayString(0),
        title: 'Execution',
        startTime: '14:00',
        endTime: '17:00',
    },
    {
        id: '3',
        projectId: 'p2',
        date: toDayString(0),
        title: 'Review',
        startTime: '18:00',
        endTime: '19:00',
    },
];

describe('Dashboard widgets theme contract', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders QuickStats with semantic widget classes', () => {
        const { container } = render(<QuickStats logs={logs} allLogs={logs} />);

        expect(container.querySelector('.dashboard-widget--stats')).toBeInTheDocument();
        expect(container.querySelectorAll('.dashboard-widget-card--stat').length).toBeGreaterThan(0);
        expect(container.querySelector('.dashboard-stat-icon-shell')).toBeInTheDocument();
        expect(container.querySelector('.dashboard-stat-label')).toBeInTheDocument();
        expect(container.querySelector('.dashboard-stat-value')).toBeInTheDocument();
    });

    it('renders WeeklyMiniChart with themed tooltip shell', () => {
        const { container } = render(<WeeklyMiniChart logs={logs} />);

        expect(container.querySelector('.dashboard-widget--chart')).toBeInTheDocument();
        expect(container.querySelector('.dashboard-widget-title')).toBeInTheDocument();
        expect(container.querySelector('.dashboard-widget-caption')).toBeInTheDocument();
        expect(container.querySelector('.dashboard-chart-bar')).toBeInTheDocument();
        expect(container.querySelector('.dashboard-chart-day-label')).toBeInTheDocument();
        expect(container.querySelector('.dashboard-chart-tooltip')).toBeInTheDocument();
    });

    it('renders QuickActions with themed action items', () => {
        const onDuplicate = vi.fn();
        const { container } = render(<QuickActions logs={logs} onDuplicate={onDuplicate} />);

        expect(container.querySelector('.dashboard-widget--actions')).toBeInTheDocument();
        expect(container.querySelector('.dashboard-widget-title')).toBeInTheDocument();
        expect(container.querySelector('.dashboard-widget-caption')).toBeInTheDocument();
        expect(container.querySelector('.dashboard-action-item')).toBeInTheDocument();
        expect(container.querySelector('.dashboard-action-avatar')).toBeInTheDocument();
        expect(container.querySelector('.dashboard-action-copy')).toBeInTheDocument();
    });
});
