import { getId, getTempId, getAnyId, diff, pickDiff } from '../utils'
import fastCopy from 'fast-copy'
import {
  AnyData,
  AnyDataOrArray,
  ModelInstanceOptions,
  ModelConstructor,
  BaseModelModifierOptions,
  BaseModelAssociations,
  CloneOptions,
} from './types'
import { Id, NullableId, Params } from '@feathersjs/feathers'
import { models } from '../models'
import { EventEmitter } from 'events'
import { GenericStore } from './store-types'

export class BaseModel<STORE extends GenericStore = GenericStore> implements AnyData {
  static readonly store: any
  static readonly models = models
  static pinia = null
  static servicePath = ''
  static idField = ''
  static modelName = ''
  static tempIdField = ''
  static associations: BaseModelAssociations = {}

  public __isClone!: boolean

  constructor(data: Record<string, any> = {}, options: ModelInstanceOptions = {}) {
    const c = this.getModel()
    Object.assign(this, c.instanceDefaults.call(c, data, { models, store: this.getStore() }))

    Object.defineProperty(this, '__isClone', {
      value: !!options.clone,
    })
    return this
  }

  public static instanceDefaults<C extends ModelConstructor>(
    this: C,
    data: AnyData,
    options?: BaseModelModifierOptions,
  ): AnyData
  static instanceDefaults<C extends ModelConstructor>(this: C, data: AnyData): AnyData {
    return data
  }

  //#region EventEmitter

  static emitter = new EventEmitter()

  public static addEventListener<C extends ModelConstructor>(
    this: C,
    eventName: string | symbol,
    listener: (...args: any[]) => void,
  ) {
    this.emitter.addListener(eventName, listener)
    return this
  }

  public static emit<C extends ModelConstructor>(this: C, eventName: string | symbol, ...args: any[]) {
    return this.emitter.emit(eventName, ...args)
  }

  public static eventNames<C extends ModelConstructor>(this: C) {
    return this.emitter.eventNames()
  }

  public static getMaxListeners<C extends ModelConstructor>(this: C) {
    return this.emitter.getMaxListeners()
  }

  public static listenerCount<C extends ModelConstructor>(this: C, eventName: string | symbol) {
    return this.emitter.listenerCount(eventName)
  }

  public static listeners<C extends ModelConstructor>(this: C, eventName: string | symbol) {
    return this.emitter.listeners(eventName)
  }

  public static off<C extends ModelConstructor>(
    this: C,
    eventName: string | symbol,
    listener: (...args: any[]) => void,
  ) {
    this.emitter.off(eventName, listener)
    return this
  }

  public static on<C extends ModelConstructor>(
    this: C,
    eventName: string | symbol,
    listener: (...args: any[]) => void,
  ) {
    this.emitter.on(eventName, listener)
    return this
  }

  public static once<C extends ModelConstructor>(
    this: C,
    eventName: string | symbol,
    listener: (...args: any[]) => void,
  ) {
    this.emitter.once(eventName, listener)
    return this
  }

  public static prependListener<C extends ModelConstructor>(
    this: C,
    eventName: string | symbol,
    listener: (...args: any[]) => void,
  ) {
    this.emitter.prependListener(eventName, listener)
    return this
  }

  public static prependOnceListener<C extends ModelConstructor>(
    this: C,
    eventName: string | symbol,
    listener: (...args: any[]) => void,
  ) {
    this.emitter.prependOnceListener(eventName, listener)
    return this
  }

  public static rawListeners<C extends ModelConstructor>(this: C, eventName: string | symbol) {
    return this.emitter.rawListeners(eventName)
  }

  public static removeAllListeners<C extends ModelConstructor>(this: C, eventName?: string | symbol) {
    this.emitter.removeAllListeners(eventName)
    return this
  }

  public static removeListener<C extends ModelConstructor>(
    this: C,
    eventName: string | symbol,
    listener: (...args: any[]) => void,
  ) {
    this.emitter.removeListener(eventName, listener)
    return this
  }

  public static setMaxListeners<C extends ModelConstructor>(this: C, n: number) {
    this.emitter.setMaxListeners(n)
    return this
  }

  //#endregion

