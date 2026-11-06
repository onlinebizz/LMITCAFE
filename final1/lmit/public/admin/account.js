import { api } from './api.js';
import { t, errorText } from './i18n.js';
import { h, ic, pageHead, field, btn, toast, clearDirty } from './ui.js';

export default {
  titleKey: 'nav_account',
  async mount(root, route, ctx) {
    const me = await api.get('/api/admin/me');
    const cur = field({ label: t('pw_current'), name: 'current', type: 'password', dir: 'ltr', autocomplete: 'current-password', required: true, max: 200 });
    const next = field({ label: t('pw_new'), name: 'next', type: 'password', dir: 'ltr', autocomplete: 'new-password', required: true, max: 200, hint: t('pw_hint') });
    const again = field({ label: t('pw_again'), name: 'again', type: 'password', dir: 'ltr', autocomplete: 'new-password', required: true, max: 200 });
    const msg = h('p', { class: 'form-msg', role: 'alert', hidden: true });
    const save = h('button', { type: 'submit', class: 'btn btn-primary' }, t('pw_change'));
    const form = h('form', { class: 'acct-form', novalidate: true }, cur.el, next.el, again.el, msg, h('div', { class: 'savebar' }, save));
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      msg.hidden = true;
      [cur, next, again].forEach((f) => f.setError(''));
      if (!cur.input.value) { cur.setError(t('err_required', { field: t('pw_current') })); cur.input.focus(); return; }
      if (next.input.value.length < 10) { next.setError(t('err_weak_password')); next.input.focus(); return; }
      if (next.input.value !== again.input.value) { again.setError(t('pw_mismatch')); again.input.focus(); return; }
      save.disabled = true;
      try {
        await api.post('/api/admin/password', { current: cur.input.value, next: next.input.value });
        form.reset(); [cur, next, again].forEach((f) => { f.input.value = ''; });
        toast(t('pw_saved'));
      } catch (err) {
        const f = { current: cur, next }[err.field];
        if (f) { f.setError(errorText(err, { passwordChange: true })); f.input.focus(); } else { msg.hidden = false; msg.textContent = errorText(err, { passwordChange: true }); }
      }
      save.disabled = false;
    });
    const backup = btn([ic('download'), t('backup_download')], '', async (e) => {
      const b = e.currentTarget; b.disabled = true;
      try {
        const blob = await api.blob('/api/admin/export');
        const a = h('a', { href: URL.createObjectURL(blob), download: `lmit-backup-${new Date().toISOString().slice(0, 10)}.json` });
        document.body.append(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        toast(t('backup_saved'));
      } catch (err) { toast(errorText(err), 'error'); }
      b.disabled = false;
    });
    root.append(pageHead(t('nav_account')),
      h('p', { class: 'page-sub' }, t('signed_in_as', { email: me.user.email })),
      h('div', { class: 'acct' },
        h('section', { class: 'acct-card' }, h('h2', { class: 'sec-title' }, t('pw_title')), form),
        h('section', { class: 'acct-card' }, h('h2', { class: 'sec-title' }, t('backup_title')), h('p', { class: 'hint' }, t('backup_text')), backup),
        h('section', { class: 'acct-card' }, h('h2', { class: 'sec-title' }, t('sign_out')), btn([ic('logout'), t('sign_out')], '', () => { clearDirty(); ctx.signOut(); }))));
    return {};
  },
};
