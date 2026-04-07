# LoveDate Distribution Guide

## Web release package (zip)
1. Run:
```bash
npm run release
```
2. Output is created in `releases/` as:
- a versioned folder
- a versioned `.zip`

## Windows desktop installer (.exe)
1. Run:
```bash
npm run dist:desktop
```
2. Output is created in `desktop-dist/`:
- `LoveDate-Setup-<version>.exe` (installer)
- `win-unpacked/` (portable unpacked app)

## Optional: portable desktop build
```bash
npm run dist:desktop:portable
```

## Notes
- If SmartScreen warns on first run, choose "More info" -> "Run anyway" for local unsigned builds.
- For production public distribution, code-signing is recommended.
- To customize installer icon, add an `.ico` file and set `build.win.icon` in `package.json`.
