import { describe, it, expect } from 'vitest';
import { buildEnumRegistry, ambiguousEnums, emitEnumsFile, enumNameFor } from './enums';
import type { OpenApiSpec } from '../extract';

/** Minimal spec builder: one GET op per resource, each param carrying an enum. */
function specWith(params: Array<{ resource: string; field: string; values: string[]; array?: boolean }>): OpenApiSpec {
    const paths: OpenApiSpec['paths'] = {};
    params.forEach((p, i) => {
        const schema = p.array ? { type: 'array', items: { enum: p.values } } : { enum: p.values };
        paths[`/v1/${p.resource}/${i}`] = { get: { tags: [p.resource], parameters: [{ name: p.field, in: 'query', schema }] } };
    });
    return { openapi: '3.0.0', info: {}, paths };
}

describe('buildEnumRegistry', () => {
    it('names a clean enum after its descriptive owner field', () => {
        const defs = buildEnumRegistry(specWith([{ resource: 'services', field: 'status', values: ['pending', 'in_attendance', 'finished'] }]));
        expect(defs).toHaveLength(1);
        expect(defs[0]!.name).toBe('ServiceStatus');
        expect(defs[0]!.source).toBe('field');
        expect(defs[0]!.values).toEqual(['pending', 'in_attendance', 'finished']);
    });

    it('prefers the descriptive field over a generic one for the same value-set', () => {
        const values = ['prospect', 'engaged', 'active_client'];
        const defs = buildEnumRegistry(specWith([
            { resource: 'organizations', field: 'search', values },
            { resource: 'organizations', field: 'status', values },
        ]));
        expect(defs).toHaveLength(1);
        expect(defs[0]!.name).toBe('OrganizationStatus');
    });

    it('collapses the doubled prefix (events.event_type -> EventType)', () => {
        const defs = buildEnumRegistry(specWith([{ resource: 'events', field: 'event_type', values: ['login', 'logout'] }]));
        expect(defs[0]!.name).toBe('EventType');
    });

    it('excludes sort/pagination and date pseudo-enums', () => {
        const defs = buildEnumRegistry(specWith([
            { resource: 'services', field: 'order', values: ['asc', 'desc'] },
            { resource: 'services', field: 'direction', values: ['asc', 'desc'] },
            { resource: 'services', field: 'field_date', values: ['created_at', 'updated_at'] },
        ]));
        expect(defs).toHaveLength(0);
    });

    it('dedupes repeated values within one enum', () => {
        const defs = buildEnumRegistry(specWith([{ resource: 'connections', field: 'status', values: ['active', 'inactive', 'active'] }]));
        expect(defs[0]!.values).toEqual(['active', 'inactive']);
    });

    it('flags an overloaded field (two value-sets, no alias) as ambiguous', () => {
        const defs = buildEnumRegistry(specWith([
            { resource: 'widgets', field: 'type', values: ['red', 'green', 'blue'] },
            { resource: 'widgets', field: 'type', values: ['small', 'medium', 'large'] },
        ]));
        expect(ambiguousEnums(defs)).toHaveLength(2);
        expect(defs.every((d) => d.source === 'ambiguous')).toBe(true);
    });

    it('resolves a known alias by value-set and frees the field for the rest', () => {
        // `bot|queue|user` is aliased to ServiceOrigin; a second value-set on the
        // same field then takes the plain ServiceType name, unflagged.
        const defs = buildEnumRegistry(specWith([
            { resource: 'services', field: 'type', values: ['user', 'queue', 'bot'] },
            { resource: 'services', field: 'type', values: ['ping', 'pong'] },
        ]));
        const byName = Object.fromEntries(defs.map((d) => [d.name, d]));
        expect(byName['ServiceOrigin']!.source).toBe('alias');
        expect(byName['ServiceType']!.source).toBe('field');
        expect(ambiguousEnums(defs)).toHaveLength(0);
    });

    it('reads enums off array-typed params', () => {
        const defs = buildEnumRegistry(specWith([{ resource: 'services', field: 'statuses', values: ['pending', 'finished'], array: true }]));
        expect(defs[0]!.name).toBe('ServiceStatus');
    });
});

describe('emitEnumsFile', () => {
    it('emits an as-const rows array and a Code union type', () => {
        const out = emitEnumsFile(buildEnumRegistry(specWith([{ resource: 'services', field: 'status', values: ['pending', 'finished'] }])));
        expect(out).toContain('export const ServiceStatus = [');
        expect(out).toContain("{ code: 'pending' },");
        expect(out).toContain("export type ServiceStatusCode = (typeof ServiceStatus)[number]['code'];");
    });
});

describe('enumNameFor', () => {
    it('resolves the enum name for a raw value array regardless of order', () => {
        const defs = buildEnumRegistry(specWith([{ resource: 'services', field: 'status', values: ['pending', 'in_attendance', 'finished'] }]));
        expect(enumNameFor(defs, ['finished', 'pending', 'in_attendance'])).toBe('ServiceStatus');
        expect(enumNameFor(defs, ['nope'])).toBeUndefined();
    });
});
