// Key segment type tags. The tag byte is the first byte of every encoded
// segment, so its numeric value fixes the cross-type sort order for
// composite keys under BLOB memcmp comparison: string < number < bigint < boolean.
// 0x00 is intentionally unused as a tag — it is reserved as the "lower than
// any real segment" sentinel used only when computing prefix scan bounds
// (see `prefixBounds` in keys.mjs), and must never collide with a real tag.
export const TAG_STRING = 0x01;
export const TAG_NUMBER = 0x02;
export const TAG_BIGINT = 0x03;
export const TAG_BOOLEAN = 0x04;

// Sentinel appended to compute a prefix scan's inclusive lower bound; never
// part of a stored key. Guaranteed smaller than every real tag above, so
// `prefix + PREFIX_LOW_MARKER` sorts after an exact match on `prefix` alone
// but before any real segment that extends it.
export const PREFIX_LOW_MARKER = "\x00";

// String segment framing. The payload is escaped so that a literal
// occurrence of either byte below is unambiguous, then closed with an
// unescaped STRING_TERMINATOR. Both values are smaller than any unescaped
// pass-through byte (0x02-0xFF), which is what keeps escaped low-value bytes
// sorting correctly relative to unescaped ones — the framing has to be
// order-preserving, not just parseable.
export const STRING_TERMINATOR = "\x00";
export const STRING_ESCAPE = "\x01";

// Arbitrary-precision bigint segments carry a single length byte recording
// the magnitude's byte length, capping magnitudes at 255 bytes (~2040 bits) —
// far beyond any realistic id or timestamp. Larger bigints throw
// ERR_KVSTORE_BIGINT_TOO_LARGE rather than silently truncating or corrupting
// order.
export const MAX_BIGINT_MAGNITUDE_BYTES = 255;

// Fixed internal table name — the `namespace` option was cut from the
// public surface entirely, so there's only ever one table.
export const TABLE_NAME = "kvstore_v1";

// Chunk size for getMany's IN (...) query. Kept comfortably below every
// known SQLITE_MAX_VARIABLE_NUMBER default (999 pre-3.32.0, 32766 from
// 3.32.0 on) so getMany works for arbitrarily large key lists without
// depending on — or crashing past — the runtime's compiled-in limit.
export const MAX_IN_CLAUSE_VARIABLES = 500;
