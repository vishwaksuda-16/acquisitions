import express from 'express';
import logger from './config/logger.js';
const app = express();

app.get('/', (req, res) => {
  logger.info("Hello from Acquisitions!");
  
  res.status(200).send('Hello from Aquisitions!');
});

export default app;
