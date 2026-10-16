import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import v8 from 'node:v8';
import { safeRelative, byteHash } from "../storage/transaction-context.js";
import { authorizeValidatedRestoreCopy } from "../storage/restore-authorization.js";
import { readWorkspaceSnapshot, runWorkspaceMutation } from "../runtime/workspace.js";
import { readConfirmedSources, sourceBytes } from "./sources.js";
import { createSnapshot, validateFullBackupSnapshot } from "./service.js";
const LIMIT = 64 * 1024 * 1024, TOTAL = 512 * 1024 * 1024, COUNT = 100000;
export function validateFullManifestSize(size) { if (!Number.isSafeInteger(size) || size < 0 || size > LIMIT)
    throw Error('Full backup manifest size limit exceeded'); }
const privateName = /(^|\/)(?:\.env(?:\..*)?|[^/]*\.(?:pem|key|p12|pfx)|owner(?:\.json)?|publisher(?:\.json)?|sessions?|credentials?|import-credentials|backup-sources\.json)(?:\/|$)/i;
const credential = /(?:-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bsk-(?:proj-)?[A-Za-z0-9_-]{16,}|["'](?:apiKey|api_key|access_token|refresh_token|passwordHash|clientSecret|privateKey)["']\s*:\s*["'][^"']+["'])/i;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
function logical(root, value, referenced = new Set()) { if (!referenced.has(value) && !value.startsWith('growth-workspace/') && !value.startsWith('.codebuddy/skills/') && !/^external\/[a-z0-9][a-z0-9_-]{0,63}\//.test(value))
    throw Error('Invalid bundle scope'); if (privateName.test(value))
    throw Error('Private bundle path rejected'); return safeRelative(root, value); }
export function estimateBackupMemory(bytes) { if (!Number.isSafeInteger(bytes) || bytes < 0)
    throw Error('Invalid capacity input'); return bytes * 8 + 64 * 1024 * 1024; }
export function requireBackupCapacity(bytes, available = Math.min(process.availableMemory(), v8.getHeapStatistics().heap_size_limit) - process.memoryUsage().rss) { if (estimateBackupMemory(bytes) > available)
    throw Error('Backup capacity unavailable: buffered transaction requires additional memory'); }
function collectReferences(bytes, sourceRoot, paths, missing) {
    let value;
    try {
        value = JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, ''));
    }
    catch {
        return;
    }
    if (value?.version === 1 && typeof value.category === 'string' && Array.isArray(value.sourceLinks) && Array.isArray(value.attachments)) {
        value = { ...value, path: 'growth-workspace/' + value.path, sourceLinks: value.sourceLinks.map((url) => ({ url })) };
    }
    const scan = (item, key = '') => { if (typeof item === 'string' && ['url', 'path', 'filePath', 'attachment', 'attachmentPath', 'sourcePath'].includes(key)) {
        if (/^https?:\/\//i.test(item)) {
            missing.push({ reference: item, reason: 'URL reference only; no remote download' });
            return;
        }
        if (!item)
            return;
        const reference = key === 'path' && /^knowledge\/.+\.md$/.test(item.replaceAll('\\', '/')) ? 'growth-workspace/' + item.replaceAll('\\', '/') : item;
        const absolute = path.resolve(sourceRoot, reference), relative = path.relative(sourceRoot, absolute).split(path.sep).join('/');
        if (relative === '..' || relative.startsWith('../') || path.isAbsolute(relative)) {
            missing.push({ reference: item, reason: 'External local source requires explicit confirmation' });
            return;
        }
        try {
            if (privateName.test(relative))
                throw Error('private');
            if (relative.split('/').some(part => !part || part === '.' || part === '..' || /[. ]$/.test(part) || /[<>:\"|?*\x00-\x1f]/.test(part) || part.startsWith('.') && part !== '.codebuddy'))
                throw Error('Invalid reference');
            if (!relative.startsWith('.workbench-backups/'))
                paths.add(relative);
        }
        catch {
            missing.push({ reference: item, reason: 'Private or invalid local reference excluded' });
        }
    }
    else if (item && typeof item === 'object')
        for (const [k, v] of Object.entries(item))
            scan(v, k); };
    scan(value);
}
function capture(store, retain = true) {
    const rows = new Map(), digests = new Map(), missing = [], references = new Set(), aliases = new Set();
    let total = 0;
    const add = (relative, bytes) => { logical(store.root, relative, references); if (bytes.length > LIMIT || total + bytes.length > TOTAL || digests.size >= COUNT)
        throw Error('Backup size or count limit exceeded'); requireBackupCapacity(total + bytes.length); if (credential.test(bytes.toString('utf8'))) {
        missing.push({ reference: relative, reason: 'Known credential text excluded; review custom files for other secrets' });
        return;
    } if (aliases.has(relative.toLowerCase()))
        throw Error('Bundle path alias'); aliases.add(relative.toLowerCase()); digests.set(relative, byteHash(bytes)); if (retain)
        rows.set(relative, bytes); total += bytes.length; if (relative.startsWith('growth-workspace/') && relative.endsWith('.json'))
        collectReferences(bytes, store.root, references, missing); };
    function walk(relative) { for (const entry of store.listDirectory(path.join(store.root, relative))) {
        const rel = relative + '/' + entry.name;
        if (privateName.test(rel)) {
            if (rel !== 'growth-workspace/backup-sources.json')
                missing.push({ reference: rel, reason: 'Private credential/configuration excluded' });
            continue;
        }
        logical(store.root, rel);
        if (entry.isDirectory())
            walk(rel);
        else if (entry.isFile()) {
            const f = path.join(store.root, rel), size = fs.statSync(f).size;
            if (size > LIMIT || total + size > TOTAL)
                throw Error('Backup file size limit exceeded');
            requireBackupCapacity(total + size);
            add(rel, store.readBytes(f));
        }
        else
            throw Error('Backup nonregular node rejected');
    } }
    walk('growth-workspace');
    if (store.exists(path.join(store.root, '.codebuddy/skills')))
        walk('.codebuddy/skills');
    for (const relative of references) {
        if (digests.has(relative))
            continue;
        const file = logical(store.root, relative, references);
        if (!store.exists(file)) {
            missing.push({ reference: relative, reason: 'Referenced local file missing' });
            continue;
        }
        if (!fs.lstatSync(file).isFile())
            throw Error('Referenced local source not regular');
        const size = fs.statSync(file).size;
        if (size > LIMIT || total + size > TOTAL)
            throw Error('Backup file size limit exceeded');
        requireBackupCapacity(total + size);
        add(relative, store.readBytes(file));
    }
    const sources = readConfirmedSources(store);
    for (const row of sources)
        for (const relative of row.files) {
            const size = fs.statSync(path.join(row.directory, relative)).size;
            if (size > LIMIT || total + size > TOTAL)
                throw Error('Backup file size limit exceeded');
            requireBackupCapacity(total + size);
            add('external/' + row.sourceId + '/' + relative, sourceBytes(row, relative));
        }
    const fingerprint = byteHash(Buffer.from(JSON.stringify({ files: [...digests].sort(([a], [b]) => a.localeCompare(b)), sources, registry: store.exists(path.join(store.base, 'backup-sources.json')) ? byteHash(store.readBytes(path.join(store.base, 'backup-sources.json'))) : null, sourceBindings: sources.map(r => [r.sourceId, fs.statSync(r.directory).ino, r.files.map(f => { const st = fs.statSync(path.join(r.directory, f)); return [f, st.dev, st.ino, st.size, st.mtimeMs]; })]), instanceId: instanceId(store) })));
    return { rows, missing, sources, fingerprint, references };
}
function instanceId(store) { const f = path.join(store.root, '.workbench-runtime/instance.json'); if (!fs.existsSync(f))
    throw Error('Initialize customer instance with A1 before full backup'); if (fs.lstatSync(path.dirname(f)).isSymbolicLink() || fs.lstatSync(f).isSymbolicLink())
    throw Error('Invalid instance metadata'); const v = JSON.parse(fs.readFileSync(f, 'utf8')); if (v.workspaceId !== store.json(path.join(store.base, 'workspace.json')).workspaceId || v.projectRoot !== store.root || !uuid.test(v.instanceId))
    throw Error('Invalid instance binding'); return v.instanceId; }
export async function exportFullBackup(root, options = {}) {
    return runWorkspaceMutation(root, options, store => {
        const collected = capture(store), w = store.json(path.join(store.base, 'workspace.json')), id = crypto.randomUUID(), directory = path.join(store.root, '.workbench-backups/full', id);
        if (store.exists(directory))
            throw Error('Bundle destination exists');
        const manifest = { formatVersion: 2, id, workspaceId: w.workspaceId, sourceInstanceId: instanceId(store), sourceProjectRoot: store.root, createdAt: new Date().toISOString(), files: [...collected.rows].map(([logicalPath, b]) => ({ logicalPath, sha256: byteHash(b), size: b.length, blob: 'blobs/' + byteHash(b) })).sort((a, b) => a.logicalPath.localeCompare(b.logicalPath)), coverage: { complete: collected.missing.length === 0, missing: collected.missing }, sourceMetadata: collected.sources.map(s => ({ sourceId: s.sourceId, files: s.files })) };
        const manifestBytes = Buffer.from(JSON.stringify(manifest, null, 2));
        validateFullManifestSize(manifestBytes.length);
        requireBackupCapacity([...collected.rows.values()].reduce((sum, b) => sum + b.length, manifestBytes.length));
        for (const row of manifest.files) {
            const f = path.join(directory, row.blob), b = collected.rows.get(row.logicalPath);
            authorizeValidatedRestoreCopy(store.root, f, b, 'archive');
            store.writeBytes(f, b);
        }
        const again = capture(store, false);
        if (again.fingerprint !== collected.fingerprint)
            throw Error('Backup source changed');
        const bytes = manifestBytes, file = path.join(directory, 'manifest.json');
        authorizeValidatedRestoreCopy(store.root, file, bytes, 'archive');
        store.writeBytes(file, bytes);
        return { id, directory, manifest };
    });
}
function checkedBundleFile(directory, relative) { const absolute = path.resolve(directory); let cursor = path.parse(absolute).root; for (const part of absolute.slice(cursor.length).split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, part);
    if (fs.lstatSync(cursor).isSymbolicLink())
        throw Error('Bundle symlink rejected');
} return safeRelative(absolute, relative); }
function loadBundle(root, directory) { const file = checkedBundleFile(directory, 'manifest.json'); if (!fs.lstatSync(file).isFile())
    throw Error('Invalid manifest file'); validateFullManifestSize(fs.statSync(file).size); const raw = fs.readFileSync(file), m = JSON.parse(raw.toString('utf8').replace(/^\uFEFF/, '')); if (m.formatVersion !== 2 || !uuid.test(m.id) || typeof m.workspaceId !== 'string' || !m.workspaceId || typeof m.sourceInstanceId !== 'string' || !uuid.test(m.sourceInstanceId) || !Number.isFinite(Date.parse(m.createdAt)) || !Array.isArray(m.files) || m.files.length > COUNT || !m.coverage || typeof m.coverage.complete !== 'boolean' || !Array.isArray(m.coverage.missing) || m.coverage.missing.some(x => typeof x.reference !== 'string' || typeof x.reason !== 'string') || m.coverage.complete && m.coverage.missing.length)
    throw Error('Invalid full backup manifest'); let total = 0; const rows = new Map(), aliases = new Set(); for (const f of m.files) {
    if (typeof f.logicalPath !== 'string' || aliases.has(f.logicalPath.toLowerCase()))
        throw Error('Bundle path alias');
    aliases.add(f.logicalPath.toLowerCase());
} for (const logicalPath of aliases) {
    const parts = logicalPath.split('/');
    for (let i = 1; i < parts.length; i++)
        if (aliases.has(parts.slice(0, i).join('/')))
            throw Error('Bundle path alias');
} for (const f of m.files) {
    if (typeof f.logicalPath !== 'string' || privateName.test(f.logicalPath))
        throw Error('Invalid bundle path');
    safeRelative(root, f.logicalPath);
    if (!/^[a-f0-9]{64}$/.test(f.sha256) || f.blob !== 'blobs/' + f.sha256 || !Number.isSafeInteger(f.size) || f.size < 0 || f.size > LIMIT || (total += f.size) > TOTAL)
        throw Error('Invalid bundle blob/size');
    requireBackupCapacity(total);
    const source = checkedBundleFile(directory, f.blob);
    if (!fs.lstatSync(source).isFile() || fs.statSync(source).size !== f.size)
        throw Error('Bundle blob size mismatch');
    const b = fs.readFileSync(source);
    if (byteHash(b) !== f.sha256)
        throw Error('Bundle hash mismatch');
    if (credential.test(b.toString('utf8')))
        throw Error('Known credential in restore');
    rows.set(f.logicalPath, b);
} if (typeof m.sourceProjectRoot !== 'string' || !path.isAbsolute(m.sourceProjectRoot) || !Array.isArray(m.sourceMetadata) || m.sourceMetadata.some(r => !r || typeof r.sourceId !== 'string' || !/^[a-z0-9][a-z0-9_-]{0,63}$/.test(r.sourceId) || !Array.isArray(r.files) || r.files.some(f => typeof f !== 'string')))
    throw Error('Invalid source metadata'); const refs = new Set(); for (const [p, b] of rows)
    if (p.startsWith('growth-workspace/') && p.endsWith('.json'))
        collectReferences(b, m.sourceProjectRoot, refs, []); for (const [p] of rows) {
    logical(root, p, refs);
    if (p.startsWith('external/')) {
        const [, id, ...parts] = p.split('/');
        if (!m.sourceMetadata.some(r => r.sourceId === id && r.files.includes(parts.join('/'))))
            throw Error('External source manifest binding missing');
    }
} return { manifest: m, rows, references: refs, fingerprint: byteHash(Buffer.concat([raw, ...[...rows.values()].map(b => Buffer.from(byteHash(b)))])) }; }
function preflight(store, bundle) { if (bundle.manifest.workspaceId !== store.json(path.join(store.base, 'workspace.json')).workspaceId)
    throw Error('Bundle belongs to another workspace'); const snapshot = { id: bundle.manifest.id, workspaceId: bundle.manifest.workspaceId, schemaVersion: 3, contractVersion: 2, createdAt: bundle.manifest.createdAt, files: [...bundle.rows].filter(([p]) => p.startsWith('growth-workspace/')).map(([p, b]) => ({ path: p, checksum: byteHash(b), data: b.toString('base64') })) }; validateFullBackupSnapshot(store.root, snapshot); const additions = [], conflicts = []; for (const [p, b] of bundle.rows) {
    if (p.startsWith('external/') || !p.startsWith('growth-workspace/') && !p.startsWith('.codebuddy/skills/')) {
        additions.push('incoming/' + p);
        continue;
    }
    const f = logical(store.root, p);
    if (store.exists(f)) {
        if (!store.readBytes(f).equals(b))
            conflicts.push(p);
    }
    else
        additions.push(p);
} return { additions, conflicts }; }
function targetFingerprint(store, bundle) { const destinations = [...bundle.rows].filter(([p]) => p.startsWith('growth-workspace/') || p.startsWith('.codebuddy/skills/')).map(([p]) => { const f = logical(store.root, p); return [p, store.exists(f) ? byteHash(store.readBytes(f)) : null]; }); return byteHash(Buffer.from(JSON.stringify({ current: capture(store, false).fingerprint, destinations, instance: instanceId(store) }))); }
const previews = new Map();
export async function previewFullRestore(root, directory, options = {}) { return readWorkspaceSnapshot(root, store => { if (options.revision !== undefined && options.revision !== store.digest())
    throw Error('Workspace revision conflict'); const b = loadBundle(store.root, directory), diff = preflight(store, b), target = targetFingerprint(store, b), fingerprint = byteHash(Buffer.from(store.root + b.fingerprint + target)), previewId = crypto.randomUUID(); if (previews.size >= 100)
    previews.delete(previews.keys().next().value); previews.set(previewId, { root: store.root, directory: path.resolve(directory), source: b.fingerprint, target, fingerprint }); return { previewId, ...diff, missing: b.manifest.coverage.missing, fingerprint }; }); }
export async function confirmFullRestore(root, previewId, options) { if (options?.confirmed !== true)
    throw Error('Explicit restore confirmation required'); const saved = previews.get(previewId); if (!saved)
    throw Error('Restore preview missing'); return runWorkspaceMutation(root, { revision: options.revision }, store => { if (saved.root !== store.root)
    throw Error('Restore preview scope changed'); const b = loadBundle(store.root, saved.directory); if (b.fingerprint !== saved.source || targetFingerprint(store, b) !== saved.target)
    throw Error('Restore preview changed'); preflight(store, b); const folder = path.join(store.root, '.workbench-backups', crypto.randomUUID()), backupPath = path.join(folder, 'before-restore.json'), before = Buffer.from(JSON.stringify(createSnapshot(store.root))); authorizeValidatedRestoreCopy(store.root, backupPath, before, 'archive'); store.writeBytes(backupPath, before); const result = { backupPath, restored: [], conflicts: [] }; for (const [p, bytes] of b.rows) {
    const external = p.startsWith('external/') || !p.startsWith('growth-workspace/') && !p.startsWith('.codebuddy/skills/'), file = external ? path.join(folder, 'incoming', p) : logical(store.root, p);
    if (!external && store.exists(file)) {
        if (store.readBytes(file).equals(bytes))
            continue;
        const incoming = path.join(folder, 'incoming', p);
        authorizeValidatedRestoreCopy(store.root, incoming, bytes, 'archive');
        store.writeBytes(incoming, bytes);
        result.conflicts.push({ path: p, local: file, incoming });
    }
    else {
        authorizeValidatedRestoreCopy(store.root, file, bytes, external || p.startsWith('growth-workspace/migration-backups/') ? 'archive' : p.startsWith('.codebuddy/skills/') ? 'portable-file' : 'entity');
        store.writeBytes(file, bytes);
        result.restored.push(external ? path.relative(store.root, file).split(path.sep).join('/') : p);
    }
} const fresh = loadBundle(store.root, saved.directory); if (fresh.fingerprint !== saved.source)
    throw Error('Restore source changed'); previews.delete(previewId); return result; }); }
// Read-only validation shared by retention; never activates source registries.
export function inspectFullBackup(root, directory) { const b = loadBundle(root, directory); return { manifest: b.manifest, fingerprint: b.fingerprint }; }
