const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: process.env.PORT || 3000 });

const clients = new Map();

wss.on('connection', (ws) => {
    const id = Math.random().toString(36).substr(2, 9);
    clients.set(id, ws);
    console.log(`Player connected: ${id}`);

    // Отправляем игроку его ID
    ws.send(JSON.stringify({ type: 'id', id }));

    ws.on('message', (data) => {
        // Если это аудио данные — рассылаем всем кроме отправителя
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
});

console.log('VoiceChat server running!');
