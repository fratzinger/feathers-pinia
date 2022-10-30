import { Ref } from 'vue-demi'
import { Paginated } from './types'

export type MaybeRef<T> = T | Ref<T>
export type MaybeArray<T> = T | T[]

export type ArrayOrPaginated<T> = T[] | Paginated<T>

export type NonConstructorKeys<T> = { [P in keyof T]: T[P] extends new () => any ? never : P }[keyof T]
export type NonConstructor<T> = Pick<T, NonConstructorKeys<T>>
export type Constructor<T = any, A extends unknown[] = any[]> = new (...arguments_: A) => T
