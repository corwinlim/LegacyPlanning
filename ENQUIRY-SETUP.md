# Email-only appointment requests

The form collects name, phone, email, one of four topics, an optional 200-word note and consent. English and Chinese share the neutral family image; Malay retains the original image.

## Required before enabling the form

The owner has an existing sending service and must provide its name and connection details. The current adapter supports Resend. For Resend, configure `RESEND_API_KEY` and `ENQUIRY_EMAIL_FROM` (an address on a verified sender domain) in Vercel. Never commit keys or paste them into chat. If another provider is used, adapt the server-side sender first.

The sole destination is `corwindamansara@gmail.com`, fixed server-side. The email contains all enquiry fields, consent and a reference, and serves as the appointment request record. There is no separate database or application log of personal details. No WhatsApp API, links or notifications are used.

Missing configuration returns 503. Invalid inputs return 400. Email-provider failure returns 502. Only provider acceptance produces a success message; it does not prove inbox delivery or confirm an appointment. Confirm receipt of a synthetic request with the owner before enabling the public form.

Retries use a content-derived Resend idempotency key. The form retains inputs on errors and prevents duplicate clicks. English and Chinese note limits are validated on both client and server. The honeypot provides basic spam filtering; use the selected provider's abuse controls for a public launch.
