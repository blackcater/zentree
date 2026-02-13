import { defineConfig } from 'tsdown'

export default defineConfig({
	entry: {
		index: './src/index.ts',
		foundation: './src/foundation/index.ts',
		hooks: './src/hooks/index.ts',
		utils: './src/utils/index.ts',
	},
	format: 'esm',
	outDir: './dist',
	platform: 'browser',
	inputOptions: {
		transform: {
			jsx: 'react-jsx',
		},
	},
	dts: true,
	exports: true,
	clean: true,
})
