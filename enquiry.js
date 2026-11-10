(() => {
  const form = document.getElementById('enquiry-form');
  const note = form.elements.note;
  const feedback = document.getElementById('form-feedback');
  const whatsapp = document.getElementById('whatsapp-followup');
  const submit = form.querySelector('button[type="submit"]');
  let completed = false;
  const t = key => translations[document.getElementById('lang').value][key] || translations.en[key];
  // Han characters count individually, so a Chinese note cannot bypass the word limit.
  const countWords = value => (value.replace(/([\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}])/gu, ' $1 ').match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) || []).length;
  function updateCount() {
    const count = countWords(note.value);
    document.getElementById('note-counter').textContent = `${count} / 200`;
    note.setCustomValidity(count > 200 ? t('noteTooLong') : '');
  }
  function updateWhatsApp() {
    const text = ['Legacy Planning — Appointment Request',
      `Name: ${form.elements.name.value.trim()}`, `Phone: ${form.elements.phone.value.trim()}`,
      `Email: ${form.elements.email.value.trim()}`, `Topic: ${form.elements.service.value}`,
      `Note: ${note.value.trim() || '—'}`].join('\n');
    whatsapp.href = 'https://wa.me/60108106717?text=' + encodeURIComponent(text);
  }
  note.addEventListener('input', updateCount);
  document.getElementById('lang').addEventListener('change', () => {
    updateCount();
    if (submit.disabled) submit.textContent = completed ? t('submit') : t('sending');
    const url = new URL(location.href);url.searchParams.set('lang', document.getElementById('lang').value);history.replaceState(null, '', url);
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();updateCount();
    if (completed || !form.reportValidity()) return;
    submit.disabled = true;submit.textContent = t('sending');
    feedback.textContent = '';whatsapp.hidden = true;
    const payload = Object.fromEntries(new FormData(form));
    payload.language = document.getElementById('lang').value;
    updateWhatsApp();
    try {
      const controller = new AbortController();const timeout = setTimeout(() => controller.abort(), 35000);
      let response;
      try { response = await fetch('/api/enquiry', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:controller.signal}); }
      finally {clearTimeout(timeout);}
      const result = await response.json();
      if (!response.ok || result.email !== 'accepted') {
        feedback.dataset.state = 'error';
        feedback.textContent = result.code === 'NOT_CONFIGURED' ? t('unavailable') : t('failed');
        whatsapp.hidden = false;feedback.focus();return;
      }
      completed = true;feedback.dataset.state = 'success';
      feedback.textContent = t('success');
      // A WhatsApp link prepares a message; the visitor still needs to confirm Send.
      whatsapp.hidden = result.whatsapp === 'accepted';
      feedback.focus();
    } catch {
      feedback.dataset.state = 'error';feedback.textContent = t('failed');whatsapp.hidden = false;feedback.focus();
    } finally {
      submit.disabled = completed;submit.textContent = t('submit');
    }
  });
})();
