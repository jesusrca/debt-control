interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const aiLimits = new Map<string, RateLimitEntry>();
const uploadLimits = new Map<string, RateLimitEntry>();
const generalLimits = new Map<string, RateLimitEntry>();

const AI_RATE_LIMIT = parseInt(process.env.AI_RATE_LIMIT_REQUESTS || '10', 10);
const AI_RATE_WINDOW = parseInt(process.env.AI_RATE_LIMIT_WINDOW_MS || '60000', 10);
const UPLOAD_RATE_LIMIT = 20;
const UPLOAD_RATE_WINDOW = 60000;
const GENERAL_RATE_LIMIT = 100;
const GENERAL_RATE_WINDOW = 60000;

function getClientIP(req: { ip?: string; connection?: { remoteAddress?: string }; headers?: { [key: string]: string } }): string {
  return req.ip || req.connection?.remoteAddress || req.headers?.['x-forwarded-for'] as string || 'unknown';
}

function checkRateLimit(limits: Map<string, RateLimitEntry>, ip: string, maxRequests: number, windowMs: number): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = limits.get(ip);

  if (!entry || now > entry.resetAt) {
    limits.set(ip, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetIn: windowMs };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetIn: entry.resetAt - now };
  }

  entry.count++;
  return { allowed: true, remaining: maxRequests - entry.count, resetIn: entry.resetAt - now };
}

export function aiRateLimiter(req: { ip?: string; connection?: { remoteAddress?: string }; headers?: { [key: string]: string } }): { allowed: boolean; remaining: number; resetIn: number } {
  const ip = getClientIP(req);
  return checkRateLimit(aiLimits, ip, AI_RATE_LIMIT, AI_RATE_WINDOW);
}

export function uploadRateLimiter(req: { ip?: string; connection?: { remoteAddress?: string }; headers?: { [key: string]: string } }): { allowed: boolean; remaining: number; resetIn: number } {
  const ip = getClientIP(req);
  return checkRateLimit(uploadLimits, ip, UPLOAD_RATE_LIMIT, UPLOAD_RATE_WINDOW);
}

export function generalRateLimiter(req: { ip?: string; connection?: { remoteAddress?: string }; headers?: { [key: string]: string } }): { allowed: boolean; remaining: number; resetIn: number } {
  const ip = getClientIP(req);
  return checkRateLimit(generalLimits, ip, GENERAL_RATE_LIMIT, GENERAL_RATE_WINDOW);
}

export function cleanupExpiredEntries(): void {
  const now = Date.now();

  for (const [key, entry] of aiLimits.entries()) {
    if (now > entry.resetAt) aiLimits.delete(key);
  }
  for (const [key, entry] of uploadLimits.entries()) {
    if (now > entry.resetAt) uploadLimits.delete(key);
  }
  for (const [key, entry] of generalLimits.entries()) {
    if (now > entry.resetAt) generalLimits.delete(key);
  }
}

setInterval(cleanupExpiredEntries, 60000);