import { FileWorkspace } from "../../server.js";
import { migrateWorkspace } from "../storage/migrate.js";
import { withWorkspaceWrite, withWorkspaceRead } from "../storage/transaction.js";
import { crmFamilies } from "../crm/validation.js";
import { withWorkspaceLease } from "../storage/lease.js";
export async function openFileWorkspace(root) {
    return withWorkspaceLease(root, 'write', async () => { await withWorkspaceWrite(root, {}, () => { const store = new FileWorkspace(root); migrateWorkspace(root); store.initialize(); migrateWorkspace(root); }); return new FileWorkspace(root); });
}
// Transactions assign server-owned versions when preparing. Return persisted versions and
// digest after commit, before the outer lease can admit a competing writer.
export function committedResult(store, value) {
    if (value === null || typeof value !== 'object' || Buffer.isBuffer(value))
        return value;
    const rows = new Map();
    for (const family of ['tasks', 'artifacts', 'reviews', 'receipts', 'records', 'feedback', 'audits', 'knowledge-confirmations', 'daily-decisions', 'schedules', 'schedule-occurrences', 'delivery-programs', 'content-items', 'publish-attempts', 'publish-confirmations', ...crmFamilies])
        for (const file of store.files(family, '.json')) {
            const row = store.json(file);
            if (typeof row.id === 'string')
                rows.set(row.id, [...(rows.get(row.id) ?? []), row]);
        }
    const revision = store.digest();
    const visit = (item) => { if (item && typeof item === 'object' && !Array.isArray(item) && item.workspace && Array.isArray(item.tasks) && item.crm && typeof item.revision === 'string') {
        const persisted = store.load();
        return { ...persisted, ...Object.fromEntries(Object.entries(item).filter(([key]) => !Object.hasOwn(persisted, key)).map(([key, v]) => [key, visit(v)])) };
    } if (Buffer.isBuffer(item) || item === null || typeof item !== 'object')
        return item; if (Array.isArray(item))
        return item.map(visit); const out = Object.fromEntries(Object.entries(item).map(([key, v]) => [key, key === 'revision' ? revision : visit(v)])); if (typeof item.id === 'string') {
        const row = rows.get(item.id)?.find(row => Object.keys(item).every(key => key === 'entityVersion' || JSON.stringify(item[key]) === JSON.stringify(row[key])));
        if (row?.entityVersion !== undefined)
            out.entityVersion = row.entityVersion;
    } return out; };
    return visit(value);
}
export async function runWorkspaceMutation(root, options, operation, readback) {
    return withWorkspaceLease(root, 'write', async () => { const value = await withWorkspaceWrite(root, options, () => operation(new FileWorkspace(root))); return withWorkspaceRead(root, () => readback ? readback(new FileWorkspace(root), value) : committedResult(new FileWorkspace(root), value)); });
}
export async function readWorkspaceSnapshot(root, operation) { return withWorkspaceRead(root, () => operation(new FileWorkspace(root))); }
