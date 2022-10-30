/* eslint-disable @typescript-eslint/no-unused-vars */
import { BaseModel, useService, defineServiceStore } from '../src/index' // from 'feathers-pinia'
import { createPinia } from 'pinia'
import { api } from './feathers'

const pinia = createPinia()

describe('Tracking Constructor Run Counts', () => {
  const resetStore = () => {
    api.service('messages').store = {}
  }
  beforeEach(() => resetStore())

  test('constructor runs once on new Model()', async () => {
    let runCount = 0
    // Setup
    class Message extends BaseModel {
      _id: number
      text = 'foo'
      constructor(data: Partial<Message>, options: Record<string, any> = {}) {
        super(data, options)
        this.init(data)
        runCount++
      }
    }
    const useMessagesService = defineServiceStore('messages', () =>
      useService({ servicePath: 'messages', Model: Message, app: api }),
    )
    const messagesService = useMessagesService(pinia)

    // Test
    const message = new Message({ text: 'Here I am!' })
    expect(runCount).toBe(1)
  })

  test('constructor runs only once when calling new Model().addToStore()', async () => {
    let runCount = 0
    // Setup
    class Message extends BaseModel {
      _id: number
      text = 'foo'
      constructor(data: Partial<Message>, options: Record<string, any> = {}) {
        super(data, options)
        this.init(data)
        runCount++
      }
    }
    const useMessagesService = defineServiceStore('messages', () =>
      useService({ servicePath: 'messages', Model: Message, app: api }),
    )
    const messagesService = useMessagesService(pinia)

    // Test
    const message = new Message({ text: 'Here I am!' }).addToStore()
    expect(runCount).toBe(1)
  })

  test('constructor runs only once when calling new Model().addToStore().save()', async () => {
    let runCount = 0
    // Setup
    class Message extends BaseModel {
      _id: number
      text = 'foo'
      constructor(data: Partial<Message>, options: Record<string, any> = {}) {
        super(data, options)
        this.init(data)
        runCount++
      }
    }
    const useMessagesService = defineServiceStore('messages', () =>
      useService({ servicePath: 'messages', Model: Message, app: api }),
    )
    const messagesService = useMessagesService(pinia)

    // Test
    const message = await new Message({ text: 'Here I am!' }).addToStore().save()
    expect(runCount).toBe(1)
  })

  test('constructor runs only once when calling new Model().addToStore.clone()', async () => {
    let runCount = 0
    // Setup
    class Message extends BaseModel {
      _id: number
      text = 'foo'
      constructor(data: Partial<Message>, options: Record<string, any> = {}) {
        super(data, options)
        this.init(data)
        runCount++
      }
    }
    const useMessagesService = defineServiceStore('messages', () =>
      useService({ servicePath: 'messages', Model: Message, app: api }),
    )
    const messagesService = useMessagesService(pinia)

    // Test
    const message = new Message({ text: 'Here I am!' }).addToStore().clone()
    expect(runCount).toBe(1)
  })

  test('constructor runs only once when calling new Model().addToStore().clone().commit()', async () => {
    let runCount = 0
    // Setup
    class Message extends BaseModel {
      _id: number
      text = 'foo'
      constructor(data: Partial<Message>, options: Record<string, any> = {}) {
        super(data, options)
        this.init(data)
        runCount++
      }
    }
    const useMessagesService = defineServiceStore('messages', () =>
      useService({ servicePath: 'messages', Model: Message, app: api }),
    )
    const messagesService = useMessagesService(pinia)

    // Test
    const message = new Message({ text: 'Here I am!' }).addToStore().clone().commit()
    expect(runCount).toBe(1)
  })
})
