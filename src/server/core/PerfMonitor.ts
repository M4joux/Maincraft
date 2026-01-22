
// Performance Monitor Helper
export class PerfMonitor {
    private tickSum = 0;
    private tickCount = 0;
    private lastReport = Date.now();

    startTick() { return process.hrtime(); }

    endTick(start: [number, number]) {
        const diff = process.hrtime(start);
        const ms = (diff[0] * 1e9 + diff[1]) / 1e6;
        this.tickSum += ms;
        this.tickCount++;

        if (Date.now() - this.lastReport > 10000) { // Report every 10s
            const avg = this.tickSum / this.tickCount;
            const mem = process.memoryUsage();
            console.log(`[Perf] Tick Avg: ${avg.toFixed(3)}ms | RSS: ${(mem.rss / 1024 / 1024).toFixed(1)}MB | Heap: ${(mem.heapUsed / 1024 / 1024).toFixed(1)}MB`);
            this.tickSum = 0; this.tickCount = 0; this.lastReport = Date.now();
        }
    }
}
