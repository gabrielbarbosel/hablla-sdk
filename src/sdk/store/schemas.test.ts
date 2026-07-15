import { describe, it, expect } from 'vitest';
import { STORE_SCHEMAS, STORE_SCHEMAS_BY_NAME, PERSONS_SCHEMA, FLOWS_EXECUTIONS_SCHEMA } from './schemas';
import { headerFor } from './projection';
import { keepsRaw } from './schema';

describe('store schema catalog', () => {
    it('lists every documented tab exactly once', () => {
        const names = STORE_SCHEMAS.map((s) => s.name);
        expect(names).toEqual([
            'sectors', 'users', 'connections', 'flows', 'tags', 'reasons', 'custom_fields', 'campaigns',
            'persons', 'flows_executions', 'dispatch_runs', 'dispatch_ledger',
        ]);
        expect(new Set(names).size).toBe(names.length);
    });

    it('anonymizes persons and flows_executions (no _raw in the sheet)', () => {
        expect(keepsRaw(PERSONS_SCHEMA)).toBe(false);
        expect(keepsRaw(FLOWS_EXECUTIONS_SCHEMA)).toBe(false);
        expect(headerFor(PERSONS_SCHEMA)).not.toContain('_raw');
        // persons is keyed by the pseudonym, never a phone
        expect(PERSONS_SCHEMA.idField).toBe('personToken');
        expect(headerFor(PERSONS_SCHEMA)).not.toContain('phone');
    });

    it('keeps _raw for our own dispatch tables', () => {
        expect(keepsRaw(STORE_SCHEMAS_BY_NAME.dispatch_runs)).toBe(true);
        expect(keepsRaw(STORE_SCHEMAS_BY_NAME.dispatch_ledger)).toBe(true);
    });

    it('every schema declares an id column among its columns', () => {
        for (const schema of STORE_SCHEMAS) {
            const names = schema.columns.map((c) => (typeof c === 'string' ? c : c.name));
            expect(names, schema.name).toContain(schema.idField);
        }
    });

    it('indexes by name', () => {
        expect(STORE_SCHEMAS_BY_NAME.campaigns.name).toBe('campaigns');
        expect(Object.keys(STORE_SCHEMAS_BY_NAME)).toHaveLength(STORE_SCHEMAS.length);
    });
});
