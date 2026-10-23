import type { INestApplication } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import type { OpenAPIObject } from '@nestjs/swagger'
import { bearerScheme, wagerTag, walletTag } from '../data'

const title = 'Fortune Tiger'
const version = '1.0.0'
const documentationPath = 'docs'
const jsonDocumentPath = 'docs-json'
const description = [
  'Wager processor: balance, ledger, and a repeated operation stay correct.',
  'The route rules are in `src/presentation/http/spec.md`, and the provider view is in `docs/API.md`.',
  'The default `anonymous` auth mode trusts the `X-Provider-Id` header, or the `providerId` of the body when the header is absent.',
  'The `jwt` mode takes `Authorization: Bearer <token>` from Keycloak and reads the `provider_id` claim.',
  '`POST /wagering/transactions` requires the `Idempotency-Key` header.',
].join(' ')
const bearerDescription = 'Required in the `jwt` auth mode. Ignored in the default `anonymous` mode.'
const walletDescription = 'Open a wallet, read it, page its ledger, and compare it with the ledger.'
const wagerDescription = 'Submit a wager, read it by transaction or by provider pair.'

const createDocument = (app: INestApplication): OpenAPIObject => {
  const config = new DocumentBuilder()
    .setTitle(title)
    .setDescription(description)
    .setVersion(version)
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: bearerDescription },
      bearerScheme,
    )
    .addTag(walletTag, walletDescription)
    .addTag(wagerTag, wagerDescription)
    .build()

  return SwaggerModule.createDocument(app, config)
}

const mountDocs = (app: INestApplication): void => {
  const document = createDocument(app)
  const options = { jsonDocumentUrl: jsonDocumentPath }

  SwaggerModule.setup(documentationPath, app, document, options)
}

export { createDocument, mountDocs }
