
import dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config();

export const config = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT || '3000', 10),
    WS_PORT: parseInt(process.env.WS_PORT || '8081', 10),
    HOST: process.env.HOST || '0.0.0.0',
    TICK_RATE: parseInt(process.env.TICK_RATE || '100', 10),
    WORLD_FILE: process.env.WORLD_FILE || 'world.json',
    PUBLIC_DIR: path.resolve(process.cwd(), process.env.PUBLIC_DIR || '.') // Serve root or specific public dir
};
