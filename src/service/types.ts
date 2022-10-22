import type { Params, Paginated, QueryInfo } from '../types'
import type { Ref, ComputedRef } from 'vue-demi'
import type { Id, Query } from '@feathersjs/feathers'
import type { MaybeArray, MaybeRef, NonConstructor } from '../utility-types'
import { BaseModel } from './base-model'
import { Find } from '../use-find'
import { Get } from '../use-get'

export type RequestTypeById = 'create' | 'patch' | 'update' | 'remove'

export type AnyData = Record<string, any>
export type AnyDataOrArray = MaybeArray<AnyData>

interface QueryPagination {
  $limit: number
  $skip: number
}
interface MostRecentQuery {
  pageId: string
  pageParams: QueryPagination
  queriedAt: number
  query: Query
  queryId: string
  queryParams: Query
  total: number
}

export interface CurrentQuery<M extends BaseModel> extends MostRecentQuery {
  qid: string
  ids: number[]
  items: M[]
  total: number
  queriedAt: number
  queryState: PaginationStateQuery
}

/**
 * Pagination State Types: below are types for the basic format shown here.
 * I'm surprised that something like the below can't work in TypeScript. Instead,
 * it has to be spread across the jumbled mess of interfaces and types shown below.
 * If somebody has knowledge of a cleaner representation, I'd appreciate a PR. - Marshall
 *
 * interface PaginationState {
 *   [queryId: string]: {
 *     [pageId: string]: {
 *       ids: Id[]
 *       pageParams: QueryPagination
 *       queriedAt: number
 *       ssr: boolean
 *     }
 *     queryParams: Query
 *     total: number
 *   }
 *   mostRecent: MostRecentQuery
 * }
 */
export interface PaginationPageData {
  ids: Id[]
  pageParams: QueryPagination
  queriedAt: number
  ssr: boolean
}
export type PaginationStatePage = {
  [pageId: string]: PaginationPageData
}
export type PaginationStateQuery =
  | PaginationStatePage
  | {
      queryParams: Query
      total: number
    }
export type PaginationStateQid =
  | PaginationStateQuery
  | {
      mostRecent: MostRecentQuery
    }

export type HandleFindResponseOptions = { params: Params; response: any }
export type HandleFindErrorOptions = { params: Params; error: any }

// The find action will always return data at params.data, even for non-paginated requests.
export type FindFn<C extends ModelConstructor = ModelConstructor, M extends InstanceType<C> = InstanceType<C>> = (
  params?: MaybeRef<Params>,
) => Promise<Paginated<M>>
export type GetFn<C extends ModelConstructor = ModelConstructor, M extends InstanceType<C> = InstanceType<C>> = (
  id?: Id,
  params?: MaybeRef<Params>,
) => Promise<M | undefined>
export type GetFnWithId<C extends ModelConstructor = ModelConstructor, M extends InstanceType<C> = InstanceType<C>> = (
  id: Id,
  params?: MaybeRef<Params>,
) => Promise<M | undefined>
export type UseGetFn<C extends ModelConstructor = ModelConstructor, M extends InstanceType<C> = InstanceType<C>> = (
  _id: MaybeRef<Id | null>,
  _params?: MaybeRef<GetClassParams>,
) => Get<C, M>

export interface Association<C extends ModelConstructor = ModelConstructor> {
  name: string
  Model: C
  type: 'find' | 'get'
}
export type BaseModelAssociations = Record<string, Association>

export type ModelConstructor<M extends BaseModel = BaseModel> = NonConstructor<typeof BaseModel> & {
  new (...args: any[]): M
}

export interface UpdatePaginationForQueryOptions {
  qid: string
  response: any
  query: any
  preserveSsr: boolean
}

export interface ModelInstanceOptions {
  /**
   * is creating clone
   */
  clone?: boolean
}

export interface BaseModelModifierOptions {
  store: any
}

export interface CloneOptions {
  useExisting?: boolean
}

export interface UseCloneOptions {
  useExisting?: boolean
  deep?: boolean
}

export interface QueryWhenContext {
  items: ComputedRef<AnyData[]>
  queryInfo: QueryInfo
  /**
   * Pagination data for the current qid
   */
  qidData: PaginationStateQid
  queryData: PaginationStateQuery
  pageData: PaginationStatePage
  isPending: ComputedRef<Boolean>
  haveBeenRequested: ComputedRef<Boolean>
  haveLoaded: ComputedRef<Boolean>
  error: any
}

export type QueryWhenFunction = ComputedRef<(context: QueryWhenContext) => boolean>

export interface GetClassParams extends Params {
  query?: Query
  onServer?: boolean
  immediate?: boolean
}
export interface GetClassParamsStandalone<C extends ModelConstructor = ModelConstructor, M = InstanceType<C>>
  extends GetClassParams {
  store: any
}
export interface FindClassParams extends Params {
  query: Query
  onServer?: boolean
  qid?: string
  immediate?: boolean
  watch?: boolean
}
export interface FindClassParamsStandalone extends FindClassParams {
  store: any
}

export interface UseFindWatchedOptions {
  params: Params | ComputedRef<Params | null>
  fetchParams?: ComputedRef<Params | null | undefined>
  queryWhen?: ComputedRef<boolean> | QueryWhenFunction
  qid?: string
  local?: boolean
  immediate?: boolean
}
export interface UseFindWatchedOptionsStandalone<C extends ModelConstructor> extends UseFindWatchedOptions {
  model: C
}
export interface UseFindState {
  debounceTime: null | number
  qid: string
  isPending: boolean
  haveBeenRequested: boolean
  haveLoaded: boolean
  error: null | Error
  latestQuery: null | object
  isLocal: boolean
  request: Promise<any> | null
}
export interface UseFindComputed<
  C extends ModelConstructor = ModelConstructor,
  M extends InstanceType<C> = InstanceType<C>,
> {
  items: ComputedRef<M[]>
  servicePath: ComputedRef<string>
  paginationData: ComputedRef<AnyData>
  isSsr: ComputedRef<boolean>
}

export interface UseGetOptions {
  id: Ref<Id | null> | ComputedRef<Id | null> | null
  params?: Ref<Params>
  queryWhen?: Ref<boolean>
  local?: boolean
  immediate?: boolean
}
export interface UseGetOptionsStandalone<C extends ModelConstructor> extends UseGetOptions {
  model: C
}
export interface UseGetState {
  isPending: boolean
  hasBeenRequested: boolean
  hasLoaded: boolean
  error: null | Error
  isLocal: boolean
  request: Promise<any> | null
}
export interface UseGetComputed<
  C extends ModelConstructor = ModelConstructor,
  M extends InstanceType<C> = InstanceType<C>,
> {
  item: ComputedRef<M | null>
  servicePath: ComputedRef<string>
  isSsr: ComputedRef<boolean>
}

export interface AssociateFindUtils<
  C extends ModelConstructor = ModelConstructor,
  M extends InstanceType<C> = InstanceType<C>,
> extends Find<C, M> {
  useFind: (params: MaybeRef<FindClassParams>) => Find<C, M>
}
