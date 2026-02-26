import { AnimatePresence, motion } from 'framer-motion';
import {
    CheckCircle,
    Clock,
    FileText,
    Paperclip,
    Send,
    Tag,
    Trash2,
    User,
    XCircle,
} from 'lucide-react';
import type {
    Feedback,
    FeedbackActivity,
    FeedbackComment,
    FeedbackPriority,
    FeedbackStatus,
    FeedbackUser,
    UpdateFeedbackDTO,
} from '../../types';
import {
    FEEDBACK_PRIORITY_COLORS,
    FEEDBACK_PRIORITY_LABELS,
    FEEDBACK_STATUS_COLORS,
    FEEDBACK_STATUS_LABELS,
    FEEDBACK_TYPE_COLORS,
    FEEDBACK_TYPE_LABELS,
} from '../../types';
import { ACTIVITY_ICONS, PRIORITY_OPTIONS, STATUS_FLOW, STATUS_OPTIONS } from './constants';
import {
    formatDate,
    formatIssueKey,
    getActivityActor,
    getActivityMessage,
    getAssigneeLabel,
    getCommentAuthor,
    getFeedbackAttachmentUrl,
    getUserDisplayName,
    isImageAttachment,
} from './utils';

interface AdminFeedbackDetailModalProps {
    feedback: Feedback | null;
    adminUsers: FeedbackUser[];
    isUpdating: boolean;
    isLoadingAdmins: boolean;
    noteDraft: string;
    commentDraft: string;
    labelDraft: string;
    assigneeId: string;
    isNoteDirty: boolean;
    activityItems: FeedbackActivity[];
    commentList: FeedbackComment[];
    labelList: string[];
    onClose: () => void;
    onDelete: (id: string) => void;
    onAddLabel: () => void;
    onRemoveLabel: (label: string) => void;
    onSubmitComment: () => void;
    onUpdateFeedback: (id: string, updates: UpdateFeedbackDTO, successMessage?: string) => void;
    onNoteDraftChange: (value: string) => void;
    onCommentDraftChange: (value: string) => void;
    onLabelDraftChange: (value: string) => void;
}

