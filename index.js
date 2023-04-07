const { StaticPool } = require('node-worker-threads-pool');
const axios = require('axios');

const primeCalculator = new StaticPool({
  size: 4,
  task: prime
});

const express = require('express');
const app = express();
const { createClient } = require('redis');
const client = createClient();

function prime(n) {
  function isPrime(n) {
    for (let i=2;i<=n/2;++i) {
      if (n%i==0){
        return false
      }
    }
    return true
  }  
  let i=parseInt(n)
  while (!isPrime(i)) {
    ++i
  }
  return i
}

function fibRecursive(num) {
  if (num == 1) return 1;
  if (num == 0) return 0;
  return fibRecursive(num - 1) + fibRecursive(num - 2);
}
function fibIterative(n) {
  const sequence = [0, 1];
  for (i = 2; i <= n; i++) {
    sequence[i] = sequence[i - 2] + sequence[i - 1];
  }
  return sequence[n];
}


var requestsInFlight = 0
var allocated = []
// CPU-intensive endpoint
app.get('/cpu/:n', (req, res) => {
  const t1 = Date.now()
  const result = fibIterative(req.params["n"]);
  const t2 = Date.now()
  res.send({ n: req.params["n"], fibonacci: result, msTime: t2 - t1 });
});

app.get('/prime/:n', async (req, res) => {
  const t1 = Date.now()
  let parallel = req.query.parallel
  const n = req.params["n"]
  let result
  if (parallel) {
    result = await primeCalculator.exec(n)
  } else {
    result = prime(n)
  }
  const t2 = Date.now()
  res.send({ n: req.params["n"], prime: result, parallel: parallel ? true:false, msTime: t2 - t1 });
});

app.get('/recursive/:n', async (req, res) => {
  const t1 = Date.now()
  let n = req.params["n"]
  let url = req.query.url
  if (!url) {
    url = req.protocol + '://' + req.get('host')
  }
  let result = 1
  if (n>2) {
    let f1 = await axios.get(url+`/recursive/${n-1}`,{params:{url}})
    let f2 = await axios.get(url+`/recursive/${n-2}`,{params:{url}})
    result = f1.data.fibonacci+f2.data.fibonacci
  }
  const t2 = Date.now()
  res.send({ n: req.params["n"], fibonacci: result, msTime: t2 - t1 });
});

app.get('/key/:key', async (req, res) => {
  if (!client.isReady) {
    await client.connect();
  }
  let n = await client.incr(req.params["key"])
  res.send({ key: req.params["key"], value: n });
});

// Memory-intensive endpoint
app.get('/memory', async (req, res) => {

  const size = 1024 * 1024 * 10;
  const array = []
  for (let i = 0; i < size; ++i)
    array.push(i)
  allocated[requestsInFlight % 20] = array
  console.log(process.memoryUsage());
  res.send(`Allocated ${size} MB of memory`);
  requestsInFlight++;
});

// Hello World endpoint
app.get('/', (req, res) => {
  res.send('Hello World!');
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

// Trap CTRL-C
process.on('SIGINT', function (code) {
  console.log('SIGINT received');
  process.exit();
});