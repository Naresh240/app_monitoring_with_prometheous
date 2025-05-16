const express = require('express');
const client = require('prom-client');

const app = express();
const port = 3000;

// Prometheus Registry
const register = new client.Registry();
client.collectDefaultMetrics({ register });

// Counter Metric
const requestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'endpoint']
});
register.registerMetric(requestCounter);

// Histogram Metric
const httpRequestDurationSeconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'endpoint', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 1, 1.5, 2, 3, 5]
});
register.registerMetric(httpRequestDurationSeconds);

// Middleware for metrics
app.use((req, res, next) => {
  const start = process.hrtime();

  requestCounter.inc({ method: req.method, endpoint: req.path });

  res.on('finish', () => {
    const [seconds, nanoseconds] = process.hrtime(start);
    const durationInSeconds = seconds + nanoseconds / 1e9;

    httpRequestDurationSeconds.observe(
      {
        method: req.method,
        endpoint: req.route?.path || req.path,
        status_code: res.statusCode
      },
      durationInSeconds
    );
  });

  next();
});

// Root endpoint
app.get('/', (req, res) => {
  res.send('Hello, World!');
});

// Simulate slow endpoint
app.get('/slow', async (req, res) => {
  await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5 sec delay
  res.send('Slow response');
});

// Metrics endpoint for Prometheus
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Start the server
app.listen(port, () => {
  console.log(`App running at http://localhost:${port}`);
});
