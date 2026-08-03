export function escapePostgrestLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&')
}
