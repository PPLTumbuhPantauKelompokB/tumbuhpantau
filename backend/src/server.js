import 'dotenv/config';
import { createApp } from './app.js';

import { parsePort } from './port.js';

const port = parsePort(process.env.PORT);

const app = createApp();
app.listen(port, '127.0.0.1', () => {
  console.info(`TumbuhPantau API aktif: http://127.0.0.1:${port}/api/health`);
});
