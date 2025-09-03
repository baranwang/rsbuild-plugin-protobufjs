import fs from 'node:fs';
import path from 'node:path';
import type { RsbuildPlugin, Rspack } from '@rsbuild/core';
import { pbjs, pbts } from 'protobufjs-cli';

interface Options {
  /**
   * The test condition of the protobufjs.
   * @default /\.proto$/
   */
  test?: Rspack.RuleSetCondition;
  /**
   * The target of the protobufjs.
   * @default 'static-module'
   */
  target?: string;
  /**
   * Whether to generate dts file.
   * @default true
   */
  dts?: boolean;
}

export const protobufjsPlugin = ({
  test = /\.proto$/,
  target = 'static-module',
  dts = true,
}: Options = {}): RsbuildPlugin => {
  return {
    name: 'protobufjs',

    setup(api) {
      const cachePath = path.resolve(api.context.cachePath, 'protobufjs');
      if (!fs.existsSync(cachePath)) {
        fs.mkdirSync(cachePath, { recursive: true });
      }

      api.transform({ test, enforce: 'pre' }, async ({ resourcePath }) => {
        const baseName = path.basename(resourcePath);
        const outputPath = path.resolve(cachePath, `${baseName}.js`);

        const code = await new Promise<string | undefined>(
          (resolve, reject) => {
            pbjs.main(
              ['--target', target, '-o', outputPath, resourcePath],
              (err, code) => {
                if (err) {
                  reject(err);
                } else {
                  resolve(code);
                }
              },
            );
          },
        );

        if (dts) {
          pbts.main(['-o', `${resourcePath}.d.ts`, outputPath]);
        }

        return code ?? '';
      });
    },
  };
};
