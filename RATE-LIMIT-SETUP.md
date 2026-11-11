# Build 18: shared enquiry limiter (private preview only)

The enquiry endpoint now fails closed unless these Vercel environment variables exist:
- `UPSTASH_REDIS_REST_URL`: HTTPS endpoint of a dedicated Upstash Redis REST database
- `UPSTASH_REDIS_REST_TOKEN`: server-side REST token (secret)
- `RATE_LIMIT_SALT`: unique random secret, at least 24 characters, for pseudonymizing client IPs

Set secrets through Vercel's encrypted environment-variable settings, never in GitHub, screenshots or chat. Redeploy after configuration. Do not make the site public until the environment is validated.

The implementation relies on Vercel's `x-vercel-forwarded-for` trusted header. Verify this header is actually supplied by the Vercel runtime before accepting enquiries. Missing/ambiguous headers cause HTTP 503 (fail closed). Do not replace with client-controlled `x-forwarded-for` without independently verifying the proxy trust boundary.

Quota: 30 requests/minute globally and 5 requests/hour per pseudonymized client IP, fixed windows beginning at the first request in each window. Redis Lua EVAL provides atomic increments/expiry per key across instances. Quota rejections return HTTP 429 with Retry-After. Provider errors/missing secrets return 503 and do not send email.

Limitations: two counters are incremented separately, not as one multi-key transaction; the global budget may be consumed by an already over-limit IP. Rate limits are not a substitute for CAPTCHA, WAF, monitoring, or an abuse response process. No customer PII is used in Redis keys. The hashed IP may still constitute personal data under applicable law; configure appropriate Redis retention, access controls, region and deletion policy.

Synthetic tests are in `tests/rate-limit.test.js` and `tests/enquiry.test.js`; run with `node --test tests/*.test.js`. A green GitHub Actions receipt is required before accepting the implementation. A live test must separately prove Vercel headers, Redis reachability, SMTP acceptance, and destination inbox receipt.

**Launch gate: NO-GO** until these checks, privacy notice and consented synthetic delivery test are verified.
