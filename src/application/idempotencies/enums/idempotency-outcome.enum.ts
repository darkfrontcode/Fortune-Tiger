export enum IdempotencyOutcome {
  FRESH = 'FRESH',
  REPLAY = 'REPLAY',
  CONFLICT = 'CONFLICT',
}
