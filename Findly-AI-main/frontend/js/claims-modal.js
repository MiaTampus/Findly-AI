(() => {
  const getDb = () => window.supabaseClient || window.sb;
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // modal styles, kept here so app.css stays untouched
  const style = document.createElement('style');
  style.textContent = `
    .cm-overlay{position:fixed;inset:0;background:rgba(15,27,92,.45);display:grid;place-items:center;padding:16px;z-index:100}
    .cm-box{background:#fff;border-radius:var(--r);padding:24px;width:100%;max-width:460px;box-shadow:0 10px 40px rgba(22,37,122,.25)}
    .cm-box h2{margin-bottom:4px}
    .cm-box p.sub{color:var(--mut);font-size:14px;margin-bottom:6px}
    .cm-box textarea{min-height:120px;resize:vertical}
    .cm-err{color:#B91C1C;font-size:13px;margin-top:8px;min-height:18px}`;
  document.head.appendChild(style);

  function close() { document.querySelector('.cm-overlay')?.remove(); }

  window.openClaimModal = function ({ itemId, matchId = null, itemTitle = 'this item' }) {
    close();
    const el = document.createElement('div');
    el.className = 'cm-overlay';
    el.innerHTML = `
      <div class="cm-box" role="dialog" aria-modal="true">
        <h2>Claim item</h2>
        <p class="sub">${esc(itemTitle)}</p>
        <form id="cmForm">
          <label for="cmMsg">Proof of ownership</label>
          <textarea id="cmMsg" maxlength="600" required placeholder="Describe unique details only the owner would know (marks, contents, where you lost it…)"></textarea>
          <div class="cm-err" id="cmErr"></div>
          <div class="acts">
            <button type="button" class="btn o" id="cmCancel">Cancel</button>
            <button type="submit" class="btn" id="cmSend">Submit Claim</button>
          </div>
        </form>
      </div>`;
    document.body.appendChild(el);

    el.addEventListener('click', (e) => { if (e.target === el) close(); });
    el.querySelector('#cmCancel').onclick = close;

    el.querySelector('#cmForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const err = el.querySelector('#cmErr');
      const btn = el.querySelector('#cmSend');
      const reset = () => { btn.disabled = false; btn.textContent = 'Submit Claim'; };
      const message = el.querySelector('#cmMsg').value.trim();
      if (message.length < 10) { err.textContent = 'Please give at least 10 characters.'; return; }

      const db = getDb();
      if (!db) { err.textContent = 'Supabase client not found.'; return; }

      btn.disabled = true; btn.textContent = 'Submitting…';
      try {
        const { data: { session } } = await db.auth.getSession();
        if (!session) { location.href = 'login.html'; return; }
        const user = session.user;

        // block duplicate pending claims on the same item
       
        const { data: existing } = await db.from('claims').select('id')
          .eq('item_id', itemId).eq('claimant_id', user.id).eq('status', 'pending').limit(1);
        if (existing?.length) { err.textContent = 'You already have a pending claim for this item.'; reset(); return; }

        const { error } = await db.from('claims').insert({
          item_id: itemId, match_id: matchId, claimant_id: user.id, message
        });
        if (error) { err.textContent = error.message; reset(); return; }

        close();
        window.dispatchEvent(new CustomEvent('findly:claim-submitted'));
        if (document.body.dataset.page !== 'claims') location.href = 'claims.html';
      } catch (ex) {
        err.textContent = ex.message;
        reset();
      }
    });
  };
})();