/* Preserve the original presentation; handle submissions on this local copy. */
document.documentElement.dataset.replica = 'true';

document.addEventListener('submit', async event => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  if (form.matches('.password-form')) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const message = form.querySelector('.error-message');
    if (message) {
      message.textContent = 'The recipes are password protected on the original website. ';
      const link = document.createElement('a');
      link.href = 'https://www.bhojanic.com/class-recipes';
      link.textContent = 'Open the original recipes page';
      message.append(link);
      message.style.display = 'block';
    }
    return;
  }
  if (!form.matches('.react-form-contents') && !form.closest('.sqs-block-form')) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const controls = [...form.querySelectorAll('input, select, textarea')];
  for (const control of controls) {
    if (control.getAttribute('aria-required') === 'true') control.required = true;
  }
  if (!form.reportValidity()) return;
  const labelFor = control => {
    const explicit = control.id && [...form.querySelectorAll('label')].find(label => label.htmlFor === control.id);
    const labelledBy = control.getAttribute('aria-labelledby');
    return (explicit?.textContent || (labelledBy && document.getElementById(labelledBy)?.textContent) || control.getAttribute('aria-label') || control.closest('.form-item')?.querySelector('.title, legend')?.textContent || control.name || control.type).replace(/\s+/g, ' ').trim();
  };
  const fields = controls.filter(control => !['hidden', 'submit', 'button', 'password'].includes(control.type) && (!['checkbox', 'radio'].includes(control.type) || control.checked) && control.value).map(control => ({ label: labelFor(control), value: control.value }));
  const button = form.querySelector('[type="submit"]');
  if (button) button.disabled = true;
  let status = form.querySelector('[data-local-status]');
  if (!status) {
    status = document.createElement('p');
    status.dataset.localStatus = 'true';
    status.setAttribute('role', 'status');
    form.append(status);
  }
  try {
    const response = await fetch('/api/inquiries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ page: location.pathname, fields }) });
    if (!response.ok) throw new Error('Unable to save inquiry');
    status.textContent = 'Thank you! Your inquiry has been saved locally. Email catering@bhojanic.com to send it to the team.';
    form.reset();
  } catch {
    status.textContent = 'Your inquiry could not be saved. Please email catering@bhojanic.com.';
  } finally {
    if (button) button.disabled = false;
  }
}, true);
