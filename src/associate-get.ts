import type { FindClassParams, ModelConstructor } from './service/types'
import type { HandleSetInstance } from './associate-utils'
import type { Params } from './types'
import type { Id } from '@feathersjs/feathers'
import { getParams, setupAssociation } from './associate-utils'
import { BaseModel } from './service'

interface AssociateGetOptions<
  M1 extends BaseModel,
  C extends ModelConstructor,
  M extends InstanceType<C> = InstanceType<C>,
> {
  Model: C
  getId: (instance: M1) => Id | null
  makeParams?: (instance: M1) => FindClassParams
  handleSetInstance?: HandleSetInstance<M1, M>
  propUtilsPrefix?: string
}
export function associateGet<C extends ModelConstructor, M extends InstanceType<C> = InstanceType<C>>(
  instance: M,
  prop: string,
  { Model, getId, makeParams, handleSetInstance, propUtilsPrefix = '_' }: AssociateGetOptions<C>,
) {
  // Cache the initial data in a variable
  const initialData = (instance as any)[prop]

  const { _handleSetInstance, propUtilName } = setupAssociation(
    instance,
    handleSetInstance,
    prop,
    Model,
    propUtilsPrefix,
  )

  const utils = {
    get(id?: Id | null, params?: Params) {
      const _id = getId(instance) || id
      const _params = getParams(instance, Model.store as any, makeParams) || params
      return Model.get(_id as Id, _params)
    },
    getFromStore(id?: Id | null, params?: Params) {
      const _id = instance.getId() || id
      const _params = getParams(instance, Model.store as any, makeParams) || params
      return Model.getFromStore(_id as Id | null, _params)
    },
  }

  Object.defineProperty(instance, prop, {
    // Define the key as non-enumerable so it won't get cloned
    enumerable: false,

    // Reading values will populate them from data in the store that matches the params.
    get() {
      const id = getId(this)
      let _params
      if (makeParams) {
        _params = getParams(this, Model.store as any, makeParams)
      }
      return Model.getFromStore(id, _params as any)
    },

    // Writing a value to the setter will write it to the other Model's store.
    set(this: M, item: any[]) {
      const model = new Model(item).addToStore()
      return _handleSetInstance.call(this, model as any)
    },
  })

  // Create the `_propName` utility object
  Object.defineProperty(instance.getModel().prototype, propUtilName, {
    configurable: true,
    enumerable: false,
    value: utils,
  })

  // Write the initial data to the new setter
  if (initialData) {
    (instance as any)[prop] = initialData
  }
}
