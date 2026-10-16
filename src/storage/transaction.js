import { decodeBase64Bytes } from "./base64.js";
import { restoreCopyAuthority } from "./restore-authorization.js";
import { channel } from 'node:diagnostics_channel';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { atomicDirectoryInstall, assertDirectoryInstallAvailable, renameDirectoryNoReplace } from "./directory-install.js";
import { withWorkspaceLease } from "./lease.js";
import { WorkspaceStore } from "./workspace-store.js";
import { computeWorkspaceRevision } from "./revision.js";
import { transactionContext, contextFor, byteHash, diskBytes, diskHash, diskKind, directoryNames, safeRelative } from "./transaction-context.js";
const boundaryChannel = channel('workbench.transaction.boundary');
function boundary(phase, transactionId, entryIndex) { if (boundaryChannel.hasSubscribers)
    boundaryChannel.publish(Object.freeze({ phase, transactionId, ...(entryIndex === undefined ? {} : { entryIndex }) })); }
const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
const hex = /^[a-f0-9]{64}$/;
const manifest = 'growth-workspace/workspace.json';
export const durabilityCapabilities = Object.freeze({ fileFsync: true, directoryFsync: process.platform !== 'win32', powerLossGuaranteed: false, atomicDirectoryInstall });
function syncDirectory(dir) { if (process.platform === 'win32')
    return; const fd = fs.openSync(dir, 'r'); try {
    fs.fsyncSync(fd);
}
finally {
    fs.closeSync(fd);
} }
function runtimePath(root, ...parts) { let cursor = root; for (const part of ['.workbench-runtime', 'transactions', ...parts]) {
    cursor = path.join(cursor, part);
    if (fs.lstatSync(cursor, { throwIfNoEntry: false })?.isSymbolicLink())
        throw Error('Journal symlink rejected');
} return cursor; }
function durable(file, bytes, temporaryDirectory = path.dirname(file)) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temporary = path.join(temporaryDirectory, path.basename(file) + '.' + crypto.randomUUID() + '.tmp');
    try {
        const fd = fs.openSync(temporary, 'wx', 0o600);
        try {
            fs.writeFileSync(fd, bytes);
            fs.fsyncSync(fd);
        }
        finally {
            fs.closeSync(fd);
        }
        fs.renameSync(temporary, file);
        syncDirectory(path.dirname(file));
    }
    finally {
        if (fs.existsSync(temporary))
            fs.unlinkSync(temporary);
    }
}
function save(root, j) { durable(runtimePath(root, j.id, 'journal.json'), Buffer.from(JSON.stringify(j))); syncDirectory(runtimePath(root)); }
function directoryIdentity(file) {
    const stat = fs.lstatSync(file, { bigint: true, throwIfNoEntry: false });
    return stat?.isDirectory() && !stat.isSymbolicLink() ? { dev: String(stat.dev), ino: String(stat.ino), birthtimeNs: String(stat.birthtimeNs) } : null;
}
function sameDirectory(file, identity) { try {
    const actual = directoryIdentity(file);
    return !!actual && actual.dev === identity.dev && actual.ino === identity.ino && actual.birthtimeNs === identity.birthtimeNs;
}
catch {
    return false;
} }
function stageDirectories(root, j) {
    const missing = j.directories.filter(d => d.existed === false && j.entries.some(e => e.relativePath.startsWith(d.relativePath + '/')));
    // Node's Windows rename rejects an existing target directory, including an empty one.
    // POSIX rename can replace that target, so it must not stand in for no-replace installation.
    if (missing.length && !durabilityCapabilities.atomicDirectoryInstall)
        throw Error('Atomic directory installation unavailable on this platform');
    if (missing.length)
        assertDirectoryInstallAvailable(runtimePath(root, j.id));
    const created = [];
    for (const d of missing) {
        const stagingName = 'directory-' + crypto.randomUUID(), staged = runtimePath(root, j.id, stagingName);
        fs.mkdirSync(staged);
        const identity = directoryIdentity(staged);
        if (!identity || identity.ino === '0' || identity.dev !== String(fs.statSync(root, { bigint: true }).dev))
            throw Error('Stable same-volume directory identity unavailable');
        created.push({ relativePath: d.relativePath, stagingName, identity });
    }
    j.createdDirectories = created;
}
function workspaceId(root) { const bytes = diskBytes(safeRelative(root, manifest)); if (!bytes)
    return null; const value = JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, '')); if (value.workspaceId === undefined)
    return null; if (typeof value.workspaceId !== 'string' || !value.workspaceId)
    throw Error('Invalid workspace scope'); return value.workspaceId; }
