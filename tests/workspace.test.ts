import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(import.meta.dirname, '..');

describe('Workspace Structure', () => {
  describe('Root package.json', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'));

    it('has correct name', () => {
      expect(pkg.name).toBe('sentinel');
    });

    it('has correct scripts', () => {
      expect(pkg.scripts.build).toBeDefined();
      expect(pkg.scripts.test).toBeDefined();
    });

    it('has correct engine requirements', () => {
      expect(pkg.engines.node).toBe('>=20.0.0');
      expect(pkg.engines.pnpm).toBe('>=9.0.0');
    });
  });

  describe('TypeScript config', () => {
    const config = JSON.parse(readFileSync(join(ROOT, 'tsconfig.json'), 'utf-8'));

    it('has path aliases for packages', () => {
      expect(config.compilerOptions.paths['@sentinel/*']).toBeDefined();
    });
  });

  describe('Package structure', () => {
    const packages = ['api', 'dashboard', 'admin', 'sdk', 'shared'];

    packages.forEach((pkg) => {
      it(`${pkg} package exists and has correct name`, () => {
        const pkgPath = join(ROOT, 'packages', pkg, 'package.json');
        expect(existsSync(pkgPath)).toBe(true);

        const pkgJson = JSON.parse(readFileSync(pkgPath, 'utf-8'));
        expect(pkgJson.name).toBe(`@sentinel/${pkg}`);
      });
    });
  });
});
