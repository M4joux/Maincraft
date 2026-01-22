# 🧱 Maincraft

<p align="center">
  <strong>Persistent Multiplayer Voxel Engine</strong><br/>
  Built with Node.js, Python, and Three.js
</p>


<p align="center">
  <img src="https://img.shields.io/badge/Engine-Voxel-2c5364?style=flat-square"/>
  <img src="https://img.shields.io/badge/Multiplayer-WebSocket-2c5364?style=flat-square"/>
  <img src="https://img.shields.io/badge/Rendering-Three.js-2c5364?style=flat-square"/>
  <img src="https://img.shields.io/badge/Server-Node.js-2c5364?style=flat-square"/>
  <img src="https://img.shields.io/badge/WorldGen-Python-2c5364?style=flat-square"/>
  <img src="https://img.shields.io/badge/Status-Prototype-2c5364?style=flat-square"/>
  <img src="https://img.shields.io/badge/License-MIT-2c5364?style=flat-square"/>
</p>

---

## 📌 Overview

**Maincraft** is a Minecraft-inspired **persistent multiplayer voxel engine prototype**  
focused on **architecture, performance, and deterministic systems**.

It demonstrates a full **client–server model** with:
- server-authoritative state
- procedural world generation
- real-time multiplayer synchronization

This project is intended as an **engine-level prototype**, not a complete game.

---

## ✨ Features

- 🌐 **Multiplayer** — Real-time player synchronization via WebSockets  
- 💾 **Persistence** — World edits and player states saved to disk  
- 🌍 **Procedural World Generation** — Python-based terrain generation (IPC)  
- 🧠 **Greedy Meshing** — Optimized voxel geometry generation  
- ⚔️ **Combat & AI** — Basic PvE gameplay with server-authoritative mobs  
- 🎨 **Textures** — Procedural texture atlas with UV mapping  
- 🔐 **Security** — Server-side validation and rate limiting  

---

## 📸 Screenshots

<p align="center">
  <img src="screenshot/screenshot.png" width="45%"/>
</p>

---

## 🚀 Getting Started

### Prerequisites
- Node.js **v16+**
- Python **3.x**
- npm

---

### Installation

```bash
npm install
```
Development
npx tsx src/server/main.ts


Client: http://localhost:3000

WebSocket: ws://localhost:8081

Production Build & Run
npx tsc
node dist/server/main.js


The production server serves:

WebSocket API

Static client

Access via:
http://localhost:3000

🎮 Controls

W / A / S / D — Move

SPACE — Jump

Left Click — Break Block / Attack

Right Click — Place Block

1 / 2 / 3 — Select Block Type

ESC — Release Mouse Lock

🏗️ Architecture

Server (src/server)
Node.js WebSocket server handling all authoritative logic
(physics, combat, persistence, validation)

World Generator (engine_py)
Python-based procedural chunk generation via IPC

Client (client_render.html)
Three.js WebGL renderer
Stateless client that renders server state and sends input

🤝 Support the Project

If you find this project useful and would like to support its development:

Currency	Wallet Address
Bitcoin (BTC)	bc1q3smxjtjesh3km3rl0y89nyg964esdjkkmtwyhm
Ethereum (ETH)	0x891c40D9ac520DC6c8827eDD744ee15c472e88Ff
USDT (TRC-20)	TJriJCkKnG8d6dh1tejmz79JtUvnNoRirc

Support is optional and appreciated ❤️

📄 License


MIT License
