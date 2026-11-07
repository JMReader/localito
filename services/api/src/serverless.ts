import { createApp } from './app.js';

let appPromise: any = null;

async function getApp() {
  if (!appPromise) {
    appPromise = createApp({
      logger: false,
      dbPath: process.env.DATABASE_PATH ?? ':memory:',
      demoMode: true,
      corsOrigins: ['*'],
    });
  }
  const app = await appPromise;
  await app.ready();
  return app;
}

export default async function handler(req: any, res: any) {
  try {
    const app = await getApp();
    app.server.emit('request', req, res);
  } catch (err: any) {
    console.error('Error in serverless handler:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      error: 'SERVERLESS_ERROR',
      message: err?.message,
      stack: err?.stack,
    }));
  }
}
