import 'dotenv/config';
import { fileURLToPath } from 'node:url';
import express from 'express';
import app from './lib/app.js';

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Chat app: http://localhost:${port}`));
}

export default app;
