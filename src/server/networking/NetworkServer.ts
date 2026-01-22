import { WebSocketServer, WebSocket } from 'ws';
import { IPCManager } from '../core/IPCManager';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { PerfMonitor } from '../core/PerfMonitor';

interface ClientMessage {
    type: string;
    [key: string]: any;
}

interface Player {
    id: string;
    ws: WebSocket | null;
    name: string;
    pos: { x: number, y: number, z: number };
    rot: { copy: number };
    health: number;
    invulnerableTime: number;
    editsThisSecond: number;
    lastWarnTime: number;
    isAuthenticated: boolean;
}

interface Mob {
    id: string;
    pos: { x: number, y: number, z: number };
    vel: { x: number, y: number, z: number };
    timer: number;
    health: number;
}

export class NetworkServer {
    private wss: WebSocketServer;
    private ipc: IPCManager;
    private readonly SEED = 12345;
    private chunks: Map<string, Uint16Array> = new Map();
    private players: Map<string, Player> = new Map();
    private mobs: Map<string, Mob> = new Map();
    private savePath: string;
    private isDirty: boolean = false;
    private perf: PerfMonitor = new PerfMonitor();

    // Interval Handles
    private saveInterval: NodeJS.Timeout;
    private tickInterval: NodeJS.Timeout;

    constructor(port: number, ipc: IPCManager) {
        this.ipc = ipc;
        this.savePath = path.resolve(process.cwd(), 'world.json');
        this.loadWorld();
        this.initMobs();

        this.wss = new WebSocketServer({ port });
        console.log(`[Network] WebSocket Server listening on port ${port}`);

        this.wss.on('connection', (ws) => {
            this.handleConnection(ws);
        });

        // Loop 1s (Save & Rate Limit)
        this.saveInterval = setInterval(() => {
            if (this.isDirty) { this.saveWorld(); this.isDirty = false; }
            for (const p of this.players.values()) p.editsThisSecond = 0;
        }, 1000);

        // Tick Loop 10Hz (Mobs & Perf)
        this.tickInterval = setInterval(() => {
            const start = this.perf.startTick();
            this.updateMobs();
            this.perf.endTick(start);
        }, 100);
    }

    private initMobs() {
        if (this.mobs.size > 0) return;
        for (let i = 0; i < 5; i++) {
            const id = randomUUID().substring(0, 4);
            // AA-6: Safer Mob Spawn Logic (Fixed Height Y=11)
            // Ideally we check terrain height, but for prototype we assume standard ground
            this.mobs.set(id, {
                id,
                pos: { x: 16 + (Math.random() - 0.5) * 10, y: 11, z: 16 + (Math.random() - 0.5) * 10 }, // Y=11 is approx ground + 1
                vel: { x: 0, y: 0, z: 0 },
                timer: 0,
                health: 10
            });
        }
    }

    private updateMobs() {
        const updates: any[] = [];
        for (const mob of this.mobs.values()) {
            mob.timer--;
            if (mob.timer <= 0) {
                mob.timer = 10 + Math.random() * 20;
                const angle = Math.random() * Math.PI * 2;
                mob.vel.x = Math.cos(angle) * 2.0;
                mob.vel.z = Math.sin(angle) * 2.0;
            }
            mob.pos.x += mob.vel.x * 0.1;
            mob.pos.z += mob.vel.z * 0.1;

            updates.push({
                id: mob.id,
                pos: { x: +mob.pos.x.toFixed(2), y: +mob.pos.y.toFixed(2), z: +mob.pos.z.toFixed(2) }
            });

            this.checkMobDamage(mob);
        }
        if (updates.length > 0) this.broadcast({ type: 'MOB_STATE', mobs: updates });
    }

    private checkMobDamage(mob: Mob) {
        for (const player of this.players.values()) {
            if (!player.isAuthenticated || !player.ws || player.health <= 0) continue;
            const dx = player.pos.x - mob.pos.x;
            const dy = player.pos.y - mob.pos.y;
            const dz = player.pos.z - mob.pos.z;
            if (dx * dx + dy * dy + dz * dz < 2.25) {
                if (Date.now() > player.invulnerableTime) {
                    player.health -= 2;
                    player.invulnerableTime = Date.now() + 1000;
                    this.broadcast({ type: 'PLAYER_DAMAGE', playerId: player.id, health: player.health });
                    if (player.health <= 0) {
                        // AA-7: Spawn Safety Logic (Set to Y=13 approx)
                        player.health = 20;
                        player.pos = { x: 16, y: 13, z: 16 };
                        if (player.ws && player.ws.readyState === WebSocket.OPEN)
                            player.ws.send(JSON.stringify({ type: 'PLAYER_STATE', position: player.pos }));
                        this.broadcast({ type: 'PLAYER_DAMAGE', playerId: player.id, health: player.health });
                    }
                }
            }
        }
    }

