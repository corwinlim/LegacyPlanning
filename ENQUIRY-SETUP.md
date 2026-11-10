# Appointment enquiry delivery

This draft adds a real form with name, phone, email, topic, optional note (200 words; Han characters count individually), consent and explicit delivery feedback. It is not ready to merge until the owner's sending services are connected and tested.

## Sending services

The current adapter supports Resend and Meta WhatsApp Cloud API. Adapt it if the owner uses a different provider. Configure secrets in Vercel project settings, never in repository files or chat.

- `RESEND_API_KEY`: Resend sending key.
- `ENQUIRY_EMAIL_FROM`: address on a sender domain verified by that Resend account.
- `WHATSAPP_ACCESS_TOKEN`: Meta token with permission to send messages.
- `WHATSAPP_PHONE_NUMBER_ID`: sender's WhatsApp Business phone-number ID (not the receiving number).
- `WHATSAPP_ENQUIRY_TEMPLATE`: approved notification template whose body contains one text parameter for the enquiry summary.
- `WHATSAPP_TEMPLATE_LANGUAGE`: approved template language code, default `en`.

Email destination is fixed server-side at `corwindamansara@gmail.com`; WhatsApp destination is `60108106717`. A provider accepting a message does not prove inbox/handset delivery. Confirm both with the owner in a synthetic end-to-end test before enabling the public form. WhatsApp templates and consent/opt-in requirements must match the business account's setup.

## Behaviour

No email configuration: HTTP 503 and no success message. Invalid inputs: HTTP 400. Email provider failure: HTTP 502. Email accepted: show acceptance, never a confirmed appointment. WhatsApp acceptance is reported separately; if automatic WhatsApp cannot be confirmed, show a prefilled WhatsApp link that the visitor must send manually. That link is not automatic delivery.

Email retries use a content-derived Resend idempotency key. The form retains input on errors and prevents duplicate clicks. No personal information is written to local storage or application logs. The honeypot is a basic spam filter; configure the chosen provider's abuse controls for a public launch.

## Verification already completed

Mocked API tests: required fields/consent, service allowlist, word limits in English and Chinese, missing configuration, fixed recipients, success and failure responses. Browser tests: all three languages, language-specific hero, 390px layout, note limit, preserved input on errors, WhatsApp fallback and duplicate-submit prevention. No real messages were sent by those tests.
