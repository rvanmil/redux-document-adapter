import { createDraftSafeSelector } from '@reduxjs/toolkit'
import { ObjectId } from 'bson'
import {
  Document,
  DocumentEntities,
  DocumentState,
  DocumentSelectors,
} from './models'

export const createSelectorsFactory = <T extends Document>() => {
  const getSelectors = <S extends DocumentState<T>>(): DocumentSelectors<
    T,
    S
  > => {
    const selectIds = (state: DocumentState<T>) => state.ids

    const selectEntities = (state: DocumentState<T>) => state.entities

    const selectAll = createDraftSafeSelector(
      selectIds,
      selectEntities,
      (ids: string[], entities: DocumentEntities<T>): T[] =>
        ids.map((id) => entities[id] as T)
    )

    const selectId = (state: DocumentState<T>, id: ObjectId) => id

    const selectById = (entities: DocumentEntities<T>, id: ObjectId) =>
      entities[id.toHexString()] as T

    const selectTotal = createDraftSafeSelector(selectIds, (ids) => ids.length)

    return {
      selectIds,
      selectEntities,
      selectAll,
      selectTotal,
      selectById: createDraftSafeSelector(selectEntities, selectId, selectById),
    }
  }

  return { getSelectors }
}
