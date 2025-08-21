import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { MULTIPLE_KEYS_MUST_BE_HAVE_KEYS, MULTIPLE_KEYS_MUST_BE_ARRAY} from './errors.mjs';
import { getValueForKeys, getValuesForMultipleKeys } from "./get.mjs";
import { MockDB } from './__mocks__/db.mjs';

describe('getValueForKeys', () => {
    let mockDB;
    
    beforeEach(() => {
        mockDB = new MockDB();
    });

    it('should return the value for existing keys', () => {
        // Set up test data - the serialized key format from keys.mjs
        const testValue = { value: 'test-value' };
        mockDB.upsert('key1', testValue);
        
        const result = getValueForKeys('key1', {}, mockDB);
        
        assert.deepEqual(result, {
            key: 'key1',
            value: 'test-value'
        });
    });

    it('should return null for non-existing keys', () => {
        const result = getValueForKeys(['non-existent-key'], {}, mockDB);
        
        assert.deepEqual(result, {
            key: ['non-existent-key'],
            value: null
        });
    });

    it('should handle multiple keys', () => {
        const testValue = { value: 'multi-key-value' };
        mockDB.upsert('key2 key1', testValue);
        
        const result = getValueForKeys(['key2', 'key1'], {}, mockDB);
        
        assert.deepEqual(result, {
            key: ['key2', 'key1'],
            value:  'multi-key-value'
        });
    });

    it('should handle numeric keys', () => {
        const testValue = { value: 'numeric-value' };
        mockDB.upsert('2', testValue);
        
        const result = getValueForKeys([2], {}, mockDB);

        assert.deepEqual(result, {
            key: [2],
            value:  'numeric-value'
        });
    });

    it('should handle boolean keys', () => {
        const testValue = { value: 'boolean-value' };
        mockDB.upsert('_true_', testValue);
        
        const result = getValueForKeys([true], {}, mockDB);
        
        assert.deepEqual(result, {
            key: [true],
            value:  'boolean-value'
        });
    });

    it('should handle string keys', () => {
        const testValue = { value: 'string-value' };
        mockDB.upsert('hello world', testValue);
        
        const result = getValueForKeys(['hello', 'world'], {}, mockDB);
        
        assert.deepEqual(result, {
            key: ['hello', 'world'],
            value:  'string-value'
        });
    });


    it('should work with complex nested key structures', () => {
        // Test with arrays of keys that will be sorted
        mockDB.upsert('_false_ a b', { value: 'nested-value' });

        const result = getValueForKeys([false, 'a', 'b'], {}, mockDB);
        assert.deepEqual(result, {
            key: [false, 'a', 'b'],
            value: 'nested-value'
        });
    });
});

describe('getValuesForMultipleKeys', () => {
    let mockDB;
    
    beforeEach(() => {
        mockDB = new MockDB();
    });

    it('should throw error when manyKeys is not an array', () => {
        assert.throws(
            () => getValuesForMultipleKeys('not-an-array', {}, mockDB),
            { message: MULTIPLE_KEYS_MUST_BE_ARRAY }
        );
        
        assert.throws(
            () => getValuesForMultipleKeys(null, {}, mockDB),
            { message: MULTIPLE_KEYS_MUST_BE_ARRAY }
        );
        
        assert.throws(
            () => getValuesForMultipleKeys(undefined, {}, mockDB),
            { message: MULTIPLE_KEYS_MUST_BE_ARRAY }
        );
        
        assert.throws(
            () => getValuesForMultipleKeys(123, {}, mockDB),
            { message: MULTIPLE_KEYS_MUST_BE_ARRAY }
        );
    });

    it('should throw for empty array as input', () => {
        assert.throws(
            () => getValuesForMultipleKeys([], {}, mockDB),
            { message: MULTIPLE_KEYS_MUST_BE_HAVE_KEYS }
        );
    });

    it('should handle mix of existing and non-existing keys', () => {
        mockDB.upsert('existing', { value: 'exists' });
        
        const result = getValuesForMultipleKeys([
            ['existing'],
            ['non-existing']
        ], {}, mockDB);
        
        assert.equal(result.length, 2);
        assert.deepEqual(result[0], { key: ['existing'], value: 'exists' });
        assert.deepEqual(result[1], { key: ['non-existing'], value: null });
    });

    it('should handle multiple key sets with different key types', () => {
        mockDB.upsert('string', { value: 'string-val' });
        mockDB.upsert('2', { value: 'number-val' });
        mockDB.upsert('2n', { value: 'bigint-val' });
        mockDB.upsert('_true_', { value: 'boolean-val' });
        
        const result = getValuesForMultipleKeys([
            ['string'],
            [2],
            [2n],
            [true]
        ], {}, mockDB);
        
        assert.equal(result.length, 4);
        assert.deepEqual(result[0], { key: ['string'], value: 'string-val' });
        assert.deepEqual(result[1], { key: [2], value: 'number-val' });
        assert.deepEqual(result[2], { key: [2n], value: 'bigint-val' });
        assert.deepEqual(result[3], { key: [true], value: 'boolean-val' });
    });


    it('should handle edge cases with empty values', () => {
        mockDB.upsert('empty', { value: '' });
        mockDB.upsert('zero', { value: 0 });
        mockDB.upsert('false', { value: false });
        
        const results = getValuesForMultipleKeys([
            ['empty'],
            ['zero'],
            ['false']
        ], {}, mockDB);
        
        assert.deepEqual(results[0], { key: ['empty'], value: '' });
        assert.deepEqual(results[1], { key: ['zero'], value: 0 });
        assert.deepEqual(results[2], { key: ['false'], value: false });
    });
});
