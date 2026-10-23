import { connect } from 'node:net'
import { Environment } from '../src/infrastructure/environment'

type Dependency = {
  name: string
  url: string | undefined
}

type Check = {
  name: string
  reachable: boolean
  detail: string
}

type Step = {
  name: string
  command: Array<string>
}

const EMPTY_NUMBER = 0
const successfulExitCode = EMPTY_NUMBER
const failureExitCode = 1
const probeTimeout = 2_000
const fullFlag = 'full'
const environment = new Environment()

const mark = {
  step: '🚀',
  failure: '❌',
  success: '✅',
}

const messages = {
  missing: 'the variable is missing in .env',
  unreachable: 'Unreachable dependency:',
  startStack: 'Run "docker compose up -d" and try again.',
  failed: 'Verify failed.',
  complete: 'Verify passed.',
}

const command = {
  lint: ['bun', 'run', 'lint'],
  build: ['bun', 'run', 'build'],
  unit: ['bun', 'run', 'test:unit'],
  migration: ['bun', 'run', 'migration:up'],
  integration: ['bun', 'run', 'test:int'],
  concurrency: ['bun', 'run', 'test:concurrency'],
  e2e: ['bun', 'run', 'test:e2e'],
}

const steps: { static: Array<Step>, full: Array<Step> } = {
  static: [
    { name: 'Lint', command: command.lint },
    { name: 'Build', command: command.build },
    { name: 'Unit tests', command: command.unit },
  ],
  full: [
    { name: 'Migrations', command: command.migration },
    { name: 'Integration tests', command: command.integration },
    { name: 'Concurrency tests', command: command.concurrency },
    { name: 'End-to-end tests', command: command.e2e },
  ],
}

const connection = (url: string): Promise<boolean> => new Promise((finish) => {
  const address = new URL(url)
  const host = address.hostname
  const port = Number(address.port)
  const socket = connect({ host, port })

  const settle = (reachable: boolean): void => {
    socket.destroy()
    finish(reachable)
  }

  const opened = (): void => settle(true)
  const failed = (): void => settle(false)
  const expired = (): void => settle(false)

  socket.setTimeout(probeTimeout, expired)
  socket.once('connect', opened)
  socket.once('error', failed)
})

const probe = async (url: string): Promise<boolean> => {
  const byFailure = (): boolean => false
  const reachable = await connection(url).catch(byFailure)

  return reachable
}

const check = async (dependency: Dependency): Promise<Check> => {
  const { name, url } = dependency

  if (url === undefined) { return { name, reachable: false, detail: messages.missing } }

  const reachable = await probe(url)

  return { name, reachable, detail: url }
}

const dependencies = (): Array<Dependency> => {
  const database = environment.databaseUrl
  const endpoint = environment.endpoint

  return [
    { name: 'PostgreSQL', url: database },
    { name: 'LocalStack', url: endpoint },
  ]
}

const report = (result: Check): void => {
  console.error(`${mark.failure} ${result.name}: ${result.detail}`)
}

const preflight = async (): Promise<boolean> => {
  const checks = await Promise.all(dependencies().map(check))
  const byUnreachable = (result: Check) => !result.reachable
  const unreachable = checks.filter(byUnreachable)
  const reachable = unreachable.length === EMPTY_NUMBER

  if (reachable) { return true }

  console.error(messages.unreachable)
  unreachable.forEach(report)
  console.error(messages.startStack)

  return false
}

const run = async (step: Step): Promise<boolean> => {
  console.log(`\n${mark.step} ${step.name}`)

  const child = Bun.spawn(step.command, { stdout: 'inherit', stderr: 'inherit' })
  const exitCode = await child.exited
  const passing = exitCode === successfulExitCode

  if (passing) { return true }

  console.error(`${mark.failure} ${step.name}`)

  return false
}

const chain = async (carried: Promise<boolean>, step: Step): Promise<boolean> => {
  const passing = await carried

  if (!passing) { return false }

  return run(step)
}

const full = Bun.argv.includes(fullFlag)

if (full) {
  const ready = await preflight()

  if (!ready) { process.exit(failureExitCode) }
}

const selected = full ? [...steps.static, ...steps.full] : steps.static
const started = Promise.resolve(true)
const passed = await selected.reduce(chain, started)

if (!passed) {
  console.error(`\n${mark.failure} ${messages.failed}`)
  process.exit(failureExitCode)
}

console.log(`\n${mark.success} ${messages.complete}`)
