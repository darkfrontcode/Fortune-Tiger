import type { SearchType } from '../types'

export interface VectorSearchProtocol {
  search(query: SearchType.Query): Promise<Array<SearchType.Result>>
}
