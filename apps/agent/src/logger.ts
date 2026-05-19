/** 간단한 콘솔 로거 (timestamp + level). */

type Level = 'info' | 'warn' | 'error' | 'debug';

function pad(n: number, w: number): string {
  return n.toString().padStart(w, '0');
}

function ts(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1, 2)}-${pad(d.getDate(), 2)} ${pad(d.getHours(), 2)}:${pad(d.getMinutes(), 2)}:${pad(d.getSeconds(), 2)}`;
}

function log(level: Level, msg: string, meta?: unknown): void {
  const line = `[${ts()}] [${level.toUpperCase().padEnd(5)}] ${msg}`;
  const stream = level === 'error' || level === 'warn' ? process.stderr : process.stdout;
  stream.write(line + (meta !== undefined ? ` ${JSON.stringify(meta)}` : '') + '\n');
}

export const logger = {
  info: (msg: string, meta?: unknown) => log('info', msg, meta),
  warn: (msg: string, meta?: unknown) => log('warn', msg, meta),
  error: (msg: string, meta?: unknown) => log('error', msg, meta),
  debug: (msg: string, meta?: unknown) => {
    if (process.env.AGENT_DEBUG === '1') log('debug', msg, meta);
  },
};
