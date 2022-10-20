import { computed } from 'vue-demi'
import { createPinia, defineStore } from 'pinia'
import { api } from './feathers'
import { timeout } from './test-utils'
import { useFindWatched } from '../src/use-find-watched'
import { vi } from 'vitest'
import { BaseModel, useService } from '../src'

describe('Custom Actions', () => {
  test('adds custom actions to the store', async () => {
    const pinia = createPinia()
    const test = vi.fn()
    class Message extends BaseModel {}
    const useMessagesService = defineStore('messages', () => {
      const serviceStore = useService({
        servicePath: 'messages',
        Model: Message,
        app: api,
      })

      return {
        ...serviceStore,
        test,
      }
    })
    const messagesService = useMessagesService(pinia)

    messagesService.test()

    expect(test).toHaveBeenCalled()
  })

  test('supports useFind as a customAction', async () => {
    const pinia = createPinia()
    const useMessagesService: any = defineStore('messages', () => {
      const serviceStore = useService({
        servicePath: 'messages',
        Model: BaseModel,
        app: api,
      })
      function findMessages(params: any) {
        return useFindWatched({ params, model: this })
      }

      return {
        ...serviceStore,
        findMessages,
      }
    })

    const messagesService = useMessagesService(pinia)

    const params = computed(() => ({ query: { text: 'this is a test' }, temps: true }))
    const data = messagesService.findMessages(params)

    expect(data.items.value).toHaveLength(0)

    messagesService.addToStore({ text: 'this is a test' })

    await timeout(100)

    expect(data.items.value).toHaveLength(1)
  })

  test('custom actions are added to the model class', () => {
    const pinia = createPinia()
    class Message extends BaseModel {
      static test: Function
    }
    const useMessagesService = defineStore('messages', () => {
      const serviceStore = useService({
        servicePath: 'messages',
        Model: Message,
        app: api,
      })

      function test() {
        serviceStore.idField.value = 'moose'
      }

      return {
        ...serviceStore,
        test,
      }
    })
    const messagesService = useMessagesService(pinia)

    Message.test()

    expect(messagesService.idField).toBe('moose')
  })
})
