import { defineStore as _defineStore } from 'pinia'
import { GenericStore } from './store-types'

export const defineStore = <Id extends string, SS>(id: Id, setupStore: () => SS) => {
  const store = _defineStore(id, setupStore)

  const model = (store as any as GenericStore).Model

  Object.assign(model, {
    store,
  })

  return store
}
