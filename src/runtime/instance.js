import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
const hash = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
// Reject every junction/symlink ancestor before touching private configuration.
export function checkedPrivatePath(file) { const absolute = path.resolve(file); let cursor = absolute; while (true) {
    const stat = fs.lstatSync(cursor, { throwIfNoEntry: false });
    if (stat?.isSymbolicLink())
        throw Error('Private path junction/symlink rejected');
    if (stat && cursor !== absolute && !stat.isDirectory())
        throw Error('Private path parent is not directory');
    const parent = path.dirname(cursor);
    if (parent === cursor)
        break;
    cursor = parent;
} return absolute; }
export function resolveInstance(root, options = {}) { const projectRoot = fs.realpathSync(root); const workspace = JSON.parse(fs.readFileSync(checkedPrivatePath(path.join(projectRoot, 'growth-workspace', 'workspace.json')), 'utf8')); if (typeof workspace.workspaceId !== 'string' || !workspace.workspaceId)
    throw Error('Invalid workspace binding'); const file = checkedPrivatePath(path.join(projectRoot, '.workbench-runtime', 'instance.json')); let value; if (fs.existsSync(file)) {
    value = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (value.formatVersion !== 1 || value.workspaceId !== workspace.workspaceId || value.projectRoot !== projectRoot || !/^([a-f0-9]{8}-){1}[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value.instanceId))
        throw Error('Instance binding mismatch');
}
else {
    if (options.create === false)
        throw Error('Instance not initialized');
    value = { formatVersion: 1, instanceId: crypto.randomUUID(), workspaceId: workspace.workspaceId, projectRoot };
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(value, null, 2), { flag: 'wx', mode: 0o600 });
} return { instanceId: value.instanceId, workspaceId: value.workspaceId, projectRoot, privateDirectory: checkedPrivatePath(path.join(options.privateBase ?? path.join(os.homedir(), '.workbench-private', 'instances'), value.instanceId)) }; }
export function privateConfigFile(ctx, kind) { if (!ctx || typeof ctx === 'string')
    throw Error('Stable customer instance required; use local config migration preview'); return checkedPrivatePath(path.join(ctx.privateDirectory, kind + '.json')); }
export function readInstanceConfig(ctx, kind) { const file = privateConfigFile(ctx, kind); if (!fs.existsSync(file))
    return {}; const value = parseConfig(fs.readFileSync(file)); if (!value || value.workspaceId !== ctx.workspaceId || value.instanceId !== ctx.instanceId)
    throw Error('Private configuration binding mismatch'); return value; }
export function writeInstanceConfig(ctx, kind, value) {
    assertCurrentInstance(ctx);
    const file = privateConfigFile(ctx, kind);
    const payload = Buffer.from(JSON.stringify({ ...value, workspaceId: ctx.workspaceId, instanceId: ctx.instanceId }));
    if (fs.existsSync(file))
        readInstanceConfig(ctx, kind);
    fs.mkdirSync(ctx.privateDirectory, { recursive: true, mode: 0o700 });
    const staging = checkedPrivatePath(file + '.' + crypto.randomUUID() + '.tmp');
    let fd;
    let created = false;
    try {
        checkedPrivatePath(file);
        assertCurrentInstance(ctx);
        fd = fs.openSync(staging, 'wx', 0o600);
        created = true;
        fs.writeFileSync(fd, payload);
        fs.fsyncSync(fd);
        fs.closeSync(fd);
        fd = undefined;
        assertCurrentInstance(ctx);
        checkedPrivatePath(staging);
        checkedPrivatePath(file);
        if (fs.existsSync(file))
            readInstanceConfig(ctx, kind);
        fs.renameSync(staging, file);
        created = false;
    }
    finally {
        if (fd !== undefined)
            fs.closeSync(fd);
        if (created)
            fs.unlinkSync(checkedPrivatePath(staging));
    }
}
export function instanceMetadata(ctx) { return { instanceId: ctx.instanceId, workspaceId: ctx.workspaceId, projectRoot: ctx.projectRoot, owner: configMetadata(ctx, 'owner'), publisher: { ...configMetadata(ctx, 'publisher'), environmentOverride: Boolean(process.env.WORKBENCH_PUBLISHER_API_KEY) }, privatePermissions: process.platform === 'win32' ? 'windows-acl-not-verified' : 'owner-mode-requested' }; }
const previews = new Map();
const identity = (ctx) => JSON.stringify([ctx.instanceId, ctx.workspaceId, ctx.projectRoot, ctx.privateDirectory]);
function assertCurrentInstance(ctx) { const fresh = resolveInstance(ctx.projectRoot, { privateBase: path.dirname(ctx.privateDirectory), create: false }); if (identity(fresh) !== identity(ctx))
    throw Error('Instance identity binding changed'); }
