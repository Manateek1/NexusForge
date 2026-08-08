# Nexus Forge

Nexus Forge is a Windows desktop app for chatting with language models that run on your own PC. It is private by design: the app talks only to a local [Ollama](https://ollama.com/) server at `http://127.0.0.1:11434`.

## What is included

- Electron desktop shell for Windows
- React chat interface
- Local Ollama model discovery and chat requests
- Windows NSIS installer build target (`.exe`)

## First local model

1. Install Ollama for Windows from [ollama.com](https://ollama.com/).
2. In PowerShell, run `ollama run llama3.2` (or another model you want to try).
3. Start Nexus Forge and click the refresh button. The model will appear in the model selector.

The RTX 5070 and 64 GB of system memory are a strong starting point. Begin with a 7B–8B model for responsiveness; model size and quantization determine how much can stay in GPU memory.

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
