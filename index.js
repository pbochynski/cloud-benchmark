const axios = require('axios');
const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const numberOfFiles = 3000;
const contentLength = 20 * 1024; // 20kB in bytes
const root_folder = process.env.DATA_ROOT || __dirname
const outputDir = path.join(root_folder, 'output');

const homePage = `<html>
<body>
  <h1>Cloud Benchmark 0.0.13</h1>
  The simple application to verify CPU speed, network latency, and filesystem throughput of your application runtime.
  <ul>
    <li><a href="/prime/2000000000">/prime/2000000000</a> - calculates the first prime number greater than 2000000000 (you can change the number)</li>
    <li><a href="/recursive/12">/recursive/12</a> - calculates the fibonacci sequence with recursive inefficient algorithm</li>
    <li><a href="/generate-files?prefix=a&n=3000&size=20000&deleteFirst=false">/generate-files?prefix=a&n=3000&size=20000&deleteFirst=false</a> - generates 3000 text files of size 20KB each</li>
    <li><a href="/list-files">/list-files</a> - lists generated files</li>
    <li><a href="/file-content/file_1.txt">/file-content/{filename}</a> - retrieve file content</li>
  </ul>

  
</body>
</html>`

// Create the output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

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


function pipeAndWait(input, output){
  return new Promise((resolve,reject)=>{
    input.pipe(output)
    output.on('finish',(error)=>{

      console.log("Finish happened", error)
      resolve(error)
    })
  })
}
const { Readable } = require('stream');

class RandomCharacterStream extends Readable {
  constructor(options = {}) {
    super(options);
    this.characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    this.count = options.count || 1000; // Number of random characters to generate
  }

  _read(size) {
    let data = '';
    for (let i = 0; i < size && i<this.count; i++) {
      const randomIndex = Math.floor(Math.random() * this.characters.length);
      data += this.characters.charAt(randomIndex);
    }
    this.push(data);
    this.count -= size;
    if (this.count <= 0) {
      this.push(null); // No more data to push
      console.log("Stream drained")
    }
  }
}

async function writeFiles(options) {
  
  for (let i = 1; i <= options.n; i++) {
    const fileName = `${options.prefix}_${i}.txt`;
    const filePath = path.join(outputDir, fileName);
    if (options.deleteFirst) {
      try{
        fs.unlinkSync(filePath); // delete first
      } catch (e) {
        // catch not found exception
      }  
    }
    
    let writeStream = fs.createWriteStream(filePath)
    let randomCharacterStream = new RandomCharacterStream({ count: options.size });

    console.log("Finishing writes... ",new Date() )
    await pipeAndWait(randomCharacterStream,writeStream)
    console.log("Write finished at %s",new Date())
  }
};

function getOptions(query) {
  let options = {
    prefix: 'file',
    deleteFirst: false,
    size: 10000,
    n: 3000
  }
  if (query.prefix) {
    options.prefix = query.prefix
  }
  if (query.deleteFirst) {
    options.deleteFirst = query.deleteFirst
  }
  if (query.size) {
    options.size = Math.floor(Number(query.size))
  }
  if (query.n) {
    options.n = Math.floor(Number(query.n))
  }
  return options
}
// Route to generate the files
app.get('/generate-files', async (req, res) => {
  const startTime = process.hrtime();
  let options=getOptions(req.query)
  await writeFiles(options);
  const endTime = process.hrtime(startTime);
  const executionTime = (endTime[0] + endTime[1] / 1e9);
  const filesPerSecond = options.n/executionTime
  const MBPerSecond = options.n*options.size/(1024*1024*executionTime)

  res.json({ message: `${options.n} files generated successfully in ${executionTime.toFixed(3)} seconds`,
  filesPerSecond,
  MBPerSecond,
  dataRoot: process.env.DATA_ROOT,
  outputDir: outputDir });
});

// Route to list the files
app.get('/list-files', (req, res) => {
  fs.readdir(outputDir, (err, files) => {
    if (err) {
      res.status(500).json({ error: 'Error listing files.' });
    } else {
      res.json({ files });
    }
  });
});

// Route to get file content
app.get('/file-content/:filename', (req, res) => {
  const fileName = req.params.filename;
  const filePath = path.join(outputDir, fileName);

  fs.readFile(filePath, 'utf8', (err, content) => {
    if (err) {
      res.status(404).json({ error: 'File not found.' });
    } else {
      res.send(content);
    }
  });
});

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