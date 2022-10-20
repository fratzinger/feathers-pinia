import { createPinia, defineStore } from 'pinia'
import { BaseModel, models, useService } from '../src/index'
import { api } from './feathers'

const pinia = createPinia()

class Message extends BaseModel {}

const servicePath = 'messages'
const useMessagesService = defineStore('messages', () => useService({ servicePath, Model: Message, app: api }))

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

  test('registering a model adds it to the models object', () => {
    expect(models).toHaveProperty('api')
    expect(models.api).toHaveProperty('Message')
  })

  test('Model class is available on the store as a getter', () => {
    expect(messagesService.Model === Message).toBeTruthy()
  })
})
