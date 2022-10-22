import { Application, NullableId } from '@feathersjs/feathers'
import { ref, computed, unref, set, del, Ref } from 'vue-demi'
import { MaybeArray, MaybeRef } from '../utility-types'

import type { HandleEvents, Params } from '../types'
import type { Id } from '@feathersjs/feathers'
import sift from 'sift'
import { operations } from '../utils-custom-operators'
import { _ } from '@feathersjs/commons'
import { filterQuery, sorter, select } from '@feathersjs/adapter-commons'
import fastCopy from 'fast-copy'
import {
  getId,
  getTempId,
  getAnyId,
  getQueryInfo,
  assignTempId,
  cleanData,
  restoreTempIds,
  getArray,
  hasOwn,
  getSaveParams,
  markAsClone,
  copyAssociations,
} from '../utils'

import type {
  UpdatePaginationForQueryOptions,
  AnyDataOrArray,
  HandleFindResponseOptions,
  AnyData,
  CloneOptions,
  UseFindWatchedOptions,
  UseGetOptions,
  FindClassParams,
  FindClassParamsStandalone,
  GetClassParams,
  GetClassParamsStandalone,
  ModelConstructor,
  PaginationStateQid,
  RequestTypeById,
} from './types'

import { useServiceEvents } from './use-service-events'
import { useFind as _useFind } from '../use-find'
import { useGet as _useGet } from '../use-get'
import { useFindWatched as _useFindWatched } from '../use-find-watched'
import { useGetWatched as _useGetWatched } from '../use-get-watched'
import { defaultIdField, defaultTempIdField } from './utils'
import { BaseModel } from './base-model'

export type UseFeathersServiceOptions<C extends ModelConstructor = ModelConstructor, M = InstanceType<C>> = {
  app: Application
  Model?: C
  idField?: string
  tempIdField?: string
  clientAlias?: string
  servicePath: string
  whitelist?: string[]
  paramsForServer?: string[]
  skipRequestIfExists?: boolean
  ssr?: MaybeRef<boolean>
  handleEvents?: HandleEvents<C>
  debounceEventsTime?: number
  debounceEventsGuarantee?: boolean
}

const defaultSharedState = {
  clientAlias: 'api',
  skipRequestIfExists: false,
}

const FILTERS = ['$sort', '$limit', '$skip', '$select']
const additionalOperators = ['$elemMatch']

