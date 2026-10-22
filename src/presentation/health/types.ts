import type { HealthStatus } from './enums'

export namespace HealthType {
  export type Output = {
    status: HealthStatus
  }
}
