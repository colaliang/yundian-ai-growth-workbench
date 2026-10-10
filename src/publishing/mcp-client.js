export const PUBLISHER_ENDPOINT = 'https://socialmedia.ydjia.com/api/mcp';
const required = ['list_channels', 'get_balance', 'list_media', 'create_post', 'publish_post', 'get_post'];
const object = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const string = (v) => typeof v === 'string' && v.length > 0;
const fail = () => { throw Error('Publisher response invalid or unavailable'); };
export class McpPublisher {
    #key;
    #fetch;
    #id = 0;
    receipts = [];
    constructor(apiKey, fetchFn = fetch, options) { if (!string(apiKey) || options?.endpoint && options.endpoint !== PUBLISHER_ENDPOINT)
        throw Error('Publisher configuration unavailable'); this.#key = apiKey; this.#fetch = fetchFn; }
    #redact(value) { if (typeof value === 'string')
        return value.split(this.#key).join('[redacted]').replace(/Bearer\s+\S+/gi, 'Bearer [redacted]'); if (Array.isArray(value))
        return value.map(v => this.#redact(v)); if (object(value))
        return Object.fromEntries(Object.entries(value).filter(([k]) => !/(api.?key|authorization|token|secret)/i.test(k)).map(([k, v]) => [k, this.#redact(v)])); return value; }
    async #rpc(method, params) { const id = ++this.#id; try {
        const response = await this.#fetch(PUBLISHER_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + this.#key }, body: JSON.stringify({ jsonrpc: '2.0', id, method, params }), redirect: 'error', signal: AbortSignal.timeout(15000) });
        if (!response.ok || response.redirected || (response.url && response.url !== PUBLISHER_ENDPOINT))
            return fail();
        const data = await response.json();
        if (!object(data) || data.jsonrpc !== '2.0' || data.id !== id || data.error || !object(data.result))
            return fail();
        const evidence = method === 'tools/call' ? { ...data.result, content: Array.isArray(data.result.content) ? data.result.content.map((part) => { if (part?.type !== 'text')
                return { type: 'unsupported' }; try {
                return { type: 'text', text: JSON.stringify(this.#redact(JSON.parse(part.text))) };
            }
            catch {
                return { type: 'text', text: '[unparseable provider content omitted]' };
            } }) : [] } : data.result;
        this.receipts.push({ method, result: this.#redact(evidence) });
        if (this.receipts.length > 30)
            this.receipts.shift();
        return data.result;
    }
    catch {
        return fail();
    } }
    async callTool(name, args) { const r = await this.#rpc('tools/call', { name, arguments: args }); if (r.isError || !Array.isArray(r.content) || r.content.length !== 1 || r.content[0]?.type !== 'text' || typeof r.content[0]?.text !== 'string')
        return fail(); try {
        const parsed = JSON.parse(r.content[0].text);
        if (object(parsed) && (parsed.error || parsed.errors))
            return fail();
        return this.#redact(parsed);
    }
    catch {
        return fail();
    } }
    async connect() { let capabilities = []; try {
        const init = await this.#rpc('initialize', { protocolVersion: '2026-08-21', capabilities: {}, clientInfo: { name: 'yundian-workbench', version: '1' } });
        if (init.protocolVersion !== '2026-08-21' || !object(init.capabilities?.tools))
            return fail();
        const result = await this.#rpc('tools/list', {});
        if (!Array.isArray(result.tools) || result.tools.some((t) => !string(t?.name)))
            return fail();
        capabilities = result.tools.map((t) => t.name);
        if (required.some(t => !capabilities.includes(t)))
            return fail();
        await this.listChannels();
        await this.getBalance();
        await this.listMedia();
        return { connected: true, checkedAt: new Date().toISOString(), capabilities, error: null };
    }
    catch {
        return { connected: false, checkedAt: new Date().toISOString(), capabilities: [], error: '发布服务连接未通过验证' };
    } }
    async listChannels() { const rows = await this.callTool('list_channels', {}); if (!Array.isArray(rows) || rows.some(r => !object(r) || !string(r.id) || !string(r.platform) || typeof r.name !== 'string' || typeof r.isActive !== 'boolean'))
        return fail(); return rows.map(({ id, platform, name, isActive }) => ({ id, platform, name, isActive })); }
    async getBalance() { const r = await this.callTool('get_balance', {}); if (!object(r) || !Number.isSafeInteger(r.balance) || r.balance < 0)
        return fail(); return { balance: r.balance }; }
    async listMedia() { const rows = await this.callTool('list_media', { limit: 100 }); if (!Array.isArray(rows) || rows.some(r => !object(r) || !string(r.id) || !string(r.mimeType) || !string(r.storagePath)))
        return fail(); return rows.map(r => ({ id: r.id, mimeType: r.mimeType, url: r.storagePath })); }
    async validateTargets(channelIds, mediaIds) { if (!Array.isArray(channelIds) || !channelIds.length || new Set(channelIds).size !== channelIds.length || new Set(mediaIds).size !== mediaIds.length)
        return fail(); const channels = await this.listChannels(), media = await this.listMedia(); if (channelIds.some(id => !channels.some(c => c.id === id && c.isActive)) || mediaIds.some(id => !media.some(m => m.id === id)))
        return fail(); }
    #results(rows) { if (!Array.isArray(rows) || !rows.length || rows.some(r => !object(r) || !string(r.channelId) || !['pending', 'processing', 'published', 'failed'].includes(r.status)))
        return fail(); return rows.map(r => ({ channelId: r.channelId, status: r.pending === true ? 'processing' : r.status, ...(r.pending === true || r.status === 'processing' ? { pending: true } : {}), ...(string(r.platformPostId) ? { platformPostId: r.platformPostId } : {}), ...(string(r.url) ? { url: r.url } : {}), ...(string(r.errorMessage ?? r.error) ? { error: r.errorMessage ?? r.error } : {}) })); }
    #post(r) { if (!object(r) || !string(r.id) || !string(r.status) || (r.scheduledAt !== null && (!string(r.scheduledAt) || !Number.isFinite(Date.parse(r.scheduledAt)))))
        return fail(); const rows = this.#results(r.postChannels); return { id: r.id, status: rows.some(x => x.pending) ? 'processing' : r.status === 'published' && !rows.every(x => x.status === 'published') ? (rows.some(x => x.status === 'published') ? 'partial' : 'unknown') : r.status, scheduledAt: r.scheduledAt, postChannels: rows }; }
    async createPost(input) { await this.validateTargets(input.channelIds, input.mediaIds); if (!string(input.content) || input.scheduledAt && !Number.isFinite(Date.parse(input.scheduledAt)))
        return fail(); return this.#post(await this.callTool('create_post', { ...input })); }
    async publishPost(postId) { if (!string(postId))
        return fail(); const r = await this.callTool('publish_post', { postId }); if (!object(r) || r.postId !== postId)
        return fail(); return { postId, results: this.#results(r.results) }; }
    async getPost(postId) { if (!string(postId))
        return fail(); const post = this.#post(await this.callTool('get_post', { postId })); if (post.id !== postId)
        return fail(); return post; }
}
