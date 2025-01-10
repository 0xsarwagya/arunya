import { defineConfig } from 'rolldown'
import { minify } from 'rollup-plugin-esbuild'

/**
 * @type {import('rolldown').Config}
 * 
 * @description
 * This is a valid configuration file for RollDown.
 * 
 * @see {@link https://rolldown.rs/guide/getting-started#typescript-config-file}
 */
// @ts-expect-error - This is a valid config (plugin is not correctly defined)
export default defineConfig({
  input: 'tracker/index.js', // The entry point of your application
  output: {
    file: 'public/script.js', // The output file
    format: 'esm', // The output format
    esModule: true, // Use ES modules
  },
  plugins: [
    minify({
      sourceMap: false, // Disable source maps
      minify: true, // Enable minification
      target: 'es2022', // Target ES2022
      minifyIdentifiers: true, // Minify identifiers
      minifySyntax: true, // Minify syntax
      minifyWhitespace: true, // Minify whitespace
      treeShaking: true, // Enable tree shaking
      mangleQuoted: true, // Mangle quoted properties
      drop: ['console' , 'debugger'], // Drop console and debugger statements
      format: 'esm', // Output format (ESM)
      charset: 'ascii', // Output charset (ASCII)
      legalComments: 'none', // Remove all comments
      ignoreAnnotations: true, // Ignore annotations
      platform: 'browser' // Target platform (browser)
    }),
  ],
})