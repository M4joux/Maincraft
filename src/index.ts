import { GameLoop } from './server/core/GameLoop';
import { IPCManager } from './server/core/IPCManager';
import { NetworkServer } from './server/networking/NetworkServer';

console.log("Initializing Maincraft Server...");

const loop = new GameLoop(20);
const ipc = new IPCManager();
const net = new NetworkServer(8081, ipc);

let tickCount = 0;

loop.on('tick', () => {
    tickCount++;
});

loop.start();

// Graceful Shutdown
process.on('SIGINT', () => {
    console.log("\nShutting down...");
    net.stop();
    loop.stop();
    process.exit(0);
});
