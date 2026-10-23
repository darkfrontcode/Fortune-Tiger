import 'reflect-metadata'
import { ValidationPipe } from '@nestjs/common'
import type { INestApplication } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { AppModule } from '../src/app.module'

type Reply<Payload> = {
  status: number
  payload: Payload
}

type Session = {
  baseUrl: string
  token: string
  playerId: string
  walletId: string
}

type Submit = {
  transactionId: string
  status: string
  balance: {
    amount: string
    currency: string
  }
  idempotentReplay: boolean
}

type Wager = {
  providerId: string
  externalTransactionId: string
}

const origin = 'http://127.0.0.1'
const freePort = 0
const empty = String()
const successfulExitCode = 0
const failureExitCode = 1
const unauthorizedStatus = 401
const createdStatus = 201
const okStatus = 200
const notFoundStatus = 404
const processedStatus = 'PROCESSED'
const jwtMode = 'jwt'

const keycloakUrl = process.env.KEYCLOAK_URL ?? 'http://127.0.0.1:8080'
const realm = process.env.KEYCLOAK_REALM ?? 'fortune-tiger'
const clientId = process.env.KEYCLOAK_CLIENT_ID ?? 'fortune-tiger-api'
const username = process.env.KEYCLOAK_USERNAME ?? 'provider-a'
const password = process.env.KEYCLOAK_PASSWORD ?? 'provider-a'

const providerId = 'provider-a'
const otherProviderId = 'provider-b'
const playerId = `auth-player-${Date.now()}`
const currency = 'BRL'
const openingAmount = '100.00'
const betAmount = '5.00'
const expectedBalance = '95.00'
const roundId = 'auth-round'
const gameId = 'auth-game'
const betKind = 'BET'

const providerHeader = 'x-provider-id'
const authorizationHeader = 'authorization'
const idempotencyHeader = 'idempotency-key'
const jsonHeader = 'content-type'
const mediaType = 'application/json'

const stamp = Date.now()
const externalTransactionId = `auth-bet-${stamp}`
const idempotencyKey = `${providerId}:${externalTransactionId}`

const route = {
  discovery: `/realms/${realm}/.well-known/openid-configuration`,
  token: `/realms/${realm}/protocol/openid-connect/token`,
  live: '/health/live',
  wallets: '/wallets',
  wagers: '/wagering/transactions',
  providerWager: `/providers/${providerId}/wagering/transactions/${externalTransactionId}`,
  otherProviderWager: `/providers/${otherProviderId}/wagering/transactions/${externalTransactionId}`,
}

const mark = {
  step: '>',
  success: 'OK',
  failure: 'ERR',
}

const messages = {
  title: 'Fortune Tiger auth smoke',
  complete: 'Auth smoke passed.',
  failed: 'Auth smoke failed.',
  keycloak: `Keycloak is not answering at ${keycloakUrl}. Start it with "docker compose --profile auth up -d".`,
  stack: 'The smoke needs the database and the queue, so run "docker compose up -d" and "bun run migration:up" first.',
}

const discovery = async (): Promise<{ issuer: string, jwksUrl: string }> => {
  const response = await fetch(`${keycloakUrl}${route.discovery}`).catch(() => undefined)

  if (response === undefined || !response.ok) { throw new Error(messages.keycloak) }

  const body = await response.json()

  return { issuer: body.issuer, jwksUrl: body.jwks_uri }
}

const token = async (): Promise<string> => {
  const body = new URLSearchParams({
    grant_type: 'password',
    client_id: clientId,
    username,
    password,
  })
  const response = await fetch(`${keycloakUrl}${route.token}`, {
    method: 'POST',
    headers: { [jsonHeader]: 'application/x-www-form-urlencoded' },
    body,
  })

  if (!response.ok) { throw new Error(`Keycloak refused the token: ${response.status}`) }

  const payload = await response.json()

  return payload.access_token
}

const headers = (
  token: string | undefined,
  key: string | undefined,
  spoofed: string | undefined,
): Record<string, string> => {
  const base: Record<string, string> = {
    [jsonHeader]: mediaType,
  }

  if (token !== undefined) { base[authorizationHeader] = `Bearer ${token}` }
  if (key !== undefined) { base[idempotencyHeader] = key }
  if (spoofed !== undefined) { base[providerHeader] = spoofed }

  return base
}

