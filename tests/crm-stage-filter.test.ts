import test from 'node:test';import assert from 'node:assert/strict';
// @ts-ignore browser-native formatter is shared by the filter and edit field.
import {crmStageOptions} from '../web/views/crm.js';
test('CRM filter and edit options pair Chinese labels with canonical enum values',()=>{for(const [value,label] of [['new','新线索'],['contacted','已联系'],['won','已成交']]){const filter=crmStageOptions(value,true),edit=crmStageOptions(value);assert.ok(filter.includes('<option value="'+value+'" selected>'+label+'</option>'));assert.ok(edit.includes('<option value="'+value+'" selected>'+label+'</option>'));assert.equal((filter.match(/ selected/g)||[]).length,1);assert.ok(filter.includes('<option value="">全部</option>'));}assert.equal((crmStageOptions('',true).match(/<option/g)||[]).length,9);});
