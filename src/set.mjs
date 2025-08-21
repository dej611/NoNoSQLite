import { getSortedKeys, serializeKeys } from "./keys.mjs";

export function setValueForKeys(keys, value, options, db) {
	const sortedKeys = getSortedKeys(keys);
	const serializedKeys = serializeKeys(sortedKeys);
	const ret = db.upsert(serializedKeys, value);
	return { ok: ret.changes === 1 };
}
