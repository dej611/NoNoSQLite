import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import KVLite from './kv.mjs';

describe('KV instance', () => {
    describe('integration tests', () => {

        let kv;

        beforeEach(() => {
            kv = new KVLite();
        });

        afterEach(() => {
            kv.flush();
            kv.close();
        });

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

        describe('keys()', () => {

            function testKeyIterator(iterator, nValues, criteria){
                let counter = 0;
                for( const { key } of iterator){
                    assert.ok(criteria(key));
                    counter++;
                }
                assert.strictEqual(counter, nValues);
            }

            it('should retrieve keys by range query - numeric values', () => {
                const entries = [{ key: [1], value: 'value1' }, { key: [2], value: 'value2' }, { key: [3], value: 'value3' }];
                for( const {key, value} of entries){
                    kv.set(key, value);
                }

                const iterator = kv.keys({start: [1], end: [3]});
                testKeyIterator(iterator, 3, key => [1, 2, 3].includes(key[0]));
            });

            it('should retrieve keys by range query - string values', () => {
                const entries = [{ key: ['a'], value: 'value1' }, { key: ['b'], value: 'value2' }, { key: ['c'], value: 'value3' }];
                for( const {key, value} of entries){
                    kv.set(key, value);
                }

                const iterator = kv.keys({start: ['a'], end: ['c']});
                testKeyIterator(iterator, 3, key => ['a', 'b', 'c'].includes(key[0]));
            });

            it('should retrieve keys by range query avoiding partial matching - nested values', () => {
                const entries = [{ key: ['users', 'alice'], value: 'value1' }, { key: ['users', 'bob'], value: 'value2' }];
                for( const {key, value} of entries){
                    kv.set(key, value);
                }

                const iterator = kv.keys({start: ['users', 'a'], end: ['users', 'b']});
                testKeyIterator(iterator, 1, key => key[1] === 'alice');
            });

            it('should retrieve keys by range query - nested values', () => {
                const entries = [{ key: ['users', 'alice'], value: 'value1' }, { key: ['users', 'bob'], value: 'value2' }];
                for( const {key, value} of entries){
                    kv.set(key, value);
                }

                const iterator = kv.keys({start: ['users', 'a'], end: ['users', 'c']});
                testKeyIterator(iterator, 2, key => ['alice', 'bob'].includes(key[1]));
            });
        })

        
    });
});