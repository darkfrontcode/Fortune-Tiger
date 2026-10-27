export interface CacheProtocol {
  get(key: string): Promise<string | undefined>
  set(key: string, value: string, ttlSeconds: number): Promise<void>
}
