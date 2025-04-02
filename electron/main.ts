import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { MCPClient } from './mcp-client'

process.env.DIST = path.join(__dirname, '../dist')
process.env.PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public')

let win: BrowserWindow | null = null
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

// Initialize MCP client
const mcpClient = new MCPClient()
let mcpInitialized = false

async function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  // Load the window first
  if (VITE_DEV_SERVER_URL) {
    await win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    await win.loadFile(path.join(process.env.DIST, 'index.html'))
  }

  // Initialize servers after window is ready
  try {
    const results = await mcpClient.initialize()
    mcpInitialized = true
    // Send initial server status for each server
    results.forEach(({ name, tools }) => {
      win?.webContents.send('mcp:server-status', {
        serverName: name,
        connected: true,
        tools
      })
    })
  } catch (error) {
    console.error('Failed to initialize servers:', error)
  }
}

// Set up IPC handlers
ipcMain.handle('mcp:request-status', async () => {
  const servers = mcpClient.getAvailableServers()
  servers.forEach(serverName => {
    win?.webContents.send('mcp:server-status', {
      serverName,
      connected: true,
      tools: mcpClient.getServerTools(serverName) || []
    })
  })
  return { success: true }
})

ipcMain.handle('mcp:get-models', async () => {
  try {
    // If MCP is not initialized yet, initialize it
    if (!mcpInitialized) {
      await mcpClient.initialize()
      mcpInitialized = true
    }
    const models = mcpClient.getAvailableModels()
    return { success: true, models }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('mcp:set-model', async (_event, modelId: string) => {
  try {
    mcpClient.setModel(modelId)
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('mcp:get-model', async () => {
  try {
    const model = mcpClient.getCurrentModel()
    return { success: true, model }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('mcp:query-stream', async (_event, query: string) => {
  try {
    const stream = mcpClient.processQueryStream(query)
    let response = ''

    for await (const chunk of stream) {
      console.log(chunk);
      response += chunk
      win?.webContents.send('mcp:stream-data', chunk)
    }

    return { success: true, response }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('mcp:cleanup', async () => {
  await mcpClient.cleanup()
  return { success: true }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    mcpClient.cleanup()
    app.quit()
  }
})

app.whenReady().then(createWindow)