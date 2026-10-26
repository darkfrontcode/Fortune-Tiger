import { chmodSync, existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

type Step = {
  name: string
  command: Array<string>
}

type Check = {
  name: string
  detail: string
  passing: boolean
}

type WalletBody = {
  id: string
  balance: { amount: string }
}

type WagerBody = {
  transactionId: string
  status: string
  balance: { amount: string }
  idempotentReplay: boolean
}

type LedgerBody = {
  items: Array<unknown>
}

type ReconciliationBody = {
  consistent: boolean
  checkedEntries: number
}

const EMPTY_NUMBER = 0
const successfulExitCode = EMPTY_NUMBER
const failureExitCode = 1
const retryDelay = 2_000
const retries = 45
const dockerDelay = 3_000
const dockerRetries = 16
const kindVersion = 'v0.33.0'
const kubectlVersion = 'v1.32.0'
const toolsDirectory = '.tools/bin'
const dockerDesktop = 'C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe'

const platform = (): string => {
  if (process.platform === 'win32') { return 'windows' }
  if (process.platform === 'darwin') { return 'darwin' }

  return 'linux'
}

const architecture = (): string => (process.arch === 'arm64' ? 'arm64' : 'amd64')
const extension = (): string => (process.platform === 'win32' ? '.exe' : '')

const cluster = {
  name: 'fortune-tiger',
  namespace: 'fortune-tiger',
  config: 'kubernetes/kind/cluster.yaml',
  base: 'kubernetes/base',
  overlay: 'kubernetes/overlays/local',
  observability: 'kubernetes/overlays/observability',
  image: 'fortune-tiger:local',
  url: 'http://127.0.0.1:30080',
  readiness: '300s',
  migration: '300s',
  restrictor: 'LoadRestrictionsNone',
}

const tools = {
  docker: 'docker',
  kind: 'kind',
  kubectl: 'kubectl',
}

const sources = new Map<string, string>()

sources.set(
  'kind',
  `https://github.com/kubernetes-sigs/kind/releases/download/${kindVersion}/kind-${platform()}-${architecture()}`,
)
sources.set(
  'kubectl',
  `https://dl.k8s.io/release/${kubectlVersion}/bin/${platform()}/${architecture()}/kubectl${extension()}`,
)

const layers = [cluster.base, cluster.overlay, cluster.observability]

const mark = {
  step: '🚀',
  failure: '❌',
  success: '✅',
}

const messages = {
  docker: 'Docker is not installed. Install Docker Desktop and try again.',
  startingDocker: 'Docker is not answering, starting Docker Desktop.',
  waitingDocker: 'Docker did not answer in time. Start Docker Desktop and try again.',
  download: 'Downloading',
  downloadFailed: 'Could not download',
  reused: 'The cluster already exists, reusing it.',
  created: 'Cluster is up.',
  removed: 'Cluster is gone.',
  rendered: 'Manifests render.',
  notReady: 'The API did not answer /health/ready on',
  api: 'The cluster API did not answer.',
  verified: 'The cluster is verified.',
  failed: 'Cluster command failed.',
}

const verification = {
  provider: 'ci',
  currency: 'BRL',
  opening: '100.00',
  bet: '30.00',
  afterBet: '70.00',
  unit: '1.00',
  burst: 20,
  nodes: 3,
  replicas: 2,
  entries: 2,
  streaming: 'streaming',
  completed: '1',
  settle: 5,
  datalakeRetries: 20,
  counter: 'wager_transactions_processed_total',
  mongo: 'app=mongo',
  collections: 'audit_events journey_steps',
}

const check = {
  nodes: 'Every node is Ready',
  endpoints: 'The api Service has two endpoints',
  replication: 'The standby streams from the primary',
  migration: 'The migration job completed',
  flow: 'The financial flow',
  wallet: 'A wallet opens',
  bet: 'A bet is processed',
  replay: 'A repeated bet replays',
  ledger: 'The ledger holds one entry per change',
  reconciliation: 'The stored balance matches the ledger',
  datalake: 'MongoDB answers and the datalake writes',
  balancing: 'Both replicas process requests',
}

const run = async (step: Step): Promise<boolean> => {
  console.log(`${mark.step} ${step.name}`)

  const child = Bun.spawn(step.command, { stdout: 'inherit', stderr: 'inherit' })
  const exitCode = await child.exited
  const passing = exitCode === successfulExitCode

  if (passing) { return true }

  console.error(`${mark.failure} ${step.name}`)

  return false
}

const must = async (step: Step): Promise<void> => {
  const passing = await run(step)

  if (passing) { return }

  console.error(`${mark.failure} ${messages.failed}`)
  process.exit(failureExitCode)
}

const output = async (command: Array<string>): Promise<string> => {
  const child = Bun.spawn(command, { stdout: 'pipe', stderr: 'ignore' })
  const text = await new Response(child.stdout).text()
  await child.exited

  return text
}

const quiet = async (command: Array<string>): Promise<boolean> => {
  const child = Bun.spawn(command, { stdout: 'ignore', stderr: 'ignore' })
  const exitCode = await child.exited

  return exitCode === successfulExitCode
}

const timeoutCode = -1

const expired = async (limit: number): Promise<number> => {
  await Bun.sleep(limit)

  return timeoutCode
}

const bounded = async (command: Array<string>, limit: number): Promise<boolean> => {
  const child = Bun.spawn(command, { stdout: 'ignore', stderr: 'ignore' })
  const exitCode = await Promise.race([child.exited, expired(limit)])

  if (exitCode === timeoutCode) {
    child.kill()

    return false
  }

  return exitCode === successfulExitCode
}

const installed = (name: string): string => resolve(toolsDirectory, `${name}${extension()}`)

const download = async (name: string): Promise<void> => {
  const source = sources.get(name)
  const path = installed(name)

  if (source === undefined) { return }

  console.log(`${mark.step} ${messages.download} ${source}`)

  const response = await fetch(source)

  if (!response.ok) {
    throw new Error(`${messages.downloadFailed} ${source}`)
  }

  mkdirSync(toolsDirectory, { recursive: true })
  await Bun.write(path, response)
  chmodSync(path, 0o755)
}

const ensure = async (name: string): Promise<string> => {
  const found = Bun.which(name)

  if (found !== null) { return found }

  const path = installed(name)

  if (existsSync(path)) { return path }

  await download(name)

  return path
}

const requireKubectl = async (): Promise<void> => {
  tools.kubectl = await ensure('kubectl')
}

const requireCluster = async (): Promise<void> => {
  const found = Bun.which(tools.docker)

  if (found === null) {
    console.error(`${mark.failure} ${messages.docker}`)
    process.exit(failureExitCode)
  }

  await requireKubectl()
  tools.kind = await ensure('kind')
}

const startDocker = (): void => {
  if (process.platform !== 'win32') { return }
  if (!existsSync(dockerDesktop)) { return }

  console.log(`${mark.step} ${messages.startingDocker}`)
  Bun.spawn([dockerDesktop], { stdout: 'ignore', stderr: 'ignore' }).unref()
}

const dockerProbe = 15_000

const dockerUp = async (): Promise<boolean> => bounded([tools.docker, 'info'], dockerProbe)

const awaitDocker = async (remaining: number): Promise<boolean> => {
  const ready = await dockerUp()

  if (ready) { return true }
  if (remaining === EMPTY_NUMBER) { return false }

  await Bun.sleep(dockerDelay)

  return awaitDocker(remaining - 1)
}

const requireDocker = async (): Promise<void> => {
  const ready = await dockerUp()

  if (ready) { return }

  startDocker()

  const recovered = await awaitDocker(dockerRetries)

  if (recovered) { return }

  console.error(`${mark.failure} ${messages.waitingDocker}`)
  process.exit(failureExitCode)
}

const lines = (text: string): Array<string> => text
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line !== '')

