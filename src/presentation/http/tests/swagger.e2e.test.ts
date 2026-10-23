import { beforeAll, describe, expect, it } from 'bun:test'
import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { createApp } from '../../../../test/test-setup.e2e'

describe('Swagger (e2e)', () => {
  let app: INestApplication

  beforeAll(async () => {
    app = await createApp()
  })

  describe('GET /docs-json', () => {
    it('should describe the provider routes and leave health and metrics out', async () => {
      const response = await request(app.getHttpServer()).get('/docs-json').expect(200)
      const paths = response.body.paths

      expect(response.body.info.title).toBe('Fortune Tiger')
      expect(paths).toHaveProperty('/wallets')
      expect(paths).toHaveProperty('/wallets/{walletId}')
      expect(paths).toHaveProperty('/wagering/transactions')
      expect(paths).toHaveProperty('/providers/{providerId}/wagering/transactions/{externalTransactionId}')
      expect(paths).not.toHaveProperty('/health/live')
      expect(paths).not.toHaveProperty('/metrics')
    })

    it('should document the request and response schemas', async () => {
      const response = await request(app.getHttpServer()).get('/docs-json').expect(200)
      const schemas = response.body.components.schemas

      expect(schemas).toHaveProperty('WagerDto')
      expect(schemas).toHaveProperty('WalletDto')
      expect(schemas).toHaveProperty('WagerSubmitOutputDto')
      expect(schemas).toHaveProperty('LedgerOutputPageDto')
      expect(response.body.components.securitySchemes).toHaveProperty('bearer')
    })

    it('should mark the Idempotency-Key as a required header of the submit route', async () => {
      const response = await request(app.getHttpServer()).get('/docs-json').expect(200)
      const submit = response.body.paths['/wagering/transactions'].post
      const headers = submit.parameters.filter((parameter: { in: string }) => parameter.in === 'header')
      const key = headers.find((parameter: { name: string }) => parameter.name === 'Idempotency-Key')

      expect(key.required).toBe(true)
    })
  })

  describe('GET /docs', () => {
    it('should serve the Swagger UI', async () => {
      const response = await request(app.getHttpServer()).get('/docs').expect(200)

      expect(response.text).toContain('swagger')
    })
  })
})
