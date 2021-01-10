import ServerPlus from '@supercollider/server-plus';

import WebSocket from 'ws';

const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', async (ws) => {
  console.log('Established WS connection');

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

  const group = await s.group();

  ws.on('message', (dat) => {
    console.log(dat);

    // Function that spawns a synth
    const spawn = async (mult = 1) => {
      console.log(mult);
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
  });
});
