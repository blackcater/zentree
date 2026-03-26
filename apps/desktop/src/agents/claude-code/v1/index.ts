import { query } from '@anthropic-ai/claude-agent-sdk'

export function queryClaudeCode(prompt: string) {
	return query({
		prompt,
		options: {
			env: {
				ANTHROPIC_BASE_URL: 'https://api.minimaxi.com/anthropic',
				// ANTHROPIC_AUTH_TOKEN
				ANTHROPIC_API_KEY: '',
			},
			pathToClaudeCodeExecutable: '',
		},
	})
}
