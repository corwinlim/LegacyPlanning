const { createHash } = require('node:crypto');
const services = new Set(['Will Writing', 'Trust', 'Estate Planning', 'Estate Execution Plan']);
const wordCount = value => (value.replace(/([\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}])/gu, ' $1 ').match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) || []).length;
const nodemailer = require('nodemailer');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {res.setHeader('Allow','POST');return res.status(405).json({code:'METHOD_NOT_ALLOWED'});}
  if (!String(req.headers['content-type'] || '').startsWith('application/json')) return res.status(415).json({code:'JSON_REQUIRED'});
  if (req.headers.origin && req.headers.origin !== 'https://legacyplanning.vercel.app' && req.headers.origin !== `https://${process.env.VERCEL_URL}`) return res.status(403).json({code:'INVALID_ORIGIN'});
  let data;
  try {
    if (Number(req.headers['content-length'] || 0) > 16384) return res.status(413).json({code:'TOO_LARGE'});
    data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!data || JSON.stringify(data).length > 16384) return res.status(400).json({code:'INVALID_DATA'});
  } catch {return res.status(400).json({code:'INVALID_DATA'});}
  const get = key => typeof data[key] === 'string' ? data[key].trim() : '';
  const name=get('name'),phone=get('phone'),email=get('email'),service=get('service'),note=get('note');
  if (get('website') || !name || name.length>100 || /[\r\n]/.test(name) || !/^[+0-9() .-]{7,30}$/.test(phone) || phone.replace(/\D/g,'').length<7 || email.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !services.has(service) || note.length>4000 || wordCount(note)>200 || !['on',true].includes(data.consent)) return res.status(400).json({code:'INVALID_FIELDS'});
  if (!process.env.SMTP_PASSWORD) return res.status(503).json({code:'NOT_CONFIGURED'});
  const text = [`Name: ${name}`,`Phone: ${phone}`,`Email: ${email}`,`Topic: ${service}`,`Note: ${note || '—'}`,`Language: ${get('language')}`, 'Consent: agreed to enquiry follow-up'].join('\n');
  const key=createHash('sha256').update(text).digest('hex');
  let emailAccepted = false;
  const transport = nodemailer.createTransport({
    host: 'smtp.gmail.com', port: 465, secure: true,
    auth: {user: 'corwindamansara@gmail.com', pass: process.env.SMTP_PASSWORD.replace(/\s/g, '')},
    connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 12000,
    logger: false, debug: false
  });
  try {
    const info = await transport.sendMail({
      from: 'Legacy Planning <corwindamansara@gmail.com>',
      to: 'corwindamansara@gmail.com', replyTo: email,
      subject: `Legacy Planning appointment request — ${service}`,
      text: `Reference: ${key.slice(0,12)}\nSubmitted at: ${new Date().toISOString()}\n${text}`
    });
    emailAccepted = info.accepted.some(address => address.toLowerCase() === 'corwindamansara@gmail.com');
  } catch (error) {
    // Log only diagnostic codes, never credentials, SMTP responses or enquiry fields.
    console.error('appointment_smtp_failure', JSON.stringify({
      code: typeof error.code === 'string' ? error.code : 'UNKNOWN',
      responseCode: typeof error.responseCode === 'number' ? error.responseCode : null,
      command: ['AUTH PLAIN','AUTH LOGIN','CONN','EHLO','MAIL FROM','RCPT TO','DATA'].includes(error.command) ? error.command : null
    }));
    emailAccepted = false;
  }
  finally {transport.close();}
  if (!emailAccepted) return res.status(502).json({code:'EMAIL_FAILED'});
  return res.status(200).json({email:'accepted'});
};
