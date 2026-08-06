import type { RequestHandler } from 'express'
import type { ZodType } from 'zod'

export function validateBody<T>(schema: ZodType<T>): RequestHandler {
  return (request, response, next): void => {
    try {
      response.locals.validatedBody = schema.parse(request.body)
      next()
    } catch (error) {
      next(error)
    }
  }
}

export function validateParams<T>(schema: ZodType<T>): RequestHandler {
  return (request, response, next): void => {
    try {
      response.locals.validatedParams = schema.parse(request.params)
      next()
    } catch (error) {
      next(error)
    }
  }
}

export function validateHeader<T>(
  schema: ZodType<T>,
  headerName: string,
  localName: string,
): RequestHandler {
  return (request, response, next): void => {
    try {
      response.locals[localName] = schema.parse(request.get(headerName))
      next()
    } catch (error) {
      next(error)
    }
  }
}
