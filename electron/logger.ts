import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import winston from 'winston';

// 로그 레벨 정의
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    success: 3,
    network: 4,
    tool: 5,
    data: 6,
    debug: 7,
};

// 로그 레벨별 이모지 정의
const levelEmojis = {
    error: '❌',
    warn: '⚠️',
    info: 'ℹ️',
    success: '✅',
    network: '🌐',
    tool: '🔧',
    data: '📊',
    debug: '🔍',
};

// 로그 레벨별 색상 정의
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'blue',
    success: 'green',
    network: 'cyan',
    tool: 'magenta',
    data: 'gray',
    debug: 'white',
};

// Winston에 커스텀 색상 추가
winston.addColors(colors);

// 개발 환경용 콘솔 포맷
const devConsoleFormat = winston.format.combine(
    winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.colorize({ all: true }),
    winston.format.printf(({ level, message, timestamp, ...metadata }) => {
        const emoji = levelEmojis[level as keyof typeof levelEmojis] || '';
        const metaStr = Object.keys(metadata).length ?
            ` ${JSON.stringify(metadata, null, 2)}` : '';
        return `[${timestamp}] ${emoji} ${message}${metaStr}`;
    })
);

// 파일 로그 포맷
const fileFormat = winston.format.printf(({ level, message, timestamp, ...metadata }) => {
    const emoji = levelEmojis[level as keyof typeof levelEmojis] || '';
    const metaStr = Object.keys(metadata).length ?
        ` ${JSON.stringify(metadata, null, 2)}` : '';
    return `[${timestamp}] ${emoji} ${message}${metaStr}`;
});

// 로그 디렉토리 설정
const LOG_DIR = app.isPackaged
    ? path.join(app.getPath('userData'), 'logs')
    : path.join(process.cwd(), 'logs');

// 로그 디렉토리가 없으면 생성
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Winston 로거 생성
const logger = winston.createLogger({
    levels,
    level: 'debug',
    format: winston.format.combine(
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json()
    ),
    transports: [
        // 에러 로그 파일
        new winston.transports.File({
            filename: path.join(LOG_DIR, 'error.log'),
            level: 'error',
            format: winston.format.combine(
                winston.format.timestamp({
                    format: 'YYYY-MM-DD HH:mm:ss'
                }),
                fileFormat
            )
        }),
        // 전체 로그 파일
        new winston.transports.File({
            filename: path.join(LOG_DIR, 'combined.log'),
            format: winston.format.combine(
                winston.format.timestamp({
                    format: 'YYYY-MM-DD HH:mm:ss'
                }),
                fileFormat
            )
        })
    ]
});

// 개발 환경에서는 콘솔 출력 추가
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: devConsoleFormat
    }));
}

export default logger; 