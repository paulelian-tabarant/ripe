export interface Config {
  databasePath: string;
  port: number;
}

export function loadConfig(): Config {
  const databasePath = process.env.DATABASE_PATH;

  if (!databasePath) throw new Error('Missing required env var: DATABASE_PATH');

  const portStr = process.env.PORT;

  if (!portStr) throw new Error('Missing required env var: PORT');
  const port = Number(portStr);

  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error(`PORT must be a valid port number, got: "${portStr}"`);

  return { databasePath, port };
}
