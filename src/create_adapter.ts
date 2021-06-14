import { createInitialStateFactory } from './document_state'
import { Document, DocumentAdapter, DocumentDefinition } from './models'
import { createStateAdapter } from './state_adapter'
import { createSelectorsFactory } from './state_selectors'

export const createDocumentAdapter = <T extends Document>({
  sortComparer,
}: DocumentDefinition<T> = {}): DocumentAdapter<T> => {
  const stateFactory = createInitialStateFactory<T>()
  const selectorsFactory = createSelectorsFactory<T>()
  const stateAdapter = createStateAdapter(sortComparer)
  return {
    sortComparer,
    ...stateFactory,
    ...selectorsFactory,
    ...stateAdapter,
  }
}
