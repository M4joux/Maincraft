import { EventEmitter } from 'events';

export class GameLoop extends EventEmitter {
    private lastTime: bigint;
    private accumulator: bigint;
    private readonly tickRate: bigint;
    private readonly maxAccumulator: bigint;
    private isRunning: boolean = false;
    private timeoutId: NodeJS.Timeout | null = null;

    /**
     * @param tps Ticks Per Second (default 20)
     */
    constructor(tps: number = 20) {
        super();
        this.tickRate = BigInt(1000000000 / tps); // Nanoseconds
        this.accumulator = 0n;
        this.maxAccumulator = this.tickRate * 10n; // Safety cap (10 ticks)
        this.lastTime = process.hrtime.bigint();
    }

    public start(): void {
        if (this.isRunning) return;
        this.isRunning = true;
        this.lastTime = process.hrtime.bigint();
        this.loop();
        console.log(`[GameLoop] Started at ${20} TPS`);
    }

    public stop(): void {
        this.isRunning = false;
        if (this.timeoutId) clearTimeout(this.timeoutId);
    }

    private loop = (): void => {
        if (!this.isRunning) return;

        const now = process.hrtime.bigint();
        let frameTime = now - this.lastTime;
        this.lastTime = now;

        // Prevent spiral of death
        if (frameTime > this.maxAccumulator) {
            frameTime = this.maxAccumulator;
        }

        this.accumulator += frameTime;

        // Consume accumulator with fixed steps
        while (this.accumulator >= this.tickRate) {
            this.emit('tick');
            this.accumulator -= this.tickRate;
        }

        // Schedule next check
        // We use setImmediate purely to yield I/O, but for precision we might adjust
        // For a server, standard event loop yielding is acceptable.
        // Approx 5ms check interval to maintain partial CPU load
        this.timeoutId = setTimeout(this.loop, 5);
    };
}
