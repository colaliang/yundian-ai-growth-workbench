// Exact grammar previously accepted by Snapshot/journal regex, checked in bounded linear space.
// No recursion or repeated-group backtracking on large binary payloads.
export function isBase64Bytes(value) {
    if (typeof value !== 'string' || value.length % 4 !== 0)
        return false;
    const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0, end = value.length - padding;
    for (let i = 0; i < end; i++) {
        const c = value.charCodeAt(i);
        if (!(c >= 65 && c <= 90 || c >= 97 && c <= 122 || c >= 48 && c <= 57 || c === 43 || c === 47))
            return false;
    }
    return true;
}
export function decodeBase64Bytes(value) { if (!isBase64Bytes(value))
    throw Error('Invalid base64 bytes'); return Buffer.from(value, 'base64'); }
