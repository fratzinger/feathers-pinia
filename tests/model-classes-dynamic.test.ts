import { createPinia } from 'pinia'
import { useService, defineServiceStore } from '../src/index'
import { api } from './feathers'

const pinia = createPinia()

const servicePath = 'messages'
const useMessagesService = defineServiceStore('messages', () => useService({ servicePath, app: api }))

const messagesService = useMessagesService(pinia)

const resetStore = () => {
  api.service('messages').store = {}
}
beforeAll(() => resetStore())
afterAll(() => resetStore())

describe('DynamicBaseModel', () => {
  test('records are instances of provided class', async () => {
    const message = await messagesService.create({
      text: 'Quick, what is the number to 911?',
    })
    expect((message.constructor as any).dynamicBaseModel).toBeTruthy()
  })

  test('create local instance', () => {
    messagesService.addToStore({ text: 'this is a test' })
  })
})
