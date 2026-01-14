# 贡献指南（Contribution Guide）

**日期：** 2026-01-14

本仓库未提供独立 CONTRIBUTING.md；以下内容根据 `AGENTS.md` 约定整理。

## 代码风格与约定
- TypeScript-first；模块尽量小且强类型
- ESLint 作为 lint/auto-fix（仓库不使用 Prettier）
- 命名：React 组件 PascalCase.tsx；API tests *.spec.ts；web tests *.test.ts(x)
- 提交信息：Conventional Commits（例如 feat(web): ...）

## 常用命令
- `pnpm lint`
- `pnpm test`

---

_Generated using BMAD Method `document-project` workflow_
