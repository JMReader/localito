import { createApp } from '../dist/app.js';

let appPromise = null;

async function getApp() {
  if (!appPromise) {
    appPromise = createApp({
      logger: false,
      dbPath: process.env.DATABASE_PATH || '/tmp/localito.db',
      demoMode: true,
      corsOrigins: ['*'],
    });
  }
  const app = await appPromise;
  await app.ready();
  return app;
}

export default async function handler(req, res) {
  const app = await getApp();
  app.server.emit('request', req, res);
}
