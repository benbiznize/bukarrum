# Bukarrum — Claude Guidelines

## Branching Strategy

Always follow this branching strategy before making any code changes:

1. **Branch from `dev`** — never work directly on `dev` or `main`
   ```bash
   git checkout dev && git pull origin dev
   git checkout -b feature/my-feature   # or fix/my-fix
   ```
2. **Naming conventions**
   - New features: `feature/kebab-case-description`
   - Bug fixes: `fix/kebab-case-description`
   - Critical production hotfixes only: `hotfix/kebab-case-description` (branch from `main`, merge to both `main` and `dev`)
3. **PR target** — always `feature/*` or `fix/*` → `dev`, never directly to `main`
4. **`main` is production** — only `dev` gets promoted to `main` via PR after staging validation

## Branch Structure

```
main          → production (Vercel auto-deploys)
dev           → staging (Vercel preview + Supabase preview)
feature/*     → individual features (branch from dev, PR back to dev)
fix/*         → regular fixes (branch from dev, PR back to dev)
hotfix/*      → critical prod bugs only (branch from main, merge to main AND dev)
```
