import ServerPlus from '@supercollider/server-plus';

import Express from 'express';

import WebSocket from 'ws';

const Quaternion = require('quaternion');

// Create a Socket.IO server
const app = Express();
const server = require('http').Server(app);
const socketio = require('socket.io')(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'PUT'],
  },
});

socketio.on('connection', () => {
  console.log('New Socket.IO connection established.');
});

server.listen(3000, () => {
  console.log('HTTP server listening on *:3000');
});

async function initSuperCollider() {
// Open a connection to the SuperCollider server
  const host = '192.168.86.48';
  const port = '57110';
  const s = new ServerPlus({ host, serverPort: port });
  await s.connect();

  // Define a synth
  const def = await s.synthDef(
    'sine',
    `
    { |mult=1, timeScale=1|
      var sin, env;
      sin = SinOsc.ar(440 * mult);
      env = sin * EnvGen.kr(Env([0, 1, 0], [0.01, 0.5, 1]), doneAction: 2);

      Out.ar(0, env);
    }
    `,
  );
}

// WSS to listen to the Arduino
const wss = new WebSocket.Server({ port: 8000, clientTracking: true });

wss.on('connection', async (ws) => {
  console.log('Established WS connection');

  let timestamp = Date.now();
  const updateInterval = 200; // in ms

  ws.on('message', (dat) => {
    // console.log(dat);

    // Broadcast an event via Socket.IO
    try {
      const json = JSON.parse(String(dat));

      const {
        gyroscope: gyro, acceleration: accel, magnetometer: mag, quaternion: quat,
      } = json;

      const {
        w: qw, x: qx, y: qy, z: qz,
      } = quat;

      const qt = Quaternion([qw, qx, qy, qz]);
      const a = [accel.x, accel.y, accel.z];
      const ar = qt.rotateVector(a);
      const gconst = -9.8065;
      // Filter gravity from the rotated velocity
      const aC = [ar[0], ar[1], ar[2] + gconst];

      socketio.emit('orientation_update', { quaternion: quat });

      if (Date.now() - timestamp >= updateInterval) {
        socketio.emit('sensor_update', {
          rotatedGravity: [null, null, null],
          linearAccel: aC,
          ...json,
        });
        timestamp = Date.now();
      }
    } catch (e) {
      console.error(e);
    }

    // Function that spawns a synth
    /*
    const group = await s.group();

    const spawn = async (mult = 1) => {
      s.synth(
        def,
        {
          mult,
        },
        group,
      );
    };

    const getMaxVal = (json: object) => {
      let curMax = 0;

      Object.values(json).forEach((v) => {
        if (v > curMax) {
          curMax = v;
        }
      });
      return curMax;
    };

    // try to parse the incomming data
    const jdat = JSON.parse(String(dat));
    spawn(Math.log(getMaxVal(jdat)) + 2);
     */
  });
});
