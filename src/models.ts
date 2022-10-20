import { BaseModel } from './service'
import { ModelStatic } from './service/types'

export const models: Record<string, any> = {}

export function registerModel(Model: ModelStatic<BaseModel>, store: { clientAlias: string }) {
  models[store.clientAlias] = models[store.clientAlias] || {}
  models[store.clientAlias][Model.modelName] = Model
}
