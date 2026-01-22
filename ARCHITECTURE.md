# Architecture & Design

## System Boundaries

### Server (TypeScript / Node.js)
- **Responsibility**: Truth. The server holds the master copy of the world (Chunks), Player States, and Mob States.
- **Persistence**: Writes `world.json` atomically on save/shutdown.
- **Validation**: Rejects invalid movements (speed hacks), invalid block edits (distance), and rate limits inputs.

### Client (HTML / JS / Three.js)
- **Responsibility**: Presentation. Renders the state provided by the server.
- **Prediction**: Simple movement prediction (Client-side physics) to mask latency, but corrected by Server state if desync occurs.
- **Meshing**: Converts Voxel Data -> Three.js Geometry (Greedy Meshing algorithm).

### World Generator (Python)
- **Responsibility**: Compute-heavy noise generation.
- **Interface**: Stdin/Stdout IPC with the Node.js server. 
- **Why**: Python has excellent noise libraries (though JS is capable, this demonstrates Polyglot architecture).

## Core Design Decisions

1.  **Greedy Meshing**:
    - *Why*: Voxel worlds have millions of faces. Rendering 1 quad per face is too slow (Draw Calls & GPU memory).
    - *How*: Merges adjacent identical faces into single large quads.
    - *Tradeoff*: Texture mapping becomes harder (need repeating textures or UV stretching). We chose UV stretching/mapping to atlas tiles for simplicity.

2.  **JSON Persistence**:
    - *Why*: No database setup required. Simple to debug. Atomic file writes avoid corruption.
    - *Limitation*: Requires holding entire world in RAM before save. Safe for small maps (size < 1GB).

3.  **Authoritative Movement**:
    - *Why*: Prevents flying/teleporting cheats.
    - *How*: Client sends `PLAYER_STATE` (Pos). Server validates distance moved vs time delta.

## Limitations & Future Work

### Limitations
- **Chunk Loading**: Currently simple radius-based. No advanced priority queuing or LoD.
- **Physics**: AABB (Axis-Aligned Bounding Box) only. No complex collisions or rigid bodies.
- **Scaling**: Single-threaded server loop. Will lag with > 50-100 concurrent players or huge mob counts.

### Future Work
- **Database**: Move `world.json` to SQLite or Redis for infinite world size.
- **Worker Threads**: Move Chunk Compression/Meshing to Web Workers on Client.
- **Binary Protocol**: Replace JSON with Protobuf or Flatbuffers for network bandwidth reduction.
