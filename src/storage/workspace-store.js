import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const id = () => crypto.randomUUID().replaceAll('-', '');
export class WorkspaceStore {
    root;
    base;
    constructor(root) { this.root = fs.realpathSync(root); if (!fs.statSync(this.root).isDirectory())
        throw Error('Project root must be a directory'); this.base = path.join(this.root, 'growth-workspace'); }
    checked(file) {
        const absolute = path.resolve(file);
        let ancestor = absolute;
        while (!fs.existsSync(ancestor)) {
            if (fs.lstatSync(ancestor, { throwIfNoEntry: false })?.isSymbolicLink())
                throw Error('Invalid symlink');
            ancestor = path.dirname(ancestor);
        }
        const resolved = path.join(fs.realpathSync(ancestor), path.relative(ancestor, absolute));
        const rel = path.relative(this.root, resolved);
        if (rel === '..' || rel.startsWith('..' + path.sep) || path.isAbsolute(rel))
            throw Error('Path outside project');
        return absolute;
    }
    read(file) { return fs.readFileSync(this.checked(file), 'utf8').replace(/^\uFEFF/, ''); }
    json(file) { return JSON.parse(this.read(file)); }
    write(file, value) {
        this.checked(file);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        this.checked(file);
        const temp = file + '.' + id() + '.tmp';
        try {
            fs.writeFileSync(temp, value, { flag: 'wx' });
            fs.renameSync(temp, file);
        }
        finally {
            if (fs.existsSync(temp))
                fs.unlinkSync(temp);
        }
    }
    put(file, value) { this.write(file, JSON.stringify(value, null, 2)); }
    files(folder, ext) {
        const dir = this.checked(path.join(this.base, folder));
        return fs.existsSync(dir) ? fs.readdirSync(dir).filter(n => n.endsWith(ext)).sort().map(n => this.checked(path.join(dir, n))) : [];
    }
}
