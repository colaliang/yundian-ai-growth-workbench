import test from 'node:test';
import assert from 'node:assert/strict';
import {settingsView} from '../web/views/settings.js';
test('previous server settings render unavailable runtime without connected claim',()=>{const state={settings:{},skills:{},profile:{},projectRoot:'fake-customer',version:'old'};const html=settingsView({state,updateInfo:null,heading:()=>'',button:()=>'',esc:x=>String(x??'')});assert.match(html,/当前服务未提供实例状态，尚未核验/);assert.ok(!html.includes('已连接'));});
