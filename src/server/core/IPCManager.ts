import { spawn, ChildProcess } from 'child_process';
import path from 'path';

interface ChunkRequest {
    x: number;
    y: number;
    z: number;
    seed: number;
    resolve: (data: Buffer) => void;
    reject: (err: Error) => void;
}

export class IPCManager {
    private pythonProc: ChildProcess;
    private queue: ChunkRequest[] = [];
    private isIdle: boolean = true;

    constructor() {
        const scriptPath = path.resolve(process.cwd(), 'engine_py/world_gen.py');
        console.log(`[IPC] Spawning Python: ${scriptPath}`);

        // Spawn python process. Ensure 'python' is in PATH or use 'python3'
        this.pythonProc = spawn('python', [scriptPath], {
            stdio: ['pipe', 'pipe', 'inherit'] // pipe stdin/out, inherit stderr for logs
        });

        this.pythonProc.on('error', (err) => {
            console.error(`[IPC] Failed to start python:`, err);
        });

        this.pythonProc.on('exit', (code) => {
            console.log(`[IPC] Python exited with code ${code}`);
        });

        // Handle Data
        this.setupDataListener();
    }

    private setupDataListener() {
        let buffer = Buffer.alloc(0);
        let expectedSize: number | null = null;

        this.pythonProc.stdout?.on('data', (chunk: Buffer) => {
            buffer = Buffer.concat([buffer, chunk]);

            while (true) {
                // If waiting for header
                if (expectedSize === null) {
                    if (buffer.length >= 4) {
                        expectedSize = buffer.readUInt32BE(0);
                        buffer = buffer.subarray(4); // Consume header
                    } else {
                        break; // Wait for more data
                    }
                }

                // If waiting for payload
                if (expectedSize !== null) {
                    if (buffer.length >= expectedSize) {
                        const payload = buffer.subarray(0, expectedSize);
                        buffer = buffer.subarray(expectedSize); // Consume payload

                        this.resolveCurrent(payload);
                        expectedSize = null;
                        this.isIdle = true;
                        this.processQueue();
                    } else {
                        break; // Wait for more data
                    }
                }
            }
        });
    }

    public requestChunk(x: number, y: number, z: number, seed: number): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            this.queue.push({ x, y, z, seed, resolve, reject });
            this.processQueue();
        });
    }

    private processQueue() {
        if (!this.isIdle || this.queue.length === 0) return;

        const req = this.queue.shift();
        if (!req || !this.pythonProc.stdin) return;

        this.isIdle = false;

        // Protocol: 4 ints (big endian)
        const buf = Buffer.alloc(16);
        buf.writeInt32BE(req.x, 0);
        buf.writeInt32BE(req.y, 4);
        buf.writeInt32BE(req.z, 8);
        buf.writeInt32BE(req.seed, 12);

        this.pythonProc.stdin.write(buf);

        // Store current request reference to resolve later (Queue is FIFO, but we only have 1 active req)
        // Note: For parallel processing, we'd need IDs, but for now we do sequential blocking IPC
        (this as any).currentReq = req;
    }

    private resolveCurrent(data: Buffer) {
        const req = (this as any).currentReq;
        if (req) {
            req.resolve(data);
            (this as any).currentReq = undefined;
        }
    }
}
