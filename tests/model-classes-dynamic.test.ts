import { createPinia, defineStore } from 'pinia'
import { models, useService } from '../src/index'
import { api } from './feathers'

const pinia = createPinia()

const servicePath = 'messages'
const useMessagesService = defineStore('messages', useService({ servicePath }))

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

  test('registering a model adds it to the models object', () => {
    expect(models).toHaveProperty('api')
    expect(models.api).toHaveProperty('messages')
  })

  test('create local instance', () => {
    messagesService.addToStore({ text: 'this is a test' })
  })
})