  public static addToStore<C extends ModelConstructor, M extends InstanceType<C> = InstanceType<C>>(
    this: C,
    data: AnyData,
  ): M
  public static addToStore<C extends ModelConstructor, M extends InstanceType<C> = InstanceType<C>>(
    this: C,
    data: AnyData[],
  ): M[]
  public static addToStore<C extends ModelConstructor, M extends InstanceType<C> = InstanceType<C>>(
    this: C,
    data: AnyDataOrArray,
  ): M | M[] {
    return this.store.addToStore(data) as M | M[]
  }
  public static update<C extends ModelConstructor, M extends InstanceType<C> = InstanceType<C>>(
    this: C,
    id: Id,
    data: AnyData,
    params?: Params,
  ) {
    return this.store.update(id, data, params) as Promise<M>
  }

  public static patch<C extends ModelConstructor, M extends InstanceType<C> = InstanceType<C>>(
    this: C,
    id: Id,
    data: AnyData,
    params?: Params,
  ): M
  public static patch<C extends ModelConstructor, M extends InstanceType<C> = InstanceType<C>>(
    this: C,
    id: null,
    data: AnyData,
    params?: Params,
  ): M[]
  public static patch<C extends ModelConstructor, M extends InstanceType<C> = InstanceType<C>>(
    this: C,
    id: NullableId,
    data: AnyData,
    params?: Params,
  ): M | M[] {
    return this.store.patch(id, data, params) as M | M[]
  }

  public static remove<C extends ModelConstructor, M extends InstanceType<C> = InstanceType<C>>(
    this: C,
    id: Id,
    params?: Params,
  ): M
  public static remove<C extends ModelConstructor, M extends InstanceType<C> = InstanceType<C>>(
    this: C,
    id: null,
    params?: Params,
  ): M[]
  public static remove<C extends ModelConstructor, M extends InstanceType<C> = InstanceType<C>>(
    this: C,
    id: NullableId,
    params?: Params,
  ): M | M[] {
    return this.getStore().remove(id, params) as M | M[]
  }
  public static removeFromStore<C extends ModelConstructor>(this: C, data: AnyDataOrArray) {
    return this.store.removeFromStore(data)
  }

  public static getStore<C extends ModelConstructor>(this: C) {
    return this.store
  }

  getModel<M extends BaseModel>(this: M) {
    return this.constructor as ModelConstructor<this>
  }

  getStore<M extends BaseModel>(this: M) {
    return this.getModel().getStore() as STORE
  }

  // get Model() {
  //   return this.constructor as ModelConstructor<this>
  // }

  /**
   * Call `this.init` in a Class's constructor to run `instanceDefaults` and `setupInstance` properly.
   * This allows default values to be specified directly in the Class's interface.
   * @param data
   */
  public init(data: Record<string, any>) {
    // @ts-expect-error setupInstance is not defined
    const { instanceDefaults, setupInstance } = this.getModel()

    // If you call these here, you can use default values in the Model interface.
    if (instanceDefaults) Object.assign(this, instanceDefaults.call(this.getModel(), data), data)
    if (setupInstance) setupInstance.call(this.getModel(), this)
  }

  public getId() {
    return getId(this, this.getModel().idField)
  }
  public getTempId() {
    return getTempId(this, this.getModel().tempIdField)
  }
  public getAnyId() {
    const { tempIdField, idField } = this.getModel()
    return getAnyId(this, tempIdField, idField)
  }

  get __isTemp() {
    const { idField } = this.getModel()
    return getId(this, idField) == null
  }

  get isSavePending() {
    const { idField } = this.getModel()
    const pending = this.getStore().pendingById[getId(this, idField) as Id]
    return pending?.create || pending?.update || pending?.patch || false
  }
  get isCreatePending(): boolean {
    const { idField } = this.getModel()
    return this.getStore().pendingById[getId(this, idField) as Id]?.create || false
  }
  get isPatchPending(): boolean {
    const { idField } = this.getModel()
    return this.getStore().pendingById[getId(this, idField) as Id]?.patch || false
  }
  get isUpdatePending(): boolean {
    const { idField } = this.getModel()
    return this.getStore().pendingById[getId(this, idField) as Id]?.update || false
  }
  get isRemovePending(): boolean {
    const { idField } = this.getModel()
    return this.getStore().pendingById[getId(this, idField) as Id]?.remove || false
  }

