import { syncWithStorageCompressed } from './storage-sync-compressed'
import { createPinia } from 'pinia'
import { api } from './feathers'
import { resetStores, timeout } from './test-utils'
import { vi } from 'vitest'
import { BaseModel, useService, defineServiceStore } from '../src'

const pinia = createPinia()

class Message extends BaseModel {}
const useMessagesService = defineServiceStore('messages', () =>
  useService({ servicePath: 'messages', Model: Message, app: api }),
)
const messagesService = useMessagesService(pinia)
const localStorageMock: Storage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
}
syncWithStorageCompressed(messagesService, ['tempsById'], localStorageMock)

const reset = () => resetStores(api.service('messages'), messagesService)

describe('Storage Sync', () => {
  beforeEach(() => {
    reset()
  })

  test('writes to storage', async () => {
    const msg = messagesService.addToStore({ test: true })
    const { tempIdField } = messagesService
    await timeout(600)
    expect(localStorageMock.setItem).toHaveBeenCalled()
    const [key, value] = (localStorageMock.setItem as any).mock.calls[0]
    expect(key).toBe('messages')
    expect(value.tempsById[msg[tempIdField]]).toBeTruthy()
  })

  test('reads from storage', async () => {
    messagesService.addToStore({ test: true })
    await timeout(1000)
    expect(localStorageMock.getItem).toHaveBeenCalled()
    const [key, value] = (localStorageMock.getItem as any).mock.calls[0]
    expect(key).toBe('messages')
    expect(value).toBeUndefined()
  })
})
