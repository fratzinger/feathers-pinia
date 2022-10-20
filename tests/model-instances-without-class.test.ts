import { createPinia, defineStore } from 'pinia'
import { useService } from '../src'
import { api } from './feathers'

const pinia = createPinia()

const servicePath = 'messages'
const useMessagesService = defineStore('messages', () => useService({ servicePath }))

const messagesService = useMessagesService(pinia)

const resetStore = () => {
  api.service('messages').store = {}
}

describe('Model Instance Methods', () => {
  beforeAll(() => resetStore())
  afterAll(() => resetStore())

  test('methods are in place even when no class is provided', async () => {
    const message = await messagesService.create({
      text: 'Quick, what is the number to 911?',
    })
    const props = ['save', 'create', 'patch', 'update', 'remove', 'clone', 'commit', 'reset']

    props.forEach((prop) => {
      expect(message).toHaveProperty(prop)
    })
  })
})
