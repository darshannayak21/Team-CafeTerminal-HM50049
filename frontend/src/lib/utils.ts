/**
 * Utility helper to concatenate conditional CSS class names without external dependencies.
 */
export function cn(...classes: (string | boolean | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
