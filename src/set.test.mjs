import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { setValueForKeys } from "./set.mjs";
import { MockDB } from './__mocks__/db.mjs';

describe('setValueForKeys', () => {
    let mockDB;
    
    beforeEach(() => {
        mockDB = new MockDB();
    });

    it('should set the value with the correct serialization', () => {
        const testValue = { value: 'test-value' };
        const result = setValueForKeys('key1', testValue.value, {}, mockDB);

        assert.deepEqual(result, { ok: true });
        assert.deepEqual(mockDB.get('key1'), testValue.value);
    });

    it('should handle multiple keys', () => {
        const testValue = { value: 'multi-key-value' };
        
        const result = setValueForKeys(['key2', 'key1'], testValue.value, {}, mockDB);
        assert.deepEqual(result, { ok: true });
        assert.deepEqual(mockDB.get('key2 key1'), testValue.value);
    });

    it('should handle numeric keys', () => {
        const testValue = { value: 'numeric-value' };
        
        const result = setValueForKeys([2], testValue.value, {}, mockDB);
        assert.deepEqual(result, { ok: true });
        assert.deepEqual(mockDB.get('2'), testValue.value);
    });

    it('should handle boolean keys', () => {
        const testValue = { value: 'boolean-value' };
        
        const result = setValueForKeys([true], testValue.value, {}, mockDB);
        assert.deepEqual(result, { ok: true });
        assert.deepEqual(mockDB.get('_true_'), testValue.value);
    });

    it('should handle string keys', () => {
        const testValue = { value: 'string-value' };

        const result = setValueForKeys(['hello', 'world'], testValue.value, {}, mockDB);

        assert.deepEqual(result, { ok: true });
        assert.deepEqual(mockDB.get('hello world'), testValue.value);
    });


    it('should work with complex nested key structures', () => {
        const testValue = { value: 'nested-value' };

        const result = setValueForKeys([false, 'a', 'b'], testValue.value, {}, mockDB);
        assert.deepEqual(result, { ok: true });
        assert.deepEqual(mockDB.get('_false_ a b'), testValue.value);
    });
});