    private handleConnection(ws: WebSocket) {
        let player: Player | null = null;
        ws.on('message', async (data, isBinary) => {
            if (isBinary) return;
            try {
                let msg;
                try { msg = JSON.parse(data.toString()); } catch { return; }

                if (!player && msg.type === 'AUTH') {
                    const providedId = msg.playerId;
                    let name = (msg.name || 'Player').substring(0, 16).replace(/[^a-zA-Z0-9 ]/g, '');
                    if (!name) name = "Guest";

                    if (providedId && this.players.has(providedId)) {
                        player = this.players.get(providedId)!;
                        console.log(`[Network] Player reconnected: ${player.name}`);
                        player.ws = ws;
                        player.isAuthenticated = true;
                        player.name = name;
                    } else {
                        const newId = randomUUID().substring(0, 8);
                        // AA-7: Initial Spawn Safety (Approx Y=13)
                        player = {
                            id: newId, ws, name, pos: { x: 16, y: 13, z: 16 }, rot: { copy: 0 },
                            editsThisSecond: 0, lastWarnTime: 0, health: 20, invulnerableTime: 0,
                            isAuthenticated: true
                        };
                        this.players.set(newId, player);
                        this.isDirty = true;
                    }

                    ws.send(JSON.stringify({ type: 'AUTH_OK', playerId: player.id, name: player.name }));
                    ws.send(JSON.stringify({ type: 'PLAYER_DAMAGE', playerId: player.id, health: player.health })); // HUD Init
                    this.broadcast({ type: 'PLAYER_JOIN', playerId: player.id, position: player.pos });
                    this.broadcast({ type: 'PLAYER_INFO', playerId: player.id, name: player.name });

                    // Send world state (other players & mobs)
                    for (const [pid, p] of this.players) {
                        // Only send valid authenticated players
                        if (pid !== player.id && p.isAuthenticated && p.ws) {
                            ws.send(JSON.stringify({ type: 'PLAYER_JOIN', playerId: pid, position: p.pos }));
                            ws.send(JSON.stringify({ type: 'PLAYER_INFO', playerId: pid, name: p.name }));
                        }
                    }
                    for (const mob of this.mobs.values()) {
                        ws.send(JSON.stringify({ type: 'MOB_SPAWN', mobId: mob.id, position: mob.pos }));
                    }
                    return;
                }

                if (!player || !player.isAuthenticated) return;
                if (!this.validateSchema(msg)) return;
                this.handleMessage(ws, player, msg);
            } catch (e) { console.error('Handler Error', e); }
        });

        ws.on('close', () => {
            if (player) {
                console.log(`[Network] Player disconnected: ${player.name}`);
                player.ws = null;
                player.isAuthenticated = false;
                this.broadcast({ type: 'PLAYER_LEAVE', playerId: player.id });
            }
        });

        ws.on('error', (err) => {
            console.error(`[Network] WS Error for ${player?.name || 'unknown'}:`, err);
        });
    }

    private validateSchema(msg: any): boolean {
        if (!msg || typeof msg !== 'object') return false;
        if (typeof msg.type !== 'string') return false;
        if (msg.type === 'AUTH') return true;
        if (msg.type === 'GET_CHUNK') return (typeof msg.x === 'number' && typeof msg.z === 'number');
        if (msg.type === 'BREAK_BLOCK' || msg.type === 'PLACE_BLOCK') return true;
        if (msg.type === 'PLAYER_STATE') return true;
        if (msg.type === 'ATTACK') return (msg.targetType === 'mob' && typeof msg.targetId === 'string');
        return false;
    }

