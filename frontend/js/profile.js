(() => {
  const db = window.supabaseClient || window.sb;
  const $ = (s) => document.querySelector(s);
  let me = null;

  function flash(text, ok = true) {
    const m = $('#msg');
    m.innerHTML = '';
    const p = document.createElement('p');
    p.className = 'tag' + (ok ? '' : ' w');
    p.style.cssText = 'display:inline-block;margin-bottom:12px';
    p.textContent = text; // textContent avoids injecting error strings as HTML
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
    if (!db) throw new Error('Supabase client not found. Check that js/supabase.js loads before this file.');

    const { data: { session } } = await db.auth.getSession();
    if (!session) { location.href = 'login.html'; return; }
    me = session.user;

    let { data, error } = await db.from('profiles').select('*').eq('id', me.id).maybeSingle();
    if (error) throw error;

    // no profile row yet: create one from the signup details
    if (!data) {
      const meta = me.user_metadata || {};
      const base = {
        id: me.id,
        full_name: meta.full_name || (me.email || 'User').split('@')[0],
        email: me.email,
      };
      let res = await db.from('profiles').insert({ ...base, student_id: meta.student_id || null }).select().single();
      // student ID already taken by another account: retry without it
      if (res.error && res.error.code === '23505') {
        res = await db.from('profiles').insert({ ...base, student_id: null }).select().single();
      }
      if (res.error) throw res.error;
      data = res.data;
    }

    paint(data);
    counts().catch(console.error);
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

  init().catch((e) => {
    console.error('Profile init failed:', e);
    flash('Error: ' + e.message, false);
  });
})();