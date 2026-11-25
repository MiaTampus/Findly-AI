// Injects shared sidebar, top bar and mobile bottom nav. Page needs: <body data-page="dashboard" data-title="..." data-sub="...">
const P={home:'M3 12l9-9 9 9M5 10v10h14V10',box:'M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8',search:'M11 19a8 8 0 100-16 8 8 0 000 16M21 21l-4-4',spark:'M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z',file:'M6 2h9l5 5v15H6zM14 2v6h6',shield:'M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z',bell:'M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M10 21h4',user:'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8',out:'M9 21H5V3h4M16 17l5-5-5-5M21 12H9',check:'M20 6L9 17l-5-5',menu:'M3 6h18M3 12h18M3 18h18',plus:'M12 5v14M5 12h14'};
const ic=n=>`<svg class="ic" viewBox="0 0 24 24"><path d="${P[n]}"/></svg>`;
const NAV=[['dashboard','Dashboard','home'],['report-lost','Report Lost Item','box'],['report-found','Report Found Item','search'],['matches','AI Matches','spark'],['my-reports','My Reports','file'],['claims','Claims','shield'],['notifications','Notifications','bell'],['profile','Profile','user']];
const B=document.body,pg=B.dataset.page;
const content=document.createElement('main');content.className='main';
while(B.firstChild)content.appendChild(B.firstChild);
content.insertAdjacentHTML('afterbegin',`<header class="top"><button class="burger" id="bg">${ic('menu')}</button><div><h1>${B.dataset.title}</h1><p>${B.dataset.sub||''}</p></div><span class="sp"></span><a class="iconbtn" href="notifications.html" aria-label="Notifications">${ic('bell')}<i class="dot"></i></a><div class="avatar">M</div></header>`);
B.innerHTML=`<aside class="side" id="sd"><div class="logo">${ic('box')} Findly AI</div>${NAV.map(([k,l,i])=>`<a href="${k}.html" class="${k===pg?'on':''}">${ic(i)} ${l}${k==='matches'?'<span class="pill">AI</span>':''}</a>`).join('')}<a href="login.html" class="out">${ic('out')} Log Out</a></aside>`;
B.appendChild(content);
B.insertAdjacentHTML('beforeend',`<nav class="bnav">${[['dashboard','Home','home'],['report-lost','Report','plus'],['matches','Matches','spark'],['claims','Claims','user']].map(([k,l,i])=>`<a href="${k}.html" class="${k===pg?'on':''}">${ic(i)}${l}</a>`).join('')}</nav>`);
document.getElementById('bg').onclick=()=>document.getElementById('sd').classList.toggle('open');
document.addEventListener('click',e=>{const s=document.getElementById('sd');if(s.classList.contains('open')&&!s.contains(e.target)&&!e.target.closest('#bg'))s.classList.remove('open')});

// ---- real avatar initials + working logout ----
(async () => {
  const c = window.supabaseClient || window.sb;
  if (!c) return;

  document.querySelector('.side .out')?.addEventListener('click', async (e) => {
    e.preventDefault();
    await c.auth.signOut();
    location.href = 'login.html';
  });

  const { data: { session } } = await c.auth.getSession();
  const user = session?.user;
  if (!user) return;
  const name = user.user_metadata?.full_name || user.email || '?';
  const av = document.querySelector('.top .avatar');
  if (av) av.textContent = name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
})();