    private async handleMessage(ws: WebSocket, player: Player, msg: ClientMessage) {
        switch (msg.type) {
            case 'GET_CHUNK': await this.handleGetChunk(ws, msg.x, msg.z); break;
            case 'BREAK_BLOCK': if (this.validateAction(player, msg)) this.handleBlockEdit(msg.x, msg.y, msg.z, 0); break;
            case 'PLACE_BLOCK': if (this.validateAction(player, msg)) this.handleBlockEdit(msg.x, msg.y, msg.z, msg.blockId); break;
            case 'PLAYER_STATE':
                if (msg.position) player.pos = msg.position;
                if (msg.rotation) player.rot = msg.rotation;
                this.broadcastExclude(ws, {
                    type: 'PLAYER_STATE',
                    playerId: player.id,
                    position: { x: +player.pos.x.toFixed(2), y: +player.pos.y.toFixed(2), z: +player.pos.z.toFixed(2) },
                    rotation: player.rot
                });
                break;
            case 'ATTACK':
                if (msg.targetType === 'mob') {
                    const mob = this.mobs.get(msg.targetId);
                    if (mob) {
                        const dist = Math.sqrt((mob.pos.x - player.pos.x) ** 2 + (mob.pos.y - player.pos.y) ** 2 + (mob.pos.z - player.pos.z) ** 2);
                        if (dist < 8) { // Generous range
                            mob.health -= 3;
                            if (mob.health <= 0) {
                                this.mobs.delete(mob.id);
                                this.broadcast({ type: 'ENTITY_DEATH', entityType: 'mob', entityId: mob.id });
                            }
                        }
                    }
                }
                break;
        }
    }

    private validateAction(player: Player, msg: ClientMessage): boolean { if (player.editsThisSecond > 10) return false; return true; }
    private async handleGetChunk(ws: WebSocket, cx: number, cz: number) { const key = `${cx},${cz}`; if (this.chunks.has(key)) { ws.send(JSON.stringify({ type: 'CHUNK_DATA', cx, cz })); ws.send(this.chunks.get(key)!, { binary: true }); return; } try { const buffer = await this.ipc.requestChunk(cx, 0, cz, this.SEED); this.chunks.set(key, new Uint16Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 2)); ws.send(JSON.stringify({ type: 'CHUNK_DATA', cx, cz })); ws.send(buffer, { binary: true }); } catch (e) { console.error(e); } }
    private handleBlockEdit(x: number, y: number, z: number, blockId: number) { const cx = Math.floor(x / 32), cz = Math.floor(z / 32), key = `${cx},${cz}`; if (!this.chunks.has(key)) return; const chunk = this.chunks.get(key)!; chunk[((x % 32 + 32) % 32) * 1024 + y * 32 + ((z % 32 + 32) % 32)] = blockId; this.broadcast({ type: 'BLOCK_UPDATE', x, y, z, blockId }); this.isDirty = true; }

    private broadcastExclude(excludeWs: WebSocket, msg: object) { const str = JSON.stringify(msg); for (const p of this.players.values()) { if (p.isAuthenticated && p.ws && p.ws !== excludeWs && p.ws.readyState === WebSocket.OPEN) p.ws.send(str); } }
    private broadcast(msg: object) { const str = JSON.stringify(msg); for (const p of this.players.values()) { if (p.isAuthenticated && p.ws && p.ws.readyState === WebSocket.OPEN) p.ws.send(str); } }
    private saveWorld() { try { const exportObj = { version: 2, chunks: {} as any, players: [] as any[] }; for (const [key, data] of this.chunks) exportObj.chunks[key] = Array.from(data); for (const p of this.players.values()) { exportObj.players.push({ id: p.id, name: p.name, pos: p.pos, health: p.health }); } const tmpPath = this.savePath + '.tmp'; fs.writeFileSync(tmpPath, JSON.stringify(exportObj)); fs.renameSync(tmpPath, this.savePath); } catch (e) { } }
    private loadWorld() { if (!fs.existsSync(this.savePath)) return; try { const data = JSON.parse(fs.readFileSync(this.savePath, 'utf8')); if (data.version >= 1) for (const key in data.chunks) this.chunks.set(key, new Uint16Array(data.chunks[key])); if (data.version >= 2 && data.players) for (const pData of data.players) this.players.set(pData.id, { id: pData.id, ws: null, name: pData.name, pos: pData.pos, rot: { copy: 0 }, health: pData.health, editsThisSecond: 0, lastWarnTime: 0, invulnerableTime: 0, isAuthenticated: false }); } catch (e) { } }

    public stop() {
        clearInterval(this.saveInterval);
        clearInterval(this.tickInterval);
        this.saveWorld();
        this.wss.close();
    }
}