  get isPending(): boolean {
    const { idField } = this.getModel()
    const pending = this.getStore().pendingById[getId(this, idField)]
    return pending?.create || pending?.update || pending?.patch || pending?.remove || false
  }

  /**
   * Add the current record to the store
   */
  public addToStore() {
    return this.getStore().addToStore(this)
  }

  /**
   * clone the current record using the `clone` action
   */
  public clone(data?: AnyData, options: CloneOptions = {}): this {
    // @ts-expect-error todo
    return this.getStore().clone(this, data, options)
  }

  /**
   * Update a store instance to match a clone.
   */
  public commit(data?: any): this {
    if (this.__isClone) {
      // @ts-expect-error todo
      return this.getStore().commit(this, data)
    } else {
      throw new Error('You cannot call commit on a non-copy')
    }
  }

  /**
   * Update a clone to match a store instance.
   */
  public reset(data: AnyData = {}): this {
    return this.getStore().reset(this, data) as this
  }

  /**
   * A shortcut to either call create or patch/update
   * @param params
   */
  public save(params?: any) {
    const { idField } = this.getModel()
    const id = getId(this, idField)
    return id != null ? this.patch(params) : this.create(params)
  }

  /**
   * Calls service create with the current instance data
   * @param params
   */
  public async create(params?: any) {
    const { idField } = this.getModel()
    const data: any = Object.assign({}, this)
    if (data[idField] === null) {
      delete data[idField]
    }
    const { __isClone } = this
    const saved = await this.getStore().create(data, params)

    // For non-reactive instances, update the instance with created data.
    Object.assign(this, saved)

    return __isClone ? saved.clone() : saved
  }

  /**
   * Calls service patch with the current instance data
   * @param params
   */
  public async patch<M extends BaseModel>(this: M, params: any = {}) {
    const { idField } = this.getModel()
    const id = getId(this, idField)

    if (id == null) {
      const error = new Error(
        `Missing ${idField} property. You must create the data before you can patch with this data`,
      )
      return Promise.reject(error)
    }
    const { __isClone } = this
    let saved: M

    // Diff clones
    if (__isClone && params.diff != false) {
      const original = this.getModel().getFromStore(id) as any
      const data = diff(original, this, params.diff)
      const rollbackData = fastCopy(original)

      // Do eager updating.
      if (params.commit !== false) this.commit(data)

      // Always include matching values from `params.with`.
      if (params.with) {
        const dataFromWith = pickDiff(this, params.with)
        // If params.with was an object, merge the values into dataFromWith
        if (typeof params.with !== 'string' && !Array.isArray(params.with)) {
          Object.assign(dataFromWith, params.with)
        }
        Object.assign(data, dataFromWith)
      }

      // If diff is empty, return the clone without making a request.
      if (Object.keys(data).length === 0) return this as any

      try {
        saved = await this.getStore().patch(id, data, params)
      } catch (error: any) {
        // If saving fails, reverse the eager update
        this.commit(rollbackData)
      }
    } else {
      saved = await this.getStore().patch(id, this, params)
    }
    // Make sure a clone is returned if a clone was saved.
    return __isClone ? saved.clone() : saved
  }

  /**
   * Calls service update with the current instance data
   * @param params
   */
  public async update(params?: any) {
    const { idField } = this.getModel()
    const id = getId(this, idField)

    if (id == null) {
      const error = new Error(
        `Missing ${idField} property. You must create the data before you can patch with this data`,
      )
      return Promise.reject(error)
    }
    const { __isClone } = this
    const saved = await this.getStore().update(id, this, params)
    return __isClone ? saved.clone() : saved
  }

  /**
   * Calls service remove with the current instance id
   * @param params
   */
  public remove(params?: Params): Promise<this> {
    checkThis(this)
    const { idField, store } = this.getModel()
    const id = getId(this, idField) as Id
    return store.remove(id, params)
  }
  /**
   * Removes the instance from the store
   */
  public removeFromStore(): this {
    return this.getStore().removeFromStore(this)
  }
}

function checkThis(context: any) {
  if (!context) {
    throw new Error(
      `Instance methods must be called with the dot operator. If you are referencing one in an event, use '@click="() => instance.remove()"' so that the correct 'this' context is applied. Using '@click="instance.remove"' will call the remove function with "this" set to 'undefined' because the function is called directly instead of as a method.`,
    )
  }
}
