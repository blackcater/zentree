# Desktop i18n Implementation Design

## Overview

Add internationalization (i18n) support to the Electron desktop application, supporting English (default), Simplified Chinese, and Traditional Chinese.

## Architecture

```
src/
├── i18n/                              # Shared i18n config and locales
│   ├── locales/                       # Translation files (shared by main and renderer)
│   │   ├── en.json                    # English (default)
│   │   ├── zh-CN.json                 # Simplified Chinese
│   │   └── zh-TW.json                 # Traditional Chinese
│   ├── index.ts                       # i18next instance initialization
│   └── shared-config.ts               # Shared config (language list, detection logic)
├── main/                              # Electron main process
│   ├── lib/
│   │   └── menu/                      # Menu text via i18next t()
│   └── index.ts                       # Initialize i18n when app ready
└── renderer/                          # React UI
    └── src/
        ├── components/providers/
        │   └── I18nProvider.tsx       # React i18n Provider
        └── i18n/
            └── client.ts              # Renderer i18n config
```

## Language Detection & Persistence

### Detection Flow

1. On app start, read `locale` from `electron-store`
2. If stored value exists, use it
3. Otherwise, use `os-locale` to detect system language
4. Match system language to supported locales: `en`, `zh-CN`, `zh-TW`
5. If no match, fallback to `en`

### Supported Locales

- `en` - English (default)
- `zh-CN` - Simplified Chinese
- `zh-TW` - Traditional Chinese

### Persistence

- Store selected locale in `electron-store` with key `locale`
- Renderer can trigger language change via IPC to main process
- Main process updates store and notifies renderer to reload i18n

## Main Process i18n

- Main process reuses the same `i18next` instance
- Menu, context menu, dialog text obtained via `t('menu.xxx')`
- i18n initialized after `app.whenReady()`
- Locale files loaded dynamically via `import()`

## Renderer Process i18n

- `I18nProvider` wraps around `Providers`, encapsulating react-i18next's `I18nextProvider`
- Use `useTranslation('namespace')` Hook to get translated text
- Namespaces loaded per-route on demand (e.g., `welcome` namespace only loaded on `/welcome` route)

## Namespace Structure

Each namespace corresponds to a module/page:

- `welcome` - Welcome wizard
- `menu` - Application menu (main process)
- `settings` - Settings page
- `common` - Common UI strings

## Dependencies

- `react-i18next` - i18n framework
- `i18next` - Core i18n
- `os-locale` - System language detection
- `electron-store` - Already in dependencies, used for persistence

## Implementation Tasks

1. Add dependencies: `i18next`, `react-i18next`, `os-locale`
2. Create `src/i18n/` directory structure
3. Create locale files: `en.json`, `zh-CN.json`, `zh-TW.json`
4. Implement `src/i18n/index.ts` - shared i18next config
5. Implement `src/i18n/shared-config.ts` - language detection and config
6. Create `I18nProvider` in renderer
7. Integrate `I18nProvider` into renderer `Providers`
8. Implement main process i18n initialization
9. Migrate hardcoded strings in `WelcomeStep` to use i18n
10. Add language switcher UI in settings page
11. TypeScript type generation for locale files
