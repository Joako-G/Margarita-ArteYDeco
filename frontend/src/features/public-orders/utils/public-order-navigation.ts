export type PublicOrderBackActionType = 'catalog' | 'history'

export function getPublicOrderBackAction(historyIndex: number | null): PublicOrderBackActionType {
  return historyIndex !== null && historyIndex > 0 ? 'history' : 'catalog'
}
