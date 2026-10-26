import type { HttpType } from '../types'

type Response = HttpType.Response

export abstract class FailureHandler {
  private next: FailureHandler | undefined

  link(handler: FailureHandler): FailureHandler {
    this.next = handler

    return handler
  }

  handle(exception: unknown, response: Response): void {
    const answered = this.answer(exception, response)

    if (answered) { return }

    const next = this.next

    if (next === undefined) { return }

    next.handle(exception, response)
  }

  protected abstract answer(exception: unknown, response: Response): boolean

  protected readonly reply = (response: Response, status: number, body: unknown): void => {
    response.status(status)
    response.json(body)
  }
}
