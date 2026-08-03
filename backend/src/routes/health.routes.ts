import { Router } from 'express'

export function createHealthRouter(): Router {
  const router = Router()

  router.get('/health', (_request, response) => {
    response.setHeader('Cache-Control', 'no-store')
    response.status(200).json({
      success: true,
      data: {
        status: 'ok',
      },
    })
  })

  return router
}