const json = async <Payload>(
  session: Session,
  method: string,
  path: string,
  options: { token?: string, key?: string, body?: unknown, spoofed?: string } = {},
): Promise<Reply<Payload>> => {
  const requestHeaders = headers(options.token, options.key, options.spoofed)
  const response = await fetch(`${session.baseUrl}${path}`, {
    method,
    headers: requestHeaders,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })
  const text = await response.text()
  const payload = text === empty ? undefined : JSON.parse(text)

  return { status: response.status, payload }
}

const assert = (name: string, expected: string, actual: string): void => {
  const passing = expected === actual

  if (!passing) { throw new Error(`${name}: expected ${expected}, got ${actual}`) }

  console.log(`${mark.success} ${name} - ${actual}`)
}

const wager = (): unknown => ({
  providerId: otherProviderId,
  externalTransactionId,
  playerId,
  walletId: empty,
  roundId,
  gameId,
  kind: betKind,
  money: { amount: betAmount, currency },
})

const open = async (issuer: string, jwksUrl: string): Promise<INestApplication> => {
  process.env.AUTH_MODE = jwtMode
  process.env.OIDC_ISSUER = issuer
  process.env.OIDC_JWKS_URL = jwksUrl
  process.env.OIDC_AUDIENCE = process.env.OIDC_AUDIENCE ?? clientId

  const app = await NestFactory.create(AppModule, { logger: false })

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  await app.listen(freePort)

  return app
}

const address = (app: INestApplication): string => {
  const server = app.getHttpServer()
  const address = server.address()
  const bound = typeof address === 'object' && address !== null
  const port = bound ? address.port : freePort

  return `${origin}:${port}`
}

const main = async (): Promise<number> => {
  console.log(`${mark.step} ${messages.title}\n`)

  const { issuer, jwksUrl } = await discovery()
  const credential = await token()
  const app = await open(issuer, jwksUrl)
  const session: Session = {
    baseUrl: address(app),
    token: credential,
    playerId,
    walletId: empty,
  }

  try {
    const live = await json<{ status: string }>(session, 'GET', route.live)
    const refused = await json<Submit>(session, 'POST', route.wagers, { body: wager() })

    assert('Liveness', String(okStatus), String(live.status))
    assert('Wager without a token', String(unauthorizedStatus), String(refused.status))

    const wallet = await json<{ id: string }>(session, 'POST', route.wallets, {
      body: { playerId, initialBalance: { amount: openingAmount, currency } },
    })

    assert('Wallet created without a token', String(createdStatus), String(wallet.status))

    session.walletId = wallet.payload.id

    const body = { ...(wager() as Record<string, unknown>), walletId: session.walletId }
    const submitted = await json<Submit>(session, 'POST', route.wagers, {
      token: session.token,
      key: idempotencyKey,
      body,
      spoofed: otherProviderId,
    })

    assert('Wager with a token and a spoofed header', String(okStatus), String(submitted.status))
    assert('Wager status', processedStatus, submitted.payload.status)
    assert('Wager balance', expectedBalance, submitted.payload.balance.amount)

    const stored = await json<Wager>(session, 'GET', route.providerWager, { token: session.token })
    const absent = await json<Wager>(session, 'GET', route.otherProviderWager, { token: session.token })

    assert('Stored provider', providerId, stored.payload.providerId)
    assert('Provider from the token wins', String(okStatus), String(stored.status))
    assert('Spoofed provider is empty', String(notFoundStatus), String(absent.status))

    const forged = await json<Submit>(session, 'POST', route.wagers, {
      token: 'forged',
      key: `${providerId}:forged-${stamp}`,
      body,
    })

    assert('Wager with a forged token', String(unauthorizedStatus), String(forged.status))
    console.log(`\n${mark.success} ${messages.complete}`)

    return successfulExitCode
  } finally {
    await app.close()
  }
}

const fail = (error: unknown): number => {
  const message = error instanceof Error ? error.message : String(error)

  console.error(`\n${mark.failure} ${messages.failed}`)
  console.error(`${mark.failure} ${message}`)
  console.error(`${mark.failure} ${messages.stack}`)

  return failureExitCode
}

process.exit(await main().catch(fail))
