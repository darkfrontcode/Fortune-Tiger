import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { HttpStatus } from '@nestjs/common'
import { uuidv7 } from 'uuidv7'

type Wallet = {
  id: string
  playerId: string
  balance: {
    amount: string
    currency: string
  }
  version: number
}

type Wager = {
  providerId: string
  externalTransactionId: string
  playerId: string
  walletId: string
  roundId: string
  gameId: string
  kind: string
  money: {
    amount: string
    currency: string
  }
}

type Peer = {
  write(data: Uint8Array): number
  end(): void
}

type Listener = {
  port: number
  stop(closeActiveConnections?: boolean): void
}

type Application = ReturnType<typeof Bun.spawn>

const host = '127.0.0.1'
const scheme = 'http://'
const method = 'POST'
const mediaType = 'application/json'
const jsonHeader = 'content-type'
const idempotencyHeader = 'idempotency-key'
const defaultPort = 5432
const ephemeralPort = 0
const testTimeout = 120_000
const startupTimeout = 60_000
const recoveryTimeout = 60_000
const pollInterval = 200
const terminationSignal = 'SIGTERM'
const deep = true
const command = {
  run: 'run',
  script: 'src/main.ts',
  pretty: 'false',
}
const route = {
  ready: '/health/ready',
  wallets: '/wallets',
  wagers: '/wagering/transactions',
}
const currency = {
  brl: 'BRL',
}
const amount = {
  opening: '100.00',
  wager: '1.00',
  remaining: '98.00',
}
const provider = {
  id: 'outage-provider',
}
const game = {
  id: 'fortune-tiger',
}
const separator = ':'
const headers = {
  [jsonHeader]: mediaType,
}
const messages = {
  ready: 'The application did not become ready in front of the proxy',
  recovered: 'The application did not recover after the proxy returned',
  unavailable: 'The application did not report the outage',
  walletOpen: 'Wallet creation returned an unexpected HTTP status',
  walletMissing: 'The wallet was not found after the outage',
}

const databaseUrl = (): string =>
  process.env.DATABASE_URL ?? `postgresql://postgres:postgres@${host}:${defaultPort}/fortune_tiger`

const upstream = (): { hostname: string; port: number } => {
  const url = new URL(databaseUrl())

  return { hostname: url.hostname, port: Number(url.port || defaultPort) }
}

const proxiedUrl = (port: number): string => {
  const url = new URL(databaseUrl())

  url.hostname = host
  url.port = String(port)

  return url.toString()
}

const status = async (url: string): Promise<number> => {
  try {
    const response = await fetch(url)

    return response.status
  } catch {
    return 0
  }
}

const waitFor = async (url: string, expected: number, deadline: number): Promise<boolean> => {
  const current = await status(url)

  if (current === expected) { return true }
  if (Date.now() >= deadline) { return false }

  await Bun.sleep(pollInterval)

  return waitFor(url, expected, deadline)
}

class Tunnel {
  private server: Listener | undefined
  private port = ephemeralPort
  private readonly pairs = new Map<Peer, Peer>()
  private readonly buffered = new Map<Peer, Array<Uint8Array>>()

  get address(): number {
    return this.port
  }

  async start(): Promise<void> {
    const target = upstream()
    const pairs = this.pairs
    const buffered = this.buffered
    const detach = (peer: Peer): void => {
      const other = pairs.get(peer)

      pairs.delete(peer)
      buffered.delete(peer)

      if (other === undefined) { return }

      pairs.delete(other)
      other.end()
    }
    const server = Bun.listen({
      hostname: host,
      port: this.port,
      socket: {
        open(client: Peer) {
          Bun.connect({
            hostname: target.hostname,
            port: target.port,
            socket: {
              open(remote: Peer) {
                pairs.set(client, remote)
                pairs.set(remote, client)

                const pending = buffered.get(client) ?? []
                const toWrite = (chunk: Uint8Array) => {
                  remote.write(chunk)
                }

                pending.forEach(toWrite)
                buffered.delete(client)
              },
              data(remote: Peer, data: Uint8Array) {
                const peer = pairs.get(remote)

                if (peer !== undefined) { peer.write(data) }
              },
              close(remote: Peer) {
                detach(remote)
              },
              error(remote: Peer) {
                detach(remote)
              },
            },
          }).catch(() => {
            client.end()
          })
        },
        data(client: Peer, data: Uint8Array) {
          const remote = pairs.get(client)

          if (remote === undefined) {
            const pending = buffered.get(client) ?? []

            pending.push(data)
            buffered.set(client, pending)

            return
          }

          remote.write(data)
        },
        close(client: Peer) {
          detach(client)
        },
        error(client: Peer) {
          detach(client)
        },
      },
    })
    const port = server.port

    this.server = server
    this.port = typeof port === 'number' ? port : this.port
  }

