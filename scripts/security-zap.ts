import { chmodSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { Environment } from '../src/infrastructure/environment'

const success = 0
const failure = 1
const probeLimit = 2_000
const image = 'ghcr.io/zaproxy/zaproxy'
const passive = 'passive'
const active = 'active'
const activeFlag = '--active'
const securityDir = resolve('security')
const workdir = '/zap/wrk'
const volume = '-v'
const mounts = [volume, `${securityDir}:${workdir}`]
const hostGateway = 'host.docker.internal:host-gateway'
const reportMode = 0o777
const report = {
  passive: `${securityDir}/reports/passive`,
  active: `${securityDir}/reports/active`,
}

const probe = async (): Promise<boolean> => {
  const environment = new Environment()
  const url = `http://127.0.0.1:${environment.port}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), probeLimit)

  try {
    const response = await fetch(`${url}/health/live`, { signal: controller.signal })

    return response.ok
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

const run = async (command: Array<string>): Promise<boolean> => {
  console.log(`🛡️  ${command.join(' ')}`)
  const child = Bun.spawn(command, { stdout: 'inherit', stderr: 'inherit' })
  const exitCode = await child.exited

  return exitCode === success
}

const main = async (): Promise<number> => {
  const ready = await probe()

  if (!ready) {
    console.error('❌ No app answers on localhost.')
    console.error('❌ Start the app and the stack, then run again: bun run start')

    return failure
  }

  const activeScan = Bun.argv.includes(activeFlag)
  const plan = activeScan ? 'zap-active.yaml' : 'zap.yaml'
  const target = activeScan ? report.active : report.passive
  mkdirSync(target, { recursive: true })
  chmodSync(target, reportMode)
  const shell = ['docker', 'run', '--rm', '--add-host', hostGateway, ...mounts, image, 'zap.sh', '-cmd', '-autorun', `${workdir}/${plan}`]

  console.log(`🛡️  OWASP ZAP ${activeScan ? active : passive} scan against the local app.`)
  console.log(`🛡️  target directory: ${target}`)

  const passed = await run(shell)
  const hint = `📄 Report: ${target}`

  if (passed) {
    console.log(`🛡️  ZAP finished. ${hint}`)

    return success
  }

  console.error(`❌ ZAP failed. ${hint}`)

  return failure
}

const fail = (error: unknown): number => {
  console.error(error)
  console.error('❌ Is Docker running? The scan runs the ghcr.io/zaproxy/zaproxy image.')

  return failure
}

process.exit(await main().catch(fail))
