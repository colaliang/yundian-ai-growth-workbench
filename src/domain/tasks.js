import crypto from 'node:crypto';
export function createTask(input) {
    if (!input.workspaceId || !input.skillId || !input.skillVersion || !input.name?.trim())
        throw Error('任务输入不完整');
    const id = crypto.randomUUID().replaceAll('-', '');
    return { ...input, id, status: 'ready', createdAt: new Date().toISOString(), inputSnapshotRef: 'growth-workspace/workflows/' + id + '.json', artifactIds: [], artifact: null, cycleId: input.cycleId || 'cycle-1' };
}
export function applyReceipt(task, receipt) {
    if (receipt.taskId !== task.id || receipt.workspaceId !== task.workspaceId || receipt.skillVersion !== task.skillVersion)
        throw Error('回执任务、客户或技能版本不匹配');
    if (!receipt.receiptId?.trim() || !receipt.executor?.trim())
        throw Error('receiptId 和执行者必填');
    if (!['running', 'needs-review', 'failed', 'cancelled', 'needs-input'].includes(receipt.status))
        throw Error('回执状态无效');
    if (receipt.status === 'needs-review' && !receipt.artifacts?.length)
        throw Error('需要实际产物');
    return { ...task, status: receipt.status };
}
