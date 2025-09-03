# rsbuild-plugin-protobufjs

[English](README.md) | [中文](README.zh.md)

An Rsbuild plugin that integrates `protobufjs`. It compiles `.proto` files into JavaScript modules that run in browsers or Node.js, and can optionally generate TypeScript declaration files (`.d.ts`).

- **What it does**: Automatically matches and transforms `.proto` files
- **Built-in cache**: Uses Rsbuild `cachePath` and writes intermediates under `protobufjs`
- **Configurable target**: Passes `--target` to `protobufjs-cli` (default `static-module`)
- **Type output**: Generates `.d.ts` by default for better TS DX

## Installation

```bash
pnpm add -D rsbuild-plugin-protobufjs
# or
npm i -D rsbuild-plugin-protobufjs
# or
yarn add -D rsbuild-plugin-protobufjs
```

- **peerDependencies**: `protobufjs` (install it in your project)
- **dependencies**: The plugin uses `protobufjs-cli` internally to run `pbjs`/`pbts`

## Quick Start

Add the plugin in your Rsbuild configuration:

```ts
// rsbuild.config.ts
import { defineConfig } from '@rsbuild/core';
import { protobufjsPlugin } from 'rsbuild-plugin-protobufjs';

export default defineConfig({
  plugins: [
    protobufjsPlugin({
      // optional, see "Options" below
    }),
  ],
});
```

Now import `.proto` files directly in your source code:

```ts
import client from './client.proto';

// With target=static-module (default), the imported object exposes static encode/decode APIs
console.log(client);
```

During build or dev, the plugin will:
- Use `pbjs` to compile `.proto` into a JS module, emitted into Rsbuild's cache directory under `protobufjs`.
- If `dts` is enabled (default true), run `pbts` to emit `client.proto.d.ts` next to the source `.proto` file.

## Options

The plugin exports `protobufjsPlugin(options?: Options)`.

```ts
interface Options {
  /**
   * Files to include. Same as Rspack RuleSetCondition.
   * @default /\.proto$/
   */
  test?: import('@rsbuild/core').Rspack.RuleSetCondition;

  /**
   * Value passed to protobufjs-cli `--target`.
   * Common values: 'static-module' (default), 'json-module', 'proto2', etc.
   * @default 'static-module'
   */
  target?: string;

  /**
   * Whether to generate `.d.ts` for each `.proto`.
   * @default true
   */
  dts?: boolean;
}
```

- **test**: Which files to transform. Defaults to all `.proto` files.
- **target**: Forwarded directly to `pbjs --target`. `static-module` is recommended for most applications.
- **dts**: Whether to call `pbts` to emit a sibling `.d.ts` file next to the source.

## Example

```ts
// rsbuild.config.ts
import { defineConfig } from '@rsbuild/core';
import { protobufjsPlugin } from 'rsbuild-plugin-protobufjs';

export default defineConfig({
  plugins: [
    protobufjsPlugin({
      test: /\.proto$/,           // only process .proto files
      target: 'static-module',     // generate static module
      dts: true,                   // generate type declarations
    }),
  ],
});
```

Project code:

```ts
// src/index.ts
import client from './client.proto';

// Use encode/decode APIs as needed
// Actual exports depend on the chosen target = static-module
console.log(client);
```

The declaration file will be emitted next to the source, e.g., `src/client.proto.d.ts`.

## FAQ

- **Q: Do I need both protobufjs and protobufjs-cli installed?**
  - A: Yes. `protobufjs` is a peer dependency you install in your project; the plugin depends on `protobufjs-cli` for compilation.

- **Q: Where are intermediate outputs written?**
  - A: Under Rsbuild's cache directory, e.g., `node_modules/.cache/rsbuild/<hash>/protobufjs/`. This is an implementation detail; the final code is returned to Rsbuild's pipeline.

- **Q: Can I emit JS without `.d.ts`?**
  - A: Yes. Set `dts: false`.

- **Q: How do I change pbjs output style?**
  - A: Use `target` to pass a value supported by `pbjs --target`, such as `json-module`. Different targets produce different module shapes; see protobufjs-cli documentation.