function decode(value) { return decodeBase64Bytes(value); }
function object(value) { return !!value && typeof value === 'object' && !Array.isArray(value); }
export function validateEntityVersion(value) { if (object(value) && value.entityVersion !== undefined && (!Number.isSafeInteger(value.entityVersion) || value.entityVersion < 0))
    throw Error('Invalid entity version'); }
function scopes(value, id) { if (!object(value) && !Array.isArray(value))
    return; if (object(value) && Object.hasOwn(value, 'workspaceId') && value.workspaceId !== id)
    throw Error('Transaction record scope mismatch'); for (const item of Object.values(value))
    scopes(item, id); }
function relative(root, file) { return path.relative(root, file).split(path.sep).join('/'); }
function validateJournal(root, id, value) {
    if (!object(value) || value.formatVersion !== 1 || value.id !== id || !uuid.test(id) || value.root !== root || !uuid.test(value.nonce) || !['preparing', 'prepared', 'committed', 'blocked'].includes(value.phase) || typeof value.targetWorkspaceId !== 'string' || !value.targetWorkspaceId || value.workspaceId !== value.targetWorkspaceId || !(value.sourceWorkspaceId === null || typeof value.sourceWorkspaceId === 'string' && value.sourceWorkspaceId.length > 0) || !Array.isArray(value.entries) || !Array.isArray(value.reads) || !Array.isArray(value.directories))
        throw Error('Invalid journal scope or schema');
    const j = value, seen = new Set();
    for (const e of j.entries) {
        if (!object(e) || typeof e.relativePath !== 'string')
            throw Error('Invalid journal entry');
        safeRelative(root, e.relativePath);
        if (Object.keys(e).some(k => k.startsWith('opaque') && !['opaqueArchive', 'opaquePortable'].includes(k)))
            throw Error('Unknown opaque journal flag');
        if (e.opaqueArchive !== undefined && (e.opaqueArchive !== true || !(e.relativePath.startsWith('.workbench-backups/') || e.relativePath.startsWith('growth-workspace/migration-backups/'))))
            throw Error('Invalid opaque archive scope');
        if (e.opaquePortable !== undefined && (e.opaquePortable !== true || !e.relativePath.startsWith('.codebuddy/skills/') || e.opaqueArchive !== undefined))
            throw Error('Invalid opaque portable scope');
        const key = e.relativePath.toLowerCase();
        if (seen.has(key) || [...seen].some(p => p.startsWith(key + '/') || key.startsWith(p + '/')))
            throw Error('Journal path alias');
        seen.add(key);
        if (!hex.test(e.newHash) || !(e.oldHash === null || hex.test(e.oldHash)) || byteHash(decode(e.after)) !== e.newHash || (e.oldHash === null ? e.before !== null : typeof e.before !== 'string' || byteHash(decode(e.before)) !== e.oldHash))
            throw Error('Journal checksum mismatch');
    }
    const reads = new Set();
    for (const d of j.reads) {
        if (!object(d) || typeof d.relativePath !== 'string' || !(d.hash === null || hex.test(d.hash)))
            throw Error('Invalid read dependency');
        safeRelative(root, d.relativePath);
        if (reads.has(d.relativePath))
            throw Error('Duplicate dependency');
        reads.add(d.relativePath);
    }
    for (const e of j.entries)
        if (!j.reads.some(d => d.relativePath === e.relativePath && d.hash === e.oldHash))
            throw Error('Missing old dependency');
    if (j.existence !== undefined) {
        if (!Array.isArray(j.existence))
            throw Error('Invalid existence dependencies');
        for (const d of j.existence) {
            if (!object(d) || typeof d.relativePath !== 'string' || !['missing', 'file', 'directory', 'other'].includes(d.kind))
                throw Error('Invalid existence dependency');
            safeRelative(root, d.relativePath);
        }
    }
    for (const d of j.directories) {
        if (!object(d) || typeof d.relativePath !== 'string' || !Array.isArray(d.names) || d.existed !== undefined && typeof d.existed !== 'boolean' || d.names.some(n => typeof n !== 'string' || n.includes('/') || n.includes('\\')))
            throw Error('Invalid directory dependency');
        safeRelative(root, d.relativePath);
    }
    if (j.createdDirectories !== undefined) {
        if (!Array.isArray(j.createdDirectories))
            throw Error('Invalid created directories');
        const paths = new Set(), staged = new Set();
        for (const d of j.createdDirectories) {
            if (!object(d) || typeof d.relativePath !== 'string' || typeof d.stagingName !== 'string' || !d.stagingName.startsWith('directory-') || !uuid.test(d.stagingName.slice(10)) || !object(d.identity) || !['dev', 'ino', 'birthtimeNs'].every(key => typeof d.identity[key] === 'string' && /^\d+$/.test(d.identity[key])) || d.identity.ino === '0' || paths.has(d.relativePath) || staged.has(d.stagingName))
                throw Error('Invalid directory ownership');
            safeRelative(root, d.relativePath);
            paths.add(d.relativePath);
            staged.add(d.stagingName);
            if (!j.directories.some(before => before.relativePath === d.relativePath && before.existed === false && before.names.length === 0) || !j.entries.some(e => e.relativePath.startsWith(d.relativePath + '/')))
                throw Error('Invalid directory ownership scope');
        }
        for (const d of j.directories)
            if (d.existed === false && j.entries.some(e => e.relativePath.startsWith(d.relativePath + '/')) && !paths.has(d.relativePath))
                throw Error('Missing directory ownership');
    }
    const m = j.entries.find(e => e.relativePath === manifest);
    if (j.sourceWorkspaceId === null) {
        if (!m || JSON.parse(decode(m.after).toString('utf8')).workspaceId !== j.targetWorkspaceId)
            throw Error('Invalid bootstrap binding');
    }
    else if (j.sourceWorkspaceId !== j.targetWorkspaceId)
        throw Error('Journal scope transition rejected');
    for (const e of j.entries)
        if (e.relativePath.endsWith('.json') && !e.opaqueArchive && !e.opaquePortable) {
            const row = JSON.parse(decode(e.after).toString('utf8').replace(/^\uFEFF/, ''));
            validateEntityVersion(row);
            if (!e.relativePath.startsWith('growth-workspace/migration-backups/'))
                scopes(row, j.targetWorkspaceId);
        }
    const current = workspaceId(root);
    if (current !== j.sourceWorkspaceId && current !== j.targetWorkspaceId)
        throw Error('Journal customer scope mismatch');
    return j;
}
function conflicts(root, j) {
    const bad = new Set();
    const matchesNew = (e) => { try {
        return diskHash(safeRelative(root, e.relativePath)) === e.newHash;
    }
    catch {
        return false;
    } };
    const applied = j.entries.filter(matchesNew);
    const installed = new Set((j.createdDirectories ?? []).filter(d => sameDirectory(safeRelative(root, d.relativePath), d.identity)).map(d => d.relativePath));
    const ownDirectory = (rp) => j.createdDirectories !== undefined ? installed.has(rp) : applied.some(e => e.relativePath.startsWith(rp + '/'));
    function check(rp, valid) { try {
        if (!valid())
            bad.add(rp);
    }
    catch {
        bad.add(rp);
    } }
    for (const d of j.createdDirectories ?? [])
        check(d.relativePath, () => { const target = safeRelative(root, d.relativePath), staged = runtimePath(root, j.id, d.stagingName); return diskKind(target) === 'missing' ? sameDirectory(staged, d.identity) && directoryNames(staged).length === 0 : installed.has(d.relativePath) && diskKind(staged) === 'missing'; });
    for (const e of j.entries)
        check(e.relativePath, () => { const actual = diskHash(safeRelative(root, e.relativePath)); return actual === e.oldHash || actual === e.newHash; });
    for (const d of j.reads)
        if (!j.entries.some(e => e.relativePath === d.relativePath))
            check(d.relativePath, () => diskHash(safeRelative(root, d.relativePath)) === d.hash);
    for (const d of j.existence ?? [])
        check(d.relativePath, () => { const kind = diskKind(safeRelative(root, d.relativePath)); return kind === d.kind || d.kind === 'missing' && (kind === 'directory' && ownDirectory(d.relativePath) || kind === 'file' && applied.some(e => e.relativePath === d.relativePath)); });
    // New journals prove empty installed directories by their persisted identity;
    // legacy journals retain descendant proof. Unknown directory children still block.
    for (const d of j.directories)
        check(d.relativePath, () => {
            const file = safeRelative(root, d.relativePath), kind = diskKind(file);
            if (kind !== 'missing' && kind !== 'directory' || d.existed === true && kind !== 'directory' || d.existed === false && kind === 'directory' && !ownDirectory(d.relativePath))
                return false;
            const added = [...applied.map(e => e.relativePath), ...installed].filter(rp => rp.startsWith(d.relativePath + '/')).map(rp => rp.slice(d.relativePath.length + 1).split('/')[0]);
            const expected = [...new Set([...d.names, ...added])].sort();
            return JSON.stringify(directoryNames(file)) === JSON.stringify(expected);
        });
    return [...bad].sort();
}
function apply(root, j) {
    let bad = conflicts(root, j);
    if (bad.length) {
        j.phase = 'blocked';
        save(root, j);
        return bad;
    }
    for (const d of [...(j.createdDirectories ?? [])].sort((a, b) => a.relativePath.split('/').length - b.relativePath.split('/').length || a.relativePath.localeCompare(b.relativePath))) {
        bad = conflicts(root, j);
        if (bad.length) {
            j.phase = 'blocked';
            save(root, j);
            return bad;
        }
        const target = safeRelative(root, d.relativePath);
        if (sameDirectory(target, d.identity))
            continue;
        const staged = runtimePath(root, j.id, d.stagingName);
        if (!durabilityCapabilities.atomicDirectoryInstall || diskKind(target) !== 'missing' || !sameDirectory(staged, d.identity)) {
            j.phase = 'blocked';
            save(root, j);
            return [d.relativePath];
        }
        try {
            renameDirectoryNoReplace(staged, target);
        }
        catch {
            j.phase = 'blocked';
            save(root, j);
            return [d.relativePath];
        }
        if (!sameDirectory(target, d.identity)) {
            j.phase = 'blocked';
            save(root, j);
            return [d.relativePath];
        }
    }
    for (const e of j.entries) {
        bad = conflicts(root, j);
        if (bad.length) {
            j.phase = 'blocked';
            save(root, j);
            return bad;
        }
        const target = safeRelative(root, e.relativePath), actual = diskHash(target);
        if (actual === e.newHash)
            continue;
        if (actual !== e.oldHash) {
            j.phase = 'blocked';
            save(root, j);
            return [e.relativePath];
        }
        durable(target, decode(e.after), runtimePath(root, j.id));
        boundary('applied', j.id, j.entries.indexOf(e));
    }
    bad = conflicts(root, j);
    if (bad.length) {
        j.phase = 'blocked';
        save(root, j);
        return bad;
    }
    j.phase = 'committed';
    save(root, j);
    return [];
}
function archivePreparing(root, j) {
    // Preparing has never applied business bytes. Retire it while its original source
    // binding is still valid, before a later bootstrap may choose another identity.
    if (workspaceId(root) !== j.sourceWorkspaceId)
        throw Error('Preparing journal source scope mismatch');
    const history = path.join(path.dirname(runtimePath(root)), 'transaction-history');
    const stat = fs.lstatSync(history, { throwIfNoEntry: false });
    if (stat && (!stat.isDirectory() || stat.isSymbolicLink()))
        throw Error('Invalid transaction history directory');
    if (!stat)
        fs.mkdirSync(history);
    const target = path.join(history, j.id);
    if (fs.lstatSync(target, { throwIfNoEntry: false }))
        throw Error('Transaction history already exists');
    fs.renameSync(runtimePath(root, j.id), target);
    syncDirectory(history);
}
function recoverHeld(root) {
    const result = { recovered: [], blocked: [] }, dir = runtimePath(root);
    for (const id of directoryNames(dir)) {
        if (!uuid.test(id)) {
            result.blocked.push({ transactionId: id, paths: ['journal'] });
            continue;
        }
        let j;
        try {
            const file = runtimePath(root, id, 'journal.json');
            if (!fs.existsSync(file)) {
                // An interrupted preparing write may only leave its private temp file. No prepared marker exists.
                const names = directoryNames(runtimePath(root, id));
                if (names.every(n => /^journal\.json\.[a-f0-9-]+\.tmp$/.test(n)))
                    continue;
                throw Error('Missing journal');
            }
            j = validateJournal(root, id, JSON.parse(fs.readFileSync(file, 'utf8')));
        }
        catch {
            result.blocked.push({ transactionId: id, paths: ['journal'] });
            continue;
        }
        if (j.phase === 'committed')
            continue;
        if (j.phase === 'preparing') {
            try {
                archivePreparing(root, j);
            }
            catch {
                result.blocked.push({ transactionId: id, paths: ['history'] });
            }
            continue;
        }
        if (j.phase === 'blocked') {
            result.blocked.push({ transactionId: id, paths: conflicts(root, j).length ? conflicts(root, j) : j.entries.map(e => e.relativePath) });
            continue;
        }
        const bad = apply(root, j);
        if (bad.length)
            result.blocked.push({ transactionId: id, paths: bad });
        else
            result.recovered.push(id);
    }
    return result;
}
export async function recoverWorkspace(root) { return withWorkspaceLease(root, 'recovery', lease => recoverHeld(lease.root)); }
function requireRecovered(root) { const r = recoverHeld(root); if (r.blocked.length)
    throw Error('Workspace recovery blocked: ' + r.blocked.map(b => b.transactionId + ':' + b.paths.join(',')).join(';')); }
