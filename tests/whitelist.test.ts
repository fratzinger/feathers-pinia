import { createPinia } from 'pinia'
import { useService, defineServiceStore } from '../src'
import { api } from './feathers'

const pinia = createPinia()

describe('whitelist', () => {
  test('adds whitelist to the state', async () => {
    const useMessagesService = defineServiceStore('messages', () =>
      useService({ servicePath: 'messages', whitelist: ['$regex'], app: api }),
    )
    const messagesService = useMessagesService(pinia)

    expect(messagesService.whitelist[0]).toBe('$regex')
  })

  test('find getter fails without whitelist', async () => {
    const useLettersService = defineServiceStore('letters', () =>
      useService({ servicePath: 'letters', whitelist: ['$regex'], app: api }),
    )
    const lettersService = useLettersService(pinia)

    const fn = () => lettersService.findInStore({ query: { $regex: 'test' } })

    expect(fn).toThrowError()
  })

  test('enables custom query params for the find getter', async () => {
    const useMessagesService = defineServiceStore('messages', () =>
      useService({ servicePath: 'messages', whitelist: ['$regex'], app: api }),
    )
    const messagesService = useMessagesService(pinia)

    await messagesService.create({ text: 'test' })
    await messagesService.create({ text: 'yo!' })

    const data = messagesService.findInStore({
      query: {
        text: { $regex: 'test' },
      },
    }).data

    expect(Array.isArray(data)).toBeTruthy()
    expect(data[0].text).toBe('test')
  })

  test('retrieves custom query params ($options) from the service options', async () => {
    const useMessagesService = defineServiceStore('messages', () =>
      useService({ servicePath: 'messages', whitelist: ['$regex'], app: api }),
    )
    const messagesService = useMessagesService(pinia)

    await messagesService.create({ text: 'test' })
    await messagesService.create({ text: 'yo!' })

    const data = messagesService.findInStore({
      query: {
        text: { $regex: 'test', $options: 'igm' },
      },
    }).data

    expect(Array.isArray(data)).toBeTruthy()
  })
})
