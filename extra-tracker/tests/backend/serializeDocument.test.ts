// @vitest-environment node

import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
    serializeDocument,
    serializeDocuments,
} = require('../../server/utils/serializeDocument');

describe('server/utils/serializeDocument', () => {
    it('returns null when input is nullish', () => {
        expect(serializeDocument(null)).toBeNull();
        expect(serializeDocument(undefined)).toBeNull();
    });

    it('serializes mongoose-like documents via toJSON and maps _id to id', () => {
        const doc = {
            toJSON: () => ({
                _id: { toString: () => '507f1f77bcf86cd799439011' },
                title: 'Deck test',
            }),
        };

        const serialized = serializeDocument(doc);
        expect(serialized).toEqual({
            id: '507f1f77bcf86cd799439011',
            title: 'Deck test',
        });
        expect(serialized._id).toBeUndefined();
    });

    it('keeps existing id returned by toJSON', () => {
        const doc = {
            toJSON: () => ({
                id: 'already-set',
                _id: 'mongo-id',
                name: 'Existing ID',
            }),
        };

        const serialized = serializeDocument(doc);
        expect(serialized.id).toBe('already-set');
        expect(serialized._id).toBe('mongo-id');
    });

    it('serializes plain objects and removes sensitive fields', () => {
        const source = {
            _id: 'abc123',
            title: 'Plain',
            user: 'secret-user',
            __v: 42,
        };

        const serialized = serializeDocument(source);
        expect(serialized).toEqual({
            id: 'abc123',
            title: 'Plain',
        });
        expect(source).toEqual({
            _id: 'abc123',
            title: 'Plain',
            user: 'secret-user',
            __v: 42,
        });
    });

    it('serializes parentId and folderId fields when they are scalar-like values', () => {
        const source = {
            _id: 'deck-1',
            parentId: 'parent-42',
            folderId: 'folder-3',
        };

        const serialized = serializeDocument(source);
        expect(serialized.id).toBe('deck-1');
        expect(serialized.parentId).toBe('parent-42');
        expect(serialized.folderId).toBe('folder-3');
    });

    it('returns empty array for non-array input', () => {
        expect(serializeDocuments(null)).toEqual([]);
        expect(serializeDocuments({} as any)).toEqual([]);
    });

    it('serializes arrays of documents', () => {
        const docs = [
            { _id: 'one', front: 'Q1', back: 'A1' },
            { _id: 'two', front: 'Q2', back: 'A2' },
        ];

        const serialized = serializeDocuments(docs);
        expect(serialized).toEqual([
            { id: 'one', front: 'Q1', back: 'A1' },
            { id: 'two', front: 'Q2', back: 'A2' },
        ]);
    });
});

