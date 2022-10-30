import type {
  StateTree,
  Store as _Store,
  _ActionsTree,
  _ExtractActionsFromSetupStore,
  _ExtractGettersFromSetupStore,
  _ExtractStateFromSetupStore,
  _StoreWithGetters,
  _StoreWithState,
} from 'pinia'
import type { UnwrapRef } from 'vue-demi'
import { ModelConstructor } from '.'
import { useService } from './use-service'

export type Store2<SS> = Store2Without<
  any,
  _ExtractStateFromSetupStore<SS>,
  _ExtractGettersFromSetupStore<SS>,
  _ExtractActionsFromSetupStore<SS>
>

export type Store2Without<
  Id extends string = string,
  S extends StateTree = {},
  G /* extends GettersTree<S>*/ = {},
  // has the actions without the context (this) for typings
  A /* extends ActionsTree */ = {},
> = _StoreWithState<Id, S, G, A> &
  UnwrapRef<S> &
  _StoreWithGetters<G> &
  // StoreWithActions<A> &
  (_ActionsTree extends A ? {} : A)

export type Store<SS> = _Store<
  any,
  _ExtractStateFromSetupStore<SS>,
  _ExtractGettersFromSetupStore<SS>,
  _ExtractActionsFromSetupStore<SS>
>

export type GenericSS<C extends ModelConstructor = ModelConstructor, M = InstanceType<C>> = ReturnType<
  typeof useService<C, M>
>

export type GenericStore = Store<GenericSS>
