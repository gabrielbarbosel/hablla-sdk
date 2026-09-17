import { describe, it, expect } from 'vitest';
import { buildRequestUrl } from './url';

const BASE = { baseUrl: 'https://api.test', workspaceId: 'ws-1' };

describe('buildRequestUrl', () => {
    it('fills a workspace token from the workspace id', () => {
        expect(buildRequestUrl({ ...BASE, rawPath: '/v1/workspaces/{workspace_id}/persons' })).toBe('https://api.test/v1/workspaces/ws-1/persons');
    });

    it('prefers an explicit workspace parameter over the configured id', () => {
        expect(buildRequestUrl({ ...BASE, rawPath: '/v1/workspaces/{workspace_id}', pathParams: { workspace_id: 'other' } })).toBe('https://api.test/v1/workspaces/other');
    });

    it('looks a dotted token up by its last segment', () => {
        expect(buildRequestUrl({ ...BASE, rawPath: '/v1/persons/{person.id}', pathParams: { id: 'p-1' } })).toBe('https://api.test/v1/persons/p-1');
    });

    it('encodes parameter values', () => {
        expect(buildRequestUrl({ ...BASE, rawPath: '/v1/items/{item_id}', pathParams: { item_id: 'a/b c' } })).toBe('https://api.test/v1/items/a%2Fb%20c');
    });

    it('throws naming the token when a parameter is missing', () => {
        expect(() => buildRequestUrl({ ...BASE, rawPath: '/v1/persons/{person_id}' })).toThrow('Missing path parameter: person_id');
    });

    it('serializes the query in the indices format by default', () => {
        expect(buildRequestUrl({ ...BASE, rawPath: '/v1/x', query: { users: ['a', 'b'], limit: 50 } })).toBe('https://api.test/v1/x?users%5B0%5D=a&users%5B1%5D=b&limit=50');
    });

    it('serializes the query as JSON values when asked', () => {
        expect(buildRequestUrl({ ...BASE, rawPath: '/v1/x', query: { filters: { person: 'p-1' } }, queryFormat: 'json' })).toBe('https://api.test/v1/x?filters=%7B%22person%22%3A%22p-1%22%7D');
    });
});
