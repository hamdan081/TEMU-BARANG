import test from 'node:test';
import assert from 'node:assert/strict';
import {getMotionDelta,isShake} from '../utils/shakeMotion.mjs';

const idle={x:0,y:1,z:0};
test('bacaan awal tidak dianggap gerakan',()=>{
 assert.equal(getMotionDelta(null,idle),0);
 assert.equal(isShake(null,idle),false);
});
test('sumbu dengan getaran cukup besar melewati threshold',()=>{
 assert.equal(isShake(idle,{x:1.2,y:1,z:0}),true);
 assert.equal(isShake(idle,{x:0.1,y:1.05,z:0.03}),false);
});
test('perubahan nilai yang kecil dan gravitasi statis tidak memicu getaran',()=>{
 assert.equal(isShake({x:0,y:1,z:0},{x:0,y:1,z:0}),false);
 assert.equal(isShake({x:0,y:1,z:0},{x:0,y:0.95,z:0}),false);
});
test('bacaan invalid diabaikan dan threshold harus positif',()=>{
 assert.equal(isShake(idle,{x:NaN,y:1,z:1}),false);
 assert.equal(isShake(idle,{x:5,y:1,z:0},0),false);
});
