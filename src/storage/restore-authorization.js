// Internal copy authority: never exposed as HTTP input or WriteOptions.
import { contextFor, byteHash, safeRelative } from "./transaction-context.js";
import path from 'node:path';
const authorities = new WeakMap();
export function authorizeValidatedRestoreCopy(root, file, bytes, kind) {
    const ctx = contextFor(root);
    if (!ctx?.writable)
        throw Error('Validated restore copy requires writable transaction context');
    const relative = path.relative(root, file).split(path.sep).join('/'), target = safeRelative(root, relative);
    const archive = relative.startsWith('.workbench-backups/') || relative.startsWith('growth-workspace/migration-backups/');
    if (kind === 'portable-file' ? !relative.startsWith('.codebuddy/skills/') : kind === 'archive' ? !archive : !relative.startsWith('growth-workspace/') || archive)
        throw Error('Restore authority path mismatch');
    let entries = authorities.get(ctx);
    if (!entries) {
        entries = new Map();
        authorities.set(ctx, entries);
    }
    entries.set(target, Object.freeze({ hash: byteHash(bytes), kind }));
}
export function restoreCopyAuthority(ctx, file, bytes) {
    if (!ctx.open || contextFor(ctx.root) !== ctx)
        throw Error('Restore authority context closed or mismatched');
    const authority = authorities.get(ctx)?.get(file);
    if (authority && authority.hash !== byteHash(bytes))
        throw Error('Validated restore source bytes changed');
    return authority;
}
