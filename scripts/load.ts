import { Environment } from '../src/infrastructure/environment'

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

type Comparison = {
  difference: Money
  consistent: boolean
  checkedEntries: number
}

type Attempt<Payload> = {
  duration: number
  status?: number
  payload?: Payload
}

type Wave = {
  name: string
  attempts: Array<Attempt<Submit>>
  wall: number
}

type Stats = {
  count: number
  throughput: number
  p50: number
  p95: number
  p99: number
  errors: number
}

type Account = {
  playerId: string
  wallet: Wallet
}

type WagerInput = {
  playerId: string
  walletId: string
  externalId: string
}

type Counters = {
  processed: number
  duplicates: number
  lockConflicts: number
}

type Config = {
  wallets: number
  hot: number
  concurrency: number
  target: string
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

const origin = 'http://127.0.0.1'
const empty = String()
const successfulExitCode = 0
const failureExitCode = 1
const defaultWallets = 50
const defaultHot = 50
const defaultConcurrency = 25
const hotReserve = 1_000
const openingAmount = '10.00'
const betAmount = '1.00'
const expectedWalletBalance = '9.00'
const expectedDifference = '0.00'
const okStatus = 200
const createdStatus = 201
const processedStatus = 'PROCESSED'
const currency = 'BRL'
const providerId = 'load-provider'
const providerHeader = 'x-provider-id'
const idempotencyHeader = 'idempotency-key'
const jsonHeader = 'content-type'
const mediaType = 'application/json'
const roundId = 'load-round'
const gameId = 'load-game'
const betKind = 'BET'
const processedMetric = 'wager_transactions_processed_total'
const duplicateMetric = 'idempotency_duplicates_total'
const lockMetric = 'lock_conflicts_total'
const labelWidth = 20
const requestWidth = 8
const rateWidth = 12
const latencyWidth = 10
const missingCounter = 0
const environment = new Environment()

const route = {
  live: '/health/live',
  metrics: '/metrics',
  wallets: '/wallets',
  wagers: '/wagering/transactions',
}

const stamp = Date.now()

const mark = {
  step: '>',
  success: 'ok',
  failure: 'fail',
}

const messages = {
  title: 'Fortune Tiger load test',
  hint: 'The load test needs a running API: run "bun run start" in another terminal.',
  invalidFlag: 'Invalid flag',
  walletFailed: 'Wallet open failed',
  distinctBalance: 'Distinct wallet balances',
  hotBalance: 'Hot wallet balance',
  reconciliation: 'Hot wallet reconciliation',
  entries: 'Hot wallet ledger entries',
  processed: 'Bets processed',
  duplicates: 'Duplicate counter delta',
  lock: 'Lock conflicts during the run',
  complete: 'Load test passed.',
  failed: 'Load test failed.',
}

const argument = (name: string): string | undefined => {
  const prefix = `--${name}=`
  const found = Bun.argv.find((value) => value.startsWith(prefix))

  return found?.slice(prefix.length)
}

const count = (name: string, fallback: number): number => {
  const value = argument(name)

  if (value === undefined) { return fallback }

  const parsed = Number(value)

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${messages.invalidFlag}: --${name}=${value}`)
  }

  return parsed
}

const config = (): Config => ({
  wallets: count('wallets', defaultWallets),
  hot: count('hot', defaultHot),
  concurrency: count('concurrency', defaultConcurrency),
  target: argument('target') ?? `${origin}:${environment.port}`,
})

const amount = (value: number): string => value.toFixed(2)

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

const json = async <Payload>(target: string, call: Call): Promise<Reply<Payload>> => {
  const response = await fetch(`${target}${call.path}`, init(call))
  const text = await response.text()
  const parsed = text === empty ? undefined : JSON.parse(text)
  const payload = parsed as Payload

  return { status: response.status, payload }
}

const plain = async (target: string, path: string): Promise<string> => {
  const response = await fetch(`${target}${path}`)

  return response.text()
}

const counter = (exposition: string, name: string): number => {
  const prefix = `${name} `
  const startsWith = (line: string) => line.startsWith(prefix)
  const line = exposition.split('\n').find(startsWith)

  if (line === undefined) { return missingCounter }

  return Number(line.slice(prefix.length))
}

const pool = async <Input, Output>(
  inputs: Array<Input>,
  limit: number,
  run: (input: Input) => Promise<Output>,
): Promise<Array<Output>> => {
  const queue = [...inputs]
  const results: Array<Output> = []

  const worker = async (): Promise<void> => {
    const input = queue.shift()

    if (input === undefined) { return }

    results.push(await run(input))
    await worker()
  }

  const workers = Math.min(limit, inputs.length)

  await Promise.all(Array.from({ length: workers }, () => worker()))

  return results
}

const timed = async <Payload>(call: () => Promise<Reply<Payload>>): Promise<Attempt<Payload>> => {
  const started = performance.now()

  try {
    const reply = await call()

    return { duration: performance.now() - started, status: reply.status, payload: reply.payload }
  } catch {
    return { duration: performance.now() - started }
  }
}

const wave = async (
  name: string,
  inputs: Array<WagerInput>,
  limit: number,
  run: (input: WagerInput) => Promise<Reply<Submit>>,
): Promise<Wave> => {
  const started = performance.now()
  const attempts = await pool(inputs, limit, (input) => timed(() => run(input)))
  const wall = performance.now() - started

  return { name, attempts, wall }
}

const ascending = (left: number, right: number): number => left - right

const percentile = (durations: Array<number>, fraction: number): number => {
  if (durations.length === 0) { return 0 }

  const rank = Math.ceil(fraction * durations.length)
  const index = Math.min(Math.max(rank - 1, 0), durations.length - 1)

  return Math.round(durations[index] ?? 0)
}

const failed = (attempt: Attempt<Submit>): boolean => attempt.status !== okStatus

const stats = (measured: Wave): Stats => {
  const durations = measured.attempts.map((attempt) => attempt.duration).sort(ascending)
  const seconds = measured.wall / 1_000
  const throughput = seconds === 0 ? 0 : measured.attempts.length / seconds

  return {
    count: measured.attempts.length,
    throughput,
    p50: percentile(durations, 0.5),
    p95: percentile(durations, 0.95),
    p99: percentile(durations, 0.99),
    errors: measured.attempts.filter(failed).length,
  }
}

const row = (name: string, result: Stats): string => {
  const cells = [
    name.padEnd(labelWidth),
    String(result.count).padStart(requestWidth),
    `${result.throughput.toFixed(1)}/s`.padStart(rateWidth),
    `${result.p50} ms`.padStart(latencyWidth),
    `${result.p95} ms`.padStart(latencyWidth),
    `${result.p99} ms`.padStart(latencyWidth),
    String(result.errors).padStart(requestWidth),
  ]

  return cells.join('  ')
}

const line = (name: string, value: string): void => {
  console.log(`${mark.success} ${name} - ${value}`)
}

const assert = (name: string, expected: string, actual: string): void => {
  if (expected !== actual) {
    throw new Error(`${name}: expected ${expected}, got ${actual}`)
  }

  line(name, actual)
}

const assertAtLeast = (name: string, expected: number, actual: number): void => {
  if (actual < expected) {
    throw new Error(`${name}: expected at least ${expected}, got ${actual}`)
  }

  line(name, `${actual}, at least ${expected}`)
}

const wager = (input: WagerInput): WagerBody => ({
  providerId,
  externalTransactionId: input.externalId,
  playerId: input.playerId,
  walletId: input.walletId,
  roundId,
  gameId,
  kind: betKind,
  money: { amount: betAmount, currency },
})

const bet = (target: string, input: WagerInput): Promise<Reply<Submit>> =>
  json<Submit>(target, {
    method: 'POST',
    path: route.wagers,
    key: `${providerId}:${input.externalId}`,
    body: wager(input),
  })

const openWallet = async (target: string, playerId: string, balance: string): Promise<Wallet> => {
  const body = { playerId, initialBalance: { amount: balance, currency } }
  const reply = await json<Wallet>(target, { method: 'POST', path: route.wallets, body })

  if (reply.status !== createdStatus) {
    throw new Error(`${messages.walletFailed}: ${playerId} answered ${reply.status}`)
  }

  return reply.payload
}

const openAccount = async (target: string, playerId: string, balance: string): Promise<Account> => {
  const wallet = await openWallet(target, playerId, balance)

  return { playerId, wallet }
}

const readWallet = async (target: string, walletId: string): Promise<Wallet> => {
  const reply = await json<Wallet>(target, { method: 'GET', path: `${route.wallets}/${walletId}` })

  if (reply.status !== okStatus) {
    throw new Error(`${messages.hotBalance}: ${walletId} answered ${reply.status}`)
  }

  return reply.payload
}

const reconcile = async (target: string, walletId: string): Promise<Comparison> => {
  const path = `${route.wallets}/${walletId}/reconciliation`
  const reply = await json<Comparison>(target, { method: 'POST', path })

  if (reply.status !== okStatus) {
    throw new Error(`${messages.reconciliation}: ${walletId} answered ${reply.status}`)
  }

  return reply.payload
}

const readCounters = async (target: string): Promise<Counters> => {
  const exposition = await plain(target, route.metrics)

  return {
    processed: counter(exposition, processedMetric),
    duplicates: counter(exposition, duplicateMetric),
    lockConflicts: counter(exposition, lockMetric),
  }
}

const live = async (target: string): Promise<boolean> => {
  const unreachable = (): boolean => false
  const reached = await json<{ status: string }>(target, { method: 'GET', path: route.live })
    .then((reply) => reply.status === okStatus)
    .catch(unreachable)

  return reached
}

const assertProcessed = (measured: Wave): void => {
  const wrong = measured.attempts.filter((attempt) => attempt.payload?.status !== processedStatus)
  const errors = measured.attempts.filter(failed)
  const firstStatus = errors.at(0)?.status ?? okStatus

  if (wrong.length > 0 || errors.length > 0) {
    throw new Error(`${messages.processed}: ${measured.name} had ${errors.length} http errors (first status ${firstStatus}) and ${wrong.length} not ${processedStatus}`)
  }

  line(`${messages.processed} (${measured.name})`, String(measured.attempts.length))
}

const assertBalances = (wallets: Array<Wallet>): void => {
  const wrong = wallets.filter((wallet) => wallet.balance.amount !== expectedWalletBalance)

  if (wrong.length > 0) {
    throw new Error(`${messages.distinctBalance}: ${wrong.length} of ${wallets.length} did not answer ${expectedWalletBalance}`)
  }

  line(messages.distinctBalance, `${wallets.length} at ${expectedWalletBalance}`)
}

const header = (): void => {
  const labels = [
    'Scenario'.padEnd(labelWidth),
    'Requests'.padStart(requestWidth),
    'Throughput'.padStart(rateWidth),
    'p50'.padStart(latencyWidth),
    'p95'.padStart(latencyWidth),
    'p99'.padStart(latencyWidth),
    'Errors'.padStart(requestWidth),
  ]

  console.log(`\n${labels.join('  ')}`)
}

const main = async (): Promise<number> => {
  const settings = config()

  console.log(`${mark.step} ${messages.title}`)

  if (!(await live(settings.target))) {
    console.error(`${mark.failure} ${messages.hint}`)

    return failureExitCode
  }

  const players = Array.from({ length: settings.wallets }, (_, index) => `load-player-${stamp}-${index}`)
  const accounts = await pool(players, settings.concurrency, (playerId) =>
    openAccount(settings.target, playerId, openingAmount))

  const hotPlayer = `load-hot-${stamp}`
  const hotAccount = await openAccount(settings.target, hotPlayer, amount(settings.hot + hotReserve))

  const distinctInputs = accounts.map((account, index) => ({
    playerId: account.playerId,
    walletId: account.wallet.id,
    externalId: `load-distinct-${stamp}-${index}`,
  }))

  const hotInputs = Array.from({ length: settings.hot }, (_, index) => ({
    playerId: hotAccount.playerId,
    walletId: hotAccount.wallet.id,
    externalId: `load-hot-bet-${stamp}-${index}`,
  }))

  const before = await readCounters(settings.target)
  const distinct = await wave('Distinct wallets', distinctInputs, settings.concurrency, (input) =>
    bet(settings.target, input))
  const hot = await wave('Hot wallet', hotInputs, settings.concurrency, (input) =>
    bet(settings.target, input))
  const after = await readCounters(settings.target)

  header()
  console.log(row(distinct.name, stats(distinct)))
  console.log(row(hot.name, stats(hot)))

  console.log(empty)

  assertProcessed(distinct)
  assertProcessed(hot)

  const wallets = await pool(accounts, settings.concurrency, (account) =>
    readWallet(settings.target, account.wallet.id))

  assertBalances(wallets)

  const hotWallet = await readWallet(settings.target, hotAccount.wallet.id)
  const comparison = await reconcile(settings.target, hotAccount.wallet.id)

  assert(messages.hotBalance, amount(hotReserve), hotWallet.balance.amount)
  assert(messages.reconciliation, String(true), String(comparison.consistent))
  assert(`${messages.reconciliation} difference`, expectedDifference, comparison.difference.amount)
  assert(messages.entries, String(settings.hot + 1), String(comparison.checkedEntries))

  const processedDelta = after.processed - before.processed
  const duplicateDelta = after.duplicates - before.duplicates
  const lockDelta = after.lockConflicts - before.lockConflicts

  assertAtLeast(messages.processed, settings.wallets + settings.hot, processedDelta)
  assert(messages.duplicates, '0', String(duplicateDelta))
  line(messages.lock, String(lockDelta))

  console.log(`\n${mark.success} ${messages.complete}`)

  return successfulExitCode
}

const fail = (error: unknown): number => {
  const message = error instanceof Error ? error.message : String(error)

  console.error(`\n${mark.failure} ${messages.failed}`)
  console.error(`${mark.failure} ${message}`)

  return failureExitCode
}

process.exit(await main().catch(fail))