export const AdminFeedbackDetailModal: React.FC<AdminFeedbackDetailModalProps> = ({
    feedback,
    adminUsers,
    isUpdating,
    isLoadingAdmins,
    noteDraft,
    commentDraft,
    labelDraft,
    assigneeId,
    isNoteDirty,
    activityItems,
    commentList,
    labelList,
    onClose,
    onDelete,
    onAddLabel,
    onRemoveLabel,
    onSubmitComment,
    onUpdateFeedback,
    onNoteDraftChange,
    onCommentDraftChange,
    onLabelDraftChange,
}) => (
    <AnimatePresence>
        {feedback && (
            <motion.div
                key={feedback._id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
                <motion.div
                    className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                    onClick={onClose}
                />
                <motion.div
                    initial={{ scale: 0.96, y: 20, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0.96, y: 20, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 280, damping: 24 }}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="feedback-modal-title"
                    className="relative flex w-full max-w-6xl max-h-[90vh] flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl dark:border-white/10 dark:bg-dark-400/95"
                >
                    {/* Header: titolo + meta + azione chiudi */}
                    <header className="shrink-0 border-b border-gray-200 bg-gray-50 p-6 dark:border-white/20 dark:bg-white/[0.06]">
                        <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                                <div className="mb-2 flex items-center gap-2 text-xs text-gray-500 dark:text-white/60">
                                    <span className="font-mono font-semibold tracking-wide text-gray-700 dark:text-white/80">
                                        {formatIssueKey(feedback)}
                                    </span>
                                    <span className="h-1 w-1 shrink-0 rounded-full bg-gray-400 dark:bg-white/40" aria-hidden />
                                    <span>{formatDate(feedback.createdAt)}</span>
                                </div>
                                <h2 id="feedback-modal-title" className="text-2xl font-bold leading-tight text-gray-900 sm:text-3xl dark:text-white">
                                    {feedback.title}
                                </h2>
                            </div>
                            <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
                                <span className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${FEEDBACK_STATUS_COLORS[feedback.status]}`}>
                                    {FEEDBACK_STATUS_LABELS[feedback.status]}
                                </span>
                                <span className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${FEEDBACK_PRIORITY_COLORS[feedback.priority]}`}>
                                    {FEEDBACK_PRIORITY_LABELS[feedback.priority]}
                                </span>
                                <span className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${FEEDBACK_TYPE_COLORS[feedback.type]}`}>
                                    {FEEDBACK_TYPE_LABELS[feedback.type]}
                                </span>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    aria-label="Chiudi"
                                    className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700 dark:text-white/60 dark:hover:bg-white/15 dark:hover:text-white"
                                >
                                    <XCircle className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    </header>

                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
                            {/* Colonna sinistra: contenuto e cronologia */}
                            <div className="space-y-6">
                                <section aria-labelledby="section-dettagli" className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/20 dark:bg-white/[0.08]">
                                    <div className="mb-4 flex items-center gap-2 border-b border-gray-200 pb-2 dark:border-white/10">
                                        <FileText className="h-4 w-4 text-gray-500 dark:text-white/70" aria-hidden />
                                        <h3 id="section-dettagli" className="text-sm font-semibold uppercase tracking-[0.15em] text-gray-800 dark:text-white/80">
                                            Dettagli
                                        </h3>
                                    </div>
                                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800 dark:text-white/90">
                                        {feedback.description}
                                    </p>
                                    <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-3 text-xs text-gray-500 dark:border-white/5 dark:text-white/60">
                                        <span className="flex items-center gap-1.5">
                                            <User className="h-3.5 w-3.5" aria-hidden />
                                            {getUserDisplayName(feedback.user)}
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <Clock className="h-3.5 w-3.5" aria-hidden />
                                            {formatDate(feedback.createdAt)}
                                        </span>
                                        {feedback.resolvedAt && (
                                            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400/90">
                                                <CheckCircle className="h-3.5 w-3.5" aria-hidden />
                                                Risolto il {formatDate(feedback.resolvedAt)}
                                            </span>
                                        )}
                                    </div>
                                </section>

                                {feedback.attachments && feedback.attachments.length > 0 && (
                                    <section aria-labelledby="section-allegati" className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/20 dark:bg-white/[0.08]">
                                        <h3 id="section-allegati" className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-gray-800 dark:text-white/80">
                                            Allegati
                                        </h3>
                                        <div className="space-y-4">
                                            {feedback.attachments.map((attachment, index) => {
                                                const attachmentUrl = getFeedbackAttachmentUrl(attachment.filename);
                                                const isImage = isImageAttachment(attachment.mimetype, attachment.originalName);
                                                return (
                                                    <div key={index} className="space-y-2">
                                                        {isImage && (
                                                            <a
                                                                href={attachmentUrl}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="block overflow-hidden rounded-lg border border-gray-200 dark:border-white/20 dark:bg-white/5"
                                                            >
                                                                <img
                                                                    src={attachmentUrl}
                                                                    alt={attachment.originalName}
                                                                    className="max-h-96 w-full max-w-2xl object-contain"
                                                                    loading="lazy"
                                                                />
                                                            </a>
                                                        )}
                                                        <a
                                                            href={attachmentUrl}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 transition-colors hover:bg-gray-100 dark:border-white/20 dark:bg-white/10 dark:text-white/70 dark:hover:text-white"
                                                        >
                                                            <Paperclip className="h-3.5 w-3.5" aria-hidden />
                                                            {attachment.originalName}
                                                        </a>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </section>
                                )}

                                <section aria-labelledby="section-commenti" className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/20 dark:bg-white/[0.08]">
                                    <h3 id="section-commenti" className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-gray-800 dark:text-white/80">
                                        Commenti pubblici
                                    </h3>
                                    {commentList.length === 0 ? (
                                        <p className="text-xs italic text-gray-500 dark:text-white/50">Nessun commento ancora.</p>
                                    ) : (
                                        <ul className="space-y-3">
                                            {commentList.map((comment, index) => (
                                                <li key={`${comment.createdAt}-${index}`} className="rounded-lg border border-gray-100 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                                                    <p className="whitespace-pre-wrap text-sm text-gray-800 dark:text-white/85">{comment.message}</p>
                                                    <div className="mt-3 border-t border-gray-200 pt-2 text-[11px] text-gray-500 dark:border-white/5 dark:text-white/50">
                                                        {getCommentAuthor(comment)} — {formatDate(comment.createdAt)}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </section>

                                <section aria-labelledby="section-attivita" className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/20 dark:bg-white/[0.08]">
                                    <h3 id="section-attivita" className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-gray-800 dark:text-white/80">
                                        Attività
                                    </h3>
                                    <ul className="space-y-1">
                                        {activityItems.map((activity, index) => {
                                            const ActivityIcon = ACTIVITY_ICONS[activity.type] || Clock;
                                            return (
                                                <li
                                                    key={`${activity.type}-${activity.createdAt}-${index}`}
                                                    className="flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
                                                >
                                                    <div className="rounded-lg border border-gray-200 bg-gray-100 p-2 dark:border-white/10 dark:bg-white/10 dark:text-white/60">
                                                        <ActivityIcon className="h-3.5 w-3.5" aria-hidden />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm text-gray-700 dark:text-white/80">{getActivityMessage(activity)}</p>
                                                        <div className="mt-1.5 flex items-center gap-2 text-[11px] text-gray-500 dark:text-white/50">
                                                            <span>{getActivityActor(activity, feedback)}</span>
                                                            <span aria-hidden>—</span>
                                                            <span>{formatDate(activity.createdAt || feedback.createdAt)}</span>
                                                        </div>
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </section>
                            </div>

                            {/* Colonna destra: azioni e form */}
                            <div className="space-y-6">
                                <section aria-labelledby="section-workflow" className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/20 dark:bg-white/[0.08]">
                                    <h3 id="section-workflow" className="mb-4 text-sm font-semibold uppercase tracking-[0.15em] text-gray-800 dark:text-white/80">
                                        Workflow
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {STATUS_FLOW.map((status) => {
                                            const isActive = feedback.status === status;
                                            return (
                                                <button
                                                    key={status}
                                                    type="button"
                                                    disabled={isUpdating || isActive}
                                                    onClick={() => onUpdateFeedback(feedback._id, { status }, 'Stato aggiornato')}
                                                    className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                                                        isActive
                                                            ? 'border-primary-500/50 bg-primary-500/20 text-primary-700 dark:border-primary-500/40 dark:bg-primary-500/25 dark:text-primary-200'
                                                            : 'border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100 dark:border-white/15 dark:bg-white/8 dark:text-white/70 dark:hover:bg-white/15'
                                                    }`}
                                                >
                                                    {FEEDBACK_STATUS_LABELS[status]}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </section>

                                <section aria-labelledby="section-gestione" className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/20 dark:bg-white/[0.08]">
                                    <h3 id="section-gestione" className="mb-4 text-sm font-semibold uppercase tracking-[0.15em] text-gray-800 dark:text-white/80">
                                        Gestione
                                    </h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label htmlFor="modal-assignee" className="mb-2 block text-xs font-medium text-gray-600 dark:text-white/70">
                                                Assegnatario
                                            </label>
                                            <select
                                                id="modal-assignee"
                                                value={assigneeId || ''}
                                                onChange={(event) => onUpdateFeedback(feedback._id, { assignee: event.target.value || null }, 'Assegnazione aggiornata')}
                                                disabled={isUpdating || isLoadingAdmins}
                                                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-white/20 dark:bg-white/10 dark:text-white"
                                            >
                                                <option value="" className="bg-white text-gray-900 dark:bg-dark-300 dark:text-white">Non assegnato</option>
                                                {adminUsers.map((admin) => (
                                                    <option key={admin._id} value={admin._id} className="bg-white text-gray-900 dark:bg-dark-300 dark:text-white">
                                                        {getAssigneeLabel(admin)}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label htmlFor="modal-status" className="mb-2 block text-xs font-medium text-gray-600 dark:text-white/70">
                                                Cambia stato
                                            </label>
                                            <select
                                                id="modal-status"
                                                value={feedback.status}
                                                onChange={(event) => onUpdateFeedback(feedback._id, { status: event.target.value as FeedbackStatus }, 'Stato aggiornato')}
                                                disabled={isUpdating}
                                                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-white/20 dark:bg-white/10 dark:text-white"
                                            >
                                                {STATUS_OPTIONS.filter((option) => option.value).map((option) => (
                                                    <option key={option.value} value={option.value} className="bg-white text-gray-900 dark:bg-dark-300 dark:text-white">
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label htmlFor="modal-priority" className="mb-2 block text-xs font-medium text-gray-600 dark:text-white/70">
                                                Priorità
                                            </label>
                                            <select
                                                id="modal-priority"
                                                value={feedback.priority}
                                                onChange={(event) => onUpdateFeedback(feedback._id, { priority: event.target.value as FeedbackPriority }, 'Priorità aggiornata')}
                                                disabled={isUpdating}
                                                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-white/20 dark:bg-white/10 dark:text-white"
                                            >
                                                {PRIORITY_OPTIONS.filter((option) => option.value).map((option) => (
                                                    <option key={option.value} value={option.value} className="bg-white text-gray-900 dark:bg-dark-300 dark:text-white">
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </section>

                                <section aria-labelledby="section-etichette" className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/20 dark:bg-white/[0.08]">
                                    <h3 id="section-etichette" className="mb-4 text-sm font-semibold uppercase tracking-[0.15em] text-gray-800 dark:text-white/80">
                                        Etichette
                                    </h3>
                                    {labelList.length > 0 && (
                                        <div className="mb-3 flex flex-wrap gap-2">
                                            {labelList.map((label) => (
                                                <button
                                                    key={label}
                                                    type="button"
                                                    onClick={() => onRemoveLabel(label)}
                                                    className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-gray-50 px-2.5 py-1.5 text-xs text-gray-700 transition-colors hover:bg-gray-100 dark:border-white/20 dark:bg-white/10 dark:text-white/70 dark:hover:text-white"
                                                >
                                                    <Tag className="h-3 w-3" aria-hidden />
                                                    {label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={labelDraft}
                                            onChange={(event) => onLabelDraftChange(event.target.value)}
                                            onKeyDown={(event) => {
                                                if (event.key === 'Enter' || event.key === ',') {
                                                    event.preventDefault();
                                                    onAddLabel();
                                                }
                                            }}
                                            placeholder="Aggiungi etichetta"
                                            aria-label="Nuova etichetta"
                                            className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 dark:border-white/20 dark:bg-white/10 dark:text-white dark:placeholder:text-white/50"
                                        />
                                        <button
                                            type="button"
                                            onClick={onAddLabel}
                                            disabled={!labelDraft.trim() || isUpdating}
                                            className="rounded-lg border border-gray-300 bg-gray-100 px-4 py-2.5 text-xs font-medium text-gray-800 transition-colors hover:bg-gray-200 disabled:opacity-50 dark:border-white/20 dark:bg-white/15 dark:text-white/80 dark:hover:bg-white/20"
                                        >
                                            Aggiungi
                                        </button>
                                    </div>
                                </section>

                                <section aria-labelledby="section-commento-pubblico" className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/20 dark:bg-white/[0.08]">
                                    <h3 id="section-commento-pubblico" className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-gray-800 dark:text-white/80">
                                        Commento pubblico
                                    </h3>
                                    <textarea
                                        value={commentDraft}
                                        onChange={(event) => onCommentDraftChange(event.target.value)}
                                        rows={3}
                                        maxLength={2000}
                                        aria-label="Scrivi un commento pubblico"
                                        placeholder="Scrivi un aggiornamento per l'utente..."
                                        className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 dark:border-white/20 dark:bg-white/10 dark:text-white dark:placeholder:text-white/50"
                                    />
                                    <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500 dark:text-white/50">
                                        <span>{commentDraft.length}/2000</span>
                                        <button
                                            type="button"
                                            onClick={onSubmitComment}
                                            disabled={!commentDraft.trim() || isUpdating}
                                            className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-gray-100 px-3 py-1.5 text-gray-700 transition-colors hover:bg-gray-200 disabled:opacity-50 dark:border-white/20 dark:bg-white/15 dark:text-white/80 dark:hover:bg-white/20"
                                        >
                                            <Send className="h-3.5 w-3.5" aria-hidden />
                                            Invia
                                        </button>
                                    </div>
                                </section>

                                <section aria-labelledby="section-note-internal" className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/20 dark:bg-white/[0.08]">
                                    <h3 id="section-note-internal" className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-gray-800 dark:text-white/80">
                                        Note interne
                                    </h3>
                                    <textarea
                                        value={noteDraft}
                                        onChange={(event) => onNoteDraftChange(event.target.value)}
                                        rows={3}
                                        maxLength={2000}
                                        aria-label="Note interne (non visibili all'utente)"
                                        placeholder="Aggiungi dettagli tecnici, passi fatti, decisioni..."
                                        className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 dark:border-white/20 dark:bg-white/10 dark:text-white dark:placeholder:text-white/50"
                                    />
                                    <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500 dark:text-white/50">
                                        <span>{noteDraft.length}/2000</span>
                                        <button
                                            type="button"
                                            onClick={() => onUpdateFeedback(feedback._id, { adminNotes: noteDraft.trim() }, 'Note aggiornate')}
                                            disabled={!isNoteDirty || isUpdating}
                                            className="rounded-lg border border-gray-300 bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-800 transition-colors hover:bg-gray-200 disabled:opacity-50 dark:border-white/20 dark:bg-white/15 dark:text-white/80 dark:hover:bg-white/20"
                                        >
                                            Salva note
                                        </button>
                                    </div>
                                </section>

                                <section aria-label="Zona pericolosa" className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-500/30 dark:bg-red-500/10">
                                    <button
                                        type="button"
                                        onClick={() => onDelete(feedback._id)}
                                        className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-300 bg-red-100 px-3 py-2.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-200 dark:border-red-500/40 dark:bg-red-500/20 dark:text-red-300 dark:hover:bg-red-500/30"
                                    >
                                        <Trash2 className="h-4 w-4" aria-hidden />
                                        Elimina feedback
                                    </button>
                                </section>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        )}
    </AnimatePresence>
);