export const useService = <C extends ModelConstructor = ModelConstructor, M = InstanceType<C>>(
  _options: UseFeathersServiceOptions<C, M>,
) => {
  const options = Object.assign({}, defaultSharedState, _options)

  let _Model: C

  // If no Model class is provided, create a dynamic one.
  if (!_options.Model) {
    // @ts-expect-error - We are creating a dynamic class
    _Model = class DynamicBaseModel extends BaseModel {
      static dynamicBaseModel = true
      static modelName = _options.servicePath
    }
  } else {
    _Model = _options.Model
  }

  if (!_Model.modelName) {
    _Model.modelName = _Model.name
  }

  const servicePath = ref(_options.servicePath)
  const idField = ref(options.idField || defaultIdField())
  const tempIdField = ref(options.tempIdField || defaultTempIdField())
  const itemsById = ref({}) as Ref<Record<string | number | symbol, M>>
  const tempsById = ref({}) as Ref<Record<string | number | symbol, M>>
  const clonesById = ref({}) as Ref<Record<string | number | symbol, M>>

  Object.assign(_Model, {
    servicePath: options.servicePath,
    idField: idField.value,
    tempIdField: tempIdField.value,
  })

  const isPending = ref({
    find: 0,
    count: 0,
    get: 0,
  })

  const createPending = ref({}) as Ref<Record<string | number | symbol, true>>
  const updatePending = ref({}) as Ref<Record<string | number | symbol, true>>
  const patchPending = ref({}) as Ref<Record<string | number | symbol, true>>
  const removePending = ref({}) as Ref<Record<string | number | symbol, true>>

  const pagination = ref({}) as Ref<{ [qid: string]: PaginationStateQid }>
  const whitelist = ref(options.whitelist ?? [])
  const paramsForServer = ref(options.paramsForServer ?? [])
  const skipRequestIfExists = ref(options.skipRequestIfExists ?? false)

  const service = computed(() => {
    return options.app.service(servicePath.value)
  })

  const Model = computed(() => {
    return _Model
  })

  const isSsr = computed(() => {
    const ssr = unref(options.ssr)
    return !!ssr
  })

  const items = computed(() => {
    return Object.values(itemsById.value)
  })

  const itemIds = computed(() => {
    return items.value.map((item) => item[idField.value] as Id)
  })

  const temps = computed(() => {
    return Object.values(tempsById.value)
  })

  const tempIds = computed(() => {
    return temps.value.map((temp) => temp[tempIdField.value] as string)
  })

  const clones = computed(() => {
    return Object.values(clonesById.value)
  })

  const cloneIds = computed(() => {
    return clones.value.map((clone) => (clone[idField.value] ?? clone[tempIdField.value]) as Id)
  })

  /** @private */
  const _filterQueryOperators = computed(() => {
    return additionalOperators
      .concat(whitelist.value || [])
      .concat(['$like', '$iLike', '$ilike', '$notLike', '$notILike'])
      .concat(service.value.options?.allow || service.value.options?.whitelist || [])
  })

  const findInStore = computed(() => (params: Params) => {
    params = { ...unref(params) } || {}

    const _paramsForServer = paramsForServer.value

    const q = _.omit(params.query || {}, ..._paramsForServer)

    const { query, filters } = filterQuery(q, {
      operators: _filterQueryOperators.value,
    })
    let values = items.value

    if (params.temps) {
      values.push(...temps.value)
    }

    values = values.filter(sift(query, { operations }))

    const total = values.length

    if (filters.$sort) {
      values.sort(sorter(filters.$sort))
    }

    if (filters.$skip) {
      values = values.slice(filters.$skip)
    }

    if (typeof filters.$limit !== 'undefined') {
      values = values.slice(0, filters.$limit)
    }

    // if (filters.$select) {
    //   values = values.map((value) => _.pick(value, ...filters.$select.slice()))
    // }

    // Make sure items are instances
    values = values.map((item) => {
      if (item && !(item instanceof _Model)) {
        item = addOrUpdate(item)
      }
      return item
    })

    return {
      total,
      limit: filters.$limit || 0,
      skip: filters.$skip || 0,
      data: values,
    }
  })

  const countInStore = computed(() => (params: Params) => {
    params = { ...unref(params) }

    if (!params.query) {
      throw 'params must contain a query-object'
    }

    params.query = _.omit(params.query, ...FILTERS)

    return findInStore.value(params).total
  })

  const getFromStore = computed(() => (id: Id | null, params?: Params): M | null => {
    id = unref(id)
    params = fastCopy(unref(params) || {})

    let item = null
    const existingItem = itemsById.value[id as Id] && select(params, idField.value)(itemsById.value[id as Id])
    const tempItem = tempsById.value[id as Id] && select(params, tempIdField.value)(tempsById.value[id as Id])

    if (existingItem) item = existingItem
    else if (tempItem) item = tempItem

    if (!item) {
      return null
    }

    // Make sure item is an instance
    if (!(item instanceof _Model)) {
      return addOrUpdate(item)
    }

    return item
  })

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
    return Object.values(createPending.value).length > 0
  })

  const isUpdatePending = computed(() => {
    return Object.values(updatePending.value).length > 0
  })

  const isPatchPending = computed(() => {
    return Object.values(patchPending.value).length > 0
  })

  const isRemovePending = computed(() => {
    return Object.values(removePending.value).length > 0
  })

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

  async function find(_params?: MaybeRef<Params>) {
    const params = getSaveParams(_params)
    const { query = {} } = params
    const isPaginated = params.paginate === true || hasOwn(query, '$limit') || hasOwn(query, '$skip')

    // For client-side services, like feathers-memory, paginate.default must be truthy.
    if (isPaginated) {
      params.paginate = { default: true }
    }

    isPending.value.find++

    const info = getQueryInfo(params, {})
    const qidData = pagination.value[info.qid]
    // @ts-expect-error todo
    const queryData = qidData?.[info.queryId]
    const pageData = queryData?.[info.pageId as string]

    let ssrPromise

    if (pageData?.ssr) {
      const ssrResponse = {
        data: pageData.ids.map((id: Id) => getFromStore.value(id)),
        limit: pageData.pageParams.$limit,
        skip: pageData.pageParams.$skip,
        total: queryData.total,
        fromSsr: true,
      }
      ssrPromise = Promise.resolve(ssrResponse)
      if (!params.preserveSsr) {
        unflagSsr(params)
      }
    }

    try {
      const response = await (ssrPromise || service.value.find(params))
      return await _handleFindResponse({ params, response })
    } catch (error) {
      return await Promise.reject(error)
    } finally {
      isPending.value.find--
    }
  }

  /**
   * Handle the response from the find action.
   *
   * @param payload consists of the following two params
   *   @param params - Remember that these params aren't what was sent to the
   *         Feathers client.  The client modifies the params object.
   *   @param response
   */
  async function _handleFindResponse({ params, response }: HandleFindResponseOptions) {
    const id = idField.value
    const { qid = 'default', query, preserveSsr = false } = params
    // Normalize response so data is always found at response.data
    if (Array.isArray(response)) response = { data: response }

    addOrUpdate(response.data)

    // The pagination data will be under `pagination.default` or whatever qid is passed.
    response.data && updatePaginationForQuery({ qid, response, query, preserveSsr })

    // Swap out the response records for their Vue-observable store versions
    const data = response.data
    const mappedFromState = data.map((i: any) => itemsById.value[getId(i, id) as Id])
    if (mappedFromState[0] !== undefined) {
      response.data ? (response.data = mappedFromState) : (response = mappedFromState)
    }

    return response
  }

  async function count(_params?: MaybeRef<Params>) {
    const params = getSaveParams(_params)
    const { query = {} } = params

    query.$limit = 0

    Object.assign(params, { query })

    isPending.value.count++

    try {
      return await service.value.find(params)
    } catch (error) {
      return await Promise.reject(error)
    } finally {
      isPending.value.count--
    }
  }

  // Supports passing params the feathers way: `get(id, params)`
  // Does NOT support the old array syntax:
  // `get([null, params])` which was only needed for Vuex
  async function get(id: Id, _params?: MaybeRef<Params>) {
    const params = getSaveParams(_params)

    const skipIfExists = params.skipRequestIfExists || skipRequestIfExists.value
    delete params.skipRequestIfExists

    // If the records is already in store, return it
    const existingItem = getFromStore.value(id, params)
    if (existingItem && skipIfExists) {
      return Promise.resolve(existingItem)
    }

    isPending.value.get++

    try {
      const response = await service.value.get(id, params)
      addOrUpdate(response)
      return itemsById.value[id]
    } catch (error) {
      return await Promise.reject(error)
    } finally {
      isPending.value.get--
    }
  }

  async function create(data: AnyData, _params?: MaybeRef<Params>): Promise<M>
  async function create(data: AnyData[], _params?: MaybeRef<Params>): Promise<M[]>
  async function create(data: AnyDataOrArray, _params?: MaybeRef<Params>): Promise<M | M[]> {
    const params = getSaveParams(_params)

    const _idField = idField.value
    const _tempIdField = tempIdField.value

    if (!Array.isArray(data)) {
      setPendingById(getId(data, _idField) || data[_tempIdField], 'create', true)
    }

    try {
      const response = await service.value.create(cleanData(data, _tempIdField), params)
      const restoredTempIds = restoreTempIds(data, response, _tempIdField)
      return addOrUpdate(restoredTempIds)
    } catch (error) {
      return await Promise.reject(error)
    } finally {
      if (!Array.isArray(data)) {
        setPendingById(getId(data, _idField) || data[_tempIdField], 'create', false)
      }
    }
  }

  async function update(id: Id, data: AnyData, _params?: MaybeRef<Params>) {
    const params = getSaveParams(_params)

    setPendingById(id, 'update', true)

    try {
      const response = await service.value.update(id, cleanData(data, Model.value.tempIdField), params)
      return addOrUpdate(response)
    } catch (error) {
      return await Promise.reject(error)
    } finally {
      setPendingById(id, 'update', false)
    }
  }

  async function patch(id: Id, data: AnyData, _params?: MaybeRef<Params>): Promise<M>
  async function patch(id: null, data: AnyData, _params?: MaybeRef<Params>): Promise<M[]>
  async function patch(id: NullableId, data: AnyData, _params?: MaybeRef<Params>): Promise<M | M[]> {
    const params = getSaveParams(_params)

    if (params && params.data) {
      data = params.data
    }

    setPendingById(id, 'patch', true)

    try {
      const response = await service.value.patch(id, cleanData(data, Model.value.tempIdField), params)
      return addOrUpdate(response)
    } catch (error) {
      return await Promise.reject(error)
    } finally {
      setPendingById(id, 'patch', false)
    }
  }

  /**
   * Sends API request to remove the record with the given id.
   * Calls `removeFromStore` after response.
   * @param id
   * @param params
   * @returns
   */
  async function remove(id: Id, _params?: MaybeRef<Params>): Promise<M>
  async function remove(id: null, _params?: MaybeRef<Params>): Promise<M[]>
  async function remove(id: NullableId, _params?: MaybeRef<Params>): Promise<M | M[]> {
    const params = getSaveParams(_params)

    setPendingById(id, 'remove', true)

    try {
      const response = await service.value.remove(id, params)
      removeFromStore(response)
      return response
    } catch (error) {
      return await Promise.reject(error)
    } finally {
      setPendingById(id, 'remove', false)
    }
  }

  function removeFromStore<T>(data: T): T {
    const { items } = getArray(data)
    const id = idField.value
    const tempId = tempIdField.value
    const idsToRemove = items
      .map((item: any) => (getId(item, id) != null ? getId(item, id) : getTempId(item, tempId)))
      .filter((id: any) => id != null)

    itemsById.value = _.omit(itemsById.value, ...idsToRemove)

    clonesById.value = _.omit(clonesById.value, ...idsToRemove)
    // TODO!
    // pendingById.value = _.omit(pendingById.value, ...idsToRemove)
    tempsById.value = _.omit(tempsById.value, ...idsToRemove)

    return data
  }

  /**
   * An alias for addOrUpdate
   * @param data a single record or array of records.
   * @returns data added or modified in the store.
   *  If you pass an array, you get an array back.
   */
  function addToStore(data: AnyData): M
  function addToStore(data: AnyData[]): M[]
  function addToStore(data: AnyDataOrArray): MaybeArray<M> {
    return addOrUpdate(data)
  }

  function addOrUpdate(data: AnyData): M
  function addOrUpdate(data: AnyData[]): M[]
  function addOrUpdate(data: AnyDataOrArray): MaybeArray<any> {
    const _idField = idField.value
    const _tempIdField = tempIdField.value
    const { items, isArray } = getArray(data)

    const _items = items.map((item: AnyData) => {
      if (getId(item, _idField) != null && getTempId(item, _tempIdField) != null) {
        return moveTempToItems(item)
      } else {
        return _addOrMergeToStore(item)
      }
    })

    return isArray ? _items : _items[0]
  }

  function moveTempToItems(data: AnyData) {
    const _idField = idField.value
    const _tempIdField = tempIdField.value
    const id = getId(data, _idField)
    if (id == undefined) return
    const tempId = getTempId(data, _tempIdField)
    const existingTemp = tempsById.value[tempId]
    if (existingTemp) {
      set(itemsById.value, id, Object.assign(existingTemp, data))
      del(tempsById.value, tempId)
      del(itemsById.value[id], _tempIdField)
    }
    del(data, _tempIdField)
    return itemsById.value[id]
  }

  function clearAll() {
    itemsById.value = {}
    tempsById.value = {}
    clonesById.value = {}

    createPending.value = {}
    updatePending.value = {}
    patchPending.value = {}
    removePending.value = {}
  }

  function clone(item: M, data = {}, options: CloneOptions = {}): M {
    const tempId = getTempId(item, Model.value.tempIdField)
    const placeToStore = tempId != null ? tempsById.value : itemsById.value
    const id = getAnyId(item, Model.value.tempIdField, Model.value.idField)
    const originalItem = placeToStore[id]
    const existing = clonesById.value[id]

    // Maintain reactivity for existing clones
    if (existing) {
      if (options.useExisting) return existing
      return reset(item, data) as M
    } else {
      // Create the clone with any applicable associations
      const clone = fastCopy(originalItem)
      markAsClone(clone)
      copyAssociations(originalItem, clone, clone.getModel().associations)

      // Copy over any provided data
      Object.assign(clone, data)

      // Store and return the clone
      set(clonesById.value, id, clone)
      return clonesById.value[id] // Must return the item from the store
    }
  }

  function commit(item: M, data = {}) {
    const id = getAnyId(item, Model.value.tempIdField, Model.value.idField)
    if (id != null) {
      const tempId = getTempId(item, Model.value.tempIdField)
      const placeToStore = tempId != null ? tempsById.value : itemsById.value
      const clone = clonesById.value[id]
      const newOriginal = fastCopy(clone)
      Object.assign(newOriginal, data)
      copyAssociations(clone, newOriginal, clone.getModel().associations)

      set(placeToStore, id, newOriginal)

      return placeToStore[id]
    }
  }

  function reset(item: M, data = {}) {
    const tempId = getTempId(item, Model.value.tempIdField)
    const placeToStore = tempId != null ? tempsById.value : itemsById.value
    const id = getAnyId(item, Model.value.tempIdField, Model.value.idField)
    const originalItem = placeToStore[id]
    const existingClone = clonesById.value[id]
    if (!existingClone) return clone(item, data)

    const cloneReset: M = Object.assign(existingClone, originalItem, data)

    // Remove properties that may have been added to the clone but are not in the original
    Object.keys(cloneReset as object).forEach((key) => {
      if (!hasOwn(originalItem as any, key)) {
        del(cloneReset as any, key)
      }
    })
    markAsClone(cloneReset)
    return cloneReset
  }

  /**
   * Stores pagination data on state.pagination based on the query identifier
   * (qid) The qid must be manually assigned to `params.qid`
   */
  function updatePaginationForQuery({
    qid,
    response,
    query = {},
    preserveSsr = false,
  }: UpdatePaginationForQueryOptions) {
    const { data, total } = response
    const _idField = idField.value
    const ids = data.map((i: any) => getId(i, _idField))
    const queriedAt = new Date().getTime()
    const { queryId, queryParams, pageId, pageParams } = getQueryInfo({ qid, query }, response)

    if (!pagination.value[qid]) {
      set(pagination.value, qid, {})
    }

    if (!hasOwn(query, '$limit') && hasOwn(response, 'limit')) {
      set(pagination.value, 'defaultLimit', response.limit)
    }
    if (!hasOwn(query, '$skip') && hasOwn(response, 'skip')) {
      set(pagination.value, 'defaultSkip', response.skip)
    }

    const mostRecent = {
      query,
      queryId,
      queryParams,
      pageId,
      pageParams,
      queriedAt,
      total,
    }

    // @ts-expect-error todo
    const existingPageData = pagination.value[qid]?.[queryId]?.[pageId as string]

    const qidData = pagination.value[qid] || {}
    Object.assign(qidData, { mostRecent })

    // @ts-expect-error todo
    set(qidData, queryId, qidData[queryId] || {})
    const queryData = {
      total,
      queryParams,
    }

    // @ts-expect-error todo
    set(qidData, queryId, Object.assign({}, qidData[queryId], queryData))

    const ssr = preserveSsr ? existingPageData?.ssr : unref(options.ssr)

    const pageData = {
      [pageId as string]: { pageParams, ids, queriedAt, ssr: !!ssr },
    }

    // @ts-expect-error todo
    Object.assign(qidData[queryId], pageData)

    const newState = Object.assign({}, pagination.value[qid], qidData)

    set(pagination.value, qid, newState)
  }

  function hydrateAll() {
    addToStore(items.value)
  }

  /** @private */
  function _addOrMergeToStore(item: AnyData) {
    const _idField = idField.value
    const _tempIdField = tempIdField.value

    const key = getId(item, _idField) != null ? 'itemsById' : 'tempsById'
    const placeToStore = key === 'tempsById' ? tempsById.value : itemsById.value

    if (key === 'tempsById' && !item[_tempIdField]) assignTempId(item, _tempIdField)

    const id = getAnyId(item, _tempIdField, _idField)
    const existing = placeToStore[id]
    if (existing) Object.assign(existing, item)
    else {
      set(placeToStore, id, new Model.value(item))
    }

    if (isSsr.value || !(item instanceof Model.value)) {
      set(placeToStore, id, new Model.value(existing ? Object.assign(existing, item) : item))
    }

    return placeToStore[id]
  }

  function unflagSsr(params: Params) {
    const queryInfo = getQueryInfo(params, {})
    const { qid, queryId, pageId } = queryInfo

    const pageData = pagination.value[qid]?.[queryId]?.[pageId as string]
    pageData.ssr = false
  }

  useServiceEvents({
    idField: idField.value,
    Model: Model.value,
    onAddOrUpdate: addToStore,
    onRemove: removeFromStore,
    service: service.value,
    handleEvents: options.handleEvents,
    debounceEventsGuarantee: options.debounceEventsGuarantee,
    debounceEventsTime: options.debounceEventsTime,
  })

  const store = {
    servicePath,
    idField,
    tempIdField,
    itemsById,
    tempsById,
    clonesById,
    isPending,
    createPending,
    updatePending,
    patchPending,
    removePending,
    pagination,
    whitelist,
    paramsForServer,
    skipRequestIfExists,
    service,
    Model,
    isSsr,
    items,
    itemIds,
    temps,
    tempIds,
    clones,
    cloneIds,
    findInStore,
    countInStore,
    getFromStore,
    setPendingById,
    isFindPending,
    isCountPending,
    isGetPending,
    isCreatePending,
    isUpdatePending,
    isPatchPending,
    isRemovePending,
    find,
    count,
    get,
    create,
    update,
    patch,
    remove,
    removeFromStore,
    addToStore,
    addOrUpdate,
    clearAll,
    clone,
    commit,
    reset,
    hydrateAll,
    useFind: function (params: MaybeRef<FindClassParams>) {
      (params.value || params).store = this
      return _useFind(params as MaybeRef<FindClassParamsStandalone<C>>)
    },
    useGet: function (_id: MaybeRef<Id | null>, _params: MaybeRef<GetClassParams> = {}) {
      (_params.value || _params).store = this
      return _useGet(_id as Id, _params as MaybeRef<GetClassParamsStandalone<C, M>>)
    },
    useGetOnce: function (_id: MaybeRef<Id | null>, _params: MaybeRef<GetClassParams> = {}) {
      Object.assign(_params.value || _params, { store: this, immediate: false, onServer: true })
      const results = this.useGet(_id as Id, _params as MaybeRef<GetClassParamsStandalone<C, M>>)
      results.queryWhen(() => !results.data.value)
      results.get()
      return results
    },
    useFindWatched: function (options: UseFindWatchedOptions) {
      return _useFindWatched({ model: Model.value, ...options })
    },
    // alias to useGetWatched, doesn't require passing the model
    useGetWatched: function (options: UseGetOptions) {
      return _useGetWatched({ model: Model.value, ...options })
    },
  }

  return store
}
