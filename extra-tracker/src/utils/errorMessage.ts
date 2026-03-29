/**
 * Type-safe error message extraction.
 * Replaces `catch (err: any) { err.message }` pattern.
 */
export const getErrorMessage = (err: unknown): string =>
    err instanceof Error ? err.message : 'Errore sconosciuto';