const listing = async (): Promise<Array<string>> => lines(await output([tools.kind, 'get', 'clusters']))

const nodes = async (): Promise<Array<string>> => lines(await output([tools.kind, 'get', 'nodes', '--name', cluster.name]))

const resume = async (): Promise<void> => {
  const names = await nodes()

  if (names.length === EMPTY_NUMBER) { return }

  await quiet([tools.docker, 'start', ...names])
}

const create = async (): Promise<void> => {
  const names = await listing()
  const present = names.includes(cluster.name)

  if (present) {
    await resume()
    console.log(`${mark.success} ${messages.reused}`)

    return
  }

  await must({
    name: 'Create cluster',
    command: [tools.kind, 'create', 'cluster', '--config', cluster.config, '--wait', cluster.readiness],
  })

  console.log(`${mark.success} ${messages.created}`)
}

const apiSettle = 100

const awaitApi = async (remaining: number): Promise<boolean> => {
  const ready = await quiet([tools.kubectl, 'get', 'nodes'])

  if (ready) { return true }
  if (remaining === EMPTY_NUMBER) { return false }

  await Bun.sleep(retryDelay)

  return awaitApi(remaining - 1)
}

const awaitNodes = async (): Promise<void> => {
  const settled = await awaitApi(apiSettle)

  if (!settled) {
    console.error(`${mark.failure} ${messages.api}`)
    process.exit(failureExitCode)
  }

  await must({
    name: 'Wait for the nodes',
    command: [tools.kubectl, 'wait', '--for=condition=Ready', 'nodes', '--all', '--timeout', cluster.readiness],
  })
}

