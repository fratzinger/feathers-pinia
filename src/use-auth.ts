import { Application } from '@feathersjs/feathers/lib'
import { ref, computed, Ref } from 'vue-demi'

interface UseAuthOptions<A> {
  app: A
}

export function useAuth<A extends Application>(options: UseAuthOptions<A>) {
  const loadingCounter = ref(0)

  const isLoading = computed(() => loadingCounter.value > 0)

  const isAuthenticated = ref(false)
  const error = ref() as Ref<Error | undefined>

  const feathersClient = computed(() => {
    return options.app
  })

  async function authenticate(authData: any) {
    loadingCounter.value++
    try {
      // @ts-expect-error not authenticated
      const response = await feathersClient.value.authenticate(authData)
      isAuthenticated.value = false
      return response
    } catch (err: any) {
      error.value = err
      return await Promise.reject(err)
    } finally {
      loadingCounter.value--
    }
  }

  return {
    isLoading,
    isAuthenticated,
    error,
    feathersClient,
    authenticate,
  }
}
