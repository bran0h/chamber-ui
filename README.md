# Chamber UI

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A native desktop app for managing AWS SSM Parameter Store secrets through the [chamber](https://github.com/segmentio/chamber) CLI — with a clean, keyboard-friendly interface built on Tauri 2, Vue 3, and shadcn-vue.

## What it does

- **Browse services** — collapsible sidebar lists all chamber services for the selected profile and region
- **Read secrets** — table view with masked values, reveal toggle per row, and live filter
- **Write & delete** — add, edit, or delete secrets with a confirmation dialog; the UI polls until AWS confirms the change before updating
- **Export to clipboard** — copy all secrets for a service as a `.env`-formatted block
- **AWS SSO** — log in via browser-based SSO directly from the app, or connect using an existing session
- **Profile & region picker** — select from all profiles in `~/.aws/config`; region is auto-filled from the profile and can be changed via dropdown

## Requirements

| Tool | Version |
|------|---------|
| [Node.js](https://nodejs.org) | 18+ |
| [Rust](https://rustup.rs) | stable |
| [Tauri CLI prerequisites](https://tauri.app/start/prerequisites/) | macOS / Linux / Windows |
| [chamber](https://github.com/segmentio/chamber) | any recent version |
| AWS credentials | profile in `~/.aws/config` or environment variables |

Install chamber on macOS:

```bash
brew install chamber
```

## Setup

```bash
# 1. Clone
git clone https://github.com/your-org/chamber-ui.git
cd chamber-ui

# 2. Install JS dependencies
npm install

# 3. Run in development mode
npm run tauri dev

# 4. Build a production bundle
npm run tauri build
```

The first `tauri dev` or `tauri build` will compile the Rust backend — this takes a couple of minutes on a fresh machine.

## Usage

1. **Select your AWS profile** from the dropdown (populated from `~/.aws/config`).
2. The **region** is auto-filled from the profile; change it if needed.
3. Click **Connect** if you already have valid credentials, or **Login with AWS SSO** to authenticate via browser.
4. Once authenticated, your services appear in the left sidebar.
5. Click a service to load its secrets.
6. Use the action buttons on each row to **copy**, **edit**, or **delete** a secret.
7. Click **+ Add** in the header to create a new secret.
8. Click the **export** button to copy all secrets as `KEY=value` pairs to the clipboard.

## Tech stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | [Tauri 2](https://tauri.app) (Rust) |
| Frontend | [Vue 3](https://vuejs.org) + TypeScript + Vite |
| UI components | [shadcn-vue](https://www.shadcn-vue.com) + Tailwind CSS |
| State | [Pinia](https://pinia.vuejs.org) |
| Icons | [Lucide](https://lucide.dev) |
| Secrets backend | [chamber](https://github.com/segmentio/chamber) → AWS SSM Parameter Store |

## Project structure

```
chamber-ui/
├── src/
│   ├── components/
│   │   ├── AuthView.vue       # Login screen (profile, region, SSO)
│   │   ├── SecretsView.vue    # Main layout after auth
│   │   ├── AppSidebar.vue     # Collapsible service list
│   │   ├── SecretsHeader.vue  # Toolbar (service name, add, export, refresh)
│   │   ├── SecretsTable.vue   # Secrets table with reveal / copy / edit / delete
│   │   └── SecretDialog.vue   # Add / edit dialog
│   ├── stores/
│   │   └── chamber.ts         # Pinia store — all invoke calls and polling logic
│   └── assets/index.css       # Tailwind + CSS variable theming
└── src-tauri/
    └── src/
        ├── lib.rs             # Tauri builder + command registration
        └── commands.rs        # Rust commands (chamber & AWS CLI wrappers)
```

## License

[MIT](LICENSE) — free to use, modify, and distribute. Attribution appreciated.

---

Made with ❤️
