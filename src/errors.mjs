// Database error messages
export const DATABASE_IS_CLOSED = "Database is closed";
// Keys related error messages
export const KEYS_MUST_BE_ARRAY = "keys must be an array";
export const KEYS_ARRAY_EMPTY = "keys array is empty";
export const KEYS_UNKNOWN_TYPE = "keys array contains unknown types";
export const KEYS_MAX_BUFFER_SIZE = "keys array exceeds maximum buffer size";
export const KEYS_EMPTY_STRING = "keys array contains empty strings";
// Multiple keys error messages
export const MULTIPLE_KEYS_MUST_BE_ARRAY = "Invalid input: manyKeys must be an array"
export const MULTIPLE_KEYS_MUST_BE_HAVE_KEYS = "Invalid input: manyKeys must have at least one key"
// Selector error messages
export const KEY_SELECTOR_INVALID = "Invalid key selector";
export const KEY_SELECTOR_RANGE_START_OVER_END = "Start key is greater than end key";
export const KEY_SELECTOR_RANGE_START_NOT_IN_PREFIX = "Start key is not in the key space defined by prefix";
export const KEY_SELECTOR_RANGE_END_NOT_IN_PREFIX = "End key is not in the key space defined by prefix";
export const KEY_SELECTOR_RANGE_INVALID = "Invalid range selector";