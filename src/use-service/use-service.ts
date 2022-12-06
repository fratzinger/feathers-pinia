import type { MaybeRef } from '../utility-types'
import type { ModelFn as ModelFnType } from '../use-base-model'
import type { Id } from '@feathersjs/feathers'
import type {
  UseFindWatchedOptions,
  UseGetOptions,
  FindClassParams,
  FindClassParamsStandalone,
  GetClassParams,
  HandleEvents,
  AnyData,
} from './types'

import { Service } from '@feathersjs/feathers'
import { ref, computed, unref } from 'vue-demi'
import { useFind as _useFind } from '../use-find'
import { useGet as _useGet } from '../use-get'
import { useFindWatched as _useFindWatched } from '../use-find-watched'
import { useGetWatched as _useGetWatched } from '../use-get-watched'
import { useServiceLocal } from './use-service-local-queries'
import { useServiceEvents } from './use-service-events'

import { useServicePending } from './use-service-pending'
import { useServicePagination } from './use-service-pagination'
import { useServiceApiFeathers } from './use-service-api-feathers'
import EventEmitter from 'events'
import { useServiceEventLocks } from './use-service-event-locks'
import { useAllStorageTypes } from './use-all-storage-types'

export type UseFeathersServiceOptions<M extends AnyData> = {
  service: Service
  ModelFn: ModelFnType<M>
  idField: string
  tempIdField?: string
  whitelist?: string[]
  paramsForServer?: string[]
  skipRequestIfExists?: boolean
  ssr?: MaybeRef<boolean>
  handleEvents?: HandleEvents<M>
  debounceEventsTime?: number
  debounceEventsGuarantee?: boolean
}

const makeDefaultOptions = () => ({
  tempIdField: '__tempId',
  skipRequestIfExists: false,
})

export const useService = <M extends AnyData, D extends AnyData = AnyData, Q extends AnyData = AnyData>(
  _options: UseFeathersServiceOptions<M>,
) => {
  const options = Object.assign({}, makeDefaultOptions(), _options)
  const ModelFn = _options.ModelFn as ModelFnType<M> & EventEmitter

  const service = computed(() => options.service)
  const whitelist = ref(options.whitelist ?? [])
  const paramsForServer = ref(options.paramsForServer ?? [])
  const skipRequestIfExists = ref(options.skipRequestIfExists ?? false)
  const idField = ref(options.idField)
  const tempIdField = ref(options.tempIdField)

  const { itemStorage, tempStorage, moveTempToItems, cloneStorage, clone, commit, reset } = useAllStorageTypes({
    ModelFn,
  })

  const isSsr = computed(() => {
    const ssr = unref(options.ssr)
    return !!ssr
  })

  // pending state
  const pendingState = useServicePending()

  // pagination
  const { pagination, updatePaginationForQuery, unflagSsr } = useServicePagination({
    idField,
    isSsr,
  })

  // local data filtering
  const { findInStore, countInStore, getFromStore, removeFromStore, addToStore, clearAll } = useServiceLocal<M, Q>({
    idField,
    tempIdField,
    itemStorage,
    tempStorage,
    whitelist,
    paramsForServer,
    afterRemove: (item: any) => {
      cloneStorage.remove(item)
    },
    afterClear: () => {
      cloneStorage.clear()
      pendingState.clearAllPending()
    },
    moveTempToItems,
  })

  // feathers service
  const serviceMethods = useServiceApiFeathers<M, D, Q>({
    service: options.service,
    tempIdField,
    addToStore,
  })

  // event locks
  const eventLocks = useServiceEventLocks()

  // events
  useServiceEvents({
    idField: idField.value,
    ModelFn: ModelFn,
    onAddOrUpdate: addToStore,
    onRemove: removeFromStore,
    service: service.value,
    handleEvents: options.handleEvents,
    debounceEventsGuarantee: options.debounceEventsGuarantee,
    debounceEventsTime: options.debounceEventsTime,
    toggleEventLock: eventLocks.toggleEventLock,
    eventLocks: eventLocks.eventLocks,
  })

  const serviceUtils = {
    useFind: function (_params: MaybeRef<FindClassParams>) {
      const params: any = unref(_params)
      params.store = this
      return _useFind(params as MaybeRef<FindClassParamsStandalone>)
    },
    useGet: function (_id: MaybeRef<Id | null>, _params: MaybeRef<GetClassParams> = {}) {
      const params: any = unref(_params)
      params.store = this
      return _useGet(_id as Id, _params as MaybeRef<any>)
    },
    useGetOnce: function (_id: MaybeRef<Id | null>, _params: MaybeRef<GetClassParams> = {}) {
      const params = unref(_params)
      Object.assign(params, { store: this, immediate: false, onServer: true })
      const results = this.useGet(_id as Id, _params as MaybeRef<any>)
      results.queryWhen(() => !results.data.value)
      results.get()
      return results
    },
    useFindWatched: function (options: UseFindWatchedOptions) {
      return _useFindWatched({ model: ModelFn, ...(options as any) })
    },
    // alias to useGetWatched, doesn't require passing the model
    useGetWatched: function (options: UseGetOptions) {
      return _useGetWatched({ model: ModelFn as any, ...options })
    },
  }

  const store = {
    // service
    ...(service.value ? { service } : {}),
    Model: computed(() => ModelFn),
    whitelist,
    paramsForServer,
    skipRequestIfExists,
    isSsr,

    // items
    idField,
    itemsById: itemStorage.byId,
    items: itemStorage.list,
    itemIds: itemStorage.ids,

    // temps
    tempIdField,
    tempsById: tempStorage.byId,
    temps: tempStorage.list,
    tempIds: tempStorage.ids,

    // clones
    clonesById: cloneStorage.byId,
    clones: cloneStorage.list,
    cloneIds: cloneStorage.ids,
    clone,
    commit,
    reset,

    // options
    pagination,
    updatePaginationForQuery,
    unflagSsr,

    // local queries
    findInStore,
    countInStore,
    getFromStore,
    removeFromStore,
    addToStore,
    clearAll,

    // pending (conditional based on if service was provided)
    ...pendingState,

    // event locks
    ...eventLocks,

    // service actions (conditional based on if service was provided)
    ...serviceMethods,

    // service utils
    ...serviceUtils,
  }

  return store
}
