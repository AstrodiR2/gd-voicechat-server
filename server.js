const http = require('http');
const WebSocket = require('ws');

const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end('VoiceChat Server OK');
});

const wss = new WebSocket.Server({ server });
const clients = new Map();

wss.on('connection', (ws, req) => {
    const id = Math.random().toString(36).substr(2, 9);
    clients.set(id, ws);
    console.log(`Player connected: ${id}`);

    ws.send(JSON.stringify({ type: 'id', id }));

    ws.on('message', (data) => {
        clients.forEach((client, clientId) => {
            if (clientId !== id && client.readyState === WebSocket.OPEN) {
                client.send(data);
            }
        });
    });

    ws.on('close', () => {
        clients.delete(id);
        console.log(`Player disconnected: ${id}`);
    });

    ws.on('error', (err) => {
        console.error(`Error: ${err}`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`VoiceChat server running on port ${PORT}`);
});
