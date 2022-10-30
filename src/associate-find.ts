import type { FindClassParams, FindClassParamsStandalone, AssociateFindUtils, ModelConstructor } from './service/types'
import { getParams, HandleSetInstance, setupAssociation } from './associate-utils'
import { Find, useFind } from './use-find'
import { MaybeRef } from './utility-types'
import { BaseModel } from './service'

interface AssociateFindOptions<
  M1 extends BaseModel,
  C extends ModelConstructor,
  M extends InstanceType<C> = InstanceType<C>,
> {
  Model: C
  makeParams: (instance: M1) => FindClassParams
  handleSetInstance?: HandleSetInstance<M1, M>
  propUtilsPrefix?: string
}
export function associateFind<
  M1 extends BaseModel,
  C extends ModelConstructor,
  M extends InstanceType<C> = InstanceType<C>,
>(
  instance: M1,
  prop: string,
  { Model, makeParams, handleSetInstance, propUtilsPrefix = '_' }: AssociateFindOptions<M1, C, M>,
) {
  // cache the initial data in a variable
  const initialData = (instance as any)[prop]
  const { _handleSetInstance, propUtilName } = setupAssociation(
    instance,
    handleSetInstance,
    prop,
    Model,
    propUtilsPrefix,
  )

  // define `setupFind` for lazy creation of associated getters.
  let _utils: AssociateFindUtils<C>
  function setupFind(instance: M) {
    if (!makeParams) return null
    const _params = getParams(instance, Model.store as any, makeParams)
    _utils = new Find(_params as FindClassParamsStandalone<C>) as any
    _utils.useFind = (params: MaybeRef<FindClassParams>): Find<C> => {
      (params.value || params).store = Model.store
      return useFind(params as MaybeRef<FindClassParamsStandalone<C, M>>)
    }
  }

  // create the `propName` where the data is found.
  Object.defineProperty(instance, prop, {
    enumerable: false,
    get() {
      if (!_utils) setupFind(this)
      return _utils.data.value
    },
    // Writing values to the setter will write them to the other Model's store.
    set(this: M, items: any[]) {
      items.map((i) => new Model(i).addToStore()).map((i) => _handleSetInstance.call(this, i as any))
    },
  })

  // Create the `_propName` utility object
  Object.defineProperty(instance, propUtilName, {
    enumerable: false,
    get() {
      if (!_utils) setupFind(this)
      return _utils
    },
  })

  // Write the initial data to the new setter
  if (initialData) {
    (instance as any)[prop] = initialData
  }
}
