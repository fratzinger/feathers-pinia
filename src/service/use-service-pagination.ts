import { ref, Ref, set } from 'vue-demi'
import { getId, getQueryInfo, hasOwn } from '../utils'
import { PaginationStateQid, UpdatePaginationForQueryOptions } from './types'

export type UseServicePagination = {
  idField: Ref<string>
  isSsr: Ref<boolean>
}

export const useServicePagination = (options: UseServicePagination) => {
  const { idField, isSsr } = options

  const pagination = ref({}) as Ref<{ [qid: string]: PaginationStateQid }>

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

    const ssr = preserveSsr ? existingPageData?.ssr : isSsr.value

    const pageData = {
      [pageId as string]: { pageParams, ids, queriedAt, ssr: !!ssr },
    }

    // @ts-expect-error todo
    Object.assign(qidData[queryId], pageData)

    const newState = Object.assign({}, pagination.value[qid], qidData)

    set(pagination.value, qid, newState)
  }

  return {
    pagination,
    updatePaginationForQuery,
  }
}
