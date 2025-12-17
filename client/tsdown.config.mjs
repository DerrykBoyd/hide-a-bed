import { defineConfig } from 'tsdown'

export default defineConfig([
  {
    entry: 'index.ts',
    outDir: 'dist/esm',
    dts: false,
    format: 'esm'
  },
  {
    entry: 'index.ts',
    outDir: 'dist/cjs',
    dts: false,
    format: 'cjs'
  }
])
