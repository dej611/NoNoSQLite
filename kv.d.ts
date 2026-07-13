import type { Readable } from "node:stream";

/** Atomic key segment. */
export type KeySegment = string | number | bigint | boolean;

/**
 * A key is either a single string (shorthand for `[string]`) or an array of
 * primitive segments. Accepted anywhere a key is *passed in* (get/set/delete,
 * selector bounds, watch key/keys/prefix).
 */
export type KeyValue = string | KeySegment[];

/**
 * The shape a key always has when it comes *back out* of the store — the
 * bare-string shorthand is normalized to a single-segment array before
 * anything is returned, so a returned key is never a plain `string`.
 */
export type NormalizedKey = KeySegment[];

export interface EntryValue<T = unknown> {
	key: NormalizedKey;
	/**
	 * `null` when the key is not present. Also `null` when the stored value
	 * genuinely is `null` — the two cases are indistinguishable in 1.0 (a
	 * future `versionstamp` return is tracked for 1.x).
	 */
	value: T | null;
}

export interface RangeSelector {
	start: KeyValue;
	end: KeyValue;
}

export interface PrefixSelector {
	/** An empty array (`[]`) matches every key in the store. */
	prefix: KeyValue;
	start?: KeyValue;
	end?: KeyValue;
}

export type KeySelector = RangeSelector | PrefixSelector;

export interface KVStoreOptions {
	/** On-disk database file. Omit for an ephemeral in-memory store. */
	path?: string;
}

export type KeyEventType = "set" | "delete" | "clear";

export type KeyEvent<T = unknown> =
	| { type: "set"; key: NormalizedKey; value: T }
	| { type: "delete"; key: NormalizedKey }
	| { type: "clear" }
	| { type: "lag"; dropped: number };

export interface WatchKeySelector {
	key: KeyValue;
	events?: KeyEventType[];
}

export interface WatchKeysSelector {
	keys: KeyValue[];
	events?: KeyEventType[];
}

export interface WatchPrefixSelector {
	prefix: KeyValue;
	events?: KeyEventType[];
}

export interface WatchTopicSelector {
	topic: string;
}

export type WatchSelector =
	| WatchKeySelector
	| WatchKeysSelector
	| WatchPrefixSelector
	| WatchTopicSelector;

export interface WatchOptions {
	/**
	 * Per-watcher buffer size. When the buffer is full, intervening events
	 * are dropped and a single `{type:'lag', dropped}` event is delivered
	 * once space frees up. Must be >= 1. Default: 1024.
	 */
	highWaterMark?: number;
}

/**
 * Every error this module throws is a plain `Error`/`TypeError`/`RangeError`
 * instance — never a bespoke exported class — carrying one of these on
 * `.code`. Branch on `.code`, not on `instanceof` or `.message`:
 *
 * | Code | Base | Thrown when |
 * |---|---|---|
 * | `ERR_KVSTORE_CLOSED` | `Error` | Any method called after `close()`. |
 * | `ERR_KVSTORE_INVALID_KEY` | `TypeError` | A key violates type, segment, or byte-limit constraints. |
 * | `ERR_KVSTORE_BIGINT_TOO_LARGE` | `RangeError` | A bigint key segment's magnitude exceeds 255 bytes. |
 * | `ERR_KVSTORE_INVALID_KEYS` | `TypeError` | `getMany`'s argument itself (the list of keys) is malformed. |
 * | `ERR_KVSTORE_INVALID_SELECTOR` | `TypeError` | `keys()` or `watch()` selector/options errors. |
 * | `ERR_KVSTORE_INVALID_TOPIC` | `TypeError` | `publish()`'s topic argument is malformed. |
 */
export type KVStoreErrorCode =
	| "ERR_KVSTORE_CLOSED"
	| "ERR_KVSTORE_INVALID_KEY"
	| "ERR_KVSTORE_BIGINT_TOO_LARGE"
	| "ERR_KVSTORE_INVALID_KEYS"
	| "ERR_KVSTORE_INVALID_SELECTOR"
	| "ERR_KVSTORE_INVALID_TOPIC";

export class KVStore {
	constructor(options?: KVStoreOptions);

	/** Idempotent. */
	close(): void;

	delete(key: KeyValue): boolean;

	/** Delete all the keys in the database. */
	clear(): void;

	get<T = unknown>(key: KeyValue): EntryValue<T>;

	getMany<T = unknown>(keys: KeyValue[]): Array<EntryValue<T>>;

	keys(selector: KeySelector): Iterable<{ key: NormalizedKey }>;

	set(key: KeyValue, value: unknown): void;

	/**
	 * Watch mutations on the store or messages on a custom topic. Returns an
	 * object-mode Readable (also an AsyncIterable) that emits one event per
	 * push.
	 *
	 * Topic streams emit the published payload directly (no envelope). Key/
	 * keys/prefix streams emit `KeyEvent` objects.
	 */
	watch(
		selector: WatchTopicSelector,
		options?: WatchOptions,
	): Readable & AsyncIterable<unknown>;
	watch<T = unknown>(
		selector: WatchKeySelector | WatchKeysSelector | WatchPrefixSelector,
		options?: WatchOptions,
	): Readable & AsyncIterable<KeyEvent<T>>;

	/** Publish a payload on a custom topic. Topics live in their own namespace. */
	publish(topic: string, payload: unknown): void;
}

/**
 * Open a KV store — the documented entry point of the module. `KVStore` is
 * also exported for `instanceof` checks and typing.
 */
export function openKv(options?: KVStoreOptions): KVStore;
