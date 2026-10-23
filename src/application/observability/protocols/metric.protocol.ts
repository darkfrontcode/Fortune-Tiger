export interface MetricProtocol {
  increment(name: string): void
  observe(name: string, milliseconds: number): void
  render(): Promise<string>
}
