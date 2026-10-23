import { INVALID_CREDENTIAL_MESSAGE } from '../data'

const name = 'ProviderIdentityError'

export class ProviderIdentityError extends Error {
  constructor() {
    super(INVALID_CREDENTIAL_MESSAGE)
    this.name = name
  }
}
