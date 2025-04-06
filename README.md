# MCP Client

Desktop application for AI model interactions using the Model Context Protocol (MCP). Built with Electron and Vue 3.

## Features

- AI model integration through MCP SDK
- Real-time streaming responses
- Markdown content rendering
- Cross-platform desktop support
- Dark/Light theme modes

## Development

```bash
# Install dependencies
npm install

# Start development
npm run electron:dev

# Build application
npm run electron:build
```

## Configuration

Create a `settings.json` file in the root directory:

```json
{
  "modelProvider": {
    "apiKey": "<ANTHROPIC_API_KEY>"
  },
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "C:\\Users\\<YOUR_USERNAME>\\Downloads"
      ]
    }
  }
}
```

The configuration file specifies:
- Model provider settings (e.g., Anthropic API key)
- MCP server configurations for various capabilities (e.g., filesystem access)

## Tech Stack

- Electron for desktop runtime
- Vue 3 + TypeScript
- Vite for build tooling
- MCP SDK for model interactions

## Requirements

- Node.js ≥ 14
- npm or yarn
