import { describe, it, expect } from 'vitest';
import { buildEnumRegistry, emitEnumsFile, enumNameFor } from './enums';
import type { EnumAlias } from '../overrides/enum-aliases';
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

/** Build a registry with explicit aliases (none by default), so tests only see what they declare. */
function registryOf(spec: OpenApiSpec, aliases: EnumAlias[] = []) {
    return buildEnumRegistry(spec, aliases);
}

const ORIGIN_ALIAS: EnumAlias = { name: 'ServiceOrigin', owners: ['services.type'], values: ['bot', 'queue', 'user'] };

describe('buildEnumRegistry', () => {
    it('names a clean enum after its descriptive owner field', () => {
        const { defs, issues } = registryOf(specWith([{ resource: 'services', field: 'status', values: ['pending', 'in_attendance', 'finished'] }]));
        expect(issues).toEqual([]);
        expect(defs).toHaveLength(1);
        expect(defs[0]!.name).toBe('ServiceStatus');
        expect(defs[0]!.source).toBe('field');
        expect(defs[0]!.values).toEqual(['pending', 'in_attendance', 'finished']);
    });

    it('prefers the descriptive field over a generic one for the same value-set', () => {
        const values = ['prospect', 'engaged', 'active_client'];
        const { defs } = registryOf(specWith([
            { resource: 'organizations', field: 'search', values },
            { resource: 'organizations', field: 'status', values },
        ]));
        expect(defs).toHaveLength(1);
        expect(defs[0]!.name).toBe('OrganizationStatus');
    });

    it('collapses the doubled prefix (events.event_type -> EventType)', () => {
        const { defs } = registryOf(specWith([{ resource: 'events', field: 'event_type', values: ['login', 'logout'] }]));
        expect(defs[0]!.name).toBe('EventType');
    });

    it('excludes sort/pagination and date pseudo-enums', () => {
        const { defs } = registryOf(specWith([
            { resource: 'services', field: 'order', values: ['asc', 'desc'] },
            { resource: 'services', field: 'direction', values: ['asc', 'desc'] },
            { resource: 'services', field: 'field_date', values: ['created_at', 'updated_at'] },
        ]));
        expect(defs).toHaveLength(0);
    });

    it('dedupes repeated values within one enum', () => {
        const { defs } = registryOf(specWith([{ resource: 'connections', field: 'status', values: ['active', 'inactive', 'active'] }]));
        expect(defs[0]!.values).toEqual(['active', 'inactive']);
    });

    it('reports an overloaded field (two value-sets, no alias) as an issue', () => {
        const { defs, issues } = registryOf(specWith([
            { resource: 'widgets', field: 'type', values: ['red', 'green', 'blue'] },
            { resource: 'widgets', field: 'type', values: ['small', 'medium', 'large'] },
        ]));
        expect(defs.every((d) => d.source === 'ambiguous')).toBe(true);
        expect(issues).toHaveLength(2);
    });

    it('resolves a known alias and frees the field for the rest', () => {
        const { defs, issues } = registryOf(specWith([
            { resource: 'services', field: 'type', values: ['user', 'queue', 'bot'] },
            { resource: 'services', field: 'type', values: ['ping', 'pong'] },
        ]), [ORIGIN_ALIAS]);
        const byName = Object.fromEntries(defs.map((d) => [d.name, d]));
        expect(byName['ServiceOrigin']!.source).toBe('alias');
        expect(byName['ServiceType']!.source).toBe('field');
        expect(issues).toEqual([]);
    });

    it('keeps the alias name when the API adds a value to the aliased set', () => {
        const { defs, issues } = registryOf(specWith([
            { resource: 'services', field: 'type', values: ['user', 'queue', 'bot', 'ai_agent'] },
            { resource: 'services', field: 'type', values: ['ping', 'pong'] },
        ]), [ORIGIN_ALIAS]);
        const origin = defs.find((d) => d.name === 'ServiceOrigin');
        expect(origin?.values).toEqual(['user', 'queue', 'bot', 'ai_agent']);
        expect(issues).toEqual([]);
    });

    it('reports an alias whose value was removed instead of renaming the enum silently', () => {
        const { issues } = registryOf(specWith([
            { resource: 'services', field: 'type', values: ['user', 'queue'] },
            { resource: 'services', field: 'type', values: ['ping', 'pong'] },
        ]), [ORIGIN_ALIAS]);
        expect(issues).toContain('enum alias ServiceOrigin matched 0 value-sets (expected exactly 1)');
    });

    it('does not let an alias claim a value-set of an unrelated owner', () => {
        const { defs, issues } = registryOf(specWith([{ resource: 'tasks', field: 'status', values: ['user', 'queue', 'bot'] }]), [ORIGIN_ALIAS]);
        expect(defs[0]!.name).toBe('TaskStatus');
        expect(issues).toEqual(['enum alias ServiceOrigin matched 0 value-sets (expected exactly 1)']);
    });

    it('reports two aliases claiming the same value-set', () => {
        const twin: EnumAlias = { ...ORIGIN_ALIAS, name: 'ServiceSource', values: ['bot', 'user'] };
        const { issues } = registryOf(specWith([{ resource: 'services', field: 'type', values: ['user', 'queue', 'bot'] }]), [ORIGIN_ALIAS, twin]);
        expect(issues).toEqual(['enum aliases ServiceOrigin and ServiceSource claim the same value-set']);
    });

    it('reads enums off array-typed params', () => {
        const { defs } = registryOf(specWith([{ resource: 'services', field: 'statuses', values: ['pending', 'finished'], array: true }]));
        expect(defs[0]!.name).toBe('ServiceStatus');
    });
});

describe('emitEnumsFile', () => {
    it('emits an as-const rows array and a Code union type', () => {
        const out = emitEnumsFile(registryOf(specWith([{ resource: 'services', field: 'status', values: ['pending', 'finished'] }])).defs);
        expect(out).toContain('export const ServiceStatus = [');
        expect(out).toContain("{ code: 'pending' },");
        expect(out).toContain("export type ServiceStatusCode = (typeof ServiceStatus)[number]['code'];");
    });
});

describe('enumNameFor', () => {
    it('resolves the enum name for a raw value array regardless of order', () => {
        const { defs } = registryOf(specWith([{ resource: 'services', field: 'status', values: ['pending', 'in_attendance', 'finished'] }]));
        expect(enumNameFor(defs, ['finished', 'pending', 'in_attendance'])).toBe('ServiceStatus');
        expect(enumNameFor(defs, ['nope'])).toBeUndefined();
    });
});
