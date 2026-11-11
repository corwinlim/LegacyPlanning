'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {checkRateLimit}=require('../lib/rate-limit');
const before={...process.env};
const originalFetch=global.fetch;
const headers={'x-vercel-forwarded-for':'203.0.113.7'};
function setup(handler) {
 process.env.UPSTASH_REDIS_REST_URL='https://redis.example.invalid';
 process.env.UPSTASH_REDIS_REST_TOKEN='synthetic-token';
 process.env.RATE_LIMIT_SALT='synthetic-salt-of-at-least-24-characters';
 global.fetch=handler;
}
function restore() {
 global.fetch=originalFetch;
 for(const k of ['UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN','RATE_LIMIT_SALT']) {
   if(before[k]===undefined)delete process.env[k];else process.env[k]=before[k];
 }
}
test('missing configuration fails closed',async()=>{
 restore();delete process.env.UPSTASH_REDIS_REST_URL;
 assert.deepEqual(await checkRateLimit({headers}),{ok:false,status:503});
});
test('missing trusted IP fails closed',async()=>{
 setup(async()=>{throw Error('must not call');});
 try{assert.deepEqual(await checkRateLimit({headers:{}}),{ok:false,status:503});}finally{restore();}
});
test('successful global and client budgets',async()=>{
 let calls=0;
 setup(async()=>({ok:true,json:async()=>({result:[++calls,30]})}));
 try{assert.deepEqual(await checkRateLimit({headers}),{ok:true});assert.equal(calls,2);}finally{restore();}
});
test('global budget exhaustion returns 429 without second call',async()=>{
 let calls=0;
 setup(async()=>{calls++;return {ok:true,json:async()=>({result:[31,17]})};});
 try{assert.deepEqual(await checkRateLimit({headers}),{ok:false,status:429,retryAfter:17});assert.equal(calls,1);}finally{restore();}
});
test('per-client exhaustion returns 429',async()=>{
 let calls=0;
 setup(async()=>({ok:true,json:async()=>({result:[++calls===1?1:6,44]})}));
 try{assert.deepEqual(await checkRateLimit({headers}),{ok:false,status:429,retryAfter:44});}finally{restore();}
});
test('store outage fails closed',async()=>{
 setup(async()=>{throw Error('offline');});
 try{assert.deepEqual(await checkRateLimit({headers}),{ok:false,status:503});}finally{restore();}
});
test('provider error fails closed',async()=>{
 setup(async()=>({ok:true,json:async()=>({error:'ERR'})}));
 try{assert.deepEqual(await checkRateLimit({headers}),{ok:false,status:503});}finally{restore();}
});
