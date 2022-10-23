import { createPinia } from 'pinia'
import { useService, defineServiceStore } from '../src'
import { api } from './feathers'

const pinia = createPinia()

const servicePath = 'messages'
const useMessagesService = defineServiceStore('messages', () => useService({ servicePath, app: api }))

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
