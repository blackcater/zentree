# RFC 0008: 本地存储设计

## 概述

定义 Acme 桌面应用的本地存储方案，包括数据目录结构、SQLite 数据库设计、加密存储和数据迁移策略。

| 属性 | 值 |
|------|-----|
| RFC ID | 0008 |
| 状态 | 草稿 |
| 作者 | BlackCater |
| 创建日期 | 2026-03-11 |
| 最终更新 | 2026-03-11 |

## 背景

Acme 遵循"本地优先"原则，所有数据默认存储在用户本地设备，保护用户隐私。本文档定义数据存储的具体实现方案。

## 存储策略

Acme 优先使用本地文件存储所有数据，后续可能引入 SQLite 增强搜索等能力。

### 目录树

```
~/.acme/
├── config/
│   ├── settings.json          # 应用设置
│   ├── providers.json         # Provider 配置 (加密)
│   └── keybindings.json      # 快捷键配置
├── data/
│   └── vaults/
│       └── {vaultId}/
│           ├── config.json         # Vault 元数据
│           ├── settings.json       # Vault 设置
│           ├── threads.json        # Threads 索引
│           ├── threads/
│           │   └── {threadId}/
│           │       └── messages.jsonl  # 消息内容
│           ├── mcp-servers.json
│           └── skills.json
├── cache/                     # 缓存目录
│   └── models/                # 模型缓存
└── logs/                     # 日志文件
    └── acme.{date}.log
```

> **注意**: SQLite (`acme.db`) 是可选的后续增强，MVP 版本优先使用纯文件存储。

### 路径管理器

```typescript
// packages/shared/src/config/paths.ts

import { app } from 'electron';
import { join } from 'path';

export class ConfigPaths {
  private readonly basePath: string;

  constructor() {
    // 开发环境使用项目目录，生产环境使用用户目录
    this.basePath = app.isPackaged
      ? join(app.getPath('userData'))
      : join(__dirname, '../../../../.acme-dev');
  }

  get root(): string {
    return this.basePath;
  }

  get config(): string {
    return join(this.basePath, 'config');
  }

  get data(): string {
    return join(this.basePath, 'data');
  }

  // Vault 相关路径
  get vaults(): string {
    return join(this.data, 'vaults');
  }

  getVaultPath(vaultId: string): string {
    return join(this.vaults, vaultId);
  }

  getThreadsPath(vaultId: string): string {
    return join(this.getVaultPath(vaultId), 'threads');
  }

  getThreadPath(vaultId: string, threadId: string): string {
    return join(this.getThreadsPath(vaultId), threadId);
  }

  getMessagesPath(vaultId: string, threadId: string): string {
    return join(this.getThreadPath(vaultId, threadId), 'messages.jsonl');
  }

  get cache(): string {
    return join(this.basePath, 'cache');
  }
  }

  get logs(): string {
    return join(this.basePath, 'logs');
  }

  get cache(): string {
    return join(this.basePath, 'cache');
  }

  ensureDirectories(): void {
    const dirs = [
      this.basePath,
      this.config,
      this.data,
      this.workspaces,
      this.attachments,
      this.logs,
      this.cache,
    ];

    for (const dir of dirs) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

export const paths = new ConfigPaths();
```

## 数据库设计

### SQLite 配置

```typescript
// packages/shared/src/database/db.ts

import { Database } from '@tanstack/db';
import { betterSqlite3 } from 'better-sqlite3';

export function createDatabase(path: string): Database {
  const db = new Database(path, {
    verbose: console.log, // 开发环境打印 SQL
  });

  // 启用 WAL 模式，提高并发性能
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  return db;
}
```

### Schema 定义

