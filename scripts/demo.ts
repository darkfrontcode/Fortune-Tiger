import 'reflect-metadata'
import { ValidationPipe } from '@nestjs/common'
import type { INestApplication } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { AppModule } from '../src/app.module'

type Method = 'GET' | 'POST'

type Call = {
  method: Method
  path: string
  key?: string
  body?: unknown
}

type Reply<Payload> = {
  status: number
  payload: Payload
}

type Money = {
  amount: string
  currency: string
}

type Wallet = {
  id: string
  playerId: string
  balance: Money
  version: number
}

type Submit = {
  transactionId: string
  status: string
  balance: Money
  idempotentReplay: boolean
  failureCode?: string
}

type LedgerPage = {
  items: Array<{ direction: string }>
  nextCursor?: string
}

type Comparison = {
  storedBalance: Money
  calculatedBalance: Money
  difference: Money
  consistent: boolean
  checkedEntries: number
}

type WagerBody = {
  providerId: string
  externalTransactionId: string
  playerId: string
  walletId: string
  roundId: string
  gameId: string
  kind: string
  money: Money
}

type Session = {
  baseUrl: string
  playerId: string
  walletId: string
  betTransactionId: string
  betBalance: string
}

const origin = 'http://127.0.0.1'
const freePort = 0
const empty = String()
const missing = -1
const successfulExitCode = 0
const failureExitCode = 1

const okStatus = 200
const createdStatus = 201
const processedStatus = 'PROCESSED'
const creditDirection = 'CREDIT'
const debitDirection = 'DEBIT'
const liveStatus = 'live'
const readyStatus = 'ready'

const providerId = 'demo-provider'
const providerHeader = 'x-provider-id'
const idempotencyHeader = 'idempotency-key'
const jsonHeader = 'content-type'
const mediaType = 'application/json'

const currency = 'BRL'
const roundId = 'demo-round'
const gameId = 'demo-game'
const betKind = 'BET'
const lossKind = 'LOSS'
const openingAmount = '100.00'
const betAmount = '30.00'
const lossAmount = '30.00'
const expectedBetBalance = '70.00'
const expectedLedgerEntries = 2
const expectedProcessed = 3
const expectedDuplicates = 1
const expectedDifference = '0.00'

const processedMetric = 'wager_transactions_processed_total'
const duplicateMetric = 'idempotency_duplicates_total'

const route = {
  live: '/health/live',
  ready: '/health/ready',
  metrics: '/metrics',
  wallets: '/wallets',
  wagers: '/wagering/transactions',
}

const stamp = Date.now()
const player = `demo-player-${stamp}`
const betExternalId = `demo-bet-${stamp}`
const lossExternalId = `demo-loss-${stamp}`
const betKey = `${providerId}:${betExternalId}`
const lossKey = `${providerId}:${lossExternalId}`

const validation = { whitelist: true, forbidNonWhitelisted: true, transform: true }

const mark = {
  step: '🚀',
  success: '✅',
  failure: '❌',
}

const messages = {
  title: 'Fortune Tiger demo',
  complete: 'Demo passed.',
  failed: 'Demo failed.',
  hint: 'The demo needs "docker compose up -d" and "bun run migration:up" first.',
}

const headers = (key: string | undefined): Record<string, string> => {
  const base: Record<string, string> = {
    [jsonHeader]: mediaType,
    [providerHeader]: providerId,
  }

  if (key === undefined) { return base }

  return { ...base, [idempotencyHeader]: key }
}

const init = (call: Call): RequestInit => ({
  method: call.method,
  headers: headers(call.key),
  body: call.body === undefined ? undefined : JSON.stringify(call.body),
})

const json = async <Payload>(session: Session, call: Call): Promise<Reply<Payload>> => {
  const response = await fetch(`${session.baseUrl}${call.path}`, init(call))
  const text = await response.text()
  const parsed = text === empty ? undefined : JSON.parse(text)
  const payload = parsed as Payload

  return { status: response.status, payload }
}

const plain = async (session: Session, path: string): Promise<string> => {
  const response = await fetch(`${session.baseUrl}${path}`)

  return response.text()
}

const counter = (exposition: string, name: string): number => {
  const prefix = `${name} `
  const startsWith = (line: string) => line.startsWith(prefix)
  const line = exposition.split('\n').find(startsWith)

  if (line === undefined) { return missing }

  return Number(line.slice(prefix.length))
}

const assert = (name: string, expected: string, actual: string): void => {
  const passing = expected === actual

  if (!passing) { throw new Error(`${name}: expected ${expected}, got ${actual}`) }

  console.log(`${mark.success} ${name} — ${actual}`)
}

const assertAtLeast = (name: string, expected: number, actual: number): void => {
  const passing = actual >= expected
  const detail = `${actual}, at least ${expected}`

  if (!passing) { throw new Error(`${name}: expected ${detail}`) }

  console.log(`${mark.success} ${name} — ${detail}`)
}

