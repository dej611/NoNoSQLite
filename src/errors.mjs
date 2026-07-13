/**
 * Mirrors Node core's own error convention (see `lib/internal/errors.js`):
 * every error this module throws is a plain `Error`/`TypeError`/`RangeError`
 * instance carrying a stable `.code`, never a bespoke exported class. Node
 * core doesn't export per-module error classes to userland — the one
 * exception, `assert.AssertionError`, earns its own class only because it
 * carries extra structured fields (`actual`/`expected`/`operator`) that
 * `.code` can't express. This module's errors are a plain (code, message)
 * shape, so they get the same treatment as fs/http/net/crypto: `.code` is
 * the sole stable, documented discriminator — branch on it, not on
 * `instanceof` or `.message`.
 */
function E(code, Base) {
	class KVStoreError extends Base {
		constructor(message) {
			super(message);
			this.code = code;
		}
	}
	// `err.name`/`.stack` already read "Error"/"TypeError"/"RangeError"
	// correctly via ordinary prototype inheritance from `Base` — no override
	// needed there. This only fixes up `err.constructor.name`, which would
	// otherwise leak the generated class's own name ("KVStoreError") to
	// anything that inspects it directly.
	Object.defineProperty(KVStoreError, "name", { value: Base.name });
	return KVStoreError;
}

/** Thrown by any method called after `close()`. */
export const ERR_KVSTORE_CLOSED = E("ERR_KVSTORE_CLOSED", Error);

/**
 * Thrown when a single key (as opposed to a list of keys) violates type,
 * segment, or byte-limit constraints.
 */
export const ERR_KVSTORE_INVALID_KEY = E("ERR_KVSTORE_INVALID_KEY", TypeError);

/** Thrown when a bigint key segment's magnitude exceeds the encoding limit. */
export const ERR_KVSTORE_BIGINT_TOO_LARGE = E(
	"ERR_KVSTORE_BIGINT_TOO_LARGE",
	RangeError,
);

/** Thrown for `getMany`'s argument-shape errors (the list of keys itself). */
export const ERR_KVSTORE_INVALID_KEYS = E(
	"ERR_KVSTORE_INVALID_KEYS",
	TypeError,
);

/** Thrown for `keys()` and `watch()` selector errors. */
export const ERR_KVSTORE_INVALID_SELECTOR = E(
	"ERR_KVSTORE_INVALID_SELECTOR",
	TypeError,
);

/** Thrown for `publish()` topic-argument errors. */
export const ERR_KVSTORE_INVALID_TOPIC = E(
	"ERR_KVSTORE_INVALID_TOPIC",
	TypeError,
);
