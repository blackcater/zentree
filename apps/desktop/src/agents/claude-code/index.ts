import { unstable_v2_prompt } from '@anthropic-ai/claude-agent-sdk'

export async function queryClaudeCode(prompt: string) {
	const result = await unstable_v2_prompt(prompt, {
		model: 'MiniMax-M2.7',
		env: {
			ANTHROPIC_BASE_URL: 'https://api.minimaxi.com/anthropic',
			// ANTHROPIC_AUTH_TOKEN
			ANTHROPIC_API_KEY: '',
		},
		pathToClaudeCodeExecutable: '',
	})

	return result.subtype === 'success' ? result.result : ''
}
