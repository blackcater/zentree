// packages/agent/src/codex/codex-agent.ts

import { AgentBase } from '../base/agent-base'
import { AgentType } from '@acme-ai/core'
import type { AgentEvent, Message } from '@acme-ai/core'

/**
 * Codex Agent 配置
 */
export interface CodexAgentConfig {
  id?: string
  name?: string
  model?: string
  workingDirectory?: string
}

/**
 * Codex Agent
 * 基于 OpenAI Agent SDK 实现
 */
export class CodexAgent extends AgentBase {
  private _config: CodexAgentConfig

  constructor(config: CodexAgentConfig = {}) {
    const id = config.id || `codex-${Date.now()}`
    const name = config.name || 'Codex'
    super(id, name, AgentType.Codex)
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

    // TODO: 集成 OpenAI Agent SDK
    // 这里需要根据 SDK 的实际 API 实现
  }
}