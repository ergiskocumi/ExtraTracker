import type {
    Feedback,
    FeedbackActivity,
    FeedbackComment,
    FeedbackPriority,
    FeedbackStatus,
    FeedbackUser,
} from '../../types';
import {
    FEEDBACK_PRIORITY_LABELS,
    FEEDBACK_STATUS_LABELS,
} from '../../types';

export const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

export const formatIssueKey = (feedback: Feedback): string =>
    `FB-${feedback._id.slice(-6).toUpperCase()}`;

export const getUserDisplayName = (user: FeedbackUser | string): string => {
    if (typeof user === 'string') return user;
    if (user.profile?.displayName) return user.profile.displayName;
    if (user.profile?.firstName || user.profile?.lastName) {
        return `${user.profile.firstName || ''} ${user.profile.lastName || ''}`.trim();
    }
    return user.email;
};

export const getAssigneeLabel = (assignee?: FeedbackUser | string | null): string => {
    if (!assignee) return 'Non assegnato';
    if (typeof assignee === 'string') return assignee;
    if (assignee.profile?.displayName) return assignee.profile.displayName;
    if (assignee.profile?.firstName || assignee.profile?.lastName) {
        return `${assignee.profile.firstName || ''} ${assignee.profile.lastName || ''}`.trim();
    }
    return assignee.email;
};

export const getCommentAuthor = (comment: FeedbackComment): string => {
    if (!comment.author) return 'Team Silvi';
    if (typeof comment.author === 'string') return 'Team Silvi';
    if (comment.author.profile?.displayName) return comment.author.profile.displayName;
    if (comment.author.profile?.firstName || comment.author.profile?.lastName) {
        return `${comment.author.profile.firstName || ''} ${comment.author.profile.lastName || ''}`.trim();
    }
    return comment.author.email;
};

export const normalizeLabel = (label: string): string => label.trim().toLowerCase();

export const getActivityItems = (feedback: Feedback): FeedbackActivity[] => {
    const items = Array.isArray(feedback.activity) ? [...feedback.activity] : [];

    if (items.length === 0) {
        return [{
            type: 'created',
            message: 'Ticket creato',
            createdAt: feedback.createdAt,
            performedBy: feedback.user,
        }];
    }

    return items.sort(
        (a, b) => new Date(b.createdAt || feedback.createdAt).getTime()
            - new Date(a.createdAt || feedback.createdAt).getTime()
    );
};

export const getActivityActor = (activity: FeedbackActivity, feedback: Feedback): string => {
    const performedBy = activity.performedBy;
    if (!performedBy) return 'Sistema';

    if (typeof performedBy === 'string') {
        const feedbackUserId =
            typeof feedback.user === 'string' ? feedback.user : feedback.user._id;
        return performedBy === feedbackUserId ? 'Utente' : 'Admin';
    }

    if (performedBy.profile?.displayName) return performedBy.profile.displayName;
    if (performedBy.profile?.firstName || performedBy.profile?.lastName) {
        return `${performedBy.profile.firstName || ''} ${performedBy.profile.lastName || ''}`.trim();
    }
    return performedBy.email || 'Admin';
};

export const getActivityMessage = (activity: FeedbackActivity): string => {
    if (activity.message) return activity.message;

    if (activity.type === 'status_change') {
        const fromLabel = FEEDBACK_STATUS_LABELS[activity.from as FeedbackStatus] || activity.from;
        const toLabel = FEEDBACK_STATUS_LABELS[activity.to as FeedbackStatus] || activity.to;
        return `Stato aggiornato: ${fromLabel || '-'} -> ${toLabel || '-'}`;
    }

    if (activity.type === 'priority_change') {
        const fromLabel = FEEDBACK_PRIORITY_LABELS[activity.from as FeedbackPriority] || activity.from;
        const toLabel = FEEDBACK_PRIORITY_LABELS[activity.to as FeedbackPriority] || activity.to;
        return `Priorita aggiornata: ${fromLabel || '-'} -> ${toLabel || '-'}`;
    }

    if (activity.type === 'assignee_change') {
        return 'Assegnazione aggiornata';
    }

    if (activity.type === 'labels_update') {
        return 'Etichette aggiornate';
    }

    if (activity.type === 'comment_added') {
        return "Commento inviato all'utente";
    }

    return 'Aggiornamento ticket';
};

export const isImageAttachment = (mimetype: string | undefined, fileName: string): boolean =>
    Boolean(mimetype?.startsWith('image/'))
    || /\.(png|jpg|jpeg|gif|webp)$/i.test(fileName);

export const getFeedbackAttachmentUrl = (fileName: string): string =>
    `/uploads/feedback/${fileName}`;

