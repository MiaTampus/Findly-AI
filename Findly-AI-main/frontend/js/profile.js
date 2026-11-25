(() => {
  const db = window.sb;
  const $ = (s) => document.querySelector(s);
  let me = null;

  function flash(text, ok = true) {
    const m = $('#msg');
    m.innerHTML = '';
    const p = document.createElement('p');
    p.className = 'tag' + (ok ? '' : ' w');
    p.style.cssText = 'display:inline-block;margin-bottom:12px';
    p.textContent = text; // textContent avoids injecting server error strings as HTML
    m.appendChild(p);
    setTimeout(() => (m.innerHTML = ''), 4000);
  }

  const initials = (n) => (n || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

  function paint(p) {
    $('#fullName').value = p.full_name || '';
    $('#studentId').value = p.student_id || '';
    $('#email').value = p.email || me.email || '';
    $('#avatar').textContent = initials(p.full_name);
    $('#nameView').textContent = p.full_name || '—';
    $('#roleView').textContent = p.role || 'student';
    $('#emailView').textContent = p.email || me.email || '—';
    $('#sidView').textContent = p.student_id || '—';
    $('#joinView').textContent = p.created_at
      ? new Date(p.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
      : '—';
  }

  async function counts() {
    const head = { count: 'exact', head: true };
    const [lost, found, claims, resolved] = await Promise.all([
      db.from('items').select('id', head).eq('user_id', me.id).eq('type', 'lost'),
      db.from('items').select('id', head).eq('user_id', me.id).eq('type', 'found'),
      db.from('claims').select('id', head).eq('claimant_id', me.id),
      db.from('items').select('id', head).eq('user_id', me.id).eq('status', 'resolved')
    ]);
    $('#sLost').textContent = lost.count ?? 0;
    $('#sFound').textContent = found.count ?? 0;
    $('#sClaims').textContent = claims.count ?? 0;
    $('#sResolved').textContent = resolved.count ?? 0;
  }

  async function init() {
    const { data: { user } } = await db.auth.getUser();
    if (!user) return (location.href = 'login.html');
    me = user;

    const { data, error } = await db.from('profiles').select('*').eq('id', me.id).single();
    if (error) return flash('Could not load your profile.', false);
    paint(data);
    counts();
  }

  $('#profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const full_name = $('#fullName').value.trim();
    const student_id = $('#studentId').value.trim() || null;
    if (!full_name) return flash('Full name is required.', false);

    const btn = $('#saveBtn');
    btn.disabled = true; btn.textContent = 'Saving…';

    // role is intentionally not sent (protected by protect_profile_role_trigger)
    const { data, error } = await db.from('profiles')
      .update({ full_name, student_id }).eq('id', me.id).select().single();

    btn.disabled = false; btn.textContent = 'Save Changes';
    if (error) {
      return flash(error.code === '23505' ? 'That Student ID is already registered.' : error.message, false);
    }
    paint(data);
    flash('Profile updated.');
  });

  $('#pwForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const a = $('#pw1').value, b = $('#pw2').value;
    if (a.length < 8) return flash('Password must be at least 8 characters.', false);
    if (a !== b) return flash('Passwords do not match.', false);

    const btn = $('#pwBtn');
    btn.disabled = true; btn.textContent = 'Updating…';
    const { error } = await db.auth.updateUser({ password: a });
    btn.disabled = false; btn.textContent = 'Update Password';

    if (error) return flash(error.message, false);
    $('#pwForm').reset();
    flash('Password updated.');
  });

  init();
})();