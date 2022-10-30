import type { ModelConstructor, UseGetComputed, UseGetOptionsStandalone, UseGetState } from './service/types'
import type { Id } from '@feathersjs/feathers'
import type { Params } from './types'
import { reactive, computed, toRefs, unref, watch } from 'vue-demi'

export function useGetWatched<C extends ModelConstructor, M extends InstanceType<C> = InstanceType<C>>({
  model,
  id,
  params = computed(() => ({})),
  queryWhen = computed((): boolean => true),
  local = false,
  immediate = true,
}: UseGetOptionsStandalone<C>) {
  if (!model) {
    throw new Error(`No model provided for useGetWatched(). Did you define and register it with FeathersPinia?`)
  }

  function getId() {
    return unref(id)
  }
  function getParams() {
    return unref(params)
  }

  const state = reactive<UseGetState>({
    isPending: false,
    hasBeenRequested: false,
    hasLoaded: false,
    error: null,
    isLocal: local,
    request: null,
  })

  const computes: UseGetComputed<C, M> = {
    item: computed(() => {
      const unrefId = getId()
      if (unrefId === null) {
        return null
      }
      return (model.store.getFromStore(unrefId, getParams()) as M) || null
    }),
    servicePath: computed(() => model.servicePath),
    isSsr: computed(() => model.store.isSsr),
  }

  async function get(id: Id | null, params?: Params): Promise<M | undefined | any> {
    const idToUse = unref(id)
    const paramsToUse = unref(params)

    if (idToUse != null && queryWhen.value && !state.isLocal) {
      state.isPending = true
      state.error = null
      state.hasBeenRequested = true

      const request = paramsToUse != null ? model.store.get(idToUse, paramsToUse) : model.store.get(idToUse)
      state.request = request

      try {
        const response = await request
        state.isPending = false
        state.hasLoaded = true
        return response
      } catch (error: any) {
        state.isPending = false
        state.error = error
        return error
      }
    } else {
      return Promise.resolve(undefined)
    }
  }

  watch(
    () => [getId(), getParams(), queryWhen.value],
    ([id, params]) => {
      get(id as Id | null, params as Params)
    },
    { immediate },
  )

  // Clear error when an item is found
  watch(
    () => computes.item.value,
    (item) => {
      if (item) {
        state.error = null
      }
    },
  )

  return {
    ...toRefs(state),
    ...computes,
    get,
  }
}
