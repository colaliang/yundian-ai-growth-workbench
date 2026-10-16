import test from 'node:test';
import assert from 'node:assert/strict';
import {createNavigationGuard} from '../web/main.js';
test('denied route keeps committed hash and does not reenter; accepted route commits once',()=>{
 const location={hash:'#/crm'};const replacements=[];let allowed=false;const calls=[];
 const guard=createNavigationGuard({location,history:{replaceState(_s,_t,hash){replacements.push(hash);location.hash=hash;}},route:hash=>hash.slice(2),setPage(id){calls.push(id);return allowed;}});
 assert.equal(guard.navigate('settings'),false);assert.equal(location.hash,'#/crm');
 location.hash='#/overview';assert.equal(guard.hashChanged(),false);assert.equal(location.hash,'#/crm');
 assert.deepEqual(replacements,['#/crm']);allowed=true;assert.equal(guard.navigate('settings'),true);assert.equal(location.hash,'/settings');
 location.hash='#/settings';guard.hashChanged();assert.deepEqual(calls,['settings','overview','settings']);
});

