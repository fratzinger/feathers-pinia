import { createPinia } from 'pinia'
import { BaseModel, useService, defineServiceStore } from '../src/index'
import { api } from './feathers'

const pinia = createPinia()

class Message extends BaseModel {}

const servicePath = 'messages'
const useMessagesService = defineServiceStore('messages', () => useService({ servicePath, Model: Message, app: api }))

const messagesService = useMessagesService(pinia)

const resetStore = () => {
  api.service('messages').store = {}
}

describe('Model Class', () => {
  beforeAll(() => resetStore())
  afterAll(() => resetStore())

  test('records are instances of DynamicBaseModel', async () => {
    const message = await messagesService.create({
      text: 'Quick, what is the number to 911?',
    })
    expect(message.constructor.name).toBe('Message')
  })

  test('Model class is available on the store as a getter', () => {
    expect(messagesService.Model === Message).toBeTruthy()
  })
})
