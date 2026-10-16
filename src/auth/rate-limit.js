import { isIP } from 'node:net';
const WINDOW = 300000, IDLE = 1200000, MAX_BUCKETS = 1000;
/** In-process protection only; restarting a process resets counters. */
export class LoginLimiter {
    ips = new Map();
    instances = new Map();
    key(instanceId, clientKey) { return JSON.stringify([instanceId, clientKey]); }
    prune(nowMs) { for (const [key, b] of this.ips)
        if (nowMs - b.last >= IDLE)
            this.ips.delete(key); for (const [key, b] of this.instances)
        if (nowMs - b.last >= IDLE)
            this.instances.delete(key); }
    current(bucket, nowMs) { if (bucket && nowMs - bucket.started >= WINDOW) {
        bucket.started = nowMs;
        bucket.count = 0;
        bucket.until = 0;
    } return bucket; }
    check(instanceId, clientKey, nowMs) { this.prune(nowMs); const key = this.key(instanceId, clientKey), ip = this.current(this.ips.get(key), nowMs), instance = this.current(this.instances.get(instanceId), nowMs); if (ip)
        ip.last = nowMs; if (instance)
        instance.last = nowMs; const wait = Math.max(ip?.until ?? 0, instance?.until ?? 0) - nowMs; const full = !ip && this.ips.size >= MAX_BUCKETS; return { allowed: wait <= 0 && !full, retryAfterSeconds: wait > 0 ? Math.ceil(wait / 1000) : full ? 1 : 0 }; }
    failure(instanceId, clientKey, nowMs) { this.prune(nowMs); const add = (map, key, threshold) => { let b = this.current(map.get(key), nowMs); if (!b) {
        if (map.size >= MAX_BUCKETS)
            return;
        b = { started: nowMs, count: 0, until: 0, last: nowMs };
        map.set(key, b);
    } b.last = nowMs; b.count++; if (b.count >= threshold)
        b.until = nowMs + Math.min(60, 2 ** Math.min(6, b.count - threshold)) * 1000; }; add(this.ips, this.key(instanceId, clientKey), 5); add(this.instances, instanceId, 30); }
    success(instanceId, clientKey, nowMs) { this.prune(nowMs); this.ips.delete(this.key(instanceId, clientKey)); /* Aggregate failures intentionally survive successful logins. */ }
}
const normalized = (value) => value.startsWith('::ffff:') && isIP(value.slice(7)) === 4 ? value.slice(7) : value;
export function trustedProxySocket(req, trustProxy = false, trustedProxyAddresses = []) { const socket = normalized(req.socket.remoteAddress ?? ''); return trustProxy && isIP(socket) !== 0 && trustedProxyAddresses.some(x => isIP(x) !== 0 && normalized(x) === socket); }
export function clientAddress(req, trustProxy = false, trustedProxyAddresses = []) { const socket = normalized(req.socket.remoteAddress ?? 'unknown'); const forwarded = req.headers['x-forwarded-for']; if (trustedProxySocket(req, trustProxy, trustedProxyAddresses) && typeof forwarded === 'string') {
    const addresses = forwarded.split(',').map(x => x.trim());
    if (addresses.length && addresses.every(x => isIP(x) !== 0))
        return normalized(addresses[0]);
} return socket; }
