# Nexus Forge

Nexus Forge is a Windows desktop app for chatting with language models that run on your own PC. It is private by design: the app talks only to a local [Ollama](https://ollama.com/) server at `http://127.0.0.1:11434`.

## Privacy and security

- The app makes model requests only to the Ollama server on your own machine; it does not send prompts to a hosted AI provider.
- Model weights, chat data, installers, `.env` files, and credentials are deliberately excluded from this repository.
- Keep any future API keys in a local `.env` file. Never commit them to GitHub.

## What is included

- Electron desktop shell for Windows
- React chat interface
- Local Ollama model discovery and chat requests
- Windows NSIS installer build target (`.exe`)

## One-click first model

On first launch, select **Set up Qwen3 14B**. Nexus Forge will:

1. Install the official Ollama Windows package through WinGet when it is not already present.
2. Start Ollama locally at `127.0.0.1:11434`.
3. Download Qwen3 14B (about 9.3 GB) and select it for the conversation.

If WinGet is not available, the app opens the official Ollama download page and asks you to return after installation. The model is never uploaded or bundled into this repository or installer.

The RTX 5070 and 64 GB of system memory are a strong starting point. Qwen3 14B is the default for general chat; add `qwen2.5-coder:14b` later when you are ready for a dedicated code model.

## Development

```powershell
npm install
npm run dev
```

## Build the Windows installer

```powershell
npm run dist
```

The installer is written under `dist/`.

## Next experiments

- Streaming token responses
- Local conversation history
- Attach files and code folders
- Add tool-calling for safe coding workflows
