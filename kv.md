# KV store

> Stability: 1.1 - Active development.

The `node:kvstore` module facilitates working with KV store database.
To access it:

```mjs
import kv from 'node:kvstore';
```

```cjs
const kv = require('node:kvstore');
```

This module is only available under the `node:` scheme.

The following example shows the basic usage of the `node:kvstore` module to open
an in-memory key-value database, write data to the database, and then read the data back.

```mjs
import { opevKv } from 'node:kvstore';
const kv = openKv({ memory: true });

// set few values
kv.set('testing-key', {text: 'Hello'});
kv.set('other-key', {text: 'World'});

// fetch multiple keys
const entries = kv.getMany(['testing-key', 'other-key']);
// Log the entries for the given keys
console.log(entries);
// Prints: [{key: ['testing-key'], value: {text: "Hello"}}, {key: ['other-key], value: {text: "World"}}]

// get the list of keys within the store as iterator
for( const key of kv.keys()){
    // Log the list of keys in the store
    console.log(key);
    // Prints: { key: 'testing-key'}
    // Prints: { key: 'other-key' }
}
```

```cjs
'use strict';
const { opevKv } = require("node:kvstore");
const kv = openKv({ memory: true });

// set few values
kv.set('testing-key', {text: 'Hello'});
kv.set('other-key', {text: 'World'});

// fetch multiple keys
const entries = kv.getMany(['testing-key', 'other-key']);
// Log the entries for the given keys
console.log(entries);
// Prints: [{key: ['testing-key'], value: {text: "Hello"}}, {key: ['other-key], value: {text: "World"}}]

// get the list of keys within the store as iterator
for( const key of kv.keys()){
    // Log the list of keys in the store
    console.log(key);
    // Prints: { key: 'testing-key'}
    // Prints: { key: 'other-key' }
}
```

## Usage

```
node --experimental-kvstore app.js
```

* `--experimental-kvstore` Enables the experimental KV store feature.

The current implementation is backed by the `node:sqlite` module.

## The `KeyValue` type

A key can be either a `string` or an array of either `string`, `boolean`, `number`, `bigint` values.
The `string` notation is just a shorthand for `[string]`.

## `kvstore.openKv([options])`

This method creates a new KV store instance and establish a connection to it.
All APIs exposed by this method are executed synchronously (unless stated otherwise).

```mjs
import { opevKv } from 'node:kvstore';
const kv = openKv({ memory: true });
```
```cjs
'use strict';
const { opevKv } = require("node:kvstore");
const kv = openKv({ memory: true });
```

### `kv.close()`

Close the connection to the database.
If the connection is already closed, this method does nothing.

### `kv.delete(keys)`

Removes from the KV store the entry associated with the provided key.

* `keys` {string|(string|number|bigint|boolean)[]}  The key to delete

Returns a `boolean` result hinting the effective change int he store: `true` if deleted, `false` otherwise.

### `kv.flush()`

Delete all the keys in the database.

### `kv.get(key[, options])`

Retrieve the value associated with the given key.
If no value exists for the given key, the returned entry will have a `null` value.

```mjs
import { opevKv } from 'node:kvstore';
const kv = openKv({ memory: true });

// set few values
kv.set('hello', {text: 'World'});

// Log the entries for the given keys
console.log(kv.get('hello'));
// Prints: {key: ['hello'], value: {text: "World"}}
```
```cjs
const { opevKv } = require("node:kvstore");
const kv = openKv({ memory: true });

// set few values
kv.set('hello', {text: 'World'});

// Log the entries for the given keys
console.log(kv.get('hello'));
// Prints: {key: ['hello'], value: {text: "World"}}
```

### `kv.getMany(keys[, options])`

Retrieve the values associated with the given keys.
The returned array will have the same length as the `keys` array and the entries
will be in the same order as the keys.
If no value exists for the given key, the returned entry will have a `null` value.

* `keys` {KeyValue[]} An array of `key` values to retrieve from the store

### `kv.keys(selector[, options])`

Retrieve the keys associated with the given selector.

* `selector` {{ prefix: KeyValue, start?: KeyValue, end?: KeyValue}|{start: KeyValue, end: KeyValue}}: it can be either a prefix based selector or a range based selector. A prefix selector can have express an offset `start` or `end` value (but not both).

The result is an iterator:

```mjs
import { opevKv } from 'node:kvstore';
const kv = openKv({ memory: true });

kv.set('testing-key', {text: 'Hello'});
kv.set('other-key', {text: 'World'});

// get the list of keys within the store as iterator
for( const key of kv.keys()){
    // Log the list of keys in the store
    console.log(key);
    // Prints: { key: 'testing-key'}
    // Prints: { key: 'other-key' }
}
```
```cjs
const { opevKv } = require("node:kvstore");
const kv = openKv({ memory: true });

kv.set('testing-key', {text: 'Hello'});
kv.set('other-key', {text: 'World'});

// get the list of keys within the store as iterator
for( const key of kv.keys()){
    // Log the list of keys in the store
    console.log(key);
    // Prints: { key: 'testing-key'}
    // Prints: { key: 'other-key' }
}
```

### `kv.set(key, value)`

Set the value associated with the given key.

* `key` {KeyValue} - the key to set
* `value` {*} - Any serializable object to store

Note that additional call to `set` with the same `key` will overwrite the value.

```mjs
import { opevKv } from 'node:kvstore';
const kv = openKv({ memory: true });

kv.set('testing-key', {text: 'Hello'});
...
kv.set('testing-key', {text: 'World'});

// get the value associated with 'testing-key'
console.log(kb.get('testing-key'));
// Prints { key: ['testing-key'], value: {text: 'World'}}
```
```cjs
const { opevKv } = require("node:kvstore");
const kv = openKv({ memory: true });

kv.set('testing-key', {text: 'Hello'});
...
kv.set('testing-key', {text: 'World'});

// get the value associated with 'testing-key'
console.log(kb.get('testing-key'));
// Prints { key: ['testing-key'], value: {text: 'World'}}
```

### `kv.watch(keys)`

Watch for changes to the given keys.
The method returns a `ReadableStream` to listen to changes on the store for the given keys.

* `keys` {KeyValue[]} An array of keys to watch

Note that the returned `entries` will have the same order of the provided `keys` array: for entires whose `key` have no changed the entry `value` will be set to `null`.

```mjs
import { opevKv } from 'node:kvstore';
const kv = openKv({ memory: true });

const stream = kv.watch(['testing-key']);

for await (const entries of stream) {
	doStuff(entries);
}
```
```cjs
const { opevKv } = require("node:kvstore");
const kv = openKv({ memory: true });

const stream = kv.watch(['testing-key']);

for await (const entries of stream) {
	doStuff(entries);
}
```