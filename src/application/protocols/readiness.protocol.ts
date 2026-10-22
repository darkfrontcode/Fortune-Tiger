export interface ReadinessProtocol {
  check(): Promise<boolean>
}
