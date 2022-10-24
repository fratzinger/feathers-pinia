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
} from '../utils'

import type {
  AnyDataOrArray,
  HandleFindResponseOptions,
  AnyData,
  UseFindWatchedOptions,
  UseGetOptions,
  FindClassParams,
  FindClassParamsStandalone,
  GetClassParams,
  GetClassParamsStandalone,
  ModelConstructor,
} from './types'

import { useServiceEvents } from './use-service-events'
import { useFind as _useFind } from '../use-find'
import { useGet as _useGet } from '../use-get'
import { useFindWatched as _useFindWatched } from '../use-find-watched'
import { useGetWatched as _useGetWatched } from '../use-get-watched'
import { defaultIdField, defaultTempIdField } from './utils'
import { BaseModel } from './base-model'
import { useServiceClones } from './use-service-clones'
import { useServicePending } from './use-service-pending'
import { useServicePagination } from './use-service-pagination'

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

  const servicePath = computed(() => _options.servicePath)
  const service = computed(() => {
    return options.app.service(servicePath.value)
  })

  const idField = ref(options.idField || defaultIdField())
  const itemsById = ref({}) as Ref<Record<string | number | symbol, M>>

  const items = computed(() => {
    return Object.values(itemsById.value)
  })

  const itemIds = computed(() => {
    return items.value.map((item) => item[idField.value] as Id)
  })

  const tempIdField = ref(options.tempIdField || defaultTempIdField())
  const tempsById = ref({}) as Ref<Record<string | number | symbol, M>>

  const temps = computed(() => {
    return Object.values(tempsById.value)
  })

  const tempIds = computed(() => {
    return temps.value.map((temp) => temp[tempIdField.value] as string)
  })

  Object.assign(_Model, {
    servicePath: options.servicePath,
    idField: idField.value,
    tempIdField: tempIdField.value,
  })

  const Model = computed(() => {
    return _Model
  })

  const { clone, cloneIds, clones, clonesById, commit, reset } = useServiceClones({
    Model,
    itemsById,
    tempsById,
    idField,
    tempIdField,
  })

  const whitelist = ref(options.whitelist ?? [])
  const paramsForServer = ref(options.paramsForServer ?? [])
  const skipRequestIfExists = ref(options.skipRequestIfExists ?? false)

  const isSsr = computed(() => {
    const ssr = unref(options.ssr)
    return !!ssr
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

  const {
    clearAll: clearAllPending,
    isFindPending,
    isCountPending,
    isGetPending,
    isCreatePending,
    isUpdatePending,
    isPatchPending,
    isRemovePending,
    setPending: _setPending,
    setPendingById,
    unsetPendingById: _unsetPendingById,
    createPendingById,
    patchPendingById,
    removePendingById,
    updatePendingById,
  } = useServicePending()

  const { pagination, updatePaginationForQuery } = useServicePagination({
    idField,
    isSsr,
  })

  async function find(_params?: MaybeRef<Params>) {
    const params = getSaveParams(_params)
    const { query = {} } = params
    const isPaginated = params.paginate === true || hasOwn(query, '$limit') || hasOwn(query, '$skip')

    // For client-side services, like feathers-memory, paginate.default must be truthy.
    if (isPaginated) {
      params.paginate = { default: true }
    }

    _setPending('find', true)

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
      _setPending('find', false)
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
    const paginated = Array.isArray(response) ? { data: response } : response

    addOrUpdate(paginated.data)

    // The pagination data will be under `pagination.default` or whatever qid is passed.
    paginated.data && updatePaginationForQuery({ qid, response: paginated, query, preserveSsr })

    // Swap out the response records for their Vue-observable store versions
    const data = paginated.data
    const mappedFromState = data.map((item) => itemsById.value[getId(item, id) as Id])
    if (mappedFromState[0] !== undefined) {
      paginated.data ? (paginated.data = mappedFromState) : (paginated = mappedFromState)
    }

    return paginated
  }

  async function count(_params?: MaybeRef<Params>) {
    const params = getSaveParams(_params)
    const { query = {} } = params

    query.$limit = 0

    Object.assign(params, { query })

    _setPending('count', true)

    try {
      return await service.value.find(params)
    } catch (error) {
      return await Promise.reject(error)
    } finally {
      _setPending('count', false)
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

    _setPending('get', true)

    try {
      const response = await service.value.get(id, params)
      addOrUpdate(response)
      return itemsById.value[id]
    } catch (error) {
      return await Promise.reject(error)
    } finally {
      _setPending('get', false)
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

    _setPending('create', true)

    try {
      const response = await service.value.create(cleanData(data, _tempIdField), params)
      const restoredTempIds = restoreTempIds(data, response, _tempIdField)
      return addOrUpdate(restoredTempIds)
    } catch (error) {
      return await Promise.reject(error)
    } finally {
      _setPending('create', false)
      if (!Array.isArray(data)) {
        setPendingById(getId(data, _idField) || data[_tempIdField], 'create', false)
      }
    }
  }

  async function update(id: Id, data: AnyData, _params?: MaybeRef<Params>) {
    const params = getSaveParams(_params)

    setPendingById(id, 'update', true)
    _setPending('update', true)

    try {
      const response = await service.value.update(id, cleanData(data, Model.value.tempIdField), params)
      return addOrUpdate(response)
    } catch (error) {
      return await Promise.reject(error)
    } finally {
      setPendingById(id, 'update', false)
      _setPending('update', false)
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
    _setPending('patch', true)

    try {
      const response = await service.value.patch(id, cleanData(data, Model.value.tempIdField), params)
      return addOrUpdate(response)
    } catch (error) {
      return await Promise.reject(error)
    } finally {
      setPendingById(id, 'patch', false)
      _setPending('patch', false)
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
    _setPending('remove', true)

    try {
      const response = await service.value.remove(id, params)
      removeFromStore(response)
      return response
    } catch (error) {
      return await Promise.reject(error)
    } finally {
      setPendingById(id, 'remove', false)
      _setPending('remove', false)
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
    tempsById.value = _.omit(tempsById.value, ...idsToRemove)

    _unsetPendingById(...idsToRemove)

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

    clearAllPending()
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
    // service
    servicePath,
    service,
    Model,
    // items
    idField,
    itemsById,
    tempIdField,
    items,
    itemIds,
    // temps
    tempsById,
    temps,
    tempIds,
    // clones
    clonesById,
    clones,
    cloneIds,
    clone,
    commit,
    // options
    pagination,
    whitelist,
    paramsForServer,
    skipRequestIfExists,
    isSsr,
    // getter functions
    findInStore,
    countInStore,
    getFromStore,
    // pending
    isFindPending,
    isCountPending,
    isGetPending,
    isCreatePending,
    isUpdatePending,
    isPatchPending,
    isRemovePending,
    setPendingById,
    createPendingById,
    updatePendingById,
    patchPendingById,
    removePendingById,
    // service actions
    find,
    count,
    get,
    create,
    update,
    patch,
    remove,
    // store handlers
    removeFromStore,
    addToStore,
    addOrUpdate,
    clearAll,
    reset,
    hydrateAll,
    useFind: function (params: MaybeRef<FindClassParams>) {
      (params.value || params).store = this
      return _useFind(params as MaybeRef<FindClassParamsStandalone>)
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
