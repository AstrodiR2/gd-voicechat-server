const http = require('http');
const WebSocket = require('ws');
const net = require('net');

// WebSocket сервер для браузерів
const httpServer = http.createServer((req, res) => {
    res.writeHead(200);
    res.end('VoiceChat Server OK');
});

const wss = new WebSocket.Server({ server: httpServer });

// Всі клієнти (і WS і TCP)
const clients = new Map();

function broadcast(senderId, data) {
    clients.forEach((client, id) => {
        if (id === senderId) return;
        try {
            if (client.type === 'ws' && client.ws.readyState === WebSocket.OPEN) {
                client.ws.send(data);
            } else if (client.type === 'tcp') {
                client.socket.write(data);
            }
        } catch(e) {}
    });
}

// WebSocket клієнти
wss.on('connection', (ws) => {
    const id = Math.random().toString(36).substr(2, 9);
    clients.set(id, { type: 'ws', ws });
    console.log(`WS Player connected: ${id}`);

    ws.on('message', (data) => broadcast(id, data));
    ws.on('close', () => {
        clients.delete(id);
        console.log(`WS Player disconnected: ${id}`);
    });
});

// TCP сервер для мода
const tcpServer = net.createServer((socket) => {
    const id = Math.random().toString(36).substr(2, 9);
    let buffer = Buffer.alloc(0);
    let handshakeDone = false;

    clients.set(id, { type: 'tcp', socket });
    console.log(`TCP Player connected: ${id}`);

    socket.on('data', (data) => {
        if (!handshakeDone) {
            const str = data.toString();
            if (str.includes('Upgrade: websocket')) {
                // Відповідаємо на WebSocket handshake
                const key = str.match(/Sec-WebSocket-Key: (.+)/)?.[1]?.trim();
                const crypto = require('crypto');
                const accept = crypto
                    .createHash('sha1')
                    .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
                    .digest('base64');
                socket.write(
                    'HTTP/1.1 101 Switching Protocols\r\n' +
                    'Upgrade: websocket\r\n' +
                    'Connection: Upgrade\r\n' +
                    `Sec-WebSocket-Accept: ${accept}\r\n\r\n`
                );
                handshakeDone = true;
                console.log(`TCP Player handshake done: ${id}`);
            }
            return;
        }
        // Після handshake — пересилаємо аудіо всім
        broadcast(id, data);
    });

    socket.on('close', () => {
        clients.delete(id);
        console.log(`TCP Player disconnected: ${id}`);
    });

    socket.on('error', () => {
        clients.delete(id);
    });
});

const PORT = process.env.PORT || 3000;
const TCP_PORT = parseInt(PORT) + 1;

httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`VoiceChat WS server running on port ${PORT}`);
});

tcpServer.listen(8080, '0.0.0.0', () => {
    console.log(`VoiceChat TCP server running on port 8080`);
});
