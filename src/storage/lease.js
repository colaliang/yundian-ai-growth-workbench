import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { AsyncLocalStorage } from 'node:async_hooks';
const context = new AsyncLocalStorage();
function entered(scope, work) {
    const child = { lease: scope.lease, pending: new Set(), closing: false };
    const result = Promise.resolve().then(async () => {
        try {
            return await context.run(child, () => work(child.lease));
        }
        finally {
            await drain(child);
        }
    });
    // Each invocation drains its descendants before resolving to a transaction consumer.
    // Observe rejection immediately, while preserving it on the promise returned to the caller.
    const settled = result.then(() => { }, () => { });
    scope.pending.add(settled);
    void settled.then(() => scope.pending.delete(settled));
    return result;
}
async function drain(scope) {
    scope.closing = true;
    while (scope.pending.size)
        await Promise.all([...scope.pending]);
}
function checked(file) {
    const absolute = path.resolve(file);
    let cursor = absolute;
    while (true) {
        const stat = fs.lstatSync(cursor, { throwIfNoEntry: false });
        if (stat?.isSymbolicLink())
            throw Error('Lease junction/symlink rejected');
        const parent = path.dirname(cursor);
        if (parent === cursor)
            break;
        cursor = parent;
    }
    return absolute;
}
function canonical(root) {
    checked(root);
    const result = fs.realpathSync(root);
    if (!fs.statSync(result).isDirectory())
        throw Error('Lease root is not directory');
    return result;
}
function paths(root) { return { lock: checked(path.join(root, '.workbench-runtime', 'lock')), gate: checked(path.join(root, '.workbench-runtime', 'lock-recovery')) }; }
function identity(pid) {
    try {
        if (process.platform === 'win32')
            return execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `(Get-Process -Id ${pid} -ErrorAction Stop).StartTime.ToUniversalTime().Ticks`], { encoding: 'utf8', windowsHide: true, timeout: 5000, stdio: ['ignore', 'pipe', 'ignore'] }).trim() || null;
        if (process.platform === 'linux') {
            const stat = fs.readFileSync(`/proc/${pid}/stat`, 'utf8');
            return stat.slice(stat.lastIndexOf(')') + 2).split(' ')[19] ?? null;
        }
        return null;
    }
    catch {
        return null;
    }
}
function ownerAt(lock) {
    try {
        const value = JSON.parse(fs.readFileSync(checked(path.join(lock, 'owner.json')), 'utf8'));
        if (!Number.isSafeInteger(value.pid) || value.pid < 1 || typeof value.nonce !== 'string' || !value.nonce || value.root !== path.dirname(path.dirname(lock)) || !['read', 'write', 'recovery'].includes(value.purpose) || typeof value.createdAt !== 'string' || !(value.workspaceId === null || typeof value.workspaceId === 'string') || typeof value.hostname !== 'string' || typeof value.processIdentity !== 'string' || !value.processIdentity)
            return null;
        return value;
    }
    catch {
        return null;
    }
}
function state(owner, detailed = false) {
    if (!owner || owner.hostname !== os.hostname())
        return 'blocked';
    try {
        process.kill(owner.pid, 0);
    }
    catch (e) {
        return e.code === 'ESRCH' ? 'dead' : 'blocked';
    }
    // Every live PID blocks, including a reused PID. Identity mismatch never permits stealing.
    if (detailed) {
        const current = identity(owner.pid);
        return current && current === owner.processIdentity ? 'alive' : 'blocked';
    }
    return 'alive';
}
function release(root, nonce) {
    const { lock } = paths(root);
    const owner = ownerAt(lock);
    if (!owner || owner.nonce !== nonce)
        throw Error('Lease release nonce mismatch');
    fs.unlinkSync(checked(path.join(lock, 'owner.json')));
    fs.rmdirSync(lock);
}
export function inspectLease(root) {
    const { lock, gate } = paths(canonical(root));
    return { status: fs.existsSync(gate) ? 'blocked' : !fs.existsSync(lock) ? 'free' : state(ownerAt(lock), true) };
}
function reclaim(root) {
    const { lock, gate } = paths(root);
    const candidate = ownerAt(lock);
    if (state(candidate) !== 'dead')
        return;
    try {
        fs.mkdirSync(gate);
    }
    catch (e) {
        if (e.code === 'EEXIST')
            return;
        throw e;
    }
    try {
        const latest = ownerAt(lock);
        if (latest && candidate && latest.nonce === candidate.nonce && state(latest) === 'dead')
            release(root, latest.nonce);
    }
    finally {
        fs.rmdirSync(checked(gate));
    }
}
function removeOwnedEmpty(lock, created) {
    const current = fs.lstatSync(checked(lock), { throwIfNoEntry: false });
    // An acquisition failure must never remove a replacement directory or a published owner.
    if (current?.isDirectory() && current.dev === created.dev && current.ino === created.ino && fs.readdirSync(lock).length === 0)
        fs.rmdirSync(lock);
}
export async function withWorkspaceLease(root, purpose, work, options = {}) {
    const waitMs = options.waitMs ?? 5000;
    if (!Number.isFinite(waitMs) || waitMs < 0 || waitMs > 5000)
        throw Error('Invalid waitMs: bounded 0..5000 required');
    if (!['read', 'write', 'recovery'].includes(purpose))
        throw Error('Invalid lease purpose');
    root = canonical(root);
    // Reject workspace junctions before creating even the runtime directory.
    const binding = checked(path.join(root, 'growth-workspace', 'workspace.json'));
    const nested = context.getStore();
    if (nested?.lease.root === root) {
        if (nested.closing)
            throw Error('Lease context closed');
        if (ownerAt(paths(root).lock)?.nonce !== nested.lease.nonce)
            throw Error('Lease context nonce mismatch');
        return entered(nested, work);
    }
    const { lock, gate } = paths(root);
    fs.mkdirSync(checked(path.dirname(lock)), { recursive: true });
    const deadline = Date.now() + waitMs;
    while (true) {
        checked(lock);
        checked(gate);
        if (!fs.existsSync(gate)) {
            let created;
            try {
                fs.mkdirSync(lock);
                created = fs.lstatSync(lock);
            }
            catch (e) {
                if (e.code !== 'EEXIST')
                    throw e;
            }
            if (created) {
                let owner;
                try {
                    if (!fs.existsSync(gate)) {
                        const processIdentity = identity(process.pid);
                        if (!processIdentity)
                            throw Error('Lease blocked: process identity unavailable');
                        let workspaceId = null;
                        try {
                            const value = JSON.parse(fs.readFileSync(checked(binding), 'utf8'));
                            workspaceId = typeof value.workspaceId === 'string' ? value.workspaceId : null;
                        }
                        catch (e) {
                            if (e.code !== 'ENOENT')
                                throw e;
                        }
                        const candidate = { root, workspaceId, nonce: crypto.randomUUID(), pid: process.pid, createdAt: new Date().toISOString(), purpose, hostname: os.hostname(), processIdentity };
                        fs.writeFileSync(checked(path.join(lock, 'owner.json')), JSON.stringify(candidate), { flag: 'wx', mode: 0o600 });
                        owner = candidate;
                    }
                }
                catch (e) {
                    removeOwnedEmpty(lock, created);
                    throw e;
                }
                if (owner) {
                    const scope = { lease: Object.freeze(owner), pending: new Set(), closing: false };
                    try {
                        return await context.run(scope, () => work(scope.lease));
                    }
                    finally {
                        await drain(scope);
                        release(root, owner.nonce);
                    }
                }
                removeOwnedEmpty(lock, created);
            }
            else
                reclaim(root);
        }
        if (Date.now() >= deadline)
            throw Error('Workspace lease blocked');
        await new Promise(resolve => setTimeout(resolve, Math.min(25, Math.max(0, deadline - Date.now()))));
    }
}
