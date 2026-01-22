import { WebSocket } from 'ws';

const ws = new WebSocket('ws://localhost:8081');

console.log('[Verifier] Connecting...');

ws.on('open', () => {
    console.log('[Verifier] Connected. Sending Request...');
    ws.send(JSON.stringify({ type: 'GET_CHUNK', x: 0, y: 0, z: 0 }));
});

ws.on('message', (data, isBinary) => {
    if (!isBinary) {
        console.log('[Verifier] Ignored text message:', data.toString());
        return;
    }

    const buffer = data as Buffer;
    console.log(`[Verifier] Received Binary: ${buffer.length} bytes`);

    if (buffer.length === 65536) {
        console.log('[Verifier] SUCCESS: Payload size matches 32x32x32 Uint16.');
        process.exit(0);
    } else {
        console.error(`[Verifier] FAILURE: Expected 65536, got ${buffer.length}`);
        process.exit(1);
    }
});

ws.on('error', (err) => {
    console.error('[Verifier] Error:', err);
    process.exit(1);
});

// Timeout
setTimeout(() => {
    console.error('[Verifier] Timeout waiting for chunk.');
    process.exit(1);
}, 5000);
