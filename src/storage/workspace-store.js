import { publicationFamilies, validatePublicationPath } from "./publication-path.js";
import { contextFor, observe, observeDirectory, diskKind, directoryNames, safeRelative } from "./transaction-context.js";
import fs from 'node:fs';
import path from 'node:path';
export class WorkspaceStore {
    root;
    base;
    constructor(root) { this.root = fs.realpathSync(root); if (!fs.statSync(this.root).isDirectory())
        throw Error('Project root must be a directory'); this.base = path.join(this.root, 'growth-workspace'); }
    checked(file) {
        const absolute = path.resolve(file), relative = path.relative(this.root, absolute);
        if (relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative))
            throw Error('Path outside project');
        let current = this.root;
        for (const part of relative.split(path.sep)) {
            current = path.join(current, part);
            if (fs.lstatSync(current, { throwIfNoEntry: false })?.isSymbolicLink())
                throw Error('Invalid symlink');
        }
        return absolute;
    }
    guarded(file) { const absolute = this.checked(file); if (contextFor(this.root))
        safeRelative(this.root, path.relative(this.root, absolute).split(path.sep).join('/')); return absolute; }
    readBytes(file) { file = this.guarded(file); const ctx = contextFor(this.root); if (ctx?.staged.has(file))
        return Buffer.from(ctx.staged.get(file)); const kind = diskKind(file); if (kind !== 'file' && kind !== 'missing')
        throw Error('Expected regular file bytes'); if (ctx)
        observe(ctx, file); return fs.readFileSync(file); }
    exists(file) { file = this.guarded(file); const ctx = contextFor(this.root); if (ctx) {
        if (ctx.staged.has(file) || [...ctx.staged.keys()].some(p => p.startsWith(file + path.sep)))
            return true;
        const kind = diskKind(file);
        if (!ctx.existence.has(file))
            ctx.existence.set(file, kind);
        if (kind === 'file')
            observe(ctx, file);
        if (kind === 'directory')
            observeDirectory(ctx, file);
    } return fs.existsSync(file); }
    read(file) { return this.readBytes(file).toString('utf8').replace(/^\uFEFF/, ''); }
    json(file) { return JSON.parse(this.read(file)); }
    writeBytes(file, bytes) {
        file = this.guarded(file);
        const ctx = contextFor(this.root);
        if (ctx) {
            if (!ctx.writable)
                throw Error('Read transaction cannot write');
            for (let dir = path.dirname(file); dir !== this.root; dir = path.dirname(dir))
                observeDirectory(ctx, dir);
            observe(ctx, file);
            ctx.staged.set(file, Buffer.from(bytes));
            return;
        }
        throw Error('Business writes require an active writable transaction context');
    }
    write(file, value) { this.writeBytes(file, Buffer.from(value)); }
    put(file, value) { this.write(file, JSON.stringify(value, null, 2)); }
    listDirectory(file) {
        file = this.guarded(file);
        const ctx = contextFor(this.root), names = directoryNames(file);
        if (ctx) {
            observeDirectory(ctx, file);
            for (const staged of ctx.staged.keys()) {
                const rel = path.relative(file, staged);
                if (rel && !rel.startsWith('..' + path.sep) && !path.isAbsolute(rel)) {
                    const name = rel.split(path.sep)[0];
                    if (!names.includes(name))
                        names.push(name);
                }
            }
        }
        return names.sort().map(name => { const target = path.join(file, name), stagedFile = ctx?.staged.has(target), stagedDir = ctx && [...ctx.staged.keys()].some(p => p.startsWith(target + path.sep)), kind = stagedFile ? 'file' : stagedDir ? 'directory' : diskKind(target); return { name, isDirectory: () => kind === 'directory', isFile: () => kind === 'file', isSymbolicLink: () => fs.lstatSync(target, { throwIfNoEntry: false })?.isSymbolicLink() ?? false }; });
    }
    files(folder, ext) {
        const dir = this.guarded(path.join(this.base, folder)), ctx = contextFor(this.root), names = directoryNames(dir);
        if (ctx) {
            observeDirectory(ctx, dir);
            for (const file of ctx.staged.keys())
                if (path.dirname(file) === dir && !names.includes(path.basename(file)))
                    names.push(path.basename(file));
        }
        const known = publicationFamilies.includes(folder.toLowerCase());
        if (known) {
            for (const name of directoryNames(this.base))
                validatePublicationPath('growth-workspace/' + name);
            const aliases = new Set();
            for (const name of names) {
                validatePublicationPath('growth-workspace/' + folder + '/' + name);
                const file = this.checked(path.join(dir, name)), value = this.json(file), key = name.toLowerCase();
                if (name !== value.id + '.json' || aliases.has(key))
                    throw Error('Publication filename or alias mismatch');
                aliases.add(key);
            }
        }
        return names.filter(n => n.endsWith(ext)).sort().map(n => this.checked(path.join(dir, n)));
    }
}
