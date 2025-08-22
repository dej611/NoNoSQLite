import EventEmitter from "node:events";
import { DatabaseSync } from "node:sqlite";
import { Readable } from "node:stream";
import { DATABASE_IS_CLOSED } from "./errors.mjs";
import { getValueForKeys, getValuesForMultipleKeys } from "./get.mjs";
import { findBySelector, getSerializedKeyFromRawKey } from "./keys.mjs";
import { setValueForKeys } from "./set.mjs";
import { prepareDb } from "./statements.mjs";

const IN_MEMORY_DB = ":memory:";
const DB_NAME = "mydb.sqlite";
const DEFAULT_NAMESPACE = "kvlite";

// delay the opening of the database
const database = new DatabaseSync(DB_NAME, { open: false });

/**
 * A key made of either a single string, or a list of a string, number, bigint or boolean values.
 * @typedef {string|(string|number|bigint|boolean)[]} KeyValue
 */

/**
 * @typedef {Object} EntryValue
 * @property {*} value The value for the entry. It is set to `null` if not present.
 * @property {KeyValue} key The key for the entry.
 */

/**
 * @typedef {{start: KeyValue, end: KeyValue}} RangeSelector
 */

/**
 * @typedef {Object} PrefixSelector
 * @property {KeyValue} prefix The prefix for the entry, it can specify a starting or ending given key.
 * @property {KeyValue} start The start of the range for the entry.
 * @property {KeyValue} end The end of the range for the entry.
 */

/**
 * A key selector used to select a range of data.
 * @typedef {PrefixSelector|RangeSelector} KeySelector
 */

class KVLite {
	#closed;

	#statements;
	#keysListener;

	/**
	 * Create a new instance of a Key Value database.
	 * @param {string} namespace - The namespace used for the database. Default: ${DEFAULT_NAMESPACE}
	 */
	constructor(namespace = DEFAULT_NAMESPACE) {
		this.#closed = false;

		// open the connection now
		database.open();

		// prepare the statements for later usage
		this.#statements = prepareDb(database, namespace);

		this.#keysListener = new EventEmitter();
	}

	#assertIsNotClosed() {
		if (this.#closed) {
			throw new Error(DATABASE_IS_CLOSED);
		}
	}

	#watchedKeys = new Set();

	#addKeysToWatcher(manyKeys) {
		for (const keys of manyKeys) {
			const serializedKey = getSerializedKeyFromRawKey(keys);
			this.#watchedKeys.add(serializedKey);
		}
	}

	#removeKeysFromWatcher(manyKeys) {
		for (const keys of manyKeys) {
			const serializedKey = getSerializedKeyFromRawKey(keys);
			this.#watchedKeys.delete(serializedKey);
		}
	}

	#isKeyWatched(keys) {
		const serializedKey = getSerializedKeyFromRawKey(keys);
		return this.#watchedKeys.has(serializedKey);
	}

	/**
	 * Close the connection to the database.
	 * If the connection is already closed, this method does nothing.
	 * @returns {void}
	 */
	close() {
		if (!this.#closed) {
			// do not blow it up if closed already in this case
			database.close();
			this.#closed = true;
			this.#watchedKeys.clear();
		}
	}

	/**
	 * Delete the value associated with the given key.
	 * If there's no value associated with the given key, this method does nothing.
	 * @param {KeyValue} keys - The key to delete
	 * @returns {boolean} True if the key was deleted, false otherwise.
	 */
	delete(keys) {
		this.#assertIsNotClosed();
		const serializedKey = getSerializedKeyFromRawKey(keys);
		const ret = this.#statements.delete(serializedKey);
		return ret.changes > 0;
	}

	/**
	 * Delete all the keys in the database.
	 * @returns {void}
	 */
	flush() {
		this.#assertIsNotClosed();
		this.#statements.flush();
	}

	/**
	 * Retrieve the value associated with the given key.
	 * If no value exists for the given key, the returned entry will have a `null` value.
	 * @param {KeyValue} key - The key used to retrieve
	 * @param {*} options
	 * @returns {EntryValue} The entry associated with the given key.
	 */
	get(key, options) {
		this.#assertIsNotClosed();
		return getValueForKeys(key, options, this.#statements);
	}

	/**
	 * Retrieve the values associated with the given keys.
	 * The returned array will have the same length as the `keys` array and the entries
	 * will be in the same order as the keys.
	 * If no value exists for the given key, the returned entry will have a `null` value.
	 * @param {KeyValue[]} manyKeys - The keys used to retrieve
	 * @param {*} options
	 * @returns {EntryValue[]} The entries associated with the given keys.
	 */
	getMany(manyKeys, options) {
		this.#assertIsNotClosed();
		return getValuesForMultipleKeys(manyKeys, options, this.#statements);
	}

	/**
	 * Retrieve the keys associated with the given selector.
	 * @param {KeySelector} selector - The selector used to retrieve keys.
	 * @param {*} options
	 * @returns {Iterator} An iterator over the keys associated with the given selector
	 */
	keys(selector, options) {
		this.#assertIsNotClosed();
		return findBySelector(selector, options, this.#statements);
	}

	/**
	 * Set the value associated with the given key.
	 * @param {KeyValue} key - The key to set
	 * @param {*} value - The value to associate with the key
	 * @param {*} options
	 * @returns {boolean} True if the key was set, false otherwise.
	 */
	set(key, value, options) {
		this.#assertIsNotClosed();
		const ret = setValueForKeys(key, value, options, this.#statements);
		const serializedKey = getSerializedKeyFromRawKey(key);
		if (ret.ok && this.#isKeyWatched(serializedKey)) {
			console.log("emitting key", serializedKey);
			this.#keysListener.emit(serializedKey, value);
		}
		return ret;
	}

	/**
	 * Watch for changes to the given keys.
	 * @param {KeyValue} keys - The keys to watch
	 * @param {*} options
	 * @returns {ReadableStream} A readable stream that emits changes to the keys.
	 */
	watch(keys, options) {
		this.#assertIsNotClosed();
		this.#addKeysToWatcher(keys);
		const listeners = [];

		const ac = new AbortController();

		const values = new WeakMap();

		for (const key of keys) {
			const listener = (value) => {
				if (values.get(key) !== value) {
					// add the value to the local map
					// it is ok to overwrite if not consumed yet
					values.set(key, value);
				}
			};
			this.#keysListener.on(getSerializedKeyFromRawKey(key), listener);
			listeners.push(listener);
		}

		function* generate() {
			while (true) {
				const entries = [];
				for (const key of keys) {
					const value = values.get(key) ?? null;
					entries.push({ key, value });
					// make sure to clear up the local map once dumped
					values.delete(key);
				}
				// console.log({ entries });
				if (entries.some((entry) => entry.value !== null)) {
					yield entries;
				}
			}
		}

		const readable = Readable.from(generate(), { emitClose: true });
		readable.on("close", () => {
			keys.forEach((key, i) => {
				this.#keysListener.off(getSerializedKeyFromRawKey(key), listeners[i]);
			});
			this.#removeKeysFromWatcher(keys);
			ac.abort();
		});
		return readable;
	}
}

export default KVLite;
