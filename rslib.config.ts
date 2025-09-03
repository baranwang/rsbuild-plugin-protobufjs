import { defineConfig } from '@rslib/core';
import { protobufjsPlugin } from './src';

export default defineConfig({
  lib: [
    {
      format: 'esm',
      syntax: ['node 18'],
      dts: true,
    },
    {
      format: 'cjs',
      syntax: ['node 18'],
    },
  ],
  plugins: [protobufjsPlugin()],
});
