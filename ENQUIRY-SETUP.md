# Email-only appointment requests

The form collects name, phone, email, one of four topics, an optional 200-word note and consent. English and Chinese share the neutral family image; Malay retains the original image.

## Required before enabling the form

Gmail SMTP is configured in code at `smtp.gmail.com`, port 465 with implicit TLS, username `corwindamansara@gmail.com`.

Enable Google two-step verification and create a Gmail app password at https://myaccount.google.com/apppasswords . Add it to Vercel project `legacyplanning` as an encrypted variable named `SMTP_PASSWORD`, targeting Production and Preview. Do not use the ordinary Google account password, commit credentials, or paste them into chat. Spaces in a copied app password are removed before authentication.

After setting the variable, redeploy the draft branch to load it. Run a synthetic appointment request and confirm inbox receipt before enabling the production form. No settings for repository visibility or Vercel protection need to change.

The sole destination is `corwindamansara@gmail.com`, fixed server-side. The email contains all enquiry fields, consent and a reference, and serves as the appointment request record. There is no separate database or application log of personal details. No WhatsApp API, links or notifications are used.

Missing configuration returns 503. Invalid inputs return 400. Email-provider failure returns 502. Only provider acceptance produces a success message; it does not prove inbox delivery or confirm an appointment. Confirm receipt of a synthetic request with the owner before enabling the public form.

Each email includes a content-derived reference and server timestamp. SMTP cannot guarantee deduplication after an ambiguous timeout, so a retry can create another email; use the reference to recognize repeats. The form retains inputs on errors and prevents duplicate clicks. English and Chinese note limits are validated on both client and server. The honeypot provides basic spam filtering; use the selected provider's abuse controls for a public launch.
