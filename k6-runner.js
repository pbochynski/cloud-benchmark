const { resolve } = require('path');
const { default: k6 } = require('k6');

const scriptPath = resolve(__dirname, 'test.js');

const options = {
  vus: 10,
  duration: '10s',
};

k6.run({ 
  ...options,
  scenarios: {
    cpuIntensive: {
      executor: 'constant-vus',
      vus: 10,
      tags: { example: 'cpu-intensive' },
      exec: scriptPath,
      env: {
        ENDPOINT: 'http://localhost:3000/cpu',
        FIBONACCI_NUMBER: '35',
      },
    },
    memoryIntensive: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 10 },
        { duration: '10s', target: 20 },
      ],
      tags: { example: 'memory-intensive' },
      exec: scriptPath,
      env: {
        ENDPOINT: 'http://localhost:3000/memory',
        FIBONACCI_NUMBER: '30',
      },
    },
  },
});
