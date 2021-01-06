import express from 'express';
import http from 'http';
import WebSocket from 'ws';

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ port: 8080 });

app.get('/', (req, res) => {
  res.send('hello world.');
});

wss.on('connection', (ws) => {
  console.log('opened websocket connection');
});

server.listen(3000, () => {
  console.log('listening on 3000');
});
