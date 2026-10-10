import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MODULES} from '../src/navigation/modules.ts';
const views=await import(new URL('../web/views/services.js',import.meta.url).href);
test('four free modules hide consultation; all nine paid modules show fixed contact',()=>{for(const m of MODULES){const e=views.consultationForModule(m.id);const html=views.moduleConsultationView(m.id,String);if(m.free){assert.equal(e,null);assert.equal(html,'');}else{assert.equal(e.name,'搞跨境的可乐哥');for(const text of ['专家咨询联系','AI建站、WordPress、SEO、Google Ads、Facebook广告、数据分析','付费服务；具体范围与费用联系确认。免费技能持续可用。','联系电话（微信同号）','13631179943','https://www.ydjia.com','微信二维码图片待提供'])assert.ok(html.includes(text),text);assert.equal(html.split('https://').length-1,2);assert.ok(!html.includes('<img'));assert.ok(!html.includes('delivery-share'));}}assert.equal(views.consultationForModule('unknown'),null);});
test('unsafe contact protocols never become links',()=>{for(const url of ['javascript:alert(1)','data:text/html,x']){const html=views.expertDetail({name:'test',description:'test',contact:'javascript:alert(1)',websites:[url],projectLinks:[{url,title:'x'}]},String);assert.ok(!html.includes('href='));}});
test('actual module pages wire consultation once and skill rows do not duplicate it',()=>{const app=fs.readFileSync(new URL('../app-v03.js',import.meta.url),'utf8');assert.ok(app.includes('moduleConsultationView(page,esc)'));const skill=fs.readFileSync(new URL('../web/views/skills.js',import.meta.url),'utf8');assert.ok(!skill.includes('moduleServices'));});
import fs from 'node:fs';
