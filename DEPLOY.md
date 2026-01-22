# 🚀 Deployment Guide — Maincraft

> This guide is intended for **production or VPS deployment**.  
> For local development, refer to `README.md`.

---

## 📋 Prerequisites

Ensure the following are installed on the target machine:

- **Node.js** v18+
- **Python** 3.x (required for world generation)
- **npm** (or yarn)
- (Optional) **pm2** for process management

---

## 🏗️ 1. Build

Install dependencies and compile the TypeScript server for production.

```bash
npm install
npx tsc
This will generate a dist/ directory containing the compiled server code.

⚙️ 2. Configuration
Create a .env file in the project root:

env
Copy code
NODE_ENV=production
PORT=3000
WS_PORT=8081
HOST=0.0.0.0
PUBLIC_DIR=.
Environment Variables
Variable	Description
PORT	HTTP server port (serves the client)
WS_PORT	WebSocket server port
PUBLIC_DIR	Directory containing client_render.html
NODE_ENV	Must be set to production

▶️ 3. Run
Start the production server:

bash
Copy code
node dist/server/main.js
The server will:

Start the HTTP server

Start the WebSocket server

Load or create persistent world data (world.json)

🌐 4. Access
Open your browser and navigate to:

cpp
Copy code
http://<SERVER_IP>:3000
🔁 Lifecycle & Persistence
Shutdown
Use Ctrl + C (SIGINT) or kill <pid> (SIGTERM)

World Persistence
The server automatically saves world.json on shutdown

Back up this file regularly to preserve world state

🖥️ VPS / Production Notes
Ensure the firewall allows:

TCP 3000 (HTTP)

TCP 8081 (WebSocket)

For long-running servers, use pm2:

bash
Copy code
npm install -g pm2
pm2 start dist/server/main.js --name maincraft
pm2 save
🔐 Security Notes
Do not expose the WebSocket port (8081) publicly without firewall rules

Consider using Nginx or another reverse proxy for HTTPS

This project is a prototype — additional hardening is recommended for public servers

🧾 Logs & Data
Logs are written to server.log

Persistent world data is stored in world.json

These files must not be committed to version control

✅ Deployment Checklist
 Dependencies installed

 .env configured

 Ports opened

 Build completed

 Server running without errors