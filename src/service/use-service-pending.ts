import { NullableId } from '@feathersjs/feathers'
import { computed, ref, Ref, set, del } from 'vue-demi'
import { RequestTypeById } from './types'

const defaultPending = () => ({
  find: 0,
  count: 0,
  get: 0,
  create: 0,
  update: 0,
  patch: 0,
  remove: 0,
})

export const useServicePending = () => {
  const isPending = ref(defaultPending())

  const createPending = ref({}) as Ref<Record<string | number | symbol, true>>
  const updatePending = ref({}) as Ref<Record<string | number | symbol, true>>
  const patchPending = ref({}) as Ref<Record<string | number | symbol, true>>
  const removePending = ref({}) as Ref<Record<string | number | symbol, true>>

  const isFindPending = computed(() => {
    return isPending.value.find > 0
  })

  const isCountPending = computed(() => {
    return isPending.value.count > 0
  })

  const isGetPending = computed(() => {
    return isPending.value.get > 0
  })

  const isCreatePending = computed(() => {
    return isPending.value.create > 0
  })

  const isUpdatePending = computed(() => {
    return isPending.value.update > 0
  })

  const isPatchPending = computed(() => {
    return isPending.value.patch > 0
  })

  const isRemovePending = computed(() => {
    return isPending.value.remove > 0
  })

  function setPending(method: 'find' | 'count' | 'get' | 'create' | 'update' | 'patch' | 'remove', value: boolean) {
    if (value) {
      isPending.value[method]++
    } else {
      isPending.value[method]--
    }
  }

  function setPendingById(id: NullableId, method: RequestTypeById, val: boolean) {
    if (id == null) return

    let place

    if (method === 'create') place = createPending.value
    else if (method === 'update') place = updatePending.value
    else if (method === 'patch') place = patchPending.value
    else if (method === 'remove') place = removePending.value

    if (val) {
      set(place, id, true)
    } else {
      del(place, id)
    }
  }

  function unsetPendingById(...ids: NullableId[]) {
    ids.forEach((id) => {
      if (id == null) return
      del(createPending.value, id)
      del(updatePending.value, id)
      del(patchPending.value, id)
      del(removePending.value, id)
    })
  }

  function clearAll() {
    isPending.value = defaultPending()

    createPending.value = {}
    updatePending.value = {}
    patchPending.value = {}
    removePending.value = {}
  }

  return {
    isPending,
    createPending,
    updatePending,
    patchPending,
    removePending,
    isFindPending,
    isCountPending,
    isGetPending,
    isCreatePending,
    isUpdatePending,
    isPatchPending,
    isRemovePending,
    setPending,
    setPendingById,
    unsetPendingById,
    clearAll,
  }
}
