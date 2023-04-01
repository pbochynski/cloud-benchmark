const { StaticPool } = require('node-worker-threads-pool');

const primeCalculator = new StaticPool({
  size: 16,
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
  console.log("Calculate prime number >=", n)
  while (!isPrime(i)) {
    console.log(i, "is not prime")
    ++i
  }
  console.log(i, "is prime")
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
  const result = await primeCalculator.exec(req.params["n"])
  const t2 = Date.now()
  res.send({ n: req.params["n"], prime: result, msTime: t2 - t1 });
});

app.get('/recursive/:n', (req, res) => {
  const t1 = Date.now()
  const result = fibRecursive(req.params["n"]);
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