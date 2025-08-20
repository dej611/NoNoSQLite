import { getSortedKeys, serializeKeys } from './keys.mjs';
import { MULTIPLE_KEYS_MUST_BE_ARRAY, MULTIPLE_KEYS_MUST_BE_HAVE_KEYS } from './errors.mjs';

export function getValueForKeys(keys, options, db){
    const sortedKeys = getSortedKeys(keys);
    const serializedKey = serializeKeys(sortedKeys);
    const val = db.get(serializedKey);
    return { key: keys, value: val?.value ?? null };
}

export function getValuesForMultipleKeys(manyKeys, options, db){
    if(!Array.isArray(manyKeys)){
      throw new Error(MULTIPLE_KEYS_MUST_BE_ARRAY);
    }
    if(manyKeys.length < 1){
      throw new Error(MULTIPLE_KEYS_MUST_BE_HAVE_KEYS);
    }
    const results = [];
    for( const keys of manyKeys){
      results.push(getValueForKeys(keys, options, db));
    }
    return results;
}