const wager = (session: Session, kind: string, externalId: string, amount: string): WagerBody => ({
  providerId,
  externalTransactionId: externalId,
  playerId: session.playerId,
  walletId: session.walletId,
  roundId,
  gameId,
  kind,
  money: { amount, currency },
})

const submit = (session: Session, body: WagerBody, key: string): Promise<Reply<Submit>> =>
  json<Submit>(session, { method: 'POST', path: route.wagers, key, body })

const health = async (session: Session): Promise<void> => {
  const live = await json<{ status: string }>(session, { method: 'GET', path: route.live })
  const ready = await json<{ status: string }>(session, { method: 'GET', path: route.ready })

  assert('Liveness', String(okStatus), String(live.status))
  assert('Liveness body', liveStatus, live.payload.status)
  assert('Readiness', String(okStatus), String(ready.status))
  assert('Readiness body', readyStatus, ready.payload.status)
}

const openWallet = async (session: Session): Promise<void> => {
  const body = { playerId: session.playerId, initialBalance: { amount: openingAmount, currency } }
  const reply = await json<Wallet>(session, { method: 'POST', path: route.wallets, body })

  assert('Wallet created', String(createdStatus), String(reply.status))
  assert('Opening balance', openingAmount, reply.payload.balance.amount)

  session.walletId = reply.payload.id
}

const submitBet = async (session: Session): Promise<void> => {
  const reply = await submit(session, wager(session, betKind, betExternalId, betAmount), betKey)

  assert('BET accepted', String(okStatus), String(reply.status))
  assert('BET status', processedStatus, reply.payload.status)
  assert('BET balance', expectedBetBalance, reply.payload.balance.amount)

  session.betTransactionId = reply.payload.transactionId
  session.betBalance = reply.payload.balance.amount
}

const replayBet = async (session: Session): Promise<void> => {
  const body = wager(session, betKind, betExternalId, betAmount)
  const reply = await submit(session, body, betKey)

  assert('Replay accepted', String(okStatus), String(reply.status))
  assert('Replay flag', String(true), String(reply.payload.idempotentReplay))
  assert('Replay transaction', session.betTransactionId, reply.payload.transactionId)
  assert('Replay balance', session.betBalance, reply.payload.balance.amount)
}

const submitLoss = async (session: Session): Promise<void> => {
  const reply = await submit(session, wager(session, lossKind, lossExternalId, lossAmount), lossKey)

  assert('LOSS accepted', String(okStatus), String(reply.status))
  assert('LOSS status', processedStatus, reply.payload.status)
  assert('LOSS balance', expectedBetBalance, reply.payload.balance.amount)
}

const readLedger = async (session: Session): Promise<void> => {
  const path = `${route.wallets}/${session.walletId}/ledger`
  const reply = await json<LedgerPage>(session, { method: 'GET', path })
  const toDirection = (item: { direction: string }) => item.direction
  const directions = reply.payload.items.map(toDirection)
  const expected = `${creditDirection},${debitDirection}`

  assert('Ledger page', String(okStatus), String(reply.status))
  assert('Ledger entries', String(expectedLedgerEntries), String(directions.length))
  assert('Ledger directions', expected, directions.join(','))
}

const reconcile = async (session: Session): Promise<void> => {
  const path = `${route.wallets}/${session.walletId}/reconciliation`
  const reply = await json<Comparison>(session, { method: 'POST', path })

  assert('Reconciliation', String(okStatus), String(reply.status))
  assert('Reconciliation consistent', String(true), String(reply.payload.consistent))
  assert('Reconciliation difference', expectedDifference, reply.payload.difference.amount)
  assert('Reconciliation entries', String(expectedLedgerEntries), String(reply.payload.checkedEntries))
}

const readMetrics = async (session: Session): Promise<void> => {
  const exposition = await plain(session, route.metrics)
  const processed = counter(exposition, processedMetric)
  const duplicates = counter(exposition, duplicateMetric)

  assertAtLeast('Processed counter', expectedProcessed, processed)
  assertAtLeast('Duplicate counter', expectedDuplicates, duplicates)
}

const open = async (): Promise<{ app: INestApplication, session: Session }> => {
  const app = await NestFactory.create(AppModule, { logger: false })

  app.useGlobalPipes(new ValidationPipe(validation))
  await app.listen(freePort)

  const server = app.getHttpServer()
  const address = server.address()
  const bound = typeof address === 'object' && address !== null
  const port = bound ? address.port : freePort
  const session: Session = {
    baseUrl: `${origin}:${port}`,
    playerId: player,
    walletId: empty,
    betTransactionId: empty,
    betBalance: empty,
  }

  return { app, session }
}

const main = async (): Promise<number> => {
  console.log(`${mark.step} ${messages.title}\n`)

  const { app, session } = await open()

  try {
    await health(session)
    await openWallet(session)
    await submitBet(session)
    await replayBet(session)
    await submitLoss(session)
    await readLedger(session)
    await reconcile(session)
    await readMetrics(session)
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
  console.error(`${mark.failure} ${messages.hint}`)

  return failureExitCode
}

process.exit(await main().catch(fail))