const kustomize = (layer: string): Array<string> => [tools.kubectl, 'kustomize', layer, '--load-restrictor', cluster.restrictor]

const pipe = async (manifest: string): Promise<boolean> => {
  const stdin = new Blob([manifest]).stream()
  const child = Bun.spawn([tools.kubectl, 'apply', '--filename', '-'], { stdin, stdout: 'inherit', stderr: 'inherit' })
  const exitCode = await child.exited

  return exitCode === successfulExitCode
}

const apply = async (overlay: string): Promise<void> => {
  const manifest = await output(kustomize(overlay))
  const applied = await pipe(manifest)

  if (applied) { return }

  console.error(`${mark.failure} ${messages.failed}`)
  process.exit(failureExitCode)
}

const applyTree = async (): Promise<void> => {
  await must({
    name: 'Reset the migration job',
    command: [tools.kubectl, '--namespace', cluster.namespace, 'delete', 'job', 'migrate', '--ignore-not-found'],
  })

  await apply(cluster.overlay)
}

const rollout = async (workload: string): Promise<void> => {
  await must({
    name: `Wait for ${workload}`,
    command: [tools.kubectl, '--namespace', cluster.namespace, 'rollout', 'status', workload, '--timeout', cluster.readiness],
  })
}

const migrate = async (): Promise<void> => {
  await must({
    name: 'Run the migration',
    command: [
      tools.kubectl,
      '--namespace',
      cluster.namespace,
      'wait',
      '--for=condition=complete',
      'job/migrate',
      '--timeout',
      cluster.migration,
    ],
  })
}

const answer = async (): Promise<boolean> => {
  const byFailure = (): Response | false => false
  const response: Response | false = await fetch(`${cluster.url}/health/ready`).catch(byFailure)

  if (response === false) { return false }

  return response.ok
}

const attempt = async (remaining: number): Promise<boolean> => {
  const ready = await answer()

  if (ready) { return true }
  if (remaining === EMPTY_NUMBER) { return false }

  await Bun.sleep(retryDelay)

  return attempt(remaining - 1)
}

const smoke = async (): Promise<void> => {
  const ready = await attempt(retries)

  if (!ready) {
    console.error(`${mark.failure} ${messages.notReady} ${cluster.url}`)
    process.exit(failureExitCode)
  }

  console.log(`${mark.success} ${cluster.url}`)
}

const describe = (error: unknown): string => (error instanceof Error ? error.message : String(error))

const expect = (name: string, found: string, wanted: string): Check => ({
  name,
  detail: found,
  passing: found === wanted,
})

const single = (entry: Check): Array<Check> => [entry]

