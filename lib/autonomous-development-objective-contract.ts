export const MAX_AUTONOMOUS_OBJECTIVE_CHARS = 16000;

export function countObjectiveCharacters(
  value: string,
): number {
  return Array.from(value).length;
}

export function getObjectiveLengthError(
  value: string,
): string | null {
  const length =
    countObjectiveCharacters(value);

  if (!value.trim()) {
    return "Development objective is required.";
  }

  if (
    length >
    MAX_AUTONOMOUS_OBJECTIVE_CHARS
  ) {
    return `Development objective exceeds the maximum allowed length of ${MAX_AUTONOMOUS_OBJECTIVE_CHARS} Unicode characters (received ${length}).`;
  }

  return null;
}
