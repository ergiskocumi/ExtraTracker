type ClassValue = string | false | null | undefined;

const joinClasses = (...classes: ClassValue[]): string =>
    classes.filter((value): value is string => Boolean(value)).join(' ');

export type ExamSolverButtonVariant =
    | 'primary'
    | 'neutral'
    | 'ghost'
    | 'icon'
    | 'successSoft'
    | 'warningSoft'
    | 'infoSoft'
    | 'dangerSoft'
    | 'danger';

const examSolverVariantMap: Record<ExamSolverButtonVariant, string> = {
    primary: 'exam-solver-btn--primary',
    neutral: 'exam-solver-btn--neutral',
    ghost: 'exam-solver-btn--ghost',
    icon: 'exam-solver-btn--icon',
    successSoft: 'exam-solver-btn--success-soft',
    warningSoft: 'exam-solver-btn--warning-soft',
    infoSoft: 'exam-solver-btn--info-soft',
    dangerSoft: 'exam-solver-btn--danger-soft',
    danger: 'exam-solver-btn--danger',
};

export const examSolverButtonClass = (
    variant: ExamSolverButtonVariant,
    ...classes: ClassValue[]
): string => joinClasses('exam-solver-btn', examSolverVariantMap[variant], ...classes);

export type StudyOrgButtonVariant =
    | 'base'
    | 'icon'
    | 'menu'
    | 'menuDanger'
    | 'create'
    | 'cancel'
    | 'text'
    | 'tag'
    | 'tagSelected';

const studyOrgVariantMap: Record<StudyOrgButtonVariant, string> = {
    base: '',
    icon: 'study-org-btn--icon',
    menu: 'study-org-btn--menu',
    menuDanger: 'study-org-btn--menu-danger',
    create: 'study-org-btn--create',
    cancel: 'study-org-btn--cancel',
    text: 'study-org-btn--text',
    tag: 'study-org-btn--tag',
    tagSelected: 'study-org-btn--tag-selected',
};

export const studyOrgButtonClass = (
    variant: StudyOrgButtonVariant,
    ...classes: ClassValue[]
): string => joinClasses('study-org-btn', studyOrgVariantMap[variant], ...classes);

export type ExamSolverFieldVariant = 'default' | 'compact' | 'textarea';

const examSolverFieldMap: Record<ExamSolverFieldVariant, string> = {
    default: 'exam-solver-field',
    compact: 'exam-solver-field exam-solver-field--compact',
    textarea: 'exam-solver-field exam-solver-field--textarea',
};

export const examSolverFieldClass = (
    variant: ExamSolverFieldVariant = 'default',
    ...classes: ClassValue[]
): string => joinClasses(examSolverFieldMap[variant], ...classes);

export type StudyOrgFieldVariant = 'default' | 'inline';

const studyOrgFieldMap: Record<StudyOrgFieldVariant, string> = {
    default: 'study-org-field',
    inline: 'study-org-field study-org-field--inline',
};

export const studyOrgFieldClass = (
    variant: StudyOrgFieldVariant = 'default',
    ...classes: ClassValue[]
): string => joinClasses(studyOrgFieldMap[variant], ...classes);

export type ExamSolverBadgeVariant = 'success' | 'warning' | 'info' | 'danger' | 'neutral';

const examSolverBadgeMap: Record<ExamSolverBadgeVariant, string> = {
    success: 'exam-solver-badge exam-solver-badge--success',
    warning: 'exam-solver-badge exam-solver-badge--warning',
    info: 'exam-solver-badge exam-solver-badge--info',
    danger: 'exam-solver-badge exam-solver-badge--danger',
    neutral: 'exam-solver-badge exam-solver-badge--neutral',
};

export const examSolverBadgeClass = (
    variant: ExamSolverBadgeVariant,
    ...classes: ClassValue[]
): string => joinClasses(examSolverBadgeMap[variant], ...classes);

export type StudyOrgBadgeVariant = 'count' | 'due' | 'dueCritical' | 'subtle';

const studyOrgBadgeMap: Record<StudyOrgBadgeVariant, string> = {
    count: 'study-org-badge study-org-badge--count',
    due: 'study-org-badge study-org-badge--due',
    dueCritical: 'study-org-badge study-org-badge--due-critical',
    subtle: 'study-org-badge study-org-badge--subtle',
};

export const studyOrgBadgeClass = (
    variant: StudyOrgBadgeVariant,
    ...classes: ClassValue[]
): string => joinClasses(studyOrgBadgeMap[variant], ...classes);

export const classList = (...classes: ClassValue[]): string => joinClasses(...classes);
