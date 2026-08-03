import type { Request, Response } from 'express'

import type { ICsrfService } from '../services/csrf.service.js'
import { setCsrfCookie } from '../utils/cookies.js'

export class CsrfController {
  public constructor(private readonly service: ICsrfService) {}

  public getToken = (_request: Request, response: Response): void => {
    const token = this.service.createToken()

    setCsrfCookie(response, token)
    response.setHeader('Cache-Control', 'no-store')
    response.setHeader('Referrer-Policy', 'no-referrer')
    response.status(200).json({ success: true, data: { csrfToken: token } })
  }
}
