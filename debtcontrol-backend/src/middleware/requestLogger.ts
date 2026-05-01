const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const levels: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function shouldLog(level: LogLevel): boolean {
  return levels[level] >= (levels[LOG_LEVEL as LogLevel] || levels.info);
}

export function logRequest(
  method: string,
  path: string,
  status: number,
  durationMs: number
): void {
  if (!shouldLog('info')) return;

  const timestamp = new Date().toISOString();
  console.log(`${timestamp} INFO ${method} ${path} ${status} ${durationMs}ms`);
}

export function logError(message: string, error?: Error): void {
  if (!shouldLog('error')) return;

  const timestamp = new Date().toISOString();
  console.error(`${timestamp} ERROR ${message}`, error?.stack || error?.message || error);
}

export function logDebug(message: string): void {
  if (!shouldLog('debug')) return;

  const timestamp = new Date().toISOString();
  console.log(`${timestamp} DEBUG ${message}`);
}