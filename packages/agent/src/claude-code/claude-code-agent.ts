// packages/agent/src/claude-code/claude-code-agent.ts

import { AgentBase } from '../base/agent-base'
import { AgentType } from '@acme-ai/core'
import type { AgentEvent, Message } from '@acme-ai/core'

/**
 * Claude Code Agent 配置
 */
export interface ClaudeCodeAgentConfig {
  id?: string
  name?: string
  workingDirectory?: string
}

/**
 * Claude Code Agent
 * 基于 Claude Code Agent SDK 实现
 */
export class ClaudeCodeAgent extends AgentBase {
  private _config: ClaudeCodeAgentConfig

  constructor(config: ClaudeCodeAgentConfig = {}) {
    const id = config.id || `claude-code-${Date.now()}`
    const name = config.name || 'Claude Code'
    super(id, name, AgentType.ClaudeCode)
    this._config = config
  }

  async sendMessage(content: string): Promise<void> {
    if (!this._started) {
      throw new Error('Agent not started')
    }

    this._emit({
      type: 'message_start',
      message: {
        id: `msg-${Date.now()}`,
        role: 'user',
        content,
        createdAt: new Date(),
      },
    })

    // TODO: 集成 Claude Code Agent SDK
    // 这里需要根据 SDK 的实际 API 实现
    // 示例伪代码：
    // const session = await claudeCode.createSession({
    //   workingDirectory: this._config.workingDirectory,
    // })
    // const response = await session.sendMessage(content)
  }
}
