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

export const classList = (...classes: ClassValue[]): string => joinClasses(...classes);
