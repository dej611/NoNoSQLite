export const UNKNOWN_TYPE = 'unknown';

export function isString(value){
    return typeof value === "string" || value instanceof String;
}

export function isBoolean(value){
    return typeof value === "boolean" || value instanceof Boolean;
}

export function isNumber(value){
    return typeof value === "number" || value instanceof Number;
}

export function isBigInt(value){
    return typeof value === "bigint";
}

export function getType(value){
    if (isString(value)) {
        return "string";
    }
    if (isNumber(value)) {
        return "number";
    }
    if (isBoolean(value)) {
        return "boolean";
    }
    if (isBigInt(value)) {
        return "bigint";
    }
    return UNKNOWN_TYPE;
}

export function mathSorting(a, b){
    return a - b;
}

const MAX_BYTE_LENGTH = 1024;
export function isMaxBufferSize(keys){
  return new Blob(keys).size > MAX_BYTE_LENGTH;
}

export function serializeValue(value){
    return JSON.stringify(value);
}

export function deserializeValue(serializedValue){
    return JSON.parse(serializedValue);
}