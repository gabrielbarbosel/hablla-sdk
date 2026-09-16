import { describe, it, expect } from 'vitest';

import type { OpenApiSpec } from '../extract';
import { groupResources } from './emit';

const HISTORY_PATH = '/v1/workspaces/{workspace_id}/reports/alloy-reports/plans/history';
const NEIGHBOUR_PATH = '/v1/workspaces/{workspace_id}/reports/alloy-reports/workspace-users/history';

/** A `reports` spec with the given GET routes and their bundle function names. */
function reportsSpec(routes: Array<[string, string]>): OpenApiSpec {
    const paths: OpenApiSpec['paths'] = {};
    for (const [route, sdkMethod] of routes) paths[route] = { get: { tags: ['reports'], 'x-sdk-method': sdkMethod } };
    return { openapi: '3.0.0', info: {}, paths };
}

/** Method names of the single resource group, keyed by path. */
function namesByPath(spec: OpenApiSpec, published: Map<string, Map<string, string>> = new Map()): Record<string, string> {
    const [group] = groupResources(spec, [], published);
    return Object.fromEntries(group!.methods.map((m) => [m.path, m.name]));
}

describe('groupResources method naming', () => {
    it('renames both colliding methods when nothing is published yet', () => {
        const names = namesByPath(reportsSpec([[HISTORY_PATH, 'getPlanHistory'], [NEIGHBOUR_PATH, 'getUserHistory']]));
        expect(names).toEqual({ [HISTORY_PATH]: 'getPlanHistory', [NEIGHBOUR_PATH]: 'getUserHistory' });
    });

    it('keeps a published name when a new neighbour collides with it', () => {
        const published = new Map([['reports', new Map([[`GET ${HISTORY_PATH}`, 'getHistory']])]]);
        const names = namesByPath(reportsSpec([[HISTORY_PATH, 'getPlanHistory'], [NEIGHBOUR_PATH, 'getUserHistory']]), published);
        expect(names).toEqual({ [HISTORY_PATH]: 'getHistory', [NEIGHBOUR_PATH]: 'getUserHistory' });
    });

    it('ignores names published by another resource for the same route', () => {
        const published = new Map([['root', new Map([[`GET ${HISTORY_PATH}`, 'somethingElse']])]]);
        const names = namesByPath(reportsSpec([[HISTORY_PATH, 'getPlanHistory']]), published);
        expect(names).toEqual({ [HISTORY_PATH]: 'getHistory' });
    });

    it('lets the later of two pinned methods sharing a name yield', () => {
        const published = new Map([['reports', new Map([[`GET ${HISTORY_PATH}`, 'getHistory'], [`GET ${NEIGHBOUR_PATH}`, 'getHistory']])]]);
        const names = namesByPath(reportsSpec([[HISTORY_PATH, 'getPlanHistory'], [NEIGHBOUR_PATH, 'getUserHistory']]), published);
        expect(new Set(Object.values(names)).size).toBe(2);
        expect(names[HISTORY_PATH]).toBe('getHistory');
    });
});
