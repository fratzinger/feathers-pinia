---
outline: deep
---

<script setup>
import BlockQuote from '../components/BlockQuote.vue'
</script>

# What's New in 1.0

Feathers-Pinia 1.0 is a huge update with some great new features.  This page will go over some of the highlights.

[[toc]]

## Huge Performance Boost 🎉

Feathers-Pinia is SO MUCH faster than its predecessor.  You'll see massive benefits from the faster reactive types under the hood of Pinia and Vue 3. But we've gone a step further and fine-tuned and tested Feathers-Pinia to never perform extra work.  Some of the biggest improvements are:

- Full control over adding instances to the store with `new User().addToStore().
- No extra cycles involving `addOrUpdate` happen under the hood.

## Built-In LocalStorage 🎉

The new LocalStorage adapter is so fast that it makes Single Page Apps feel like they're doing Server Side Rendering.

### Compress LocalStorage

We've made a separate, localStorage plugin that uses LZW compression. Compressed storage allows you to save twice as much information in the same amount of space.

## Built-in Patch Diffing 🎉

<BlockQuote label="PRODUCTIVITY TIP">

Don't waste bandwidth! Just send the props that change!

</BlockQuote>

Patch diffing from Feathers-Vuex is now back in Feathers-Pinia with a smarter, faster algorithm that will work for any scenario you can dream up.

Diffing only occurs on `patch` requests and `save` requests that call a `patch`.

```ts
// clone a record
const clone = user.clone()
// make changes
clone.name = 'Feathers is Amazing!'
// save
await clone.save(). // --> Only the changed props go to the server!
```

<BlockQuote label="HOW IT WORKS" type="details">

- By default, all keys are deep-compared between the original record and the clone.
- Once all changes are found, only the top-level keys are sent to the server.

Diffing will work on all databases without data loss. It will be extensible in the future to support databases that allow patching of deeply-nested values in sub-documents or embedded JSON.

</BlockQuote>

### Customize the Diff

You can use the `diff` option to customize which values are compared.  Only props that have changed will be sent to the server.

```ts
// string: diff only this prop
await clone.save({ diff: 'teamId' )

// array: diff only these props
await clone.save({ diff: ['teamId', 'username'] )

// object: merge and diff these props
await clone.save({ diff: {teamId: 1, username: 'foo' } )

// or turn off diffing and send everything
await clone.save({ diff: false })
```

### Always Save Certain Props

If there are certain props that need to always go with the request, use the `with` option:

```ts
// string: always include this prop
await clone.save({ with: 'teamId' )

// array: always include these props
await clone.save({ with: ['teamId', 'username'] )

// object: merge and include these props
await clone.save({ with: {teamId: 1, username: 'foo' } )
```

## Cleaner TypeScript Models 🎉

With TypeScript-based Models, the `intanceDefaults` static Model property can move into the class's TypeScript interface.

<BlockQuote label="IMPORTANT" type="warning">

For values to initialize correctly, you MUST use a custom constructor, as shown below.

</BlockQuote>

Notice that you can access `models` and `store` directly on `this` in `setupInstance`.

```ts
export class Message extends BaseModel {
  _id: number
  text = 'foo'
  userId: null | number
  createdAt: Date | null

  // Values added in `setupInstance` can be added to the interface for type friendliness.
  user?: Partial<User>
  user2?: Partial<User> = { name: 'Larry' }

  constructor(data?: Partial<Message>, options: Record<string, any> = {}) {
    super(data, options)
    this.init(data)
  }

  static setupInstance(message: Partial<Message>) {
    // access to `store` and `models` is from `this`.
    const { store, models } = this
  }
}
```

## Handle Associations 🎉

Two new utilities make it easier to add relationships between records without depending on associations in-memory.  You can setup associations in both directions between models.

### `associateFind`

The `associateFind` utility allows you to define one-to-many relationships on your Model classes.

```ts

export class User extends BaseModel {
  _id: string
  email = ''
  userId: null | number = null
  createdAt: Date | null = null

  // Values added in `setupInstance` can be added to the interface for type friendliness.
  messages?: Array<Partial<User>>

  constructor(data?: Partial<Message>, options: Record<string, any> = {}) {
    super(data, options)
    this.init(data)
  }

  static setupInstance(user: Partial<Message>) {
    // access to `store` and `models` is from `this`.
    const { store, models } = this

    associateFind(user, 'messages', {
      Model: models.api.Message,
      makeParams: (user) => {
        return { query: { id: user._id } }
      },
    })
  }
}
```

### `associateGet`

## Lots of Little Improvments