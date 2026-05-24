import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { protobufjsPlugin } from '../dist/index.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesPath = path.resolve(dirname, 'fixtures');

const copyFixture = (name, tempPath) => {
  const sourcePath = path.resolve(fixturesPath, name);
  const resourcePath = path.resolve(tempPath, name);
  fs.copyFileSync(sourcePath, resourcePath);
  return resourcePath;
};

const createTransform = (
  options,
  environmentModule = false,
  packageType = 'module',
) => {
  const tempPath = fs.mkdtempSync(
    path.join(os.tmpdir(), 'rsbuild-protobufjs-'),
  );
  fs.writeFileSync(
    path.resolve(tempPath, 'package.json'),
    JSON.stringify({ type: packageType }),
  );
  let transform;
  const plugin = protobufjsPlugin(options);

  plugin.setup({
    context: {
      cachePath: path.resolve(tempPath, 'cache'),
      rootPath: tempPath,
    },
    transform(_options, callback) {
      transform = callback;
    },
  });

  assert.equal(typeof transform, 'function');

  return {
    tempPath,
    transform(context) {
      return transform({
        environment: { config: { output: { module: environmentModule } } },
        ...context,
      });
    },
  };
};

test('transforms a proto file into JavaScript module code', async () => {
  const { tempPath, transform } = createTransform({ dts: false });
  const resourcePath = copyFixture('client.proto', tempPath);

  const code = await transform({ resourcePath });

  assert.match(code, /demo\.Client/);
  assert.match(code, /function Client/);
  assert.equal(fs.existsSync(`${resourcePath}.d.ts`), false);
});

test('generates TypeScript declarations by default', async () => {
  const { tempPath, transform } = createTransform();
  const resourcePath = copyFixture('client.proto', tempPath);

  await transform({ resourcePath });

  const dts = fs.readFileSync(`${resourcePath}.d.ts`, 'utf-8');
  assert.match(dts, /export namespace demo/);
  assert.match(dts, /interface IClient/);
});

test('uses commonjs wrapper for non-module output environments', async () => {
  const { tempPath, transform } = createTransform({ dts: false });
  const resourcePath = copyFixture('client.proto', tempPath);

  const code = await transform({
    resourcePath,
  });

  assert.match(code, /require\("protobufjs\/minimal"\)/);
  assert.match(code, /module\.exports = \$root/);
  assert.equal(
    fs.existsSync(path.resolve(tempPath, 'cache/protobufjs/client.proto.cjs')),
    true,
  );
});

test('uses esm wrapper for module output environments', async () => {
  const { tempPath, transform } = createTransform({ dts: false }, true);
  const resourcePath = copyFixture('client.proto', tempPath);

  const code = await transform({
    resourcePath,
  });

  assert.match(code, /import \$protobuf from "protobufjs\/minimal\.js"/);
  assert.match(code, /export \{\n {2}\$root as default\n\}/);
  assert.equal(
    fs.existsSync(path.resolve(tempPath, 'cache/protobufjs/client.proto.js')),
    true,
  );
});

test('uses mjs extension for esm wrapper in commonjs packages', async () => {
  const { tempPath, transform } = createTransform(
    { dts: false },
    true,
    'commonjs',
  );
  const resourcePath = copyFixture('client.proto', tempPath);

  await transform({
    resourcePath,
  });

  assert.equal(
    fs.existsSync(path.resolve(tempPath, 'cache/protobufjs/client.proto.mjs')),
    true,
  );
});

test('allows explicit wrap option to override environment output format', async () => {
  const { tempPath, transform } = createTransform({ dts: false, wrap: 'esm' });
  const resourcePath = copyFixture('client.proto', tempPath);

  const code = await transform({
    resourcePath,
    environment: { config: { output: { module: false } } },
  });

  assert.match(code, /import \$protobuf from "protobufjs\/minimal\.js"/);
});

test('surfaces protobuf compilation errors', async () => {
  const { tempPath, transform } = createTransform({ dts: false });
  const resourcePath = copyFixture('invalid.proto', tempPath);

  await assert.rejects(
    () => transform({ resourcePath }),
    /illegal token|invalid/i,
  );
});
