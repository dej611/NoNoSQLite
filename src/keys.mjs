import { KEY_PARTS_SEPARATOR, SERIALIZED_CONSTANTS } from "./constants.mjs";
import {
	KEY_SELECTOR_INVALID,
	KEY_SELECTOR_RANGE_END_NOT_IN_PREFIX,
	KEY_SELECTOR_RANGE_INVALID,
	KEY_SELECTOR_RANGE_START_NOT_IN_PREFIX,
	KEY_SELECTOR_RANGE_START_OVER_END,
	KEYS_EMPTY_STRING,
	KEYS_MAX_BUFFER_SIZE,
	KEYS_MUST_BE_ARRAY,
	KEYS_UNKNOWN_TYPE,
} from "./errors.mjs";
import { getType, isMaxBufferSize, isString, UNKNOWN_TYPE } from "./utils.mjs";

function validateKeys(keys) {
	if (!Array.isArray(keys)) {
		throw new Error(KEYS_MUST_BE_ARRAY);
	}
	if (keys.length < 1) {
		throw new Error(KEYS_ARRAY_EMPTY);
	}
	if (keys.some((key) => isString(key) && key.trim() === "")) {
		throw new Error(KEYS_EMPTY_STRING);
	}
	if (keys.some((key) => getType(key) === UNKNOWN_TYPE)) {
		throw new Error(KEYS_UNKNOWN_TYPE);
	}
	if (isMaxBufferSize(keys)) {
		throw new Error(KEYS_MAX_BUFFER_SIZE);
	}
}

function handleStringKeys(keys) {
	return isString(keys) ? [keys] : keys;
}

export function getSortedKeys(rawKeys) {
	const keys = handleStringKeys(rawKeys);
	validateKeys(keys);
	return keys;
}

export function serializeKeys(keys) {
	return keys
		.map((key) => {
			const type = getType(key);
			if (type === "string") {
				return key;
			}
			if (type === "boolean") {
				return key ? SERIALIZED_CONSTANTS.TRUE : SERIALIZED_CONSTANTS.FALSE;
			}
			if (type === "bigint") {
				return `${key}${SERIALIZED_CONSTANTS.BIGINT_SUFFIX}`;
			}
			if (type === "number") {
				return key;
			}
			return String(key);
		})
		.join(KEY_PARTS_SEPARATOR);
}

// @TODO: memoize this somehow
export function getSerializedKeyFromRawKey(keys) {
	return serializeKeys(getSortedKeys(keys));
}

export function deserializeKeys(serializedKeys) {
	return serializedKeys.split(KEY_PARTS_SEPARATOR).map((part) => {
		if (part === SERIALIZED_CONSTANTS.TRUE) return true;
		if (part === SERIALIZED_CONSTANTS.FALSE) return false;
		if (part.endsWith(SERIALIZED_CONSTANTS.BIGINT_SUFFIX))
			return BigInt(part.slice(0, -1));
		const num = Number(part);
		return isNaN(num) ? part : num;
	});
}

function isGreater(startKey, endKey) {
	const encodedStartKey = getSerializedKeyFromRawKey(startKey);
	const encodedEndKey = getSerializedKeyFromRawKey(endKey);
	return encodedStartKey > encodedEndKey;
}

function isInPrefix(key, prefix) {
	const encodedKey = getSerializedKeyFromRawKey(key);
	const encodedPrefix = getSerializedKeyFromRawKey(prefix);
	return (
		encodedKey.startsWith(encodedPrefix) &&
		encodedKey.length > encodedPrefix.length
	);
}

function validateSelectorKeys(selector) {
	if (!selector || typeof selector !== "object") {
		throw new Error(KEY_SELECTOR_INVALID);
	}
	if (selector.prefix) {
		if (selector.start && selector.end) {
			throw new Error(KEY_SELECTOR_RANGE_INVALID);
		}
		if (selector.start && !isInPrefix(selector.start, selector.prefix)) {
			throw new Error(KEY_SELECTOR_RANGE_START_NOT_IN_PREFIX);
		}
		if (selector.end && !isInPrefix(selector.end, selector.prefix)) {
			throw new Error(KEY_SELECTOR_RANGE_END_NOT_IN_PREFIX);
		}
		validateKeys(selector.prefix);
		return;
	}
	if (!selector.start || !selector.end) {
		throw new Error(KEY_SELECTOR_RANGE_INVALID);
	}
	if (isGreater(selector.start, selector.end)) {
		throw new Error(KEY_SELECTOR_RANGE_START_OVER_END);
	}
}

export function findBySelector(selector, options, db) {
	validateSelectorKeys(selector);
	if (!selector.prefix) {
		return db.range(serializeKeys(selector.start), serializeKeys(selector.end));
	}
	const iterator = db.prefix(serializeKeys(selector.prefix), {
		start: selector.start != null ? serializeKeys(selector.start) : undefined,
		end: selector.end != null ? serializeKeys(selector.end) : undefined,
	});
	return iterator;
}
