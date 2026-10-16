import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MODULES} from '../src/navigation/modules.ts';
const views=await import(new URL('../web/views/services.js',import.meta.url).href);
test('free modules hide consultant and paid modules provide only a button',()=>{for(const m of MODULES){const e=views.consultationForModule(m.id),html=views.moduleConsultationView(m.id,String);if(m.free){assert.equal(e,null);assert.equal(html,'');}else{assert.equal(e.name,'搞跨境的可乐哥');assert.ok(html.includes('专家咨询联系'));assert.ok(!html.includes('13631179943'));assert.ok(!html.includes('<h2>'));assert.ok(html.includes('data-action="expert-detail"'));const detail=views.expertDetail(e,String);assert.ok(detail.includes('13631179943'));assert.ok(detail.includes('https://www.ydjia.com'));}}});
test('unsafe contact protocols never become links',()=>{for(const url of ['javascript:alert(1)','data:text/html,x']){const html=views.expertDetail({name:'test',description:'test',contact:'javascript:alert(1)',websites:[url],projectLinks:[{url,title:'x'}]},String);assert.ok(!html.includes('href='));}});
test('actual module pages wire consultation once and skill rows do not duplicate it',()=>{const app=fs.readFileSync(new URL('../app-v03.js',import.meta.url),'utf8');assert.ok(app.includes('moduleConsultationView(page,esc)'));const skill=fs.readFileSync(new URL('../web/views/skills.js',import.meta.url),'utf8');assert.ok(!skill.includes('moduleServices'));});
import fs from 'node:fs';
