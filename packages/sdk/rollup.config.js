import typescript from '@rollup/plugin-typescript'
import terser from '@rollup/plugin-terser'

const banner = `/**
 * FraudShield SDK v${process.env.npm_package_version || '0.0.1'}
 * (c) ${new Date().getFullYear()} FraudShield
 * @license MIT
 */`

export default [
  // ESM bundle
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/sdk.esm.js',
      format: 'esm',
      sourcemap: true,
      banner
    },
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false
      })
    ]
  },
  // UMD bundle (for script tags)
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/sdk.umd.js',
      format: 'umd',
      name: 'FraudShield',
      sourcemap: true,
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
  // Minified browser bundle
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/sdk.min.js',
      format: 'umd',
      name: 'FraudShield',
      sourcemap: true,
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
        }
      })
    ]
  }
]
