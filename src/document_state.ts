import { Document, DocumentState } from './models'

export const createInitialStateFactory = <T extends Document>() => {
  // Returns the initial state, extended with additional state if specified.
  const getInitialState = <S extends Record<string, unknown>>(
    additionalState: S
  ): DocumentState<T> & S => ({
    ids: [],
    entities: {},
    ...additionalState,
  })
  return { getInitialState }
}
