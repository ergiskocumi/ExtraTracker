export type MagicBlueprint = {
    documentType?: string;
    mainTopics?: string[];
    densityScore?: number;
};

export type MagicProgressEvent =
    | {
        step: 'analyzing';
        message?: string;
        blueprint?: MagicBlueprint;
    }
    | {
        step: 'chunking';
        message?: string;
        totalChunks: number;
    }
    | {
        step: 'concepts';
        message?: string;
        concepts: string[];
    }
    | {
        step: 'generating';
        message?: string;
        currentChunk: number;
        totalChunks: number;
        generatedSoFar: number;
        currentTopic?: string;
    }
    | {
        step: 'completed';
        totalCards: number;
    };

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null;

const asNonEmptyString = (value: unknown): string | undefined =>
    typeof value === 'string' && value.trim().length > 0 ? value : undefined;

const asPositiveInt = (value: unknown, fallback = 0): number => {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return fallback;
    }
    return Math.max(0, Math.round(value));
};

const parseStringList = (value: unknown): string[] => {
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
};

const parseBlueprint = (value: unknown): MagicBlueprint | undefined => {
    if (!isRecord(value)) return undefined;

    const documentType = asNonEmptyString(value.documentType);
    const mainTopics = parseStringList(value.mainTopics);
    const densityScore = typeof value.densityScore === 'number' && Number.isFinite(value.densityScore)
        ? value.densityScore
        : undefined;

    if (!documentType && mainTopics.length === 0 && densityScore === undefined) {
        return undefined;
    }

    return {
        documentType,
        mainTopics: mainTopics.length > 0 ? mainTopics : undefined,
        densityScore,
    };
};

export const parseMagicProgressEvent = (value: unknown): MagicProgressEvent | null => {
    if (!isRecord(value)) return null;

    const step = asNonEmptyString(value.step);
    if (!step) return null;

    if (step === 'analyzing' || step === 'blueprint') {
        return {
            step: 'analyzing',
            message: asNonEmptyString(value.message),
            blueprint: parseBlueprint(value.blueprint),
        };
    }

    if (step === 'chunking') {
        return {
            step: 'chunking',
            message: asNonEmptyString(value.message),
            totalChunks: asPositiveInt(value.totalChunks),
        };
    }

    if (step === 'concepts') {
        return {
            step: 'concepts',
            message: asNonEmptyString(value.message),
            concepts: parseStringList(value.concepts),
        };
    }

    if (step === 'generating') {
        return {
            step: 'generating',
            message: asNonEmptyString(value.message),
            currentChunk: asPositiveInt(value.currentChunk),
            totalChunks: asPositiveInt(value.totalChunks),
            generatedSoFar: asPositiveInt(value.generatedSoFar),
            currentTopic: asNonEmptyString(value.currentTopic),
        };
    }

    if (step === 'completed') {
        return {
            step: 'completed',
            totalCards: asPositiveInt(value.totalCards),
        };
    }

    return null;
};

