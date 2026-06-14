# 📦 Webex Export - Professional Archive Utility

Professional, glassmorphic React application to archive and view Webex conversations. Download message history and attachments directly from the browser or upload existing JSON archives to explore them with a modern UI.

![Webex Export Interface](https://raw.githubusercontent.com/lucide-react/lucide/main/icons/archive.svg)

## ✨ Features

- **🚀 Direct Webex Integration**: Connect using your Personal Access Token to fetch rooms and messages.
- **📥 Smart Downloading**: Downloads all messages and attachments into a structured ZIP file.
- **🔄 Rate Limit Management**: Built-in handling for Webex API limits (429 status) with automatic retry logic.
- **📂 Multi-Archive Viewer**: Upload multiple JSON exports and browse them in a unified interface.
- **🏷️ Inline Renaming**: Organize your archives by renaming conversation titles on the fly.
- **🔍 Advanced Search**: Filter through rooms and search within message histories instantly.
- **⚡ Performance First**: Incremental progress tracking and optimized message fetching for large rooms.
- **🎨 Modern Design**: Sleek glassmorphism UI with smooth Framer Motion animations.

## 🛠️ Technology Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: Vanilla CSS (Modern CSS Variables & Glassmorphism)
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Dependencies**: 
  - `jszip`: For client-side archive generation.
  - Native `fetch` with built-in retry & rate-limit handling against the Webex REST API (`webexapis.com`).

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm or yarn
- A Webex account to generate a [Personal Access Token](https://developer.webex.com/docs/getting-your-personal-access-token)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/cnklc/Webex-export.git
   cd Webex-export
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## 📖 How to Use

1. **Connect**: Enter your Webex Personal Access Token.
2. **Select**: Choose the rooms you want to archive from the list.
3. **Download**: Click "İndir" to start the process. The app will fetch all messages and files.
4. **Archive List**: After completion (or via JSON import), view your collections in the "Arşiv" tab.
5. **View**: Click "Görüntüle" on any conversation to see the full chat history in a chat-like interface.

## 🛡️ Privacy & Security
Everything happens on the **client-side**. Your Webex token is never sent to any server other than Webex's official API (`webexapis.com`). Data is processed directly in your browser.

## 🚀 Deployment (GitHub Pages)

This project is configured to deploy automatically to GitHub Pages via GitHub Actions.

1. Push the project to the `main` branch of `github.com/cnklc/Webex-export`.
2. In the repository, go to **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Every push to `main` builds the app and publishes it. The workflow lives in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

> Served from the custom domain **webex.cnklc.me**, so the Vite `base` in [`vite.config.ts`](vite.config.ts) is `/`. The custom domain is kept across deployments via [`public/CNAME`](public/CNAME) (copied into the build output). If you drop the custom domain and serve from the project path, change `base` to `/Webex-export/` instead.

**Live URL:** https://webex.cnklc.me/

## 🔗 Links

- **Repository**: [github.com/cnklc/Webex-export](https://github.com/cnklc/Webex-export)
- **Author**: [Can Kılıç](https://github.com/cnklc)

---
Created with ❤️ by **[Can Kılıç](https://github.com/cnklc)**
