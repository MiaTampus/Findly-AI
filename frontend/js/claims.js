(() => {
  const db = window.supabaseClient || window.sb;
  const $ = (s) => document.querySelector(s);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (d) => new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

  let me = null, isAdmin = false, claims = [], people = {}, filter = 'all';

  function flash(text, ok = true) {
    $('#msg').innerHTML = `<p class="tag ${ok ? '' : 'w'}" style="display:inline-block;margin-bottom:12px">${esc(text)}</p>`;
    setTimeout(() => ($('#msg').innerHTML = ''), 4000);
  }

  async function init() {
    if (!db) throw new Error('Supabase client not found. Check that js/supabase.js loads before this file.');

    const { data: { session } } = await db.auth.getSession();
    if (!session) { location.href = 'login.html'; return; }
    me = session.user;

    const { data: prof } = await db.from('profiles').select('role').eq('id', me.id).maybeSingle();
    isAdmin = prof?.role === 'admin';
    $('#listTitle').textContent = isAdmin ? 'All Claims' : 'My Claims';
    await load();
  }

  async function load() {
    let q = db.from('claims')
      .select('*, items(id,title,type,category,location,image_url)')
      .order('created_at', { ascending: false });
    if (!isAdmin) q = q.eq('claimant_id', me.id);

    const { data, error } = await q;
    if (error) {
      $('#list').innerHTML = `<p style="color:#B91C1C">Could not load claims: ${esc(error.message)}</p>`;
      return;
    }
    claims = data || [];

    // claimant_id references auth.users, so fetch names from profiles separately
    if (isAdmin && claims.length) {
      const ids = [...new Set(claims.map((c) => c.claimant_id))];
      const { data: profs } = await db.from('profiles').select('id,full_name,student_id,email').in('id', ids);
      people = Object.fromEntries((profs || []).map((p) => [p.id, p]));
    }
    render();
  }

  function render() {
    const count = (s) => claims.filter((c) => c.status === s).length;
    $('#sTotal').textContent = claims.length;
    $('#sPending').textContent = count('pending');
    $('#sApproved').textContent = count('approved');
    $('#sRejected').textContent = count('rejected');

    document.querySelectorAll('#filters .btn').forEach((b) => b.classList.toggle('o', b.dataset.f !== filter));

    const rows = claims.filter((c) => filter === 'all' || c.status === filter);
    if (!rows.length) {
      $('#list').innerHTML = `<p style="color:var(--mut);padding:12px 0">${filter === 'all' ? 'No claims yet. Open an item and tap “Claim this item” to submit one.' : `No ${esc(filter)} claims.`}</p>`;
      return;
    }

    $('#list').innerHTML = rows.map((c) => {
      const it = c.items || {};
      const who = people[c.claimant_id];
      const tagCls = c.status === 'approved' ? '' : c.status === 'pending' ? 'w' : 'l';
      const thumb = it.image_url ? `<img src="${esc(it.image_url)}" alt="">` : (it.type === 'found' ? '📦' : '🔎');

      let actions = '';
      if (isAdmin && c.status === 'pending') {
        actions = `
          <button class="btn sm" data-act="approve" data-id="${esc(c.id)}">Approve</button>
          <button class="btn sm" style="background:#FEE2E2;border-color:#FEE2E2;color:#B91C1C" data-act="reject" data-id="${esc(c.id)}">Reject</button>`;
      } else if (!isAdmin && c.status === 'pending') {
        actions = `<button class="btn sm" style="background:#FEE2E2;border-color:#FEE2E2;color:#B91C1C" data-act="cancel" data-id="${esc(c.id)}">Cancel</button>`;
      }

      return `
      <div class="row" style="align-items:flex-start;flex-wrap:wrap">
        <div class="thumb">${thumb}</div>
        <div class="info">
          <b>${esc(it.title || 'Deleted item')}</b>
          <small>${isAdmin && who ? `By ${esc(who.full_name)}${who.student_id ? ' • ' + esc(who.student_id) : ''} • ` : ''}${esc(fmt(c.created_at))}${it.location ? ' • ' + esc(it.location) : ''}</small>
          <small style="display:block;margin-top:6px;color:var(--t)">“${esc(c.message)}”</small>
        </div>
        <span class="tag ${tagCls}">${esc(c.status[0].toUpperCase() + c.status.slice(1))}</span>
        ${actions}
        ${it.id ? `<a class="btn sm o" href="item-details.html?id=${esc(it.id)}">Item</a>` : ''}
      </div>`;
    }).join('');
  }

  async function review(id, status) {
    const c = claims.find((x) => x.id === id);
    if (!c) return;

    const { error } = await db.from('claims')
      .update({ status, reviewed_by: me.id, reviewed_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return flash(error.message, false);

    // keep items / matches in sync with the decision
    if (status === 'approved') {
      await db.from('items').update({ status: 'claimed' }).eq('id', c.item_id);
      if (c.match_id) await db.from('matches').update({ status: 'accepted' }).eq('id', c.match_id);
    } else if (c.match_id) {
      await db.from('matches').update({ status: 'rejected' }).eq('id', c.match_id);
    }

    flash(`Claim ${status}.`);
    await load();
  }

  async function cancel(id) {
    if (!confirm('Cancel this claim?')) return;
    const { error } = await db.from('claims').delete().eq('id', id).eq('claimant_id', me.id).eq('status', 'pending');
    if (error) return flash(error.message, false);
    flash('Claim cancelled.');
    await load();
  }

  $('#filters').addEventListener('click', (e) => {
    const b = e.target.closest('[data-f]');
    if (!b) return;
    filter = b.dataset.f;
    render();
  });

  $('#list').addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const { act, id } = b.dataset;
    if (act === 'approve') review(id, 'approved');
    if (act === 'reject') review(id, 'rejected');
    if (act === 'cancel') cancel(id);
  });

  window.addEventListener('findly:claim-submitted', () => load().catch(console.error));

  init().catch((e) => {
    console.error('Claims init failed:', e);
    $('#list').innerHTML = `<p style="color:#B91C1C">Error: ${esc(e.message)}</p>`;
  });
})();