/* eslint-disable @typescript-eslint/no-unused-vars */
import { BaseModel, useService, type BaseModelModifierOptions } from '../src/index' // from 'feathers-pinia'
import { createPinia, defineStore } from 'pinia'
import { api } from './feathers'

const pinia = createPinia()

export class Message extends BaseModel {
  text1 = 'Class Defaults'
  text2 = 'Class Defaults'
  setupInstanceValue = false

  constructor(data: Partial<Message>, options: Record<string, any> = {}) {
    super(data, options)
    this.init(data)
  }

  static setupInstance(data: Partial<Message>) {
    const { models, store } = this
    data.setupInstanceValue = true
  }
}

const useMessagesService = defineStore('messages', () =>
  useService({ servicePath: 'messages', Model: Message, app: api }),
)
const messagesService = useMessagesService(pinia)

const resetStore = () => {
  api.service('messages').store = {}
}
beforeAll(() => resetStore())
afterAll(() => resetStore())

describe('Model Classes Custom Constructor', () => {
  //
  test('passed in values overwrite defaults', async () => {
    const message = new Message({ text1: 'Provided Text' })
    expect(message.text1).toBe('Provided Text')
  })

  test('setupInstance overwrites model class defaults', async () => {
    const message = new Message({})
    expect(message.setupInstanceValue).toBe(true)
  })

  test('class defaults work when there is no matching instanceDefault or provided value', async () => {
    const message = new Message({})
    expect(message.text2).toBe('Class Defaults')
  })
})