  stop(): void {
    this.server?.stop(deep)
    this.server = undefined

    this.pairs.forEach((peer) => {
      peer.end()
    })

    this.pairs.clear()
    this.buffered.clear()
  }
}

class Instance {
  private child: Application | undefined
  private port = ephemeralPort

  get baseUrl(): string {
    return `${scheme}${host}:${this.port}`
  }

  async start(url: string): Promise<void> {
    const reservation = Bun.serve({
      hostname: host,
      port: ephemeralPort,
      fetch: () => new Response(),
    })
    const port = reservation.port

    reservation.stop(deep)

    if (port === undefined) { throw new Error(messages.ready) }

    this.port = port
    this.child = Bun.spawn([process.execPath, command.run, command.script], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PORT: String(port),
        LOG_PRETTY: command.pretty,
        DATABASE_URL: url,
      },
      stdout: 'ignore',
      stderr: 'inherit',
    })
  }

  async stop(): Promise<void> {
    const child = this.child

    if (child === undefined) { return }

    this.child = undefined
    child.kill(terminationSignal)

    await child.exited
  }
}

const openWallet = async (baseUrl: string): Promise<Wallet> => {
  const body = JSON.stringify({
    playerId: uuidv7(),
    initialBalance: { amount: amount.opening, currency: currency.brl },
  })
  const response = await fetch(`${baseUrl}${route.wallets}`, { method, headers, body })

  if (response.status !== HttpStatus.CREATED) { throw new Error(messages.walletOpen) }

  const wallet: Wallet = await response.json()

  return wallet
}

const wager = (wallet: Wallet, externalTransactionId: string): Wager => ({
  providerId: provider.id,
  externalTransactionId,
  playerId: wallet.playerId,
  walletId: wallet.id,
  roundId: uuidv7(),
  gameId: game.id,
  kind: 'BET',
  money: { amount: amount.wager, currency: currency.brl },
})

const submit = async (baseUrl: string, body: Wager): Promise<Response> => {
  const key = `${provider.id}${separator}${body.externalTransactionId}`
  const requestHeaders = { ...headers, [idempotencyHeader]: key }

  return fetch(`${baseUrl}${route.wagers}`, {
    method,
    headers: requestHeaders,
    body: JSON.stringify(body),
  })
}

describe('Database outage', () => {
  const proxy = new Tunnel()
  const application = new Instance()

  beforeAll(async () => {
    await proxy.start()
    await application.start(proxiedUrl(proxy.address))

    const ready = await waitFor(
      `${application.baseUrl}${route.ready}`,
      HttpStatus.OK,
      Date.now() + startupTimeout,
    )

    if (!ready) { throw new Error(messages.ready) }
  }, testTimeout)

  afterAll(async () => {
    await application.stop()
    proxy.stop()
  }, testTimeout)

  test(
    'WHEN the database goes away SHOULD answer 503 and recover without a restart',
    async () => {
      const wallet = await openWallet(application.baseUrl)
      const processedId = uuidv7()
      const processed = await submit(application.baseUrl, wager(wallet, processedId))

      expect(processed.status).toBe(HttpStatus.OK)

      proxy.stop()

      const unavailable = await waitFor(
        `${application.baseUrl}${route.ready}`,
        HttpStatus.SERVICE_UNAVAILABLE,
        Date.now() + recoveryTimeout,
      )

      expect(unavailable).toBe(true)

      const outageId = uuidv7()
      const duringOutage = await submit(application.baseUrl, wager(wallet, outageId))

      expect(duringOutage.status).toBe(HttpStatus.SERVICE_UNAVAILABLE)

      await proxy.start()

      const recovered = await waitFor(
        `${application.baseUrl}${route.ready}`,
        HttpStatus.OK,
        Date.now() + recoveryTimeout,
      )

      expect(recovered).toBe(true)

      const recoveredId = uuidv7()
      const afterOutage = await submit(application.baseUrl, wager(wallet, recoveredId))
      const output = await afterOutage.json()
      const balance = await fetch(`${application.baseUrl}${route.wallets}/${wallet.id}`)
      const stored: Wallet = await balance.json()

      expect(afterOutage.status).toBe(HttpStatus.OK)
      expect(output.status).toBe('PROCESSED')
      expect(balance.status).toBe(HttpStatus.OK)
      expect(stored.balance.amount).toBe(amount.remaining)
    },
    testTimeout,
  )
})
