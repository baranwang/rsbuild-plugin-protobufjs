# rsbuild-plugin-protobufjs

[English](README.md) | [中文](README.zh.md)

一个用于 Rsbuild 的 `protobufjs` 集成插件。它在构建时把 `.proto` 文件编译为可直接在浏览器或 Node.js 中使用的 JavaScript 模块，并可选生成对应的 TypeScript 声明文件（`.d.ts`）。

- **支持**: 自动匹配 `.proto` 文件并转换
- **内置缓存**: 使用 Rsbuild `cachePath` 下的 `protobufjs` 子目录作为中间产物输出
- **可配置目标**: 通过 `protobufjs-cli` 的 `--target` 生成不同风格的模块（默认 `static-module`）
- **类型输出**: 默认生成 `.d.ts` 声明文件，便于 TS 项目直接获得类型提示

## 安装

```bash
pnpm add -D rsbuild-plugin-protobufjs
# 或者
npm i -D rsbuild-plugin-protobufjs
# 或者
yarn add -D rsbuild-plugin-protobufjs
```

- **peerDependencies**: `protobufjs`（由你的项目安装）
- **dependencies**: 插件内部使用 `protobufjs-cli` 调用 `pbjs`/`pbts`

## 快速上手

在你的 Rsbuild 配置中引入插件：

```ts
// rsbuild.config.ts
import { defineConfig } from '@rsbuild/core';
import { protobufjsPlugin } from 'rsbuild-plugin-protobufjs';

export default defineConfig({
  plugins: [
    protobufjsPlugin({
      // 可选项，见下文「配置」
    }),
  ],
});
```

现在在源码中直接导入 `.proto` 文件即可：

```ts
import client from './client.proto';

// 若 target=static-module（默认），导入对象包含静态的编码/解码方法
console.log(client);
```

构建或 dev 时，插件会：
- 使用 `pbjs` 将 `.proto` 转为 JS 模块，写入 Rsbuild 缓存目录的 `protobufjs` 子目录。
- 若启用 `dts`（默认 true），使用 `pbts` 为源 `.proto` 旁生成 `client.proto.d.ts`。

## 配置

插件导出为 `protobufjsPlugin(options?: Options)`。

```ts
interface Options {
  /**
   * 匹配需要处理的文件。对应 Rspack 的 RuleSetCondition。
   * @default /\.proto$/
   */
  test?: import('@rsbuild/core').Rspack.RuleSetCondition;

  /**
   * 传给 protobufjs-cli 的 --target 值。
   * 常见值: 'static-module'（默认）、'json-module'、'proto2' 等。
   * @default 'static-module'
   */
  target?: string;

  /**
   * 是否为每个 .proto 生成 .d.ts 类型声明。
   * @default true
   */
  dts?: boolean;
}
```

- **test**: 控制哪些文件走转换流程，默认匹配所有 `.proto`。
- **target**: 直接传递给 `pbjs --target`。推荐 `static-module`（静态 API，tree-shakable，适合大多数应用）。
- **dts**: 是否调用 `pbts` 输出同名 `.d.ts` 到源文件旁。

## 示例

```ts
// rsbuild.config.ts
import { defineConfig } from '@rsbuild/core';
import { protobufjsPlugin } from 'rsbuild-plugin-protobufjs';

export default defineConfig({
  plugins: [
    protobufjsPlugin({
      test: /\.proto$/,           // 仅处理 .proto
      target: 'static-module',     // 生成静态模块
      dts: true,                   // 生成类型声明
    }),
  ],
});
```

项目代码：

```ts
// src/index.ts
import client from './client.proto';

// 按需使用编解码 API
// 具体导出取决于 target=static-module 的生成结构
console.log(client);
```

生成的类型声明会出现在源文件旁，例如 `src/client.proto.d.ts`。

## 常见问题（FAQ）

- **Q: 需要同时安装 protobufjs 和 protobufjs-cli 吗？**
  - A: 是。`protobufjs` 作为 peer 依赖由你的项目安装；`protobufjs-cli` 用于编译，插件已声明依赖。

- **Q: 生成的中间产物放在哪？**
  - A: 放在 Rsbuild 缓存目录下，例如 `node_modules/.cache/rsbuild/<hash>/protobufjs/`。这是内部实现细节，最终返回的代码由 Rsbuild 交给打包流程处理。

- **Q: 我能只生成 JS，不生成 d.ts 吗？**
  - A: 可以，将 `dts: false` 即可。

- **Q: 更换 pbjs 输出风格？**
  - A: 使用 `target` 传入 `pbjs --target` 支持的值，如 `json-module` 等。不同 target 的导出形态会不同，请参考 protobufjs-cli 官方文档。
