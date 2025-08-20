import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import KVLite from './kv.mjs';

describe('KV instance', () => {
    describe('integration tests', () => {

        let kv;

        beforeEach(() => {
            kv = new KVLite();
        })

        afterEach(() => {
            kv.close();
        })
        it('should set and get a value', () => {
            const testKey = [1, 'test', false, 2n];
            const testValue = { foo: 'bar' };

            kv.set(testKey, testValue);

            const result = kv.get(testKey);
            assert.deepEqual(result, { key: testKey, value: testValue });
        });

        it('should get multiple entry at once', () => {
            const testKeys = [
                [1, 'test', false, 2n],
                [2, 'test2', true, 3n]
            ];
            const testValues = [
                { foo: 'bar' },
                { foo: 'baz' }
            ];

            kv.set(testKeys[0], testValues[0]);
            kv.set(testKeys[1], testValues[1]);

            const results = kv.getMany(testKeys);
            assert.deepEqual(results, [
                { key: testKeys[0], value: testValues[0] },
                { key: testKeys[1], value: testValues[1] }
            ]);
        });

        it('should delete a entry by the provided key', () => {
            const testKey = [1, 'test', false, 2n];
            const testValue = { foo: 'bar' };

            kv.set(testKey, testValue);

            assert.deepEqual(kv.get(testKey), { key: testKey, value: testValue });

            kv.delete(testKey);

            assert.deepEqual(kv.get(testKey), { key: testKey, value: null });
        });
    });
});