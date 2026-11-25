(() => {
  const db = window.supabaseClient || window.sb;
  const $ = (s) => document.querySelector(s);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  let me = null, notes = [], filter = 'all', readKey = '', read = new Set();

  const ago = (d) => {
    const s = Math.max(1, Math.floor((Date.now() - new Date(d)) / 1000));
    const u = [[31536000, 'y'], [2592000, 'mo'], [86400, 'd'], [3600, 'h'], [60, 'm']];
    for (const [n, l] of u) if (s >= n) return `${Math.floor(s / n)}${l} ago`;
    return 'just now';
  };

  const loadRead = () => { try { read = new Set(JSON.parse(localStorage.getItem(readKey) || '[]')); } catch { read = new Set(); } };
  const saveRead = () => { try { localStorage.setItem(readKey, JSON.stringify([...read])); } catch {} };

  async function init() {
    if (!db) throw new Error('Supabase client not found. Check that js/supabase.js loads before this file.');

    const { data: { session } } = await db.auth.getSession();
    if (!session) { location.href = 'login.html'; return; }
    me = session.user;
    readKey = `findly_read_${me.id}`;
    loadRead();

    const { data: prof } = await db.from('profiles').select('role').eq('id', me.id).maybeSingle();
    const isAdmin = prof?.role === 'admin';
    const out = [];

    // 1) status of my own claims
    const { data: myClaims, error: e1 } = await db.from('claims')
      .select('id,status,created_at,reviewed_at,items(title)')
      .eq('claimant_id', me.id).order('created_at', { ascending: false }).limit(30);
    if (e1) console.error('claims query:', e1);

    (myClaims || []).forEach((c) => {
      const title = c.items?.title || 'an item';
      if (c.status === 'approved') out.push({ id: `claim:${c.id}:approved`, icon: '✅', text: `Your claim for <b>${esc(title)}</b> was approved.`, at: c.reviewed_at || c.created_at, href: 'claims.html' });
      else if (c.status === 'rejected') out.push({ id: `claim:${c.id}:rejected`, icon: '❌', text: `Your claim for <b>${esc(title)}</b> was rejected.`, at: c.reviewed_at || c.created_at, href: 'claims.html' });
      else out.push({ id: `claim:${c.id}:pending`, icon: '⏳', text: `Your claim for <b>${esc(title)}</b> is awaiting review.`, at: c.created_at, href: 'claims.html' });
    });

    // 2) AI matches involving my items
    const { data: mine } = await db.from('items').select('id').eq('user_id', me.id);
    const ids = (mine || []).map((i) => i.id);
    if (ids.length) {
      const list = ids.join(',');
      const { data: ms, error: e2 } = await db.from('matches')
        .select('id,similarity,created_at,status,lost:items!matches_lost_item_id_fkey(title),found:items!matches_found_item_id_fkey(title)')
        .or(`lost_item_id.in.(${list}),found_item_id.in.(${list})`)
        .order('created_at', { ascending: false }).limit(30);
      if (e2) console.error('matches query:', e2);

      (ms || []).forEach((m) => {
        const pct = Math.round(Number(m.similarity) * 100);
        out.push({
          id: `match:${m.id}`, icon: '✨',
          text: `AI found a <b>${pct}%</b> match: ${esc(m.lost?.title || 'lost item')} ↔ ${esc(m.found?.title || 'found item')}.`,
          at: m.created_at, href: 'matches.html'
        });
      });
    }

    // 3) admins: claims waiting for review
    if (isAdmin) {
      const { data: pend } = await db.from('claims')
        .select('id,created_at,items(title)').eq('status', 'pending').order('created_at', { ascending: false }).limit(30);
      (pend || []).forEach((c) => out.push({
        id: `review:${c.id}`, icon: '📝',
        text: `New claim for <b>${esc(c.items?.title || 'an item')}</b> needs your review.`,
        at: c.created_at, href: 'claims.html'
      }));
    }

    notes = out.sort((a, b) => new Date(b.at) - new Date(a.at));
    render();
  }

  function render() {
    document.querySelectorAll('#filters .btn').forEach((b) => b.classList.toggle('o', b.dataset.f !== filter));
    const rows = notes.filter((n) => filter === 'all' || !read.has(n.id));

    if (!rows.length) {
      $('#list').innerHTML = `<p style="color:var(--mut);padding:12px 0">${filter === 'unread' ? 'You’re all caught up 🎉' : 'No notifications yet.'}</p>`;
      return;
    }

    $('#list').innerHTML = rows.map((n) => {
      const unread = !read.has(n.id);
      return `
      <div class="row" style="${unread ? 'background:#FFFBEF;border-radius:12px;padding-left:10px;padding-right:10px' : ''}">
        <div class="thumb">${n.icon}</div>
        <div class="info">
          <b style="font-weight:${unread ? 600 : 500}">${n.text}</b>
          <small>${esc(ago(n.at))}</small>
        </div>
        ${unread ? '<span class="tag w">New</span>' : ''}
        <a class="btn sm" href="${esc(n.href)}" data-read="${esc(n.id)}">View</a>
      </div>`;
    }).join('');
  }

  $('#filters').addEventListener('click', (e) => {
    const b = e.target.closest('[data-f]');
    if (!b) return;
    filter = b.dataset.f;
    render();
  });

  $('#markAll').addEventListener('click', () => {
    notes.forEach((n) => read.add(n.id));
    saveRead();
    render();
  });

  // mark as read when the person opens one
  $('#list').addEventListener('click', (e) => {
    const a = e.target.closest('[data-read]');
    if (!a) return;
    read.add(a.dataset.read);
    saveRead();
  });

  init().catch((e) => {
    console.error('Notifications init failed:', e);
    $('#list').innerHTML = `<p style="color:#B91C1C">Error: ${esc(e.message)}</p>`;
  });
})();