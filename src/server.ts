import Server from '@supercollider/server';

const s = new Server();

async function start() {
  await s.connect();
}

start();
