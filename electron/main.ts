import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { QueryRequest } from '../types/bridge'
import logger from './logger'
import { MCPClient } from './mcp-client'

// 개발 모드에서는 VITE_DEV_SERVER_URL을 사용하고,
// 프로덕션 모드에서는 dist 디렉토리의 index.html을 사용
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL
const distPath = app.isPackaged
  ? path.join(process.resourcesPath, 'dist')
  : path.join(__dirname, '..', 'dist')

let win: BrowserWindow | null = null

// Initialize MCP client
const mcpClient = new MCPClient()
let mcpInitialized = false
let initializePromise: Promise<void> | null = null

async function initializeMCP() {
  // 이미 초기화되었거나 초기화 중이면 진행 중인 Promise 반환
  if (mcpInitialized) {
    return;
  }
  if (initializePromise) {
    return initializePromise;
  }

  // 새로운 초기화 Promise 생성
  initializePromise = (async () => {
    try {
      const results = await mcpClient.initialize()
      mcpInitialized = true

      // 초기화 완료 후 상태 업데이트
      if (win) {
        // 서버 상태 전송
        results.forEach(({ name, tools }) => {
          win?.webContents.send('mcp:server-status', {
            serverName: name,
            connected: true,
            tools
          })
        })

        // 모델 정보 업데이트
        const models = mcpClient.getAvailableModels()
        win.webContents.send('mcp:models-updated', {
          models,
          currentModel: mcpClient.getCurrentModel()
        })
      }

      logger.info('MCP initialization completed successfully')
    } catch (error) {
      logger.error('Failed to initialize servers', { error })
      mcpInitialized = false
      initializePromise = null
      throw error
    }
  })()

  await initializePromise
  initializePromise = null
}

async function createWindow() {
  if (win !== null) {
    if (win.isMinimized()) win.restore();
    win.focus();
    return;
  }

  win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  // 윈도우 로드
  if (VITE_DEV_SERVER_URL) {
    await win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    await win.loadFile(path.join(distPath, 'index.html'))
  }

  // 윈도우가 준비된 후 초기화 시작
  await initializeMCP()
}

// IPC 핸들러 설정
ipcMain.handle('mcp:request-status', async () => {
  try {
    if (!mcpInitialized) {
      await initializeMCP()
    }

    const servers = mcpClient.getAvailableServers()
    servers.forEach(serverName => {
      win?.webContents.send('mcp:server-status', {
        serverName,
        connected: true,
        tools: mcpClient.getServerTools(serverName) || []
      })
    })

    return { success: true }
  } catch (error) {
    logger.error('Failed to get server status', { error })
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('mcp:get-models', async () => {
  try {
    if (!mcpInitialized) {
      await initializeMCP()
    }

    const models = mcpClient.getAvailableModels()
    return { success: true, models }
  } catch (error) {
    logger.error('Failed to get models', { error })
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('mcp:set-model', async (_event, modelId: string) => {
  try {
    if (!mcpInitialized) {
      await initializeMCP()
    }

    mcpClient.setModel(modelId)
    return { success: true }
  } catch (error) {
    logger.error('Failed to set model', { error, modelId })
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('mcp:get-model', async () => {
  try {
    if (!mcpInitialized) {
      await initializeMCP()
    }

    const model = mcpClient.getCurrentModel()
    return { success: true, model }
  } catch (error) {
    logger.error('Failed to get current model', { error })
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('mcp:start-query', async (_event, request: QueryRequest) => {
  try {
    logger.info('Starting query stream', { query: request.query });
    const stream = mcpClient.startQuery(request.query);

    for await (const message of stream) {
      win?.webContents.send('mcp:stream-data', message);
    }

    logger.info('Query stream completed successfully');
    return { success: true };
  } catch (error) {
    logger.error('Query processing error', { error });
    win?.webContents.send('mcp:stream-data', {
      type: 'tool_error',
      toolName: 'System',
      error: (error as Error).message
    });
    return { success: false, error: (error as Error).message };
  }
})

ipcMain.handle('mcp:stop-query', async () => {
  try {
    mcpClient.stopQuery()
    return { success: true }
  } catch (error) {
    logger.error('Failed to stop stream', { error })
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('mcp:cleanup', async () => {
  try {
    await mcpClient.cleanup()
    mcpInitialized = false
    initializePromise = null
    return { success: true }
  } catch (error) {
    logger.error('Failed to cleanup', { error })
    return { success: false, error: (error as Error).message }
  }
})

app.on('window-all-closed', async () => {
  if (process.platform !== 'darwin') {
    try {
      await mcpClient.cleanup()
    } catch (error) {
      logger.error('Failed to cleanup on window close', { error })
    }
    mcpInitialized = false
    initializePromise = null
    app.quit()
  }
})

app.on('activate', () => {
  if (win === null) {
    createWindow()
  } else {
    win.show()
  }
})

app.whenReady().then(createWindow)