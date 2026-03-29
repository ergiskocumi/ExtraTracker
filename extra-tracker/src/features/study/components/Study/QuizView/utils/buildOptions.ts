/**
 * Build and filter options for quiz
 */

export const buildOptions = (
  options: string[],
  correctAnswer: string,
  isTrueFalse: boolean,
): string[] => {
  if (isTrueFalse) {
    // Per Vero/Falso, vogliamo solo 2 opzioni
    const pool = options.filter(
      (o) => typeof o === "string" && o.trim(),
    );
    const hasTrue = pool.some(
      (o) =>
        o.toLowerCase().includes("vero") ||
        o.toLowerCase().includes("true"),
    );
    const hasFalse = pool.some(
      (o) =>
        o.toLowerCase().includes("falso") ||
        o.toLowerCase().includes("false"),
    );

    if (hasTrue && hasFalse) {
      // Ordina in modo che Vero sia sempre a sinistra/sopra
      return pool
        .filter(
          (o) =>
            o.toLowerCase().includes("vero") ||
            o.toLowerCase().includes("true") ||
            o.toLowerCase().includes("falso") ||
            o.toLowerCase().includes("false"),
        )
        .sort((a, _b) => {
          const aIsTrue =
            a.toLowerCase().includes("vero") ||
            a.toLowerCase().includes("true");
          return aIsTrue ? -1 : 1;
        })
        .slice(0, 2);
    }

    // Fallback se non ci sono entrambi
    return ["Vero", "Falso"];
  }

  const cleaned = options.filter(
    (value) =>
      typeof value === "string" &&
      value.trim() &&
      !["nessuna delle precedenti", "altro", "non specificato", "informazione non presente"].includes(value.trim().toLowerCase()),
  );

  const normalizedCorrect = correctAnswer.trim().toLowerCase();
  const hasCorrect = cleaned.some(
    (value) => value.trim().toLowerCase() === normalizedCorrect,
  );

  const pool = hasCorrect ? cleaned : [correctAnswer, ...cleaned];

  const filled: string[] = [];
  const seen = new Set<string>();

  for (const value of pool) {
    const normalized = value.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    filled.push(value.trim());
    if (filled.length >= 4) break;
  }

  return filled;
};
