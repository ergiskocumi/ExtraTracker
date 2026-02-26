import {
    AlertTriangle,
    Bug,
    CheckCircle,
    HelpCircle,
    Lightbulb,
    MessageSquare,
    MoreHorizontal,
    Sparkles,
    Tag,
    User,
} from 'lucide-react';
import type {
    FeedbackActivityType,
    FeedbackPriority,
    FeedbackStatus,
    FeedbackType,
} from '../../types';
import {
    FEEDBACK_PRIORITY_LABELS,
    FEEDBACK_STATUS_LABELS,
    FEEDBACK_TYPE_LABELS,
} from '../../types';

export const TYPE_ICONS: Record<FeedbackType, typeof Bug> = {
    bug: Bug,
    feature: Lightbulb,
    improvement: Sparkles,
    question: HelpCircle,
    other: MoreHorizontal,
};

export const TYPE_ACCENTS: Record<FeedbackType, string> = {
    bug: 'bg-red-400/80',
    feature: 'bg-purple-400/80',
    improvement: 'bg-cyan-400/80',
    question: 'bg-yellow-400/80',
    other: 'bg-gray-400/70',
};

export const STATUS_OPTIONS: { value: FeedbackStatus | ''; label: string }[] = [
    { value: '', label: 'Tutti gli stati' },
    { value: 'open', label: FEEDBACK_STATUS_LABELS.open },
    { value: 'in_progress', label: FEEDBACK_STATUS_LABELS.in_progress },
    { value: 'resolved', label: FEEDBACK_STATUS_LABELS.resolved },
    { value: 'closed', label: FEEDBACK_STATUS_LABELS.closed },
    { value: 'wont_fix', label: FEEDBACK_STATUS_LABELS.wont_fix },
];

export const TYPE_OPTIONS: { value: FeedbackType | ''; label: string }[] = [
    { value: '', label: 'Tutti i tipi' },
    { value: 'bug', label: FEEDBACK_TYPE_LABELS.bug },
    { value: 'feature', label: FEEDBACK_TYPE_LABELS.feature },
    { value: 'improvement', label: FEEDBACK_TYPE_LABELS.improvement },
    { value: 'question', label: FEEDBACK_TYPE_LABELS.question },
    { value: 'other', label: FEEDBACK_TYPE_LABELS.other },
];

export const PRIORITY_OPTIONS: { value: FeedbackPriority | ''; label: string }[] = [
    { value: '', label: 'Tutte le priorita' },
    { value: 'critical', label: FEEDBACK_PRIORITY_LABELS.critical },
    { value: 'high', label: FEEDBACK_PRIORITY_LABELS.high },
    { value: 'medium', label: FEEDBACK_PRIORITY_LABELS.medium },
    { value: 'low', label: FEEDBACK_PRIORITY_LABELS.low },
];

export const STATUS_FLOW: FeedbackStatus[] = [
    'open',
    'in_progress',
    'resolved',
    'closed',
    'wont_fix',
];

export const ACTIVE_STATUSES: FeedbackStatus[] = ['open', 'in_progress'];
export const COMPLETED_STATUSES: FeedbackStatus[] = ['resolved', 'closed', 'wont_fix'];

export const ACTIVITY_ICONS: Record<FeedbackActivityType, typeof MessageSquare> = {
    created: MessageSquare,
    status_change: CheckCircle,
    priority_change: AlertTriangle,
    assignee_change: User,
    labels_update: Tag,
    comment_added: MessageSquare,
    note_added: MessageSquare,
    note_updated: MessageSquare,
    note_cleared: MessageSquare,
};

