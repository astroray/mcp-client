# MCP Client

[![CI](https://github.com/astroray/mcp-client/actions/workflows/ci.yml/badge.svg)](https://github.com/astroray/mcp-client/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-22.x-brightgreen)](https://nodejs.org)
[![Version](https://img.shields.io/github/v/release/astroray/mcp-client)](https://github.com/astroray/mcp-client/releases)

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

- Node.js ≥ 22
- npm or yarn
