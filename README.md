# Redux Document Adapter

This library provides a `createDocumentAdapter` function which can be used in the same way as the  [Redux Toolkit `createEntityAdapter`](https://redux-toolkit.js.org/api/createEntityAdapter) function, but instead of working with plain JS objects it will accept [MongoDB Realm JavaScript](https://github.com/realm/realm-js) Documents.

A MongoDB Realm JavaScript Document is a JS object with a [BSON/EJSON](https://docs.mongodb.com/realm/functions/json-and-bson/) data structure.


**IMPORTANT**

This library breaks the Redux [Do Not Put Non-Serializable Values in State or Actions](https://redux.js.org/style-guide/style-guide#do-not-put-non-serializable-values-in-state-or-actions) rule! Make sure you understand this rule and what it means for your project when you ignore this rule.

## Installation

Redux Document Adapter is available as a package on NPM for use with a module bundler or in a Node application:

```bash
# NPM
npm install redux-document-adapter

# Yarn
yarn add redux-document-adapter
```

## Usage

The `createDocumentAdapter` function can be used the same way the `createEntityAdapter` function is used. See below an example which creates a slice of state which contains "Order" documents.

Note that the `createDocumentAdapter` does not accept a `selectId` option unlike the `createEntityAdapter` function. **The Document Adapter expects that an `_id` property with `ObjectId` type is always present.**


```TypeScript
import { createSlice } from '@reduxjs/toolkit'
import { createDocumentAdapter } from 'redux-document-adapter'
import { fetchOrders } from './thunks'

export interface Order {
  _id: ObjectId,
  description: string,
  date: Date
}

const ordersAdapter = createDocumentAdapter<Order>({
  sortComparer: (a, b) => a.description.localeCompare(b.description)
})

const slice = createSlice({
  name: 'orders',
  initialState: ordersAdapter.getInitialState({
    status: 'idle'
  }),
  reducers: {
    addOrder: ordersAdapter.addOne,
    removeOrder: ordersAdapter.removeOne,
    updateOrder: ordersAdapter.updateOne,
    upsertOrder: ordersAdapter.upsertOne
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOrders.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        ordersAdapter.setAll(state, action.payload)
        state.status = 'idle'
      })
      .addCase(fetchOrders.rejected, (state) => {
        state.status = 'idle'
      })
  }
})

export const { addOrder, removeOrder, updateOrder, upsertOrder } = slice.actions
export const { selectAll, selectById, selectEntities, selectIds, selectTotal } = ordersAdapter.getSelectors()

export default slice.reducer
```
