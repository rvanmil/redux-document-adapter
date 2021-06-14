import { Draft, PayloadAction } from '@reduxjs/toolkit'
import { ObjectId } from 'bson'

export type Document = { _id: ObjectId }

export type DocumentComparer<T> = (a: T, b: T) => number

export interface DocumentEntities<T extends Document> {
  [key: string]: Draft<T>
}

export type DocumentUpdate<T extends Document> = {
  id: ObjectId
  changes: Partial<T>
}

export interface DocumentState<T extends Document> {
  // The ids array contains the document ids in sorted order as specified by the sortComparer.
  // It is used by the selectAll selector to return a sorted list of entities.
  ids: string[]
  entities: DocumentEntities<T>
}

export interface DocumentDefinition<T extends Document> {
  sortComparer?: DocumentComparer<T>
}

export interface DocumentStateAdapter<T extends Document> {
  addMany: <S extends DocumentState<T>>(
    state: S,
    action: PayloadAction<T[]> | T[]
  ) => S
  addOne: <S extends DocumentState<T>>(
    state: S,
    action: PayloadAction<T> | T
  ) => S
  removeAll: <S extends DocumentState<T>>(state: S) => S
  removeMany: <S extends DocumentState<T>>(
    state: S,
    action: PayloadAction<ObjectId[]> | ObjectId[]
  ) => S
  removeOne: <S extends DocumentState<T>>(
    state: S,
    action: PayloadAction<ObjectId> | ObjectId
  ) => S
  setAll: <S extends DocumentState<T>>(
    state: S,
    action: PayloadAction<T[]> | T[]
  ) => S
  setMany: <S extends DocumentState<T>>(
    state: S,
    action: PayloadAction<T[]> | T[]
  ) => S
  setOne: <S extends DocumentState<T>>(
    state: S,
    action: PayloadAction<T> | T
  ) => S
  updateMany: <S extends DocumentState<T>>(
    state: S,
    action: PayloadAction<DocumentUpdate<T>[]> | DocumentUpdate<T>[]
  ) => S
  updateOne: <S extends DocumentState<T>>(
    state: S,
    action: PayloadAction<DocumentUpdate<T>> | DocumentUpdate<T>
  ) => S
  upsertMany: <S extends DocumentState<T>>(
    state: S,
    action: PayloadAction<T[]> | T[]
  ) => S
  upsertOne: <S extends DocumentState<T>>(
    state: S,
    action: PayloadAction<T> | T
  ) => S
}

export interface DocumentSelectors<T extends Document, S> {
  selectAll: (state: S) => T[]
  selectById: (state: S, id: ObjectId) => T | undefined
  selectEntities: (state: S) => DocumentEntities<T>
  selectIds: (state: S) => string[]
  selectTotal: (state: S) => number
}

export interface DocumentAdapter<T extends Document>
  extends DocumentStateAdapter<T> {
  getInitialState<S extends Record<string, unknown>>(
    additionalState: S
  ): DocumentState<T> & S
  getSelectors(): DocumentSelectors<T, DocumentState<T>>
  sortComparer?: DocumentComparer<T>
}
