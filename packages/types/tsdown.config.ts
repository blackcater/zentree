import { defineConfig } from 'tsdown'

export default defineConfig({
	entry: ['./src/index.ts'],
	format: 'esm',
	outDir: './dist',
	shims: true,
	exports: true,
	dts: true,
	clean: true,
})
