import { resolve } from 'node:path'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { codeInspectorPlugin } from 'code-inspector-plugin'
import dotenv from 'dotenv'
import { defineConfig } from 'electron-vite'
import tsconfigPathsPlugin from 'vite-tsconfig-paths'

// Load environment variables from root .env file
dotenv.config({
	path: resolve(__dirname, '../../.env'),
	override: true,
	quiet: true,
})

// Check environment variables
const env = (await import('./src/main/env.main')).env
const isDev = env.NODE_ENV === 'development'

console.log(import.meta.dirname)

// Plugin configs
const tsconfigPaths = tsconfigPathsPlugin({ root: import.meta.dirname })
const codeInspector = codeInspectorPlugin({ bundler: 'vite', editor: 'code' })

export default defineConfig({
	main: {
		plugins: [tsconfigPaths],
		define: {},
		// resolve: {
		// 	alias: {
		// 		'@xxx/yyy': '@xxx/yyy/a/b/c/index.ts',
		// 	},
		// },
		build: {
			sourcemap: isDev,
			outDir: resolve('./out/main'),
			rollupOptions: {
				input: {
					index: resolve('./src/main/index.ts'),
				},
			},
		},
	},

	preload: {
		plugins: [tsconfigPaths],
		define: {},
		build: {
			sourcemap: isDev,
			outDir: resolve('./out/preload'),
			rollupOptions: {
				input: {
					index: resolve('./src/preload/index.ts'),
				},
			},
			externalizeDeps: {
				exclude: ['@electron-toolkit/preload'],
			},
		},
	},

	renderer: {
		plugins: [tsconfigPaths, codeInspector, tailwindcss(), react()],
		define: {},
		publicDir: resolve('./src/renderer/public'),
		build: {
			sourcemap: isDev,
			outDir: resolve('./out/renderer'),
			rollupOptions: {
				input: {
					index: resolve('./src/renderer/index.html'),
				},
			},
		},
		worker: { format: 'es' },
		server: {
			port: env.PORT,
			strictPort: true, // throw error if port is already in use
			open: false,
		},
	},
})
