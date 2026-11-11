'use strict';
const { createHash } = require('node:crypto');

// Upstash Redis REST; each EVAL is atomic across serverless instances.
// Configuration absence, bad proxy headers and provider errors fail closed.
const LUA = "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return {n,redis.call('TTL',KEYS[1])}";
async function increment(url, token, key, windowSeconds) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const response = await fetch(url, {
      method:'POST',
      headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
      body:JSON.stringify(['EVAL',LUA,'1',key,String(windowSeconds)]),
      signal:controller.signal
    });
    if (!response.ok) throw new Error('RATE_STORE_HTTP');
    const data = await response.json();
    if (data.error || !Array.isArray(data.result) || data.result.length!==2) throw new Error('RATE_STORE_RESULT');
    const [count, ttl] = data.result.map(Number);
    if (!Number.isSafeInteger(count) || count<1 || !Number.isFinite(ttl)) throw new Error('RATE_STORE_INVALID');
    return {count,ttl:Math.max(1,Math.ceil(ttl))};
  } finally {clearTimeout(timer);}
}
async function checkRateLimit(req) {
  const url=process.env.UPSTASH_REDIS_REST_URL;
  const token=process.env.UPSTASH_REDIS_REST_TOKEN;
  const salt=process.env.RATE_LIMIT_SALT;
  // Vercel's platform-owned header, not the spoofable X-Forwarded-For.
  const raw=req.headers['x-vercel-forwarded-for'];
  const ip=typeof raw==='string'?raw.trim():'';
  if (!url || !/^https:\/\//.test(url) || !token || !salt || salt.length<24 ||
      !ip || ip.includes(',') || ip.length>64 || !/^[0-9a-fA-F:.]+$/.test(ip)) {
    return {ok:false,status:503};
  }
  const digest=createHash('sha256').update(salt).update(':').update(ip).digest('hex');
  try {
    const global=await increment(url,token,'legacyplanning:enquiry:global',60);
    if(global.count>30) return {ok:false,status:429,retryAfter:global.ttl};
    const perIp=await increment(url,token,'legacyplanning:enquiry:ip:'+digest,3600);
    if(perIp.count>5) return {ok:false,status:429,retryAfter:perIp.ttl};
    return {ok:true};
  } catch {
    return {ok:false,status:503};
  }
}
module.exports={checkRateLimit};
