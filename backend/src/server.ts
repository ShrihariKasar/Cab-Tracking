import http from 'http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { initTrackingGateway } from './gateway/trackingGateway.js';

const app = createApp();
const server = http.createServer(app);
const io = initTrackingGateway(server);
app.set('io', io);

server.listen(env.port, () => {
  console.log(`Simple Cab Tracking API running on port ${env.port}`);
});
