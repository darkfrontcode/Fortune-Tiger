import { describe, expect, test } from 'bun:test'
import { LedgerDirection } from '@domain/ledger/enums'
import { WagerTransactionKind, WagerTransactionStatus } from '../enums'
import { DirectionMap, ReferenceMap, TransitionMap } from '../maps'

const unknownKind = 'UNKNOWN_KIND' as WagerTransactionKind
const unknownStatus = 'UNKNOWN_STATUS' as WagerTransactionStatus

describe('wager maps', () => {
  test('WHEN a direction is inverted SHOULD return the opposite direction', () => {
    const directions = new DirectionMap()

    expect(directions.get(WagerTransactionKind.BET)).toBe(LedgerDirection.DEBIT)
    expect(directions.inverse(WagerTransactionKind.BET)).toBe(LedgerDirection.CREDIT)
    expect(directions.inverse(WagerTransactionKind.WIN)).toBe(LedgerDirection.DEBIT)
  })

  test('WHEN a direction is unknown SHOULD refuse it', () => {
    const read = () => new DirectionMap().get(unknownKind)

    expect(read).toThrow()
  })

  test('WHEN a reference kind is unknown SHOULD refuse it', () => {
    const read = () => new ReferenceMap().get(unknownKind)

    expect(read).toThrow()
  })

  test('WHEN a transition status is unknown SHOULD refuse it', () => {
    const read = () => new TransitionMap().get(unknownStatus)

    expect(read).toThrow()
  })
})
