import { describe, expect, it } from 'bun:test'

import { SystemClock } from '../system-clock'

describe('SystemClock', () => {
  it('returns the system instant', () => {
    const clock = new SystemClock()
    const before = Date.now()
    const now = clock.now()
    const after = Date.now()

    expect(now.getTime()).toBeGreaterThanOrEqual(before)
    expect(now.getTime()).toBeLessThanOrEqual(after)
  })
})
