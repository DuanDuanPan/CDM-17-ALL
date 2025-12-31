import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Story 7.5 - plugin migration cleanup', () => {
  it('removes migrated feature modules from kernel source tree', () => {
    const migratedModuleDirs = ['nodes', 'edges', 'approval', 'comments'];

    for (const dir of migratedModuleDirs) {
      const p = path.join(__dirname, 'modules', dir);
      expect(fs.existsSync(p)).toBe(false);
    }
  });

  it('kernel does not import migrated feature modules via relative paths', () => {
    const appModulePath = path.join(__dirname, 'app.module.ts');
    const content = fs.readFileSync(appModulePath, 'utf-8');

    expect(content).not.toMatch(/from ['"]\.\/modules\/(nodes|edges|approval|comments)['"]/);
  });
});
