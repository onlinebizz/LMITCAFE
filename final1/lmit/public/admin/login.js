import { api, setCsrf } from './api.js';
import { t, tn, errorText, lang, setLang } from './i18n.js';
import { h, ic, field } from './ui.js';

export function showLogin(app, { message = '', done }) {
  const email = field({ label: t('email'), name: 'email', type: 'email', dir: 'ltr', autocomplete: 'username', required: true, max: 200 });
  const pass = field({ label: t('password'), name: 'password', type: 'password', dir: 'ltr', autocomplete: 'current-password', required: true, max: 200 });
  const eye = h('button', { type: 'button', class: 'icon-btn eye', 'aria-label': t('show_password'), 'aria-pressed': 'false' }, ic('eye'));
  eye.addEventListener('click', () => {
    const on = pass.input.type === 'password';
    pass.input.type = on ? 'text' : 'password';
    eye.setAttribute('aria-pressed', on ? 'true' : 'false');
    eye.setAttribute('aria-label', on ? t('hide_password') : t('show_password'));
    eye.replaceChildren(ic(on ? 'eyeoff' : 'eye'));
  });
  pass.el.querySelector('.inp').after(eye);
  pass.el.classList.add('has-eye');
  const msg = h('p', { class: 'form-msg', role: 'alert' }, message);
  msg.hidden = !message;
  const go = h('button', { type: 'submit', class: 'btn btn-primary btn-block' }, t('sign_in'));
  let timer;
  const form = h('form', { class: 'login-form', novalidate: true }, h('h1', { class: 'login-title', tabindex: '-1' }, t('sign_in')), h('p', { class: 'login-sub' }, t('login_sub')), msg, email.el, pass.el, go);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearInterval(timer);
    let limited = false;
    email.setError(''); pass.setError(''); msg.hidden = true;
    if (!email.input.value.trim()) { email.setError(t('err_required', { field: t('f_email') })); email.input.focus(); return; }
    if (!pass.input.value) { pass.setError(t('err_required', { field: t('f_password') })); pass.input.focus(); return; }
    go.disabled = true; go.textContent = t('signing_in');
    try {
      const r = await api.post('/api/admin/login', { email: email.input.value.trim(), password: pass.input.value }, { quiet: true });
      setCsrf(r.csrf);
      done(r.user);
      return;
    } catch (err) {
      msg.hidden = false;
      msg.textContent = errorText(err);
      if (err.code === 'rate_limited') {
        let left = Number(err.extra.retry_after) || 60;
        limited = true;
        go.disabled = true;
        timer = setInterval(() => {
          left -= 1;
          if (left <= 0) { clearInterval(timer); go.disabled = false; msg.hidden = true; return; }
          msg.textContent = errorText({ code: 'rate_limited', extra: { retry_after: left } });
        }, 1000);
      } else if (err.code === 'bad_credentials') pass.input.focus();
    }
    go.textContent = t('sign_in');
    if (!limited) go.disabled = false;
  });

  const langBtn = h('button', { type: 'button', class: 'btn btn-quiet login-lang', on: { click: () => { setLang(lang() === 'ar' ? 'en' : 'ar'); showLogin(app, { message: '', done }); } } }, ic('globe'), t('lang_other'));
  app.className = 'login';
  app.replaceChildren(
    h('div', { class: 'login-art' }, h('img', { src: '/brand/logo-lockup-cream.png', width: 240, height: 97, alt: t('brand') }), h('p', { class: 'login-art-line' }, t('login_art'))),
    h('main', { class: 'login-main' }, langBtn, form));
  email.input.focus();
  document.title = `${t('sign_in')} | ${t('brand')}`;
}
