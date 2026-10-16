import fs from 'node:fs';
import path from 'node:path';
import { MODULES } from "./modules.js";
const navigation = [['overview', '工作台'], ['knowledge', '企业知识库'], ['skills', '营销推广'], ['content-operations', '内容运营'], ['crm', '客户管理'], ['schedules', '定时任务'], ['settings', '设置']];
export function loadUiContract(appRoot) {
    const value = JSON.parse(fs.readFileSync(path.join(appRoot, 'config/workbench-ui.json'), 'utf8'));
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    if (!same(Object.keys(value).sort(), ['freeModuleIds', 'navigation', 'promotionModuleIds']))
        throw new Error('Invalid UI contract fields');
    if (!same(value.navigation, navigation))
        throw new Error('Invalid navigation IDs, labels or order');
    if (!same(value.promotionModuleIds, MODULES.filter(m => m.id !== 'content-operations').map(m => m.id)))
        throw new Error('Invalid promotion module IDs or order');
    if (!same(value.freeModuleIds, MODULES.filter(m => m.free).map(m => m.id)))
        throw new Error('Invalid free module IDs');
    return value;
}
