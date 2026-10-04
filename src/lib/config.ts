export const MIN_AUTH_SECRET_LENGTH = 32;

export type AppEnv = {
  AUTH_SECRET?: string;
  DATABASE_URL?: string;
};

function readEnv(env?: AppEnv): AppEnv {
  return (
    env ?? {
      AUTH_SECRET: process.env.AUTH_SECRET,
      DATABASE_URL: process.env.DATABASE_URL,
    }
  );
}

/** Names of required settings that are missing or too weak to trust. */
export function missingConfiguration(env?: AppEnv): string[] {
  const source = readEnv(env);
  const missing: string[] = [];
  if (!source.AUTH_SECRET || source.AUTH_SECRET.length < MIN_AUTH_SECRET_LENGTH) {
    missing.push("AUTH_SECRET");
  }
  if (!source.DATABASE_URL) {
    missing.push("DATABASE_URL");
  }
  return missing;
}

export function isConfigured(env?: AppEnv): boolean {
  return missingConfiguration(env).length === 0;
}
