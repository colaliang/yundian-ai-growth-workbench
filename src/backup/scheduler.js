import path from 'node:path';
import { runWorkspaceMutation, readWorkspaceSnapshot } from "../runtime/workspace.js";
import { withWorkspaceLease } from "../storage/lease.js";
import { exportFullBackup } from "./bundle.js";
const defaults = { version: 1, enabled: false, timezone: 'Asia/Shanghai', time: '02:00', dailyKeep: 7, weeklyKeep: 4, lastAttemptDay: null, nextRunAt: null, lastSuccessId: null, lastSuccessAt: null, lastResult: null, lastFailure: null, missing: [] };
export function planFromWorkspace(workspace) { const p = workspace.backupPlan; if (p === undefined)
    return structuredClone(defaults); if (!p || p.version !== 1 || typeof p.enabled !== 'boolean' || p.timezone !== 'Asia/Shanghai' || p.time !== '02:00' || p.dailyKeep !== 7 || p.weeklyKeep !== 4)
    throw Error('Invalid backup plan'); if (p.lastAttemptDay !== null && !/^\d{4}-\d{2}-\d{2}$/.test(p.lastAttemptDay) || p.lastSuccessId !== null && !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(p.lastSuccessId) || !Array.isArray(p.missing) || p.missing.some((r) => !r || typeof r.reference !== 'string' || typeof r.reason !== 'string') || ![null, 'running', 'completed', 'partial', 'failed'].includes(p.lastResult))
    throw Error('Invalid backup plan state'); return { ...structuredClone(defaults), ...p }; }
function due(nowISO) { const ms = Date.parse(nowISO); if (!Number.isFinite(ms))
    throw Error('Invalid backup clock'); const local = new Date(ms + 8 * 3600000), day = local.toISOString().slice(0, 10), hour = local.getUTCHours(); return { day, ready: hour >= 2, ms }; }
function next(p, nowISO) { const { day, ready, ms } = due(nowISO); if (!p.enabled)
    return null; const midnight = Date.parse(day + 'T00:00:00Z') - 8 * 3600000; return new Date(midnight + 2 * 3600000 + (p.lastAttemptDay === day ? 86400000 : 0)).toISOString(); }
export async function readBackupPlan(root, nowISO = new Date().toISOString()) { return readWorkspaceSnapshot(root, s => { const p = planFromWorkspace(s.json(path.join(s.base, 'workspace.json'))); return { ...p, nextRunAt: next(p, nowISO), revision: s.digest() }; }); }
export async function setBackupPlan(root, enabled, options = {}) { if (typeof enabled !== 'boolean')
    throw Error('Backup enabled must be boolean'); return withWorkspaceLease(root, 'write', async () => { await runWorkspaceMutation(root, options, s => { const f = path.join(s.base, 'workspace.json'), w = s.json(f); w.backupPlan = { ...planFromWorkspace(w), enabled, nextRunAt: null }; s.put(f, w); }); return readBackupPlan(root); }); }
export async function tickBackup(root, nowISO) { return withWorkspaceLease(root, 'write', async () => { const clock = due(nowISO), p = await readWorkspaceSnapshot(root, s => planFromWorkspace(s.json(path.join(s.base, 'workspace.json')))); if (!p.enabled)
    return { status: 'disabled' }; if (!clock.ready || p.lastAttemptDay === clock.day)
    return { status: 'not-due' }; await runWorkspaceMutation(root, {}, s => { const f = path.join(s.base, 'workspace.json'), w = s.json(f), current = planFromWorkspace(w); w.backupPlan = { ...current, lastAttemptDay: clock.day, lastResult: 'running', lastFailure: null, nextRunAt: null }; s.put(f, w); }); try {
    const b = await exportFullBackup(root), status = b.manifest.coverage.complete ? 'completed' : 'partial';
    await runWorkspaceMutation(root, {}, s => { const f = path.join(s.base, 'workspace.json'), w = s.json(f), current = planFromWorkspace(w); w.backupPlan = { ...current, lastResult: status, missing: b.manifest.coverage.missing, lastFailure: null, ...(status === 'completed' ? { lastSuccessId: b.id, lastSuccessAt: b.manifest.createdAt } : {}) }; s.put(f, w); });
    return { status, backupId: b.id };
}
catch {
    await runWorkspaceMutation(root, {}, s => { const f = path.join(s.base, 'workspace.json'), w = s.json(f); w.backupPlan = { ...planFromWorkspace(w), lastResult: 'failed', lastFailure: '本地备份失败，请检查客户目录、覆盖范围和权限；今天不自动重试' }; s.put(f, w); });
    return { status: 'failed' };
} }).catch(error => { if (error.message === 'Workspace lease blocked')
    return { status: 'running' }; throw error; }); }
