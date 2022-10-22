import { defineStore as _defineStore, Pinia } from 'pinia'

export const defineStore = <Id extends string, SS>(id: Id, setupStore: () => SS) => {
  const storeDefinition = _defineStore(id, setupStore)

  return (pinia?: Pinia) => {
    const store = storeDefinition(pinia)

    // @ts-expect-error - we're adding a property to the store
    const model = store.Model

    Object.assign(model, {
      store,
    })
    return store
  }
}
