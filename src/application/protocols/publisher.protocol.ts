export type Published = {
  id: string
  aggregateId: string
  payload: object
}

export interface PublisherProtocol {
  publish(published: Published): Promise<void>
}
