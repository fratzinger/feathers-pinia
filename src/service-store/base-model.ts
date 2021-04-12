import { getId } from '../utils'
import { AnyData, ModelInstanceOptions } from './types';
import { Id, Params } from '@feathersjs/feathers'
import { models } from '../models'

export class BaseModel {
  static store = null
  static pinia = null
  static servicePath = null
  static idField = ''

  public __isClone: boolean = false

  constructor(data: AnyData, options: ModelInstanceOptions) {
    const store = (this.constructor as typeof BaseModel).store
    Object.assign(this, this.instanceDefaults(data, { models, store }))
    Object.assign(this, this.setupInstance(data, { models, store }))

    if (options.clone) {
      Object.defineProperty(this, '__isClone', {
        value: true,
        enumerable: false
      })
    }
    return this
  }

  public instanceDefaults(data: AnyData, models: { [name: string]: any }) {
    return data
  }
  public setupInstance(data: AnyData, models: { [name: string]: any }) {
    return data
  }

  public static find(params?: Params) {
    return (this.store as any).find(params)
  }
  public static findInStore(params?: Params) {
    return (this.store as any).findInStore(params)
  }
  public static get(id: Id, params?: Params) {
    return (this.store as any).get(id, params)
  }
  public static getFromStore(id: Id, params?: Params) {
    return (this.store as any).getFromStore(id, params)
  }
  public static count(params?: Params) {
    return (this.store as any).count(params)
  }
  public static countInStore(params?: Params) {
    return (this.store as any).countInStore(params)
  }
  public static remove(params?: Params) {
    return (this.store as any).remove(params)
  }
  public static removeFromStore(params?: Params) {
    return (this.store as any).removeFromStore(params)
  }

  /**
   * clone the current record using the `createCopy` mutation
   */
  public clone(data: AnyData): this {
    const { idField, store } = this.constructor as typeof BaseModel
    if (this.__isClone) {
      throw new Error('You cannot clone a copy')
    }
    return (store as any).clone(this)
  }

  /**
   * Update a store instance to match a clone.
   */
  public commit(): this {
    const { idField,  store } = this.constructor as typeof BaseModel
    if (this.__isClone) {
      return (store as any).commitCopy(this)
    } else {
      throw new Error('You cannot call commit on a non-copy')
    }
  }

  /**
   * Update a store instance to match a clone.
   */
  public reset(): this {
    const { idField, store } = this.constructor as typeof BaseModel

    return (store as any).resetCopy(this)
  }

  /**
   * A shortcut to either call create or patch/update
   * @param params
   */
  public save(params?: any): Promise<this> {
    const { idField } = this.constructor as typeof BaseModel
    const id = getId(this, idField)
    if (id != null) {
      return this.patch(params)
    } else {
      return this.create(params)
    }
  }

  /**
   * Calls service create with the current instance data
   * @param params
   */
  public create(params?: any): Promise<this> {
    const { idField, store } = this.constructor as typeof BaseModel
    const data: any = Object.assign({}, this)
    if (data[idField] === null) {
      delete data[idField]
    }
    return (store as any).create(data, params)
  }

  /**
   * Calls service patch with the current instance data
   * @param params
   */
  public patch(params?: any): Promise<this> {
    const { idField, store } = this.constructor as typeof BaseModel
    const id = getId(this, idField)

    if (id == null) {
      const error = new Error(
        `Missing ${idField} property. You must create the data before you can patch with this data`
      )
      return Promise.reject(error)
    }
    return (store as any).patch(id, this, params)
  }

  /**
   * Calls service update with the current instance data
   * @param params
   */
  public update(params?: any): Promise<this> {
    const { idField, store } = this.constructor as typeof BaseModel
    const id = getId(this, idField)

    if (id == null) {
      const error = new Error(
        `Missing ${idField} property. You must create the data before you can patch with this data`
      )
      return Promise.reject(error)
    }
    return (store as any).update(id, this, params)
  }

  /**
   * Calls service remove with the current instance id
   * @param params
   */
  public remove(params?: Params): Promise<this> {
    checkThis(this)
    const { idField, store } = this.constructor as typeof BaseModel
    const id: Id = getId(this, idField)
    return (store as any).remove(id, params)
  }
}

function checkThis(context: any) {
  if (!context) {
    throw new Error(
      `Instance methods must be called with the dot operator. If you are referencing one in an event, use '@click="() => instance.remove()"' so that the correct 'this' context is applied. Using '@click="instance.remove"' will call the remove function with "this" set to 'undefined' because the function is called directly instead of as a method.`
    )
  }
}
