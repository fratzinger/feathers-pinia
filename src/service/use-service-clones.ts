import { ref, computed, Ref, del, set } from 'vue-demi'
import { copyAssociations, getAnyId, getTempId, hasOwn } from '../utils'
import { CloneOptions, ModelConstructor } from './types'
import fastCopy from 'fast-copy'

export function markAsClone<T>(item: T) {
  Object.defineProperty(item, '__isClone', {
    value: true,
    enumerable: false,
  })
  return item
}

export type UseServiceClonesOptions<C extends ModelConstructor = ModelConstructor, M = InstanceType<C>> = {
  idField: Ref<string>
  tempIdField: Ref<string>
  itemsById: Ref<Record<string, M>>
  tempsById: Ref<Record<string, M>>
  Model: Ref<C>
}

export const useServiceClones = <C extends ModelConstructor = ModelConstructor, M = InstanceType<C>>(
  options: UseServiceClonesOptions<C, M>,
) => {
  const { idField, tempIdField, itemsById, tempsById, Model } = options

  const clonesById = ref({}) as Ref<Record<string | number | symbol, M>>

  const clones = computed(() => {
    return Object.values(clonesById.value)
  })

  const cloneIds = computed(() => {
    return clones.value.map((clone) => (clone[idField.value] ?? clone[tempIdField.value]) as Id)
  })

  function clone(item: M, data = {}, options: CloneOptions = {}): M {
    const tempId = getTempId(item, Model.value.tempIdField)
    const placeToStore = tempId != null ? tempsById.value : itemsById.value
    const id = getAnyId(item, Model.value.tempIdField, Model.value.idField)
    const originalItem = placeToStore[id]
    const existing = clonesById.value[id]

    // Maintain reactivity for existing clones
    if (existing) {
      if (options.useExisting) return existing
      return reset(item, data) as M
    } else {
      // Create the clone with any applicable associations
      const clone = fastCopy(originalItem)
      markAsClone(clone)
      copyAssociations(originalItem, clone, clone.getModel().associations)

      // Copy over any provided data
      Object.assign(clone, data)

      // Store and return the clone
      set(clonesById.value, id, clone)
      return clonesById.value[id] // Must return the item from the store
    }
  }

  function commit(item: M, data = {}) {
    const id = getAnyId(item, Model.value.tempIdField, Model.value.idField)
    if (id != null) {
      const tempId = getTempId(item, Model.value.tempIdField)
      const placeToStore = tempId != null ? tempsById.value : itemsById.value
      const clone = clonesById.value[id]
      const newOriginal = fastCopy(clone)
      Object.assign(newOriginal, data)
      copyAssociations(clone, newOriginal, clone.getModel().associations)

      set(placeToStore, id, newOriginal)

      return placeToStore[id]
    }
  }

  function reset(item: M, data = {}) {
    const tempId = getTempId(item, Model.value.tempIdField)
    const placeToStore = tempId != null ? tempsById.value : itemsById.value
    const id = getAnyId(item, Model.value.tempIdField, Model.value.idField)
    const originalItem = placeToStore[id]
    const existingClone = clonesById.value[id]
    if (!existingClone) return clone(item, data)

    const cloneReset: M = Object.assign(existingClone, originalItem, data)

    // Remove properties that may have been added to the clone but are not in the original
    Object.keys(cloneReset as object).forEach((key) => {
      if (!hasOwn(originalItem as any, key)) {
        del(cloneReset as any, key)
      }
    })
    markAsClone(cloneReset)
    return cloneReset
  }

  return {
    clonesById,
    clones,
    cloneIds,
    clone,
    commit,
    reset,
  }
}
