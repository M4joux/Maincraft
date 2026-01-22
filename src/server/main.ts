
import http from 'http';
import fs from 'fs';
import path from 'path';
import { config } from '../config';
import { NetworkServer } from './networking/NetworkServer';
import { IPCManager } from './core/IPCManager';
import { logger } from './core/Logger';

logger.log(`[Main] Starting Maincraft Server (${config.NODE_ENV})...`);

process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err);
    // Keep running if possible, but logging is critical
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection:', reason);
});

// 1. Start Services
const ipc = new IPCManager();
const net = new NetworkServer(config.WS_PORT, ipc);

// 2. Static Server for Client
const server = http.createServer((req, res) => {
    let filePath = config.PUBLIC_DIR + req.url;
    if (req.url === '/') filePath = path.join(config.PUBLIC_DIR, 'client_render.html');

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404);
                res.end('404 Not Found');
            } else {
                res.writeHead(500);
                res.end(`Server Error: ${err.code}`);
            }
        } else {
            let contentType = 'text/html';
            const ext = path.extname(filePath);
            if (ext === '.js') contentType = 'text/javascript';
            if (ext === '.css') contentType = 'text/css';

            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(config.PORT, config.HOST, () => {
    logger.log(`[HTTP] Client Server running at http://${config.HOST}:${config.PORT}/`);
    logger.log(`[WS] WebSocket Server running on port ${config.WS_PORT}`);
});

const shutdown = () => {
    logger.log('\n[Main] Shutting down...');
    net.stop();
    server.close(() => logger.log('[HTTP] Server closed'));
    setTimeout(() => {
        logger.log('[Main] Goodbye.');
        process.exit(0);
    }, 1000);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
