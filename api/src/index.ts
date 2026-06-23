import { loadConfig } from './config.js';
import { createDatabase } from './db/createDatabase.js';
import { buildApp } from './app.js';

const { databasePath, port } = loadConfig();
const db = createDatabase(databasePath);
const app = buildApp(db);

app.listen({ port, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    process.stderr.write(`${err.message}\n`);
    process.exit(1);
  }

  process.stdout.write(`Server listening at ${address}\n`);
});