function checkOptions(store, options) {
    if (options.revision !== undefined && options.revision !== computeWorkspaceRevision(store))
        throw Error('Workspace revision conflict');
    for (const [key, expected] of Object.entries(options.expectedEntityVersions ?? {})) {
        const file = safeRelative(store.root, key);
        if (expected !== null && (!Number.isSafeInteger(expected) || expected < 0))
            throw Error('Invalid expected entity version');
        const exists = store.exists(file);
        if (expected === null) {
            if (exists)
                throw Error('Entity version conflict');
        }
        else {
            if (!exists)
                throw Error('Entity version conflict');
            const row = store.json(file);
            validateEntityVersion(row);
            if ((row.entityVersion ?? 0) !== expected)
                throw Error('Entity version conflict');
        }
    }
}
function prepare(root, nonce, source, ctx) {
    const manifestFile = safeRelative(root, manifest), manifestBytes = ctx.staged.get(manifestFile) ?? diskBytes(manifestFile);
    const target = manifestBytes ? JSON.parse(manifestBytes.toString('utf8').replace(/^\uFEFF/, '')).workspaceId : null;
    if (typeof target !== 'string' || !target || source !== null && source !== target)
        throw Error('Transaction workspace scope mismatch');
    const entries = [];
    for (const [file, staged] of ctx.staged) {
        const rp = relative(root, file);
        safeRelative(root, rp);
        const before = diskBytes(file);
        let after = staged;
        const authority = restoreCopyAuthority(ctx, file, staged);
        const archive = rp.startsWith('.workbench-backups/') || rp.startsWith('growth-workspace/migration-backups/');
        if (archive && authority?.kind !== 'archive')
            throw Error('Archive writes require validated copy authority');
        if (rp.endsWith('.json') && authority?.kind !== 'archive' && authority?.kind !== 'portable-file') {
            const value = JSON.parse(after.toString('utf8').replace(/^\uFEFF/, ''));
            validateEntityVersion(value);
            if (!rp.startsWith('growth-workspace/migration-backups/'))
                scopes(value, target);
            if (object(value) && (typeof value.id === 'string' || Object.hasOwn(value, 'entityVersion')) && !rp.startsWith('growth-workspace/migration-backups/') && !rp.startsWith('.workbench-backups/')) {
                const old = before ? JSON.parse(before.toString('utf8').replace(/^\uFEFF/, '')) : null;
                validateEntityVersion(old);
                if (authority?.kind !== 'entity' && value.entityVersion !== undefined && value.entityVersion !== (old?.entityVersion ?? 0))
                    throw Error('Client entity version mutation');
                const oldBody = old ? { ...old } : null, newBody = { ...value };
                delete newBody.entityVersion;
                if (oldBody)
                    delete oldBody.entityVersion;
                if (oldBody && JSON.stringify(oldBody) === JSON.stringify(newBody))
                    after = before;
                else
                    after = Buffer.from(JSON.stringify({ ...value, entityVersion: Math.max(old?.entityVersion ?? 0, authority?.kind === 'entity' ? value.entityVersion ?? 0 : 0) + 1 }, null, 2));
            }
        }
        if (before && before.equals(after))
            continue;
        entries.push({ relativePath: rp, oldHash: before === null ? null : byteHash(before), newHash: byteHash(after), before: before?.toString('base64') ?? null, after: after.toString('base64'), ...(authority?.kind === 'archive' ? { opaqueArchive: true } : authority?.kind === 'portable-file' ? { opaquePortable: true } : {}) });
    }
    // Every observed dependency must still be the exact original byte sequence, including outputs.
    for (const [file, hash] of ctx.reads)
        if (diskHash(safeRelative(root, relative(root, file))) !== hash)
            throw Error('Transaction read dependency conflict');
    for (const [file, kind] of ctx.existence)
        if (diskKind(safeRelative(root, relative(root, file))) !== kind)
            throw Error('Transaction existence dependency conflict');
    for (const [file, snapshot] of ctx.lists) {
        const d = JSON.parse(snapshot);
        if (diskKind(safeRelative(root, relative(root, file))) !== (d.existed ? 'directory' : 'missing') || JSON.stringify(directoryNames(file)) !== JSON.stringify(d.names))
            throw Error('Transaction directory dependency conflict');
    }
    if (!entries.length)
        return null;
    const j = { formatVersion: 1, id: crypto.randomUUID(), root, workspaceId: target, sourceWorkspaceId: source, targetWorkspaceId: target, nonce, phase: 'preparing', entries, reads: [...ctx.reads].map(([file, hash]) => ({ relativePath: relative(root, file), hash })), directories: [...ctx.lists].map(([file, names]) => ({ relativePath: relative(root, file), ...JSON.parse(names) })), existence: [...ctx.existence].map(([file, kind]) => ({ relativePath: relative(root, file), kind })) };
    return validateJournal(root, j.id, j);
}
export async function withWorkspaceWrite(root, options, work) {
    const store = new WorkspaceStore(root), inherited = contextFor(store.root);
    if (inherited) {
        if (!inherited.writable)
            throw Error('Read transaction cannot write');
        return withWorkspaceLease(store.root, 'write', () => { checkOptions(store, options); return work(); });
    }
    return withWorkspaceLease(store.root, 'write', async (lease) => {
        requireRecovered(lease.root);
        const ctx = { root: lease.root, open: true, writable: true, staged: new Map(), reads: new Map(), lists: new Map(), existence: new Map() };
        try {
            return await transactionContext.run(ctx, async () => {
                const source = workspaceId(lease.root);
                store.exists(path.join(store.base, 'workspace.json'));
                checkOptions(store, options);
                // Nested lease settlement includes ALL entered business descendants before preparing.
                const value = await withWorkspaceLease(lease.root, 'write', () => work());
                const j = prepare(lease.root, lease.nonce, source, ctx);
                ctx.open = false;
                if (j) {
                    save(lease.root, j);
                    stageDirectories(lease.root, j);
                    validateJournal(lease.root, j.id, j);
                    j.phase = 'prepared';
                    save(lease.root, j);
                    boundary('prepared', j.id);
                    const bad = apply(lease.root, j);
                    if (bad.length)
                        throw Error('Workspace recovery blocked: ' + bad.join(','));
                }
                return value;
            });
        }
        finally {
            ctx.open = false;
        }
    });
}
export async function withWorkspaceRead(root, work) {
    const store = new WorkspaceStore(root), inherited = contextFor(store.root);
    if (inherited)
        return withWorkspaceLease(store.root, 'read', () => work());
    return withWorkspaceLease(store.root, 'read', async (lease) => { requireRecovered(lease.root); const ctx = { root: lease.root, open: true, writable: false, staged: new Map(), reads: new Map(), lists: new Map(), existence: new Map() }; try {
        return await transactionContext.run(ctx, () => withWorkspaceLease(lease.root, 'read', () => work()));
    }
    finally {
        ctx.open = false;
    } });
}
