import {withWorkspaceLease,inspectLease} from '../../src/storage/lease.ts';
let release;
const gate=new Promise(resolve=>release=resolve);
process.on('message',m=>{if(m==='probe')process.send({type:'probe',status:inspectLease(process.argv[2]).status});if(m==='release')release();if(m==='cancel'){process.send({type:'blocked'});process.disconnect();process.exit(0);}});
process.send({type:'attempting'});
if(inspectLease(process.argv[2]).status!=='free')process.send({type:'observed-owner'});
try {await withWorkspaceLease(process.argv[2],process.argv[3]??'write',async lease=>{process.send({type:'acquired',nonce:lease.nonce});await gate;},{waitMs:5000});process.send({type:'released'});}catch(e){process.send({type:'blocked',error:e.message});}
process.disconnect();


