import typescript from '@rollup/plugin-typescript'
import terser from '@rollup/plugin-terser'

const banner = `/**
 * FraudShield SDK v${process.env.npm_package_version || '0.0.1'}
 * (c) ${new Date().getFullYear()} FraudShield
 * @license MIT
 */`

export default [
  // ESM bundle (no sourcemap in dist for production)
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/sdk.esm.js',
      format: 'esm',
      sourcemap: false,
      banner
    },
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false
      })
    ]
  },
  // UMD bundle (for script tags, no sourcemap in dist)
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/sdk.umd.js',
      format: 'umd',
      name: 'FraudShield',
      sourcemap: false,
      banner,
      exports: 'named'
    },
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false
      })
    ]
  },
  // Minified browser bundle (no sourcemap in dist)
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/sdk.min.js',
      format: 'umd',
      name: 'FraudShield',
      sourcemap: false,
      exports: 'named'
    },
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false
      }),
      terser({
        format: {
          comments: false
        },
        mangle: true,
        compress: true
      })
    ]
  }
]
