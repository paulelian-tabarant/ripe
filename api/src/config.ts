export interface Config {
  databasePath: string;
  port: number;
}

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) throw new Error(`Missing required env var: ${name}`);

  return value;
}

export function loadConfig(): Config {
  const databasePath = requireEnv('DATABASE_PATH');
  const portStr = requireEnv('PORT');
  const port = Number(portStr);

  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error(`PORT must be a valid port number, got: "${portStr}"`);

  return { databasePath, port };
}
