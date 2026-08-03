export class AppError extends Error {
  public readonly code: string
  public readonly details: Readonly<Record<string, boolean | number | string>> | null
  public readonly statusCode: number

  public constructor(
    statusCode: number,
    message: string,
    code: string,
    details: Readonly<Record<string, boolean | number | string>> | null = null,
  ) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.code = code
    this.details = details
  }
}

export class RepositoryError extends AppError {
  public constructor(message = 'No fue posible consultar los datos') {
    super(503, message, 'DATA_SOURCE_UNAVAILABLE')
    this.name = 'RepositoryError'
  }
}
