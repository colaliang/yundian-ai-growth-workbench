import test from 'node:test';
import assert from 'node:assert/strict';
// @ts-ignore browser native module
import {onboardingState} from '../web/views/onboarding.js';
// @ts-ignore browser native module
import {failureMessage,setFormBusy,showFeedback} from '../web/ui/feedback.js';
test('onboarding uses real workspace and current confirmed knowledge, never projectRef',()=>{
 const state:any={profile:{company:'A',products:'P',markets:'M',persona:'B',goal:'G',projectRef:'fake'},knowledge:[],tasks:[]};
 assert.equal(onboardingState(state).project,'missing');
 Object.assign(state,{projectRoot:'C:/fixture',workspace:{workspaceId:'test'}});
 assert.equal(onboardingState(state).facts,'missing');
 state.knowledge=[{contentHash:'current',confirmation:{contentHash:'old'},reviewStatus:'pending',path:'knowledge/company.md'}];
 assert.equal(onboardingState(state).facts,'missing');
 state.knowledge=[{contentHash:'current',confirmation:{contentHash:'current'},reviewStatus:'confirmed',path:'knowledge/company.md'}];
 assert.equal(onboardingState(state).facts,'ready');
 state.tasks=[{status:'pending'}];assert.equal(onboardingState(state).firstTask,'created');
 state.tasks=[{status:'needs-review'}];assert.equal(onboardingState(state).firstTask,'needs-review');
});
test('errors distinguish reauthentication and conflict while retaining inputs',()=>{
 assert.match(failureMessage({status:401,message:'auth'}),/重新认证/);
 assert.match(failureMessage({status:409,message:'revision'}),/版本冲突/);
 assert.match(failureMessage(Error('disk')),/输入已保留/);
});
test('busy restores originally disabled controls and feedback is text-only',()=>{
 const controls=[{disabled:false},{disabled:true}];const form={querySelectorAll:()=>controls,setAttribute(){},removeAttribute(){}};
 setFormBusy(form,true);assert.ok(controls.every(c=>c.disabled));setFormBusy(form,false);assert.deepEqual(controls.map(c=>c.disabled),[false,true]);
 const host:any={setAttribute(){},dataset:{}};showFeedback(host,'<script>','error');assert.equal(host.textContent,'<script>');
});

