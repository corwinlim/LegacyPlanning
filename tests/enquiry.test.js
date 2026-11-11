'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

function loadHandler(sendMail) {
  const originalLoad = Module._load;
  try {
    Module._load = function (name, parent, isMain) {
      if (name === 'nodemailer') return {createTransport: () => ({
        sendMail: sendMail || (async () => { throw Object.assign(new Error('synthetic failure'), {code:'ECONNECTION'}); }),
        close() {}
      })};
      return originalLoad.apply(this, arguments);
    };
    delete require.cache[require.resolve('../api/enquiry.js')];
    return require('../api/enquiry.js');
  } finally { Module._load = originalLoad; }
}
function request(body, overrides = {}) {
  return {
    method: 'POST',
    headers: {'content-type':'application/json',origin:'https://legacyplanning.vercel.app'},
    body, ...overrides
  };
}
function response() {
  return {
    statusCode:200, headers:{}, body:null,
    setHeader(k,v){this.headers[k]=v;return this;},
    status(n){this.statusCode=n;return this;},
    json(x){this.body=x;return this;}
  };
}
const valid = () => ({
  name:'Synthetic Test User', phone:'+60123456789', email:'synthetic@example.invalid',
  service:'Will Writing', note:'This is a test only.', consent:'on', website:'', language:'en'
});
async function run(body, overrides={}, sendMail) {
  const handler=loadHandler(sendMail);
  const res=response();
  await handler(request(body,overrides),res);
  return res;
}
test('reject GET and advertise POST',async()=>{
  const r=await run(valid(),{method:'GET'});
  assert.equal(r.statusCode,405);assert.equal(r.headers.Allow,'POST');
});
test('reject non-JSON',async()=>{
  assert.equal((await run(valid(),{headers:{'content-type':'text/plain'}})).statusCode,415);
});
test('reject oversized declared body',async()=>{
  assert.equal((await run(valid(),{headers:{'content-type':'application/json','content-length':'20000'}})).statusCode,413);
});
test('reject malformed body',async()=>{
  assert.equal((await run('{invalid')).statusCode,400);
});
test('reject invalid Origin',async()=>{
  assert.equal((await run(valid(),{headers:{'content-type':'application/json',origin:'https://attacker.example'}})).statusCode,403);
});
test('reject missing consent',async()=>{
  const v=valid();delete v.consent;assert.equal((await run(v)).statusCode,400);
});
test('reject honeypot value',async()=>{
  const v=valid();v.website='https://spam.invalid';assert.equal((await run(v)).statusCode,400);
});
test('reject unexpected service',async()=>{
  const v=valid();v.service='Other';assert.equal((await run(v)).statusCode,400);
});
test('reject newline in name',async()=>{
  const v=valid();v.name='Bad\\r\\nBcc:evil@example.invalid';assert.equal((await run(v)).statusCode,400);
});
test('reject note over 200 words',async()=>{
  const v=valid();v.note=Array(201).fill('word').join(' ');assert.equal((await run(v)).statusCode,400);
});
test('reject excessive Chinese characters',async()=>{
  const v=valid();v.note='测'.repeat(201);assert.equal((await run(v)).statusCode,400);
});
test('fail closed without SMTP configuration',async()=>{
  const before=process.env.SMTP_PASSWORD;
  delete process.env.SMTP_PASSWORD;
  try {assert.deepEqual((await run(valid())).body,{code:'NOT_CONFIGURED'});}
  finally {if(before!==undefined)process.env.SMTP_PASSWORD=before;}
});
test('SMTP failure must not claim success',async()=>{
  const before=process.env.SMTP_PASSWORD;
  process.env.SMTP_PASSWORD='synthetic-test-only';
  const originalError=console.error;
  console.error=()=>{};
  try {
    const r=await run(valid(),{},async()=>{throw Object.assign(new Error('synthetic'),{code:'ECONNECTION'});});
    assert.equal(r.statusCode,502);assert.deepEqual(r.body,{code:'EMAIL_FAILED'});
  } finally {
    console.error=originalError;
    if(before===undefined)delete process.env.SMTP_PASSWORD;else process.env.SMTP_PASSWORD=before;
  }
});
test('only provider acceptance returns 200',async()=>{
  const before=process.env.SMTP_PASSWORD;
  process.env.SMTP_PASSWORD='synthetic-test-only';
  try {
    const r=await run(valid(),{},async()=>({accepted:['corwindamansara@gmail.com']}));
    assert.equal(r.statusCode,200);assert.deepEqual(r.body,{email:'accepted'});
  } finally {if(before===undefined)delete process.env.SMTP_PASSWORD;else process.env.SMTP_PASSWORD=before;}
});
test('provider acceptance of different recipient must fail',async()=>{
  const before=process.env.SMTP_PASSWORD;
  process.env.SMTP_PASSWORD='synthetic-test-only';
  try {
    const r=await run(valid(),{},async()=>({accepted:['different@example.invalid']}));
    assert.equal(r.statusCode,502);
  } finally {if(before===undefined)delete process.env.SMTP_PASSWORD;else process.env.SMTP_PASSWORD=before;}
});
