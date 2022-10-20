import type { ComputedRef, Ref, UnwrapRef } from 'vue-demi'
import { AnyData, ModelStatic } from './service/types'

export interface Filters {
  $sort?: { [prop: string]: -1 | 1 }
  $limit?: number
  $skip?: number
  $select?: string[]
}
export interface Query extends Filters, AnyData {}

export interface PaginationOptions {
  default?: number | true
  max?: number
}

export type AnyRef<M> = ComputedRef<M | null> | Ref<UnwrapRef<M> | null>

export type DiffDefinition = undefined | string | string[] | Record<string, any> | false

export interface Params extends AnyData {
  query?: Query
  paginate?: boolean | PaginationOptions
  provider?: string
  route?: Record<string, string>
  headers?: Record<string, any>
  temps?: boolean
  copies?: boolean
  qid?: string
  skipRequestIfExists?: boolean
  data?: any
  preserveSsr?: boolean
}
export interface PatchParams extends Params {
  data?: Partial<AnyData>
  diff?: DiffDefinition
  with?: DiffDefinition
  eager?: boolean
}

export interface Paginated<T> {
  total: number
  limit: number
  skip: number
  data: T[]
  fromSsr?: true
}

export interface QueryInfo {
  qid: string
  query: Query
  queryId: string
  queryParams: Query
  pageParams: { $limit: number; $skip: number | undefined } | undefined
  pageId: string | undefined
  response: Partial<Paginated<any>> | undefined
  isOutdated: boolean | undefined
}

export type HandledEvent = 'created' | 'patched' | 'updated' | 'removed'
export type HandleEventsFunction<C extends ModelStatic = ModelStatic> = (
  item: any,
  ctx: { model: C; models: any },
) => any

export type HandleEvents<C extends ModelStatic = ModelStatic> =
  | {
      [event in HandledEvent]: HandleEventsFunction<C> | false
    }
  | false
