import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { parse as parseYaml } from 'yaml';

describe('Monorepo Workspace Configuration', () => {
  const rootDir = process.cwd();
  
  it('has pnpm-workspace.yaml with correct packages', () => {
    const workspaceFile = `${rootDir}/pnpm-workspace.yaml`;
    expect(existsSync(workspaceFile)).toBe(true);
    
    const content = readFileSync(workspaceFile, 'utf-8');
    const config = parseYaml(content);
    
    expect(config.packages).toContain('packages/*');
  });

  it('has root package.json with workspace scripts', () => {
    const pkgFile = `${rootDir}/package.json`;
    expect(existsSync(pkgFile)).toBe(true);
    
    const pkg = JSON.parse(readFileSync(pkgFile, 'utf-8'));
    expect(pkg.name).toBe('fraudshield');
    expect(pkg.private).toBe(true);
    expect(pkg.scripts).toBeDefined();
    expect(pkg.scripts.build).toBeDefined();
    expect(pkg.scripts.test).toBeDefined();
  });

  it('has base tsconfig.json with path aliases', () => {
    const tsconfigFile = `${rootDir}/tsconfig.json`;
    expect(existsSync(tsconfigFile)).toBe(true);
    
    const config = JSON.parse(readFileSync(tsconfigFile, 'utf-8'));
    expect(config.compilerOptions).toBeDefined();
    expect(config.compilerOptions.paths).toBeDefined();
    expect(config.compilerOptions.paths['@fraudshield/*']).toBeDefined();
  });

  const packages = ['shared', 'sdk', 'api', 'dashboard', 'admin'];

  packages.forEach((pkg) => {
    it(`has packages/${pkg}/package.json`, () => {
      const pkgFile = `${rootDir}/packages/${pkg}/package.json`;
      expect(existsSync(pkgFile)).toBe(true);
      
      const pkgJson = JSON.parse(readFileSync(pkgFile, 'utf-8'));
      expect(pkgJson.name).toBe(`@fraudshield/${pkg}`);
    });
  });
});
