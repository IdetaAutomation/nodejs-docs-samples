import express = require('express');
// Imports the Google Cloud Tasks library.
import Gtasks = require('@google-cloud/tasks');
const PORT = Number(parseInt(process.env.PORT)) || 8080;
const HOST = "localhost";
const API_SERVICE_URL = "https://app.ideta.io";

const app = express();

// Instantiates a client.
const client = new Gtasks.CloudTasksClient();

const { createProxyMiddleware } = require('http-proxy-middleware');

app.use(express.json())

// app.use(createProxyMiddleware({
//    target: API_SERVICE_URL,
//    changeOrigin: true
// }));

function computeDelayInSeconds (delay: any): number {
  const { days, hours, minutes, seconds } = delay;
  let inSeconds = 0;
  if (days) inSeconds += days*24*3600;
  if (hours) inSeconds += hours*3600;
  if (minutes) inSeconds += minutes*60;
  if (seconds) inSeconds += seconds;
  return inSeconds;
}

async function createHttpTask(webhookUrl, body: any, delay: any, date?: string) {
  const inSeconds = computeDelayInSeconds(delay);
  const project = 'trhs-sandbox1';
  const queue = 'tanuqueue';
  const location = 'europe-west2';

  // const project = 'ideta-prod';
  // const queue = 'tanuqueue';
  // const location = 'europe-west2';

  const url = webhookUrl;
  let payload: any;
  try {
    payload = JSON.stringify(body);
  } catch(err) {
    payload = err;
  }

  // Construct the fully qualified queue name.
  const parent = client.queuePath(project, location, queue);

  const task: any = {};
  task.httpRequest =  {
      httpMethod: 'POST',
      url
    }

  if (payload) {
    task.httpRequest.body = Buffer.from(payload).toString('base64');
    task.httpRequest.headers = {
      'Content-Type': 'application/json'
    }
  }

  if (inSeconds) {
    task.scheduleTime = {
      seconds: inSeconds + Date.now() / 1000,
    };
  }

  const request = {parent: parent, task: task};
  const [response] = await client.createTask(request);
  return response;
}



app.get('/', (req, res) => {

  let obj: any = {
    success: true
  };
  obj.subdomain = req.subdomains;
  res.send(obj);
});

app.post('/boomerang', (req, res) => {
  console.log('req : ', req.body);
  const { webhookUrl, payload, delay, date } = req.body;
  console.log('payload : ', payload);
  const { authorization } = req.headers;
  if (authorization === 'Bearer !q9s#ZcFMrwz$VLuFu@HjhTSm5Ua1hKBt6GF7yfF') {
    try {
      const resp = createHttpTask(webhookUrl, payload, delay, date);
      console.log('working : ', resp);
      res.send({success: true});
    } catch(error) {
      console.log('error : ', error);
      res.send({
        success: false,
        error
      });
    }
  } else {
    console.log('error : ', 'Auth unsuccessful');
    res.send({
      success: false,
      error: 'Auth unsuccessful'
    })
  }
});

const server = app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
});

module.exports = server;


