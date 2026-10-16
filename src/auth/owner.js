import crypto from 'node:crypto';
import { readInstanceConfig, writeInstanceConfig } from "../runtime/instance.js";
const sessions = new WeakMap();
export function createOwnerConfig(publicMode, passwordHash, sessionTtlSeconds = 86400) { const config = { publicMode, passwordHash, sessionTtlSeconds }; sessions.set(config, new Map()); return config; }
export function hashPassword(password) { if (!password || password.length > 1024)
    throw Error('Invalid owner password'); const salt = crypto.randomBytes(16).toString('hex'); return 'scrypt$' + salt + '$' + crypto.scryptSync(password, salt, 64).toString('hex'); }
export function verifyPassword(password, hash) { if (typeof password !== 'string' || password.length > 1024)
    return false; const match = /^scrypt\$([a-f0-9]{32})\$([a-f0-9]{128})$/.exec(hash); if (!match)
    return false; return crypto.timingSafeEqual(crypto.scryptSync(password, match[1], 64), Buffer.from(match[2], 'hex')); }
const cookie = (req) => (req.headers.cookie || '').split(';').map(v => v.trim()).find(v => v.startsWith('wb_owner='))?.slice(9) || '';
export function authorizeOwner(req, config, nowMs = Date.now()) { if (!config.publicMode)
    return { allowed: true, loginRequired: false, setupRequired: false }; if (!config.passwordHash)
    return { allowed: false, loginRequired: false, setupRequired: true }; const map = sessions.get(config); if (map)
    pruneSessions(map, nowMs); const key = cookie(req), expires = map?.get(key) || 0; const allowed = expires > nowMs; if (!allowed)
    map?.delete(key); return { allowed, loginRequired: !allowed, setupRequired: false }; }
function pruneSessions(map, nowMs) { for (const [key, expires] of map)
    if (expires <= nowMs)
        map.delete(key); }
export function issueOwnerSession(config, nowMs = Date.now()) { let map = sessions.get(config); if (!map) {
    map = new Map();
    sessions.set(config, map);
} pruneSessions(map, nowMs); while (map.size >= 1000)
    map.delete(map.keys().next().value); const key = crypto.randomBytes(32).toString('base64url'); map.set(key, nowMs + config.sessionTtlSeconds * 1000); return key; }
export function revokeOwnerSession(req, config) { sessions.get(config)?.delete(cookie(req)); }
export function loadOwnerConfig(ctx, publicMode) { const value = readInstanceConfig(ctx, 'owner'); return createOwnerConfig(publicMode, typeof value.passwordHash === 'string' ? value.passwordHash : null); }
export function saveOwnerPassword(ctx, password) { writeInstanceConfig(ctx, 'owner', { passwordHash: hashPassword(password) }); }
