export function summarizeKnowledgeHealth(entries, projectRoot, checkedAt) {
    const confirmed = entries.filter(entry => entry.reviewStatus === 'confirmed').length;
    return { mode: 'local', projectRoot, files: entries.length, confirmed, pending: entries.length - confirmed, withoutRegisteredSource: entries.filter(entry => !entry.sources.some(source => source.trim()) && !entry.sourceLinks?.length).length, checkedAt };
}