const bytes = (file) => { checkedPrivatePath(file); return fs.existsSync(file) ? fs.readFileSync(file) : null; };
export function previewLegacyConfigMigration(ctx, legacyAppRoot, options = {}) { const legacy = checkedPrivatePath(path.join(options.legacyPrivateBase ?? path.join(os.homedir(), '.workbench-private'), hash(path.resolve(legacyAppRoot)))); const entries = ['owner', 'publisher'].map(kind => { const source = path.join(legacy, kind + '.json'), target = privateConfigFile(ctx, kind), sourceBytes = bytes(source), targetBytes = bytes(target); let next = null; if (sourceBytes) {
    const value = parseConfig(sourceBytes);
    if (!value || typeof value !== 'object' || Array.isArray(value))
        throw Error('Invalid legacy configuration');
    if ((kind === 'owner' && typeof value.passwordHash !== 'string') || (kind === 'publisher' && (value.apiKey != null && typeof value.apiKey !== 'string')))
        throw Error('Invalid legacy configuration');
    next = Buffer.from(JSON.stringify({ ...value, workspaceId: ctx.workspaceId, instanceId: ctx.instanceId }));
} return { kind, source, target, sourceBytes, targetBytes, next }; }); const fingerprint = hash(identity(ctx) + entries.map(e => e.source + ':' + (e.sourceBytes ? hash(e.sourceBytes) : '-') + ':' + (e.targetBytes ? hash(e.targetBytes) : '-')).join('|')); const id = crypto.randomUUID(); if (previews.size >= 100)
    previews.delete(previews.keys().next().value); previews.set(id, { ctx: identity(ctx), entries, fingerprint }); return { id, files: entries.map(e => ({ kind: e.kind, present: Boolean(e.sourceBytes), conflict: Boolean(e.targetBytes && e.next && !e.targetBytes.equals(e.next)) })), fingerprint }; }
export function confirmLegacyConfigMigration(ctx, id, options) { if (options.confirmed !== true)
    throw Error('Explicit confirmation required'); const preview = previews.get(id); if (!preview || preview.ctx !== identity(ctx))
    throw Error('Migration preview binding mismatch'); assertCurrentInstance(ctx); for (const e of preview.entries) {
    const source = bytes(e.source), target = bytes(e.target);
    if (!equal(source, e.sourceBytes) || !equal(target, e.targetBytes))
        throw Error('Migration source or target changed');
    if (target && e.next && !target.equals(e.next))
        throw Error('Migration target conflict');
} const created = []; const missingDirs = []; let dir = ctx.privateDirectory; while (!fs.existsSync(dir)) {
    missingDirs.push(dir);
    dir = path.dirname(dir);
} try {
    const pending = preview.entries.filter(e => e.next && !e.targetBytes);
    if (pending.length)
        fs.mkdirSync(ctx.privateDirectory, { recursive: true, mode: 0o700 });
    for (const e of pending) {
        checkedPrivatePath(e.target);
        const fd = fs.openSync(e.target, 'wx', 0o600);
        created.push(e.target);
        try {
            fs.writeFileSync(fd, e.next);
        }
        finally {
            fs.closeSync(fd);
        }
    }
}
catch (error) {
    for (const file of created.reverse())
        fs.unlinkSync(file);
    for (const dir of missingDirs)
        if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0)
            fs.rmdirSync(dir);
    throw error;
} previews.delete(id); return { migrated: preview.entries.filter(e => e.next && !e.targetBytes).map(e => e.kind), preserved: preview.entries.filter(e => e.sourceBytes).map(e => e.kind) }; }
function equal(a, b) { return a === null ? b === null : b !== null && a.equals(b); }
function parseConfig(bytes) { try {
    return JSON.parse(bytes.toString('utf8'));
}
catch {
    throw Error('Invalid private configuration');
} }
function configMetadata(ctx, kind) { const present = fs.existsSync(privateConfigFile(ctx, kind)); let conflict = false; if (present)
    try {
        readInstanceConfig(ctx, kind);
    }
    catch {
        conflict = true;
    } return { present, conflict }; }
