export function resolveSortBy<T extends readonly string[]>(
  input: string | undefined,
  allowed: T,
  fallback: T[number],
): T[number] {
  if (!input) return fallback;
  return (allowed as readonly string[]).includes(input) ? (input as T[number]) : fallback;
}
