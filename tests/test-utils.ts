export function resetStores(service: any, store: any) {
  service.store = {}
  service._uId = 0
  if (!store.clearAll) {
    return
  }
  if (store.clearAll) store.clearAll()
}

export function timeout(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
