import { createPinia, defineStore } from 'pinia'
import { vi } from 'vitest'
import { api } from './feathers'
import { ref, computed } from 'vue-demi'
import { useAuth } from '../src'

const pinia = createPinia()
const handleResponse = vi.fn()
const handleError = vi.fn()

const useAuthStore = defineStore('my-auth', () => {
  const auth = useAuth({ app: api })

  const test = ref(true)

  const foo = computed(() => 'bar')

  function toggleTest() {
    test.value = false
  }

  async function authenticate(authData: any) {
    try {
      const response = await auth.authenticate(authData)
      handleResponse(response)
      return response
    } catch (err: any) {
      handleError(err)
      return await Promise.reject(err)
    }
  }

  return {
    ...auth,
    test,
    foo,
    toggleTest,
    authenticate,
  }
})

const store = useAuthStore(pinia)

describe('Custom Auth Store functionality', () => {
  beforeEach(() => {
    handleResponse.mockClear()
    handleError.mockClear()
  })
  test('has custom id', async () => {
    expect(store.$id).toBe('my-auth')
  })
  test('receives custom state', async () => {
    expect(store.test).toBeTruthy
  })
  test('receives custom getters', async () => {
    expect(store.foo).toBe('bar')
  })
  test('receives custom actions', async () => {
    expect(store).toHaveProperty('toggleTest')
    store.toggleTest()
    expect(store.test).toBeFalsy
  })
  test('calls handleResponse', async () => {
    await store.authenticate({ strategy: 'jwt' })
    expect(handleResponse).toHaveBeenCalled()
    expect(handleError).not.toHaveBeenCalled()
  })
  test('calls handleError', async () => {
    await store.authenticate({ strategy: 'foo' })
    expect(handleResponse).not.toHaveBeenCalled()
    expect(handleError).toHaveBeenCalled()
  })
})
