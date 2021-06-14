import {
  createNextState,
  Draft,
  isDraft,
  PayloadAction,
} from '@reduxjs/toolkit'
import { ObjectId } from 'bson'
import {
  Document,
  DocumentState,
  DocumentComparer,
  DocumentStateAdapter,
  DocumentUpdate,
} from './models'

export const createSingleArgumentStateOperator = <T extends Document>(
  mutator: (state: DocumentState<T>) => void
) => {
  const operator = createStateOperator(
    (arg: undefined, state: DocumentState<T>) => mutator(state)
  )
  const operation = <S extends DocumentState<T>>(state: S): S =>
    operator(state, undefined)
  return operation
}

export const createStateOperator = <T extends Document, R>(
  mutator: (arg: R, state: DocumentState<T>) => void
) => {
  const operation = <S extends DocumentState<T>>(
    state: S,
    arg: R | PayloadAction<R>
  ): S => {
    const isPayloadActionArgument = (
      arg2: R | PayloadAction<R>
    ): arg2 is PayloadAction<R> =>
      (arg2 as PayloadAction<R>).payload !== undefined &&
      (arg2 as PayloadAction<R>).type !== undefined
    const runMutator = (draft: DocumentState<T>) => {
      if (isPayloadActionArgument(arg)) {
        mutator(arg.payload, draft)
      } else {
        mutator(arg, draft)
      }
    }
    if (isDraft(state)) {
      // We must already be inside a `createNextState` call, likely because this is being wrapped in `createReducer` or `createSlice`.
      // It's safe to just pass the draft to the mutator.
      runMutator(state)
      return state
    }
    return createNextState(state, runMutator)
  }
  return operation
}

export const createStateAdapter = <T extends Document>(
  sort?: false | DocumentComparer<T>
): DocumentStateAdapter<T> => {
  type R = DocumentState<T>

  // Accepts an array of documents and adds them.
  const addMany = (newDocuments: T[], state: R) => {
    const models = newDocuments.filter(
      (model) => !(model._id.toHexString() in state.entities)
    )
    merge(models, state)
  }

  // Accepts a single document and adds it.
  const addOne = (document: T, state: R) => addMany([document], state)

  // Removes all documents.
  const removeAll = (state: R) => {
    Object.assign(state, {
      ids: [],
      entities: {},
    })
  }

  // Accepts an array of ObjectIds, and removes each document with those ObjectIds if they exist.
  const removeMany = (documentIds: ObjectId[], state: R) => {
    let didMutate = false
    documentIds.forEach((documentId) => {
      const key = documentId.toHexString()
      if (key in state.entities) {
        delete state.entities[key]
        didMutate = true
      }
    })
    if (didMutate) {
      state.ids = state.ids.filter((id) => id in state.entities)
    }
  }

  // Accepts a single ObjectId, and removes the document with that ObjectId if it exists.
  const removeOne = (documentId: ObjectId, state: R) =>
    removeMany([documentId], state)

  // Accepts an array of documents. If a document with that ObjectId exists, it will replace it with the document. If the document does not exist, it will be added.
  const setMany = (newDocuments: T[], state: R) => merge(newDocuments, state)

  // Accepts a single document. If a document with that ObjectId exists, it will replace it with the document. If the document does not exist, it will be added.
  const setOne = (document: T, state: R) => setMany([document], state)

  // Accepts an array of documents and replaces the existing documents with the documents in the array.
  const setAll = (newDocuments: T[], state: R) => {
    state.entities = {}
    state.ids = []
    addMany(newDocuments, state)
  }

  // Accepts an array of update objects, and performs shallow updates on all corresponding entities.
  const updateMany = (updates: DocumentUpdate<T>[], state: R) => {
    const models: T[] = []
    updates.forEach((update) => takeUpdatedModel(models, update, state))
    if (models.length !== 0) {
      merge(models, state)
    }
  }

  // Accepts an "update object" containing an ObjectId and an object containing one or more new field values to update inside a changes field, and performs a shallow update on the corresponding document.
  const updateOne = (update: DocumentUpdate<T>, state: R) =>
    updateMany([update], state)

  // Accepts an array of documents that will be shallowly upserted.
  const upsertMany = (newDocuments: T[], state: R) => merge(newDocuments, state)

  // Accepts a single document. If a document with that ObjectId exists, it will perform a shallow update and the specified fields will be merged into the existing document, with any matching fields overwriting the existing values. If the document does not exist, it will be added.
  const upsertOne = (document: T, state: R) => upsertMany([document], state)

  // Performs a shallow update on a document.
  const takeUpdatedModel = (
    models: T[],
    update: DocumentUpdate<T>,
    state: R
  ): boolean => {
    const key = update.id.toHexString()
    if (!(key in state.entities)) {
      return false
    }
    const original = state.entities[key]
    const updated = { ...original, ...update.changes } as T
    const newKey = updated._id.toHexString()
    delete state.entities[key]
    models.push(updated)
    return newKey !== key
  }

  // Compares two arrays containing ids
  const areIdsEqual = (a: string[], b: string[]) => {
    if (a.length !== b.length) {
      return false
    }
    for (let i = 0; i < a.length && i < b.length; i += 1) {
      if (a[i] !== b[i]) {
        return false
      }
    }
    return true
  }

  // The ids array must be updated when documents are added or removed, or when the sort order changes.
  const updateIds = (state: R) => {
    const documents = Object.values(state.entities) as T[]
    if (sort) {
      documents.sort(sort)
    }
    const newIds = documents.map((document) => document._id.toHexString())
    const { ids } = state
    if (!areIdsEqual(ids, newIds)) {
      state.ids = newIds
    }
  }

  // Accepts an array of documents. If a document with that ObjectId exists, it will replace it with the document. If the document does not exist, it will be added.
  const merge = (models: T[], state: R) => {
    if (models.length !== 0) {
      models.forEach((model) => {
        state.entities[model._id.toHexString()] = model as Draft<T>
      })
      updateIds(state)
    }
  }

  return {
    addMany: createStateOperator(addMany),
    addOne: createStateOperator(addOne),
    removeAll: createSingleArgumentStateOperator(removeAll),
    removeMany: createStateOperator(removeMany),
    removeOne: createStateOperator(removeOne),
    setMany: createStateOperator(setMany),
    setOne: createStateOperator(setOne),
    setAll: createStateOperator(setAll),
    updateMany: createStateOperator(updateMany),
    updateOne: createStateOperator(updateOne),
    upsertMany: createStateOperator(upsertMany),
    upsertOne: createStateOperator(upsertOne),
  }
}