```typescript
// packages/shared/src/database/schema.ts

export const schema = {
  // Providers 表
  providers: `
    CREATE TABLE IF NOT EXISTS providers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      base_url TEXT NOT NULL,
      api_key_encrypted TEXT NOT NULL,
      capabilities TEXT NOT NULL,
      is_default INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `,

  // Models 表
  models: `
    CREATE TABLE IF NOT EXISTS models (
      id TEXT PRIMARY KEY,
      provider_id TEXT NOT NULL,
      name TEXT NOT NULL,
      context_window INTEGER NOT NULL,
      max_output_tokens INTEGER,
      supports_vision INTEGER DEFAULT 0,
      supports_reasoning INTEGER DEFAULT 0,
      is_latest INTEGER DEFAULT 0,
      FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE
    );
  `,

  // Workspaces 表
  workspaces: `
    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      config TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `,

  // Threads 表
  threads: `
    CREATE TABLE IF NOT EXISTS threads (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      model_id TEXT NOT NULL,
      workspace_id TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      metadata TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_message_at TEXT,
      FOREIGN KEY (provider_id) REFERENCES providers(id),
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
    );
  `,

  // Messages 表
  messages: `
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      tool_calls TEXT,
      tool_call_id TEXT,
      usage TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE CASCADE
    );
  `,

  // MCP Servers 表
  mcp_servers: `
    CREATE TABLE IF NOT EXISTS mcp_servers (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      name TEXT NOT NULL,
      command TEXT NOT NULL,
      args TEXT,
      env TEXT,
      enabled INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
    );
  `,

  // Skills 表
  skills: `
    CREATE TABLE IF NOT EXISTS skills (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      prompt TEXT NOT NULL,
      variables TEXT,
      enabled INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
    );
  `,

  // 索引
  indexes: `
    CREATE INDEX IF NOT EXISTS idx_threads_workspace ON threads(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_threads_status ON threads(status);
    CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_mcp_servers_workspace ON mcp_servers(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_skills_workspace ON skills(workspace_id);
  `,
};
```

## 加密存储

### 凭证加密

```typescript
// packages/shared/src/crypto/credential-manager.ts

import { safeStorage } from 'electron';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';

export class CredentialManager {
  /**
   * 加密敏感数据
   */
  static encrypt(plainText: string): string {
    // 优先使用系统安全存储
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(plainText);
      return `safe:${encrypted.toString('base64')}`;
    }

    // Fallback: 使用机器特定密钥
    const key = this.getMachineKey();
    const iv = randomBytes(16);
    const cipher = createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    return `local:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * 解密敏感数据
   */
  static decrypt(encryptedText: string): string {
    if (encryptedText.startsWith('safe:')) {
      const base64 = encryptedText.slice(5);
      const buffer = Buffer.from(base64, 'base64');
      return safeStorage.decryptString(buffer);
    }

    if (encryptedText.startsWith('local:')) {
      const [, ivHex, authTagHex, encrypted] = encryptedText.split(':');
      const key = this.getMachineKey();
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');

      const decipher = createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    }

    throw new Error('Invalid encrypted text format');
  }

  private static getMachineKey(): Buffer {
    // 使用机器特定信息生成密钥
    const machineId = process.env.COMPUTERNAME || process.env.HOSTNAME || 'default';
    return createHash('sha256').update(machineId).digest();
  }
}
```

### 使用示例

```typescript
// 存储 API Key
const encrypted = CredentialManager.encrypt('sk-xxx');
await db.insert('providers', {
  id: 'xxx',
  api_key_encrypted: encrypted,
  // ...
});

// 读取 API Key
const provider = await db.select('providers').first();
const apiKey = CredentialManager.decrypt(provider.api_key_encrypted);
```

## 应用设置

### 设置存储

```typescript
// packages/shared/src/config/settings.ts

import { app } from 'electron';

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  fontSize: number;
  fontFamily: string;
  autoUpdate: boolean;
  minimizeToTray: boolean;
  closeToTray: boolean;
  launchAtStartup: boolean;
  telemetry: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  language: 'zh-CN',
  fontSize: 14,
  fontFamily: 'system-ui',
  autoUpdate: true,
  minimizeToTray: false,
  closeToTray: false,
  launchAtStartup: false,
  telemetry: true,
};

export class SettingsManager {
  private settings: AppSettings;
  private readonly path: string;

  constructor() {
    this.path = join(paths.config, 'settings.json');
    this.settings = this.load();
  }

