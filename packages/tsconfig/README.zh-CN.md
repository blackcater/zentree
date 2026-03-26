# @acme-ai/tsconfig

`@acme-ai/tsconfig` 为 Acme monorepo 提供共享的 TypeScript 配置。它包含启用严格类型检查的
基础配置、Node.js 目标设置和 React 特定预设。

**配置：**

- `base.json` - 启用严格模式的基础配置
- `nextjs.json` - Next.js 特定设置
- `react-native.json` - React Native 设置
- `node18.json` - Node.js 18+ 目标

**使用方式：** 在 `tsconfig.json` 的 extends 字段中引用
