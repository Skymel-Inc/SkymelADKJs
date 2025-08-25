import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import polyfillNode from 'rollup-plugin-polyfill-node';

const globals = {
  'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.21.0/+esm': 'ort',
  'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.3.3/dist/transformers.min.js': 'Transformers'
};

export default {
  input: 'src/index.js',
  output: [
    // IIFE for script tags
    {
      file: 'dist/skymel-adk.js',
      format: 'iife',
      name: 'SkymelADK',
      globals
    },
    {
      file: 'dist/skymel-adk.min.js',
      format: 'iife',
      name: 'SkymelADK',
      plugins: [terser()],
      globals
    },
    // ESM for modern imports
    {
      file: 'dist/skymel-adk.esm.js',
      format: 'es'
    },
    {
      file: 'dist/skymel-adk.esm.min.js',
      format: 'es',
      plugins: [terser()]
    },
    // UMD for universal compatibility
    {
      file: 'dist/skymel-adk.umd.js',
      format: 'umd',
      name: 'SkymelADK',
      globals
    },
    {
      file: 'dist/skymel-adk.umd.min.js',
      format: 'umd',
      name: 'SkymelADK',
      plugins: [terser()],
      globals
    },
    // CommonJS for Node.js
    {
      file: 'dist/skymel-adk.cjs',
      format: 'cjs'
    },
    {
      file: 'dist/skymel-adk.cjs.min.js',
      format: 'cjs',
      plugins: [terser()]
    }
  ],
  plugins: [
    polyfillNode(),
    resolve({
      browser: true,
      preferBuiltins: false
    }),
    commonjs()
  ],
  external: [
    'onnxruntime-web',
    '@huggingface/transformers',
    'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.21.0/+esm',
    'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.3.3/dist/transformers.min.js'
  ]
};