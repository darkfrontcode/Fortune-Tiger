import { describe, expect, test } from 'bun:test'
import fc from 'fast-check'
import { WagerTransactionKind, WagerTransactionStatus } from '../enums'
import { WagerReferenceGuard, WagerTerminalGuard, WagerTransitionGuard } from '../guards'

const runs = 200
const referenceGuard = new WagerReferenceGuard()
const terminalGuard = new WagerTerminalGuard()
const transitionGuard = new WagerTransitionGuard()

const terminal = [
  WagerTransactionStatus.PROCESSED,
  WagerTransactionStatus.REJECTED,
  WagerTransactionStatus.FAILED,
]
const open = [WagerTransactionStatus.PENDING, WagerTransactionStatus.PENDING_REFERENCE]
const all = [...open, ...terminal]
const kinds = [
  WagerTransactionKind.OPENING,
  WagerTransactionKind.BET,
  WagerTransactionKind.WIN,
  WagerTransactionKind.LOSS,
  WagerTransactionKind.REFUND,
  WagerTransactionKind.ROLLBACK,
]
const reversal = [WagerTransactionKind.REFUND, WagerTransactionKind.ROLLBACK]
const allowed = [
  { status: WagerTransactionStatus.PENDING, target: WagerTransactionStatus.PENDING_REFERENCE },
  { status: WagerTransactionStatus.PENDING, target: WagerTransactionStatus.PROCESSED },
  { status: WagerTransactionStatus.PENDING, target: WagerTransactionStatus.REJECTED },
  { status: WagerTransactionStatus.PENDING, target: WagerTransactionStatus.FAILED },
  { status: WagerTransactionStatus.PENDING_REFERENCE, target: WagerTransactionStatus.PROCESSED },
  { status: WagerTransactionStatus.PENDING_REFERENCE, target: WagerTransactionStatus.REJECTED },
  { status: WagerTransactionStatus.PENDING_REFERENCE, target: WagerTransactionStatus.FAILED },
]

const isTerminal = (status: WagerTransactionStatus): boolean => terminal.includes(status)
const isReversal = (kind: WagerTransactionKind): boolean => reversal.includes(kind)
const isAllowed = (status: WagerTransactionStatus, target: WagerTransactionStatus): boolean =>
  allowed.some((edge) => edge.status === status && edge.target === target)

describe('Wager properties', () => {
  test('WHEN a status is asked whether it is closed SHOULD only the terminal ones answer true', () => {
    fc.assert(
      fc.property(fc.constantFrom(...all), (status) => {
        expect(terminalGuard.guard(status)).toBe(isTerminal(status))
      }),
      { numRuns: runs },
    )
  })

  test('WHEN a closed wager tries any move SHOULD the transition be refused', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...terminal),
        fc.constantFrom(...all),
        (status, target) => {
          const refused = () => transitionGuard.guard({ status, target })

          expect(refused).toThrow()
        },
      ),
      { numRuns: runs },
    )
  })

  test('WHEN an open wager moves SHOULD only the table edges pass', () => {
    fc.assert(
      fc.property(fc.constantFrom(...open), fc.constantFrom(...all), (status, target) => {
        const allowedEdge = isAllowed(status, target)
        const refused = () => transitionGuard.guard({ status, target })

        if (allowedEdge) {
          expect(refused).not.toThrow()

          return
        }

        expect(refused).toThrow()
      }),
      { numRuns: runs },
    )
  })

  test('WHEN a reversal has no reference SHOULD it be refused', () => {
    fc.assert(
      fc.property(fc.constantFrom(...kinds), fc.option(fc.uuid(), { nil: '' }), (kind, reference) => {
        const refused = () => referenceGuard.guard({ kind, reference })

        if (isReversal(kind) && reference === '') {
          expect(refused).toThrow()

          return
        }

        expect(refused).not.toThrow()
      }),
      { numRuns: runs },
    )
  })
})
