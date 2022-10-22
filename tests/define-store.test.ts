import { createPinia } from 'pinia'
import { BaseModel, useService, defineStore } from '../src'
import { api } from './feathers'
import { ref, computed } from 'vue-demi'

const pinia = createPinia()

class User extends BaseModel {}

const makeStore = ({ servicePath }) => {
  const store = useService({
    servicePath,
    Model: User,
    app: api,
    ssr: true,
    idField: 'id',
    whitelist: ['$regex', '$options'],
  })

  const firstName = ref('Bob')
  const lastName = ref('Smith')
  const age = ref(20)

  const fullName = computed(() => `${firstName.value} ${lastName.value}`)

  function greet() {
    return 'Hello from action'
  }

  return {
    ...store,
    firstName,
    lastName,
    age,
    fullName,
    greet,
  }
}

describe('Define User Store', () => {
  const useUsersStore = defineStore('users', () => makeStore({ servicePath: 'users' }))
  const store = useUsersStore(pinia)

  test('can interact with store', async () => {
    expect(store.isSsr).toBe(true)
    expect(store.idField).toBe('id')
    expect(store.tempIdField).toBe('__tempId')
    expect(store.$id).toBe('users')
    expect(store.servicePath).toBe('users')
    expect(store.firstName).toBe('Bob')
    expect(store.fullName).toBe('Bob Smith')
    expect(store.greet()).toBe('Hello from action')
    store.firstName = 'John'
    expect(store.firstName).toBe('John')
    expect(store.fullName).toBe('John Smith')
    expect(store.greet()).toBe('Hello from action')
  })
})
