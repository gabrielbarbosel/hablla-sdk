import { describe, it, expect } from 'vitest';

import { applyBump, decideBump, prependChangelog, RELEASE_PATHS, withLockVersion } from './release.mjs';

describe('decideBump', () => {
    it.each([
        ['breaking', '0.2.0', 'minor'],
        ['additive', '0.2.0', 'patch'],
        ['changed', '0.2.0', 'patch'],
        ['breaking', '1.4.2', 'major'],
        ['additive', '1.4.2', 'minor'],
        ['changed', '1.4.2', 'patch'],
    ])('%s on %s is a %s bump', (classification, version, bump) => {
        expect(decideBump(classification, version)).toBe(bump);
    });

    it.each(['noop', 'failure'])('refuses to release a %s run', (classification) => {
        expect(() => decideBump(classification, '0.2.0')).toThrow(`classification "${classification}" is not releasable`);
    });
});

describe('applyBump', () => {
    it('takes 0.2.0 to 0.3.0 on a breaking regen and 0.2.1 on a compatible one', () => {
        expect(applyBump('0.2.0', decideBump('breaking', '0.2.0'))).toBe('0.3.0');
        expect(applyBump('0.2.0', decideBump('additive', '0.2.0'))).toBe('0.2.1');
    });

    it('rejects a pre-release version', () => {
        expect(() => applyBump('0.3.0-rc.1', 'patch')).toThrow('unsupported version');
    });
});

describe('withLockVersion', () => {
    it('updates both version fields npm records and nothing else', () => {
        const lock = { name: 'hablla', version: '0.2.0', lockfileVersion: 3, packages: { '': { name: 'hablla', version: '0.2.0' }, 'node_modules/axios': { version: '1.7.0' } } };
        const bumped = withLockVersion(lock, '0.3.0');
        expect(bumped.version).toBe('0.3.0');
        expect(bumped.packages['']).toEqual({ name: 'hablla', version: '0.3.0' });
        expect(bumped.packages['node_modules/axios']).toEqual({ version: '1.7.0' });
        expect(lock.version).toBe('0.2.0');
    });

    it('fails on a lockfile without a root entry', () => {
        expect(() => withLockVersion({ packages: {} }, '0.3.0')).toThrow('no root package entry');
    });
});

describe('prependChangelog', () => {
    it('creates the file with a title', () => {
        expect(prependChangelog(null, '## v0.3.0 (2026-09-16)\n\nBody.\n')).toBe('# Changelog\n\n## v0.3.0 (2026-09-16)\n\nBody.\n');
    });

    it('puts the newest entry first', () => {
        const existing = '# Changelog\n\n## v0.3.0 (2026-09-16)\n\nOld.\n';
        expect(prependChangelog(existing, '## v0.3.1 (2026-09-17)\n\nNew.\n')).toBe('# Changelog\n\n## v0.3.1 (2026-09-17)\n\nNew.\n\n## v0.3.0 (2026-09-16)\n\nOld.\n');
    });
});

describe('RELEASE_PATHS', () => {
    it('ships the derived client and the lockfile with the version', () => {
        expect(RELEASE_PATHS).toEqual(expect.arrayContaining(['src/sdk/client.ts', 'package-lock.json', 'package.json', 'CHANGELOG.md']));
    });
});

