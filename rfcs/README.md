# Acme RFCs

> 请求评论 (Request for Comments) 文档库

## 简介

本目录包含 Acme 项目的 RFC 文档，用于记录架构决策和设计讨论。

## 核心概念

- **Vault**: 工作空间，类似 Obsidian 的概念
- **Thread**: 会话，名字来源于 Codex
- **@acme/runtime**: Runtime Server，提供 WebSocket 和 REST API
- **@acme/acp**: Agent Client Protocol 支持

## 什么是 RFC?

RFC (Request for Comments) 是一种用于记录软件设计和架构决策的文档格式。在 Acme 项目中，我们使用 RFC 来：

- 记录重要的技术决策
- 促进团队讨论和审查
- 追踪架构演变历史
- 帮助新成员理解系统设计

## RFC 生命周期

1. **草稿 (Draft)**: 初始版本，正在积极讨论中
2. **审查 (Review)**: 完成设计，正在接受社区反馈
3. **已批准 (Approved)**: 已通过审查，将被实现
4. **已实现 (Implemented)**: 已在代码中实现
5. **已弃用 (Deprecated)**: 已被新 RFC 取代

## 目录

| RFC | 标题 | 状态 |
|-----|------|------|
| [0001](./0001-product-vision.md) | 产品愿景与 MVP 定义 | 草稿 |
| [0002](./0002-system-architecture.md) | 系统架构设计 | 草稿 |
| [0003](./0003-data-models.md) | 数据模型设计 | 草稿 |
| [0004](./0004-multi-provider-abstraction.md) | 多 Provider 抽象层 | 草稿 |
| [0005](./0005-desktop-core-features.md) | 桌面应用核心功能 | 草稿 |
| [0006](./0006-session-message-management.md) | 会话与消息管理 | 草稿 |
| [0007](./0007-mcp-integration.md) | MCP 集成 | 草稿 |
| [0008](./0008-local-storage.md) | 本地存储设计 | 草稿 |
| [0009](./0009-ui-ux-design.md) | UI/UX 设计系统 | 草稿 |
| [0010](./0010-agent-runtime.md) | Agent 运行时集成 | 草稿 |

## 贡献指南

### 创建新 RFC

1. 复制 `0000-template.md` 作为模板
2. 使用下一个可用的 RFC 编号
3. 填写所有必需部分
4. 提交 PR 进行审查

### RFC 审查要点

- 清晰度：文档是否易于理解？
- 完整性：是否涵盖所有重要方面？
- 一致性：是否与项目整体架构一致？
- 可行性：设计是否可以在合理时间内实现？

## 格式规范

- 使用中文编写（技术术语可保留英文）
- 使用 Mermaid 绘制架构图
- 使用 TypeScript 定义类型
- 保持文档简洁，优先使用列表而非长段落
