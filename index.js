const axios = require('axios');
const express = require('express');

const app = express();
const homePage = `<html>
<body>
  <h1>Cloud Benchmark</h1>
  The simple application to verify CPU speed and network latency of your application runtime.
  <ul>
    <li><a href="/prime/2000000000">/prime/2000000000</a> - calculates the first prime number greater than 2000000000 (you can change the number)</li>
    <li><a href="/recursive/12">/recursive/12</a> - calculates the fibonacci sequence with recursive inefficient algorithm</li>
  </ul>

  
</body>
</html>`

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

function fibIterative(n) {
  const sequence = [0, 1];
  for (i = 2; i <= n; i++) {
    sequence[i] = sequence[i - 2] + sequence[i - 1];
  }
  return sequence[n];
}

app.get('/fibonacci/:n', (req, res) => {
  const t1 = Date.now()
  const result = fibIterative(req.params["n"]);
  const t2 = Date.now()
  res.send({ n: req.params["n"], fibonacci: result, msTime: t2 - t1 });
});

app.get('/prime/:n', async (req, res) => {
  const t1 = Date.now()
  const n = req.params["n"]
  let result = prime(n)
  const t2 = Date.now()
  res.send({ n: req.params["n"], prime: result , msTime: t2 - t1 });
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


app.get('/', (req, res) => {
  res.send(homePage);
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