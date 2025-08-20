// Mock database for testing
export class MockDB {
    constructor() {
        this.data = new Map();
    }
    
    get(serializedKey) {
        return this.data.get(serializedKey);
    }
    
    upsert(serializedKey, value) {
        this.data.set(serializedKey, value);
        return  { changes: 1 };
    }
}