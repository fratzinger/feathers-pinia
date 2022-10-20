import type {
  Association,
  BaseModelAssociations,
  FindClassParams,
  FindClassParamsStandalone,
  ModelStatic,
  ServiceStoreDefault,
} from './service/types'
import { BaseModel } from './service'

export type HandleSetInstance<M> = (this: M, associatedRecord: M) => void

export function getParams<M extends BaseModel>(
  instance: any,
  store: ServiceStoreDefault<M>,
  makeParams?: (instance: M) => FindClassParams,
): FindClassParamsStandalone<M> | void {
  if (makeParams) {
    const params = makeParams(instance)
    if (params.temps !== false) params.temps = true
    const _params = Object.assign({}, params, { store })
    return _params
  }
}

function defaultHandleSetInstance<M>(associatedRecord: M) {
  return associatedRecord
}

export function setupAssociation<C extends ModelStatic, M extends InstanceType<C> = InstanceType<C>>(
  instance: M,
  handleSetInstance: any,
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
