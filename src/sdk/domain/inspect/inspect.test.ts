import { describe, it, expect } from 'vitest';
import { EntityInspector } from './inspect';

const inspector = new EntityInspector();

describe('EntityInspector.endpoint', () => {
    it('maps each known type to its exact path and populate', () => {
        expect(inspector.endpoint('person', 'p1')).toBe('/v1/workspaces/{ws}/persons/p1?populate=true');
        expect(inspector.endpoint('connection', 'c1')).toBe('/v1/workspaces/{ws}/connections/c1?populate=credential,sector');
        expect(inspector.endpoint('flow', 'f1')).toBe('/v1/workspaces/{ws}/flows/f1');
        expect(inspector.endpoint('sector', 's1')).toBe('/v1/workspaces/{ws}/sectors/s1?populate=true');
        expect(inspector.endpoint('campaign', 'ca1')).toBe('/v1/workspaces/{ws}/campaigns/ca1?populate=true');
        expect(inspector.endpoint('tag', 't1')).toBe('/v1/workspaces/{ws}/tags/t1');
        expect(inspector.endpoint('template', 'tp1')).toBe('/v1/workspaces/{ws}/templates/tp1');
        expect(inspector.endpoint('credential', 'cr1')).toBe('/v1/workspaces/{ws}/credentials/cr1');
        expect(inspector.endpoint('reason', 'r1')).toBe('/v1/workspaces/{ws}/reasons/r1');
    });

    it('returns empty string for user and unknown types', () => {
        expect(inspector.endpoint('user', 'u1')).toBe('');
        expect(inspector.endpoint('nope' as never, 'x')).toBe('');
    });
});

describe('EntityInspector.clean', () => {
    it('masks secret-bearing keys', () => {
        const out = inspector.clean({ token: 'abc', password: 'p', secret: 's', api_key: 'k', access_token: 'a', refresh_token: 'r' }) as Record<string, unknown>;
        expect(out.token).toBe('••••••');
        expect(out.password).toBe('••••••');
        expect(out.secret).toBe('••••••');
        expect(out.api_key).toBe('••••••');
        expect(out.access_token).toBe('••••••');
        expect(out.refresh_token).toBe('••••••');
    });

    it('drops workspace, underscore/dollar and __v keys', () => {
        const out = inspector.clean({ workspace: 'w', _id: '1', $meta: 'm', __v: 2, name: 'keep' }) as Record<string, unknown>;
        expect(out).toEqual({ name: 'keep' });
    });

    it('caps arrays longer than 40 and truncates depth >= 3', () => {
        const big = Array.from({ length: 50 }, (_, i) => i + 1);
        const out = inspector.clean(big) as unknown[];
        expect(out.length).toBe(40);

        const deep = { a: { b: { c: { d: 1 } } } };
        const cleaned = inspector.clean(deep) as any;
        expect(cleaned.a.b.c).toBe('{…}');

        const deepArr = { a: { b: { c: [1, 2, 3] } } };
        const cleanedArr = inspector.clean(deepArr) as any;
        expect(cleanedArr.a.b.c).toBe('[3 itens]');
    });

    it('removes empty objects and empty/null values', () => {
        const out = inspector.clean({ empty: {}, blank: '', nil: null, keep: 'x' }) as Record<string, unknown>;
        expect(out).toEqual({ keep: 'x' });
    });
});

describe('EntityInspector.displayName', () => {
    it('cascades name > title > phone > id', () => {
        expect(inspector.displayName({ name: 'N', title: 'T', phone: 'P' }, 'id')).toBe('N');
        expect(inspector.displayName({ title: 'T', phone: 'P' }, 'id')).toBe('T');
        expect(inspector.displayName({ phone: 'P' }, 'id')).toBe('P');
        expect(inspector.displayName({}, 'id')).toBe('id');
        expect(inspector.displayName(null, 'id')).toBe('id');
    });
});

describe('EntityInspector.project', () => {
    it('projects a truthy raw into a cleaned entity', () => {
        const r = inspector.project('person', 'p1', { name: 'Alice', token: 'secret', workspace: 'w' });
        expect(r).toEqual({ type: 'person', id: 'p1', name: 'Alice', obj: { name: 'Alice', token: '••••••' } });
        expect(r.error).toBeUndefined();
    });

    it('marks null raw as error', () => {
        const r = inspector.project('template', 'tp1', null);
        expect(r).toEqual({ type: 'template', id: 'tp1', name: 'tp1', obj: {}, error: true });
    });
});

describe('EntityInspector.flattenMember', () => {
    it('maps member + nested user to the PT-BR view', () => {
        const view = inspector.flattenMember({
            role_type: 'admin',
            is_available: true,
            is_online: false,
            service_emails: ['a@b.com'],
            user: { name: 'Bob', email: 'bob@x.com', created_at: '2020' },
        });
        expect(view).toEqual({
            name: 'Bob',
            email: 'bob@x.com',
            papel: 'admin',
            disponivel: true,
            online: false,
            emails_de_atendimento: ['a@b.com'],
            criado_em: '2020',
        });
    });

    it('defaults when nested user is absent', () => {
        const view = inspector.flattenMember({ role_type: 'agent' });
        expect(view.name).toBe('');
        expect(view.email).toBe('');
        expect(view.papel).toBe('agent');
        expect(view.criado_em).toBeUndefined();
    });
});

describe('EntityInspector.findMember', () => {
    const members = [
        { id: 'm1', user: { id: 'u1' } },
        { id: 'm2', user: 'u2' },
        { id: 'u3', user: {} },
    ];

    it('matches by nested user.id', () => {
        expect(inspector.findMember(members, 'u1')).toBe(members[0]);
    });

    it('matches by raw user id', () => {
        expect(inspector.findMember(members, 'u2')).toBe(members[1]);
    });

    it('matches by member id', () => {
        expect(inspector.findMember(members, 'u3')).toBe(members[2]);
    });

    it('returns undefined when not a member', () => {
        expect(inspector.findMember(members, 'zzz')).toBeUndefined();
    });
});