const guarded = async (name: string, action: () => Promise<Array<Check>>): Promise<Array<Check>> => {
  try {
    return await action()
  } catch (error) {
    return [{ name, detail: describe(error), passing: false }]
  }
}

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${cluster.url}${path}`, init)

  if (!response.ok) {
    const detail = await response.text()

    throw new Error(`${path} answered ${response.status}: ${detail}`)
  }

  return await response.json() as T
}

const post = <T>(path: string, body: unknown, headers: Record<string, string> = {}): Promise<T> => request<T>(path, {
  method: 'POST',
  headers: { 'content-type': 'application/json', ...headers },
  body: JSON.stringify(body),
})

const readyNodes = async (): Promise<number> => {
  const text = await output([tools.kubectl, 'get', 'nodes', '--no-headers'])

  return lines(text).filter((line) => line.includes(' Ready ')).length
}

const apiEndpoints = async (): Promise<Array<string>> => {
  const text = await output([
    tools.kubectl,
    '--namespace',
    cluster.namespace,
    'get',
    'endpoints',
    'api',
    '--output',
    'jsonpath={.subsets[*].addresses[*].ip}',
  ])

  return text.split(' ').filter((address) => address !== '')
}

const apiPods = async (): Promise<Array<string>> => {
  const text = await output([
    tools.kubectl,
    '--namespace',
    cluster.namespace,
    'get',
    'pods',
    '--selector',
    'app=api',
    '--output',
    'jsonpath={.items[*].metadata.name}',
  ])

  return text.split(' ').filter((name) => name !== '')
}

const replication = async (): Promise<string> => {
  const text = await output([
    tools.kubectl,
    '--namespace',
    cluster.namespace,
    'exec',
    'postgres-primary-0',
    '--',
    'psql',
    '--username',
    'postgres',
    '--dbname',
    'fortune_tiger',
    '--tuples-only',
    '--no-align',
    '--command',
    'select state from pg_stat_replication',
  ])

  return text.trim()
}

const migrationState = async (): Promise<string> => {
  const text = await output([
    tools.kubectl,
    '--namespace',
    cluster.namespace,
    'get',
    'job',
    'migrate',
    '--output',
    'jsonpath={.status.succeeded}',
  ])

  return text.trim()
}

const metricScript = `fetch('http://127.0.0.1:3000/metrics').then((response) => response.text()).then((text) => { const found = text.split('\\n').filter((line) => line.indexOf('${verification.counter}') === 0); console.log(found.length === 0 ? '${verification.counter} 0' : found[0]) })`

const processed = async (pod: string): Promise<number> => {
  const text = await output([
    tools.kubectl,
    '--namespace',
    cluster.namespace,
    'exec',
    pod,
    '--container',
    'api',
    '--',
    'bun',
    '-e',
    metricScript,
  ])
  const found = new RegExp(`${verification.counter} (\\d+)`).exec(text)

  return found === null ? EMPTY_NUMBER : Number(found[1])
}

const financial = async (): Promise<Array<Check>> => {
  const playerId = `ci-${crypto.randomUUID()}`
  const wallet = await post<WalletBody>('/wallets', {
    playerId,
    initialBalance: { amount: verification.opening, currency: verification.currency },
  })
  const opened = expect(check.wallet, wallet.balance.amount, verification.opening)
  const external = `ci-${crypto.randomUUID()}`
  const body = {
    providerId: verification.provider,
    externalTransactionId: external,
    playerId,
    walletId: wallet.id,
    roundId: 'ci',
    gameId: 'ci',
    kind: 'BET',
    money: { amount: verification.bet, currency: verification.currency },
  }
  const header = { 'idempotency-key': `${verification.provider}:${external}` }
  const wager = await post<WagerBody>('/wagering/transactions', body, header)
  const processedBet = expect(check.bet, `${wager.status} ${wager.balance.amount}`, `PROCESSED ${verification.afterBet}`)
  const again = await post<WagerBody>('/wagering/transactions', body, header)
  const replayed = {
    name: check.replay,
    detail: `${again.idempotentReplay} ${again.transactionId === wager.transactionId}`,
    passing: again.idempotentReplay && again.transactionId === wager.transactionId,
  }
  const ledger = await request<LedgerBody>(`/wallets/${wallet.id}/ledger`)
  const kept = expect(check.ledger, String(ledger.items.length), String(verification.entries))
  const reconciliation = await post<ReconciliationBody>(`/wallets/${wallet.id}/reconciliation`, {})
  const balanced = {
    name: check.reconciliation,
    detail: `${reconciliation.consistent} ${reconciliation.checkedEntries}`,
    passing: reconciliation.consistent && reconciliation.checkedEntries === verification.entries,
  }

  return [opened, processedBet, replayed, kept, balanced]
}

const burstBet = (playerId: string, walletId: string, index: number): Promise<WagerBody> => {
  const external = `ci-${index}-${crypto.randomUUID()}`

  return post<WagerBody>('/wagering/transactions', {
    providerId: verification.provider,
    externalTransactionId: external,
    playerId,
    walletId,
    roundId: `ci-${index}`,
    gameId: 'ci',
    kind: 'BET',
    money: { amount: verification.unit, currency: verification.currency },
  }, { 'idempotency-key': `${verification.provider}:${external}` })
}

const balancing = async (): Promise<Check> => {
  const playerId = `ci-${crypto.randomUUID()}`
  const wallet = await post<WalletBody>('/wallets', {
    playerId,
    initialBalance: { amount: verification.opening, currency: verification.currency },
  })
  const pods = await apiPods()
  const before = await Promise.all(pods.map(processed))
  const indexes = [...Array(verification.burst).keys()]

  await Promise.all(indexes.map((index) => burstBet(playerId, wallet.id, index)))

  const after = await Promise.all(pods.map(processed))
  const spread = before.map((count, index) => (after[index] ?? count) - count)
  const passing = pods.length >= verification.replicas && spread.every((delta) => delta > 0)
  const detail = pods.map((pod, index) => `${pod} +${spread[index]}`).join(', ')

  return { name: check.balancing, detail, passing }
}

const nodesCheck = async (): Promise<Array<Check>> => single(expect(
  check.nodes,
  String(await readyNodes()),
  String(verification.nodes),
))

const endpointsCheck = async (): Promise<Array<Check>> => {
  const found = await apiEndpoints()

  return single({ name: check.endpoints, detail: `${found.length}`, passing: found.length >= verification.replicas })
}

const replicationCheck = async (): Promise<Array<Check>> => single(expect(
  check.replication,
  await replication(),
  verification.streaming,
))

const migrationCheck = async (): Promise<Array<Check>> => single(expect(
  check.migration,
  await migrationState(),
  verification.completed,
))

const mongoPods = async (): Promise<Array<string>> => {
  const text = await output([
    tools.kubectl,
    '--namespace',
    cluster.namespace,
    'get',
    'pods',
    '--selector',
    verification.mongo,
    '--output',
    'jsonpath={.items[*].metadata.name}',
  ])

  return text.split(' ').filter((name) => name !== '')
}

const mongoCollections = async (pod: string): Promise<Array<string>> => {
  const text = await output([
    tools.kubectl,
    '--namespace',
    cluster.namespace,
    'exec',
    pod,
    '--',
    'mongosh',
    '--quiet',
    '--eval',
    'db.getSiblingDB("fortune_tiger_audit").getCollectionNames().sort().join(" ")',
  ])

  return text.split(' ').map((name) => name.trim()).filter((name) => name !== '')
}

const eager = async (pod: string, remaining: number): Promise<Array<string>> => {
  const found = await mongoCollections(pod)
  const wanted = verification.collections.split(' ')

  if (wanted.every((collection) => found.includes(collection))) { return found }
  if (remaining === EMPTY_NUMBER) { return found }

  await Bun.sleep(retryDelay)

  return eager(pod, remaining - 1)
}

const datalake = async (): Promise<Check> => {
  const pods = await mongoPods()
  const settled = pods.length > EMPTY_NUMBER ? await eager(pods[0] ?? '', verification.datalakeRetries) : []
  const wanted = verification.collections.split(' ')
  const passing = pods.length > EMPTY_NUMBER && wanted.every((collection) => settled.includes(collection))
  const detail = pods.length > EMPTY_NUMBER ? settled.join(' ') : 'no mongo pod'

  return {
    name: check.datalake,
    detail,
    passing,
  }
}

const datalakeCheck = async (): Promise<Array<Check>> => single(await datalake())

const balancingCheck = async (): Promise<Array<Check>> => single(await balancing())

const verify = async (): Promise<void> => {
  await requireKubectl()

  const settled = await awaitApi(verification.settle)

  if (!settled) {
    console.error(`${mark.failure} ${messages.api}`)
    process.exit(failureExitCode)
  }

  console.log(`${mark.step} Verify the cluster`)

  const entries = [
    ...await guarded(check.nodes, nodesCheck),
    ...await guarded(check.endpoints, endpointsCheck),
    ...await guarded(check.replication, replicationCheck),
    ...await guarded(check.migration, migrationCheck),
    ...await guarded(check.flow, financial),
    ...await guarded(check.datalake, datalakeCheck),
    ...await guarded(check.balancing, balancingCheck),
  ]

  entries.forEach((entry) => {
    const symbol = entry.passing ? mark.success : mark.failure

    console.log(`${symbol} ${entry.name}: ${entry.detail}`)
  })

  if (entries.every((entry) => entry.passing)) {
    console.log(`${mark.success} ${messages.verified}`)

    return
  }

  console.error(`${mark.failure} ${messages.failed}`)
  process.exit(failureExitCode)
}

const up = async (): Promise<void> => {
  await requireCluster()
  await requireDocker()
  await create()
  await awaitNodes()

  await must({ name: 'Build the image', command: [tools.docker, 'build', '--tag', cluster.image, '.'] })
  await must({ name: 'Load the image', command: [tools.kind, 'load', 'docker-image', cluster.image, '--name', cluster.name] })

  await applyTree()
  await rollout('statefulset/postgres-primary')
  await rollout('statefulset/postgres-replica')
  await rollout('deployment/localstack')
  await rollout('deployment/mongo')
  await migrate()
  await rollout('deployment/api')
  await smoke()
}

const down = async (): Promise<void> => {
  await requireCluster()

  const command = [tools.kind, 'delete', 'cluster', '--name', cluster.name]
  const deleted = await run({ name: 'Delete the cluster', command })

  if (!deleted) {
    await Bun.sleep(retryDelay)
    await must({ name: 'Delete the cluster again', command })
  }

  console.log(`${mark.success} ${messages.removed}`)
}

const observability = async (): Promise<void> => {
  await requireCluster()
  await apply(cluster.observability)
  await rollout('deployment/prometheus')
  await rollout('deployment/grafana')
  await rollout('deployment/alertmanager')
}

const report = async (): Promise<void> => {
  await requireCluster()

  await run({ name: 'Nodes', command: [tools.kubectl, 'get', 'nodes', '-o', 'wide'] })
  await run({ name: 'Pods', command: [tools.kubectl, '--namespace', cluster.namespace, 'get', 'pods', '-o', 'wide'] })
  await run({ name: 'Services', command: [tools.kubectl, '--namespace', cluster.namespace, 'get', 'services'] })
  await run({ name: 'Endpoints', command: [tools.kubectl, '--namespace', cluster.namespace, 'get', 'endpoints'] })
  await smoke()
}

const render = async (): Promise<void> => {
  await requireKubectl()

  const rendered = await layers.reduce(async (carried: Promise<boolean>, layer: string): Promise<boolean> => {
    const passing = await carried

    if (!passing) { return false }

    return quiet(kustomize(layer))
  }, Promise.resolve(true))

  if (!rendered) {
    console.error(`${mark.failure} ${messages.failed}`)
    process.exit(failureExitCode)
  }

  console.log(`${mark.success} ${messages.rendered}`)
}

const commands = new Map<string, () => Promise<void>>()

commands.set('up', up)
commands.set('down', down)
commands.set('status', report)
commands.set('render', render)
commands.set('verify', verify)
commands.set('observability', observability)

const selected = Bun.argv.at(2) ?? 'up'

const start = async (): Promise<void> => {
  const command = commands.get(selected)

  if (command === undefined) {
    console.error(`${mark.failure} ${messages.failed}`)
    process.exit(failureExitCode)
  }

  await command()
}

const byError = (error: Error): void => {
  console.error(`${mark.failure} ${error.message}`)
  process.exit(failureExitCode)
}

start().catch(byError)
