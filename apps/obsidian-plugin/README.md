# Daily Brain Bits Obsidian Plugin

This package contains the Obsidian plugin that syncs a vault with the Daily Brain Bits backend.

## Prerequisites

- Bun (repo uses Bun scripts)
- Obsidian desktop (for local testing)

## Build

From repo root:

```bash
cd apps/obsidian-plugin
bun install
bun run build
```

Build output:

- `apps/obsidian-plugin/main.js` (plugin bundle)
- `apps/obsidian-plugin/manifest.json` (plugin manifest)

## Local install (dev vault)

Copy the plugin files into a vault plugin folder:

```bash
VAULT_PATH="/path/to/your/vault"
PLUGIN_DIR="$VAULT_PATH/.obsidian/plugins/daily-brain-bits"

mkdir -p "$PLUGIN_DIR"
cp apps/obsidian-plugin/manifest.json "$PLUGIN_DIR/"
cp apps/obsidian-plugin/main.js "$PLUGIN_DIR/"
```

Then open Obsidian, enable the plugin, and configure its settings.

## Release

1. Bump versions (keep them in sync):
   - `apps/obsidian-plugin/manifest.json` `version`
   - `apps/obsidian-plugin/package.json` `version`
2. Build the bundle:
   - `cd apps/obsidian-plugin && bun run build`
3. Prepare the release artifacts:
   - `manifest.json`
   - `main.js`
4. Create a Git tag for the release (e.g. `v0.1.0`).
5. Create a GitHub release and upload the artifacts:
   - `daily-brain-bits.zip` (containing `manifest.json` + `main.js`)
   - `manifest.json`
   - `main.js`

Example zip:

```bash
cd apps/obsidian-plugin
zip -r daily-brain-bits.zip manifest.json main.js
```

## Upload (Obsidian Community Plugins)

If publishing to the Obsidian community store, the release must include the three files above,
and the manifest version must match the Git tag and GitHub release version. Follow Obsidian's
submission/update process to point to the new release assets.
