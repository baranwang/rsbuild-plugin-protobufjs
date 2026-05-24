import fs from 'node:fs';
import path from 'node:path';
import type { RsbuildPlugin, Rspack } from '@rsbuild/core';
import { pbjs, pbts } from 'protobufjs-cli';

type PbjsWrap =
  | 'default'
  | 'commonjs'
  | 'amd'
  | 'esm'
  | 'closure'
  | (string & {});

type PackageType = 'commonjs' | 'module';

const runPbjs = async (args: string[]) => {
  return new Promise<string | undefined>((resolve, reject) => {
    pbjs.main(args, (err, code) => {
      if (err) {
        reject(err);
      } else {
        resolve(code);
      }
    });
  });
};

const runPbts = async (args: string[]) => {
  return new Promise<void>((resolve, reject) => {
    pbts.main(args, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

const isModuleTarget = (target: string) => target.endsWith('-module');

const readPackageType = (rootPath: string): PackageType => {
  const packageJsonPath = path.resolve(rootPath, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    return 'commonjs';
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')) as {
    type?: string;
  };

  return packageJson.type === 'module' ? 'module' : 'commonjs';
};

const getOutputExtension = (packageType: PackageType, wrap?: string) => {
  if (wrap === 'esm') {
    return packageType === 'module' ? '.js' : '.mjs';
  }

  if (wrap === 'commonjs' || wrap === 'default') {
    return packageType === 'module' ? '.cjs' : '.js';
  }

  return '.js';
};

const getOutputPath = (
  cachePath: string,
  resourcePath: string,
  extension: string,
) => {
  const baseName = path.basename(resourcePath);
  return path.resolve(cachePath, `${baseName}${extension}`);
};

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
   * The wrapper of the protobufjs module output.
   * Defaults to the current Rsbuild environment output format for module targets.
   */
  wrap?: PbjsWrap;
  /**
   * Whether to generate dts file.
   * @default true
   */
  dts?: boolean;
}

export const protobufjsPlugin = ({
  test = /\.proto$/,
  target = 'static-module',
  wrap,
  dts = true,
}: Options = {}): RsbuildPlugin => {
  return {
    name: 'protobufjs',

    setup(api) {
      const cachePath = path.resolve(api.context.cachePath, 'protobufjs');
      const packageType = readPackageType(api.context.rootPath);
      if (!fs.existsSync(cachePath)) {
        fs.mkdirSync(cachePath, { recursive: true });
      }

      api.transform(
        { test, enforce: 'pre' },
        async ({ resourcePath, environment }) => {
          const outputWrap =
            wrap ?? (environment.config.output.module ? 'esm' : 'commonjs');
          const moduleTarget = isModuleTarget(target);
          const outputExtension = moduleTarget
            ? getOutputExtension(packageType, outputWrap)
            : '.js';
          const outputPath = getOutputPath(
            cachePath,
            resourcePath,
            outputExtension,
          );

          const pbjsArgs = ['--target', target];

          if (moduleTarget) {
            pbjsArgs.push('--wrap', outputWrap);
          }

          pbjsArgs.push('-o', outputPath, resourcePath);

          const code = await runPbjs(pbjsArgs);

          if (dts) {
            await runPbts(['-o', `${resourcePath}.d.ts`, outputPath]);
          }

          return code ?? fs.readFileSync(outputPath, 'utf-8');
        },
      );
    },
  };
};
