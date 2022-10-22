import type { Association, BaseModelAssociations, FindClassParams, FindClassParamsStandalone } from './service/types'
import { BaseModel, ModelConstructor } from './service'

export type HandleSetInstance<M1, M2> = (this: M1, associatedRecord: M2) => void

export function getParams<M extends BaseModel>(
  instance: any,
  store: any,
  makeParams?: (instance: M) => FindClassParams,
): FindClassParamsStandalone | void {
  if (makeParams) {
    const params = makeParams(instance)
    if (params.temps !== false) params.temps = true
    const _params = Object.assign({}, params, { store })
    return _params
  }
}

function defaultHandleSetInstance<M1 extends BaseModel, C extends ModelConstructor>(associatedRecord: M1) {
  return associatedRecord
}

export function setupAssociation<M1 extends BaseModel, C extends ModelConstructor, M = InstanceType<C>>(
  instance: M1,
  handleSetInstance: HandleSetInstance<M1, M> | undefined,
  prop: string,
  Model: C,
  propUtilsPrefix: string,
) {
  // Define the association
  const def: Association = { name: prop, Model, type: 'get' }

  const _handleSetInstance = handleSetInstance || defaultHandleSetInstance

  // Register the association on the instance.getModel()
  if (!instance.getModel().associations[prop]) {
    (instance.getModel().associations as BaseModelAssociations)[prop] = def
  }

  // prefix the prop name with the `propUtilsPrefix`, which is `_`, by default.
  const propUtilName = `${propUtilsPrefix}${prop}`

  return { _handleSetInstance, propUtilName }
}
