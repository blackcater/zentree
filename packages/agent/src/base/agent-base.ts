// packages/agent/src/base/agent-base.ts

import type { IAgent, AgentEvent, AgentType } from '@acme-ai/core'

/**
 * Agent 事件处理器类型
 */
type AgentEventHandler = (event: AgentEvent) => void

/**
 * Agent 基类，实现通用逻辑
 */
export abstract class AgentBase implements IAgent {
  readonly id: string
  readonly name: string
  readonly type: AgentType

  protected _started = false
  protected _handlers: Set<AgentEventHandler> = new Set()

  constructor(id: string, name: string, type: AgentType) {
    this.id = id
    this.name = name
    this.type = type
  }

  get started(): boolean {
    return this._started
  }

  /**
   * 启动 Agent
   */
  async start(): Promise<void> {
    if (this._started) return
    this._started = true
    this._emit({ type: 'agent_start' })
  }

  /**
   * 停止 Agent
   */
  async stop(): Promise<void> {
    if (!this._started) return
    this._started = false
    this._emit({ type: 'agent_end' })
  }

  /**
   * 发送消息 - 子类实现
   */
  abstract sendMessage(content: string): Promise<void>

  /**
   * 订阅事件
   * @returns 取消订阅函数
   */
  onEvent(handler: AgentEventHandler): () => void {
    this._handlers.add(handler)
    return () => {
      this._handlers.delete(handler)
    }
  }

  /**
   * 发送事件给所有订阅者
   */
  protected _emit(event: AgentEvent): void {
    for (const handler of this._handlers) {
      try {
        handler(event)
      } catch (error) {
        console.error('Error in agent event handler:', error)
      }
    }
  }
}