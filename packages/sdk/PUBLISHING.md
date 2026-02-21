# Publishing @allseeingeyes/sdk

This document describes how to set up and use the automated npm publishing workflow.

## GitHub Secrets Setup

You need to add the following secret to your GitHub repository:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add:
   - **Name:** `NPM_TOKEN`
   - **Value:** Your npm automation token

## Workflow Triggers

The SDK is automatically published to npm when:

1. **Push to main** - Any push to `main` that changes files in `packages/sdk/**`
2. **Release published** - When a GitHub release is published
3. **Manual dispatch** - Can be triggered manually from Actions tab (with optional dry-run)

## Version Bumping

Before publishing a new version:

1. Update the version in `packages/sdk/package.json`
2. Commit and push to main

Or use npm version commands:
```bash
cd packages/sdk
npm version patch  # 0.0.1 -> 0.0.2
npm version minor  # 0.0.1 -> 0.1.0
npm version major  # 0.0.1 -> 1.0.0
```

## Manual Publishing

To publish manually (requires npm login):

```bash
cd packages/sdk
pnpm build
npm publish --access public
```

## Dry Run

To test publishing without actually publishing:

```bash
cd packages/sdk
npm publish --dry-run --access public
```

Or trigger the workflow with `dry_run: true` from GitHub Actions.

## Scoped Package

The package is published under the `@allseeingeyes` scope:
- npm: https://www.npmjs.com/package/@allseeingeyes/sdk
- Install: `npm install @allseeingeyes/sdk`