  private load(): AppSettings {
    try {
      const content = fs.readFileSync(this.path, 'utf8');
      return { ...DEFAULT_SETTINGS, ...JSON.parse(content) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  get<K extends keyof AppSettings>(key: K): AppSettings[K] {
    return this.settings[key];
  }

  set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    this.settings[key] = value;
    this.save();
  }

  getAll(): AppSettings {
    return { ...this.settings };
  }

  private save(): void {
    fs.writeFileSync(this.path, JSON.stringify(this.settings, null, 2));
  }
}

export const settings = new SettingsManager();
```

## 日志管理

### 日志配置

```typescript
// packages/shared/src/logging/logger.ts

import log from 'electron-log';

export function configureLogging(): void {
  // 日志文件路径
  log.transports.file.resolvePathFn = () =>
    join(paths.logs, `acme.${dateFormat(new Date(), 'yyyy-mm-dd')}.log`);

  // 日志级别
  log.transports.file.level = 'info';
  log.transports.console.level = 'debug';

  // 日志格式
  log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';
  log.transports.console.format = '[{h}:{i}:{s}.{ms}] [{level}] {text}';

  // 日志大小限制 (5MB)
  log.transports.file.maxSize = 5 * 1024 * 1024;

  // 捕获未处理异常
  process.on('uncaughtException', (error) => {
    log.error('Uncaught Exception:', error);
    app.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    log.error('Unhandled Rejection:', reason);
  });
}
```

## 数据迁移

### 迁移系统

```typescript
// packages/shared/src/database/migration.ts

interface Migration {
  version: number;
  name: string;
  up: (db: Database) => void;
  down: (db: Database) => void;
}

const migrations: Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    up: (db) => {
      // 执行初始 schema
    },
    down: (db) => {
      // 回滚
    },
  },
  // 后续迁移...
];

export class MigrationManager {
  private readonly migrationsTable = 'migrations';

  async migrate(db: Database): Promise<void> {
    // 创建迁移记录表
    db.exec(`
      CREATE TABLE IF NOT EXISTS ${this.migrationsTable} (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL
      );
    `);

    // 获取当前版本
    const currentVersion = this.getCurrentVersion(db);

    // 执行迁移
    for (const migration of migrations) {
      if (migration.version > currentVersion) {
        log.info(`Running migration: ${migration.name}`);
        migration.up(db);
        this.recordMigration(db, migration);
      }
    }
  }

  private getCurrentVersion(db: Database): number {
    try {
      const row = db
        .prepare(`SELECT MAX(version) as version FROM ${this.migrationsTable}`)
        .get() as { version: number } | undefined;
      return row?.version || 0;
    } catch {
      return 0;
    }
  }

  private recordMigration(db: Database, migration: Migration): void {
    db.prepare(
      `INSERT INTO ${this.migrationsTable} (version, name, applied_at) VALUES (?, ?, ?)`
    ).run(migration.version, migration.name, new Date().toISOString());
  }
}
```

## 数据导出/导入

### 导出功能

```typescript
// packages/shared/src/backup/export.ts

export async function exportData(
  options: ExportOptions
): Promise<string> {
  const exportDir = options.path || join(paths.cache, 'exports');
  fs.mkdirSync(exportDir, { recursive: true });

  const exportFile = join(exportDir, `acme-export-${Date.now()}.zip`);
  const archive = archiver('zip', { zlib: { level: 9 } });

  const output = fs.createWriteStream(exportFile);
  archive.pipe(output);

  // 导出数据库
  if (options.includeDatabase) {
    archive.file(paths.database, { name: 'acme.db' });
  }

  // 导出配置
  if (options.includeConfig) {
    archive.directory(paths.config, 'config');
  }

  // 导出附件
  if (options.includeAttachments) {
    archive.directory(paths.attachments, 'attachments');
  }

  await archive.finalize();

  return new Promise((resolve, reject) => {
    output.on('close', () => resolve(exportFile));
    output.on('error', reject);
  });
}
```

## 验收标准

- [ ] 数据目录结构已定义
- [ ] SQLite 数据库已配置
- [ ] Schema 迁移系统已实现
- [ ] API Key 加密存储已实现
- [ ] 应用设置管理已实现
- [ ] 日志系统已配置
- [ ] 数据导出/导入已实现

## 相关 RFC

- [RFC 0002: 系统架构设计](./0002-system-architecture.md)
- [RFC 0003: 数据模型设计](./0003-data-models.md)
- [RFC 0005: 桌面应用核心功能](./0005-desktop-core-features.md)
