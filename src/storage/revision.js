import { knowledgeFiles } from "../domain/knowledge-metadata.js";
import crypto from 'node:crypto';
import path from 'node:path';
import { crmFamilies } from "../crm/validation.js";
// Preserve FileWorkspace.digest byte-for-byte ordering, path separators, and missing-artifact marker.
export function computeWorkspaceRevision(store) {
    const files = [path.join(store.base, 'workbench.json'), ...store.files('tasks', '.json'), ...store.files('artifacts', '.md'), ...store.files('artifacts', '.json'), ...store.files('reviews', '.json'), ...store.files('receipts', '.json'), ...store.files('knowledge-confirmations', '.json'), ...knowledgeFiles(store), ...store.files('knowledge-metadata', '.json'), ...store.files('records', '.json'), ...store.files('audits', '.json'), ...store.files('daily-decisions', '.json'), ...store.files('schedules', '.json'), ...store.files('schedule-occurrences', '.json'), ...store.files('delivery-programs', '.json'), ...store.files('content-items', '.json'), ...store.files('publish-attempts', '.json'), ...store.files('publish-confirmations', '.json'), ...crmFamilies.flatMap(f => store.files(f, '.json'))].sort();
    const h = crypto.createHash('sha256');
    for (const file of files)
        if (store.exists(store.checked(file)))
            h.update(path.relative(store.base, file)).update(store.readBytes(file));
    for (const f of store.files('artifacts', '.json')) {
        const a = store.json(f);
        if (a.path) {
            try {
                h.update(a.path).update(store.readBytes(store.checked(path.resolve(store.root, a.path))));
            }
            catch {
                h.update('missing:' + a.path);
            }
        }
    }
    const manifestFile = path.join(store.base, 'workspace.json');
    if (store.exists(manifestFile)) {
        const workspace = store.json(manifestFile);
        if (Object.hasOwn(workspace, 'backupPlan'))
            h.update('backupPlan').update(JSON.stringify(workspace.backupPlan));
    }
    return h.digest('hex');
}
