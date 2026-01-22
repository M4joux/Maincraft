
import * as fs from 'fs';
import * as path from 'path';

export class Logger {
    private logPath: string;

    constructor() {
        this.logPath = path.resolve(process.cwd(), 'server.log');
    }

    log(msg: string) {
        const entry = `[${new Date().toISOString()}] [INFO] ${msg}\n`;
        process.stdout.write(entry);
        fs.appendFile(this.logPath, entry, () => { });
    }

    error(msg: string, err?: any) {
        const entry = `[${new Date().toISOString()}] [ERROR] ${msg} ${err ? err.toString() : ''}\n`;
        process.stderr.write(entry);
        fs.appendFile(this.logPath, entry, () => { });
    }
}

export const logger = new Logger();
