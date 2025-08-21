import { mathSorting, getType, isString, UNKNOWN_TYPE, isMaxBufferSize } from "./utils.mjs";
import { 
    KEYS_MAX_BUFFER_SIZE, 
    KEYS_MUST_BE_ARRAY, 
    KEYS_UNKNOWN_TYPE,
    KEYS_EMPTY_STRING,
    KEY_SELECTOR_INVALID, 
    KEY_SELECTOR_RANGE_START_OVER_END,
    KEY_SELECTOR_RANGE_END_NOT_IN_PREFIX,
    KEY_SELECTOR_RANGE_INVALID
} from './errors.mjs';

function validateKeys(keys){
    if (!Array.isArray(keys)) {
        throw new Error(KEYS_MUST_BE_ARRAY);
    }
    if(keys.length < 1){
        throw new Error(KEYS_ARRAY_EMPTY);
    }
    if(keys.some( key => isString(key) && key.trim() === '')){
        throw new Error(KEYS_EMPTY_STRING);
    }
    if(keys.some(key => getType(key) === UNKNOWN_TYPE)){
        throw new Error(KEYS_UNKNOWN_TYPE);
    }
    if(isMaxBufferSize(keys)){
        throw new Error(KEYS_MAX_BUFFER_SIZE);
    }
}

const typePriority = new Map([
    ["string", 1],
    ["number", 2],
    ["bigint", 3],
    ['boolean', 4]
]);

function sortingByType(v1, v2){
    const type1 = getType(v1);
    const type2 = getType(v2);
    if (type1 !== type2) {
        return typePriority.get(type1) - typePriority.get(type2);
    }
    const fn = sortingCriteria.get(type1);
    if(fn){
      return fn(v1, v2);
    }
    // at this point it must be string
    return v1.localeCompare(v2);
}

const sortingCriteria = new Map([
    ['string', undefined], // default behaviour is lexicographic
    ['number', (a, b) => mathSorting(a, b)], // need to handle some more edge cases
    ['bigint', (a, b) => (a < b ? -1 : a > b ? 1 : 0)],
    ['boolean', mathSorting]
]);

function handleStringKeys(keys){
    return isString(keys) ? [keys] : keys;
}

export function getSortedKeys(rawKeys){
    const keys = handleStringKeys(rawKeys);
    validateKeys(keys);
    // @TODO: sort out this later
    // const firstKeyType = getType(keys[0]);
    // // if all keys are of the same type, sort them based on the type
    // if(keys.every(key => getType(key) === firstKeyType)){
    //     const getSortingCriteria = sortingCriteria.get(firstKeyType);
    //     return keys.toSorted(getSortingCriteria);
    // }
    // return keys.toSorted(sortingByType);
    return keys;
}

const KEY_PARTS_SEPARATOR = ' ';

export function serializeKeys(keys){
    return keys.map( key => {
        const type = getType(key);
        if(type === 'string'){
            return key;
        }
        if(type === 'boolean'){
            return key ? '_true_' : '_false_';
        }
        if(type === 'bigint'){
            return `${key}n`;
        }
        if(type === 'number'){
            return key;
        }
    }).join(KEY_PARTS_SEPARATOR);
}

// @TODO: memoize this somehow
export function getSerializedKeyFromRawKey(keys){
    return serializeKeys(getSortedKeys(keys));
}

export function deserializeKeys(serializedKeys){
    return serializedKeys.split(KEY_PARTS_SEPARATOR).map(part => {
        if(part === '_true_') return true;
        if(part === '_false_') return false;
        if(part.endsWith('n')) return BigInt(part.slice(0, -1));
        const num = Number(part);
        return isNaN(num) ? part : num;
    });
}

function isGreater(startKey, endKey){
    const sortedStartKey = getSortedKeys(startKey);
    const sortedEndKey = getSortedKeys(endKey);
    const encodedStartKey = serializeKeys(sortedStartKey);
    const encodedEndKey = serializeKeys(sortedEndKey);
    return encodedStartKey > encodedEndKey;
}

function isInPrefix(key, prefix){
    const sortedKey = getSortedKeys(key);
    const sortedPrefix = getSortedKeys(prefix);
    const encodedKey = serializeKeys(sortedKey);
    const encodedPrefix = serializeKeys(sortedPrefix);
    return encodedKey.startsWith(encodedPrefix);
}

function validateSelectorKeys(selector){
    if(!selector || typeof selector !== 'object'){
        throw new Error(KEY_SELECTOR_INVALID);
    }
    if(selector.prefix){
        validateKeys(selector.prefix);
        if(selector.start && selector.end){
            throw new Error(KEY_SELECTOR_RANGE_INVALID);
        }
        if(!isInPrefix(selector.start, selector.prefix)){
            throw new Error(KEY_SELECTOR_RANGE_START_NOT_IN_PREFIX);
        }
        if(!isInPrefix(selector.end, selector.prefix)){
            throw new Error(KEY_SELECTOR_RANGE_END_NOT_IN_PREFIX);
        }
    } else {
        if(!selector.start || !selector.end){
            throw new Error(KEY_SELECTOR_RANGE_INVALID);
        }
        if(isGreater(selector.start, selector.end)){
            throw new Error(KEY_SELECTOR_RANGE_START_OVER_END);
        }
    }
}

export function findBySelector(selector, options, db){
    validateSelectorKeys(selector);
    if(!selector.prefix){
        return db.range(serializeKeys(selector.start), serializeKeys(selector.end));
    }
    const iterator = db.prefix(serializeKeys(selector.prefix));
    // @TODO: wrap the iterator to filter out items that are not in the range
    return iterator;
}