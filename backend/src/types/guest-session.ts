export interface IGuestSessionRow {
  expiresAt: string
  id: string
  revokedAt: string | null
}

export interface IGuestSessionContext {
  expiresAt: Date
  id: string
  tokenToSet: string | null
}
