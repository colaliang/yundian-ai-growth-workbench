import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { safeRelative, byteHash } from "../storage/transaction-context.js";
import { readWorkspaceSnapshot, runWorkspaceMutation } from "../runtime/workspace.js";
const registry = 'growth-workspace/backup-sources.json';
const previews = new Map();
export function checkedSourceFile(directory, relative) {
    const absolute = path.resolve(directory), home = path.resolve(os.homedir()), relHome = path.relative(home, absolute), tempRelative = path.relative(path.resolve(os.tmpdir()), absolute), explicitTemp = !!tempRelative && !tempRelative.startsWith('..') && !path.isAbsolute(tempRelative);
    // Reject private namespaces before inspecting any selected directory ancestors.
    if (!relHome || absolute.split(path.sep).some(p => /^\.(?:codex|ssh|aws|workbench-private|gnupg|git|workbench-runtime|workbench-backups|config)$/i.test(p)) || !explicitTemp && /(^|[\\/])AppData([\\/]|$)/i.test(absolute))
        throw Error('Private home source rejected');
    let current = path.parse(absolute).root;
    for (const part of absolute.slice(current.length).split(path.sep).filter(Boolean)) {
        for (const name of fs.readdirSync(current))
            if (name.toLowerCase() === part.toLowerCase() && name !== part)
                throw Error('External directory case alias');
        current = path.join(current, part);
        if (fs.lstatSync(current).isSymbolicLink())
            throw Error('External source symlink rejected');
    }
    if (!fs.statSync(absolute).isDirectory())
        throw Error('Source must be directory');
    const file = safeRelative(absolute, relative);
    if (!fs.lstatSync(file).isFile())
        throw Error('External source must be regular file');
    return file;
}
export function sourceBytes(row, relative) { const file = checkedSourceFile(row.directory, relative), before = fs.statSync(file); if (before.size > 64 * 1024 * 1024)
    throw Error('Backup file size limit exceeded'); const fd = fs.openSync(file, 'r'), bytes = Buffer.alloc(before.size); try {
    let offset = 0;
    while (offset < bytes.length) {
        const count = fs.readSync(fd, bytes, offset, Math.min(1024 * 1024, bytes.length - offset), offset);
        if (!count)
            throw Error('Source truncated while reading');
        offset += count;
    }
}
finally {
    fs.closeSync(fd);
} const after = fs.statSync(checkedSourceFile(row.directory, relative)); if (before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size || before.mtimeMs !== after.mtimeMs || bytes.length !== before.size)
    throw Error('Source changed while reading'); return bytes; }
export function validateSourceRows(rows) { if (!Array.isArray(rows) || rows.length > 1000)
    throw Error('Invalid source list'); const seen = new Set(); return rows.map(row => { if (!row || typeof row.sourceId !== 'string' || !/^[a-z0-9][a-z0-9_-]{0,63}$/.test(row.sourceId) || seen.has(row.sourceId) || typeof row.directory !== 'string' || !path.isAbsolute(row.directory) || !Array.isArray(row.files) || !row.files.length || row.files.length > 100000)
    throw Error('Invalid source row'); seen.add(row.sourceId); const aliases = new Set(); for (const f of row.files) {
    if (typeof f !== 'string' || aliases.has(f.toLowerCase()) || /(^|\/)(?:owner|publisher|credentials?|sessions?)\.json$/i.test(f) || /\.(?:pem|key|p12|pfx)$/i.test(f))
        throw Error('Source file alias');
    aliases.add(f.toLowerCase());
    checkedSourceFile(row.directory, f);
} return { sourceId: row.sourceId, directory: path.resolve(row.directory), files: [...row.files].sort() }; }); }
export function readConfirmedSources(store) { const file = path.join(store.root, registry); if (!store.exists(file))
    return []; const value = store.json(file), w = store.json(path.join(store.base, 'workspace.json')); if (value.formatVersion !== 1 || value.workspaceId !== w.workspaceId || value.confirmed !== true)
    throw Error('Unconfirmed source registry'); return validateSourceRows(value.rows); }
function fingerprint(store, rows) { const w = store.json(path.join(store.base, 'workspace.json')), old = store.exists(path.join(store.root, registry)) ? store.readBytes(path.join(store.root, registry)) : Buffer.alloc(0); return byteHash(Buffer.from(JSON.stringify({ root: store.root, workspaceId: w.workspaceId, old: byteHash(old), rows, files: rows.flatMap(row => row.files.map(f => [row.sourceId, f, byteHash(sourceBytes(row, f)), fs.statSync(checkedSourceFile(row.directory, f)).ino, fs.statSync(row.directory).ino])) }))); }
export async function previewBackupSources(root, rows) { return readWorkspaceSnapshot(root, store => { const validated = validateSourceRows(rows), finger = fingerprint(store, validated), previewId = crypto.randomUUID(); if (previews.size >= 100)
    previews.delete(previews.keys().next().value); previews.set(previewId, { root: store.root, rows: validated, fingerprint: finger }); return { previewId, rows: validated, fingerprint: finger }; }); }
export async function confirmBackupSources(root, previewId, options) { if (options?.confirmed !== true)
    throw Error('Explicit confirmation required'); const saved = previews.get(previewId); if (!saved)
    throw Error('Source preview missing'); return runWorkspaceMutation(root, {}, store => { if (saved.root !== store.root || fingerprint(store, saved.rows) !== saved.fingerprint)
    throw Error('Source preview changed'); const w = store.json(path.join(store.base, 'workspace.json')); store.put(path.join(store.root, registry), { formatVersion: 1, workspaceId: w.workspaceId, confirmed: true, rows: saved.rows }); previews.delete(previewId); return { confirmed: true, sourceIds: saved.rows.map(r => r.sourceId) }; }); }
