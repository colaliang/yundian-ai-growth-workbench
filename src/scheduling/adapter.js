// No native WorkBuddy tool/API is available. A user supplied ID is never verified by this adapter.
export class CommandOnlyAdapter {
    async capabilities() { return { create: false, pause: false, verify: false, mode: 'command-only', reason: '未发现可核验的 WorkBuddy 原生调度 API；请复制指令在宿主创建并核验。' }; }
    async create(input) { return { workspaceId: input.workspaceId, scheduleId: input.id || '', action: 'create', hostTaskId: null, source: 'command-only adapter', evidence: 'native scheduler unavailable', status: 'unsupported' }; }
    async pause(hostId) { return { workspaceId: '', scheduleId: '', action: 'pause', hostTaskId: hostId, source: 'command-only adapter', evidence: 'pause requires native acknowledgement', status: 'pending-host' }; }
}
