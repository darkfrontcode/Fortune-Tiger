export class IdempotencyGuard {
  static same(storedHash: string, incomingHash: string): boolean {
    return storedHash === incomingHash
  }
}
