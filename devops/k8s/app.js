(function(){
  const navList = document.getElementById('nav-list');
  const content = document.getElementById('content');
  const searchInput = document.getElementById('search');
  const matchCount = document.getElementById('match-count');
  const statGroups = document.getElementById('stat-groups');
  const statCards = document.getElementById('stat-cards');

  function esc(s){
    return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  }

  function flowHTML(f){
    if(!f) return '';
    const parts = f.split('→').map(s=>s.trim()).filter(Boolean);
    return '<div class="flow detail">' + parts.map((p,i)=>
      (i>0?'<span class="arrow">→</span>':'') + '<span class="seg">'+esc(p)+'</span>'
    ).join('') + '</div>';
  }

  function pointsHTML(arr, neg){
    if(!arr || !arr.length) return '';
    return '<ul class="points detail'+(neg?' neg':'')+'">' + arr.map(p=>'<li>'+esc(p)+'</li>').join('') + '</ul>';
  }

  function qaHTML(qa){
    if(!qa || !qa.length) return '';
    return qa.map(([q,a])=>'<div class="qa detail"><div class="q">'+esc(q)+'</div><p class="a">'+esc(a)+'</p></div>').join('');
  }

  function cmdHTML(cmd){
    if(!cmd || !cmd.length) return '';
    return '<div class="cmd detail">' + cmd.map(c=>'<div>'+esc(c)+'</div>').join('') + '</div>';
  }

  function cardHTML(item){
    const cls = ['card'];
    if(item.warn) cls.push('warn');
    if(item.err) cls.push('err');
    const searchBlob = [item.t,item.o,item.d,item.d2,item.d3,(item.p||[]).join(' '),(item.pn||[]).join(' '),
      (item.qa||[]).map(x=>x.join(' ')).join(' '),(item.cmd||[]).join(' '),item.note].join(' ').toLowerCase();
    let html = '<article class="'+cls.join(' ')+'" data-search="'+esc(searchBlob)+'">';
    html += '<div class="card-head"><h3>'+esc(item.t)+'</h3><span class="oneliner">'+esc(item.o)+'</span></div>';
    if(item.d) html += '<p class="def detail">'+esc(item.d)+'</p>';
    if(item.d2) html += '<p class="def detail">'+esc(item.d2)+'</p>';
    if(item.d3) html += '<p class="def detail">'+esc(item.d3)+'</p>';
    html += pointsHTML(item.p,false);
    html += pointsHTML(item.pn,true);
    html += flowHTML(item.f);
    html += qaHTML(item.qa);
    html += cmdHTML(item.cmd);
    if(item.note) html += '<p class="note detail">'+esc(item.note)+'</p>';
    html += '</article>';
    return html;
  }

  function groupHTML(group, index){
    let html = '<section class="group" id="'+group.id+'">';
    html += '<div class="group-head"><span class="group-index">G'+(index+1)+'</span><h2>'+esc(group.title)+'</h2><span class="count">'+group.items.length+' concepts</span></div>';
    html += '<div class="cards">' + group.items.map(cardHTML).join('') + '</div>';
    html += '</section>';
    return html;
  }

  function qbankSectionHTML(){
    let html = '<section class="group" id="qbank" data-search-skip="0">';
    html += '<div class="group-head"><span class="group-index">G'+(DATA.length+1)+'</span><h2>Rapid-Fire Interview Q&amp;A Bank</h2><span class="count">'+QBANK.length+' questions</span></div>';
    html += '<div class="qbank">' + QBANK.map(([q,a])=>
      '<div class="qitem" data-search="'+esc((q+' '+a).toLowerCase())+'"><p class="q">'+esc(q)+'</p><p class="a">→ '+esc(a)+'</p></div>'
    ).join('') + '</div>';
    html += '</section>';
    return html;
  }

  function refTableSectionHTML(){
    let html = '<section class="group" id="quickref">';
    html += '<div class="group-head"><span class="group-index">G'+(DATA.length+2)+'</span><h2>Quick Reference Table</h2><span class="count">'+REFTABLE.length+' entries</span></div>';
    html += '<div class="card" style="max-width:560px"><table class="reftable"><thead><tr><th>Concept</th><th>One-liner</th></tr></thead><tbody>';
    html += REFTABLE.map(([k,v])=>'<tr><td class="k">'+esc(k)+'</td><td>'+esc(v)+'</td></tr>').join('');
    html += '</tbody></table></div>';
    html += '</section>';
    return html;
  }

  function revisionSectionHTML(){
    let html = '<section class="group" id="revision">';
    html += '<div class="group-head"><span class="group-index">G'+(DATA.length+3)+'</span><h2>30-Minute Revision Flow &amp; Final Tips</h2></div>';
    html += '<div class="card" style="margin-bottom:14px;">'+flowHTML(REVISION_FLOW).replace('detail','')+'</div>';
    html += '<div class="card"><ul class="points">'+FINAL_TIPS.map(t=>'<li>'+esc(t)+'</li>').join('')+'</ul></div>';
    html += '</section>';
    return html;
  }

  // ---- Render ----
  let allGroupsMeta = DATA.map(g=>({id:g.id,title:g.title,count:g.items.length}));
  allGroupsMeta.push({id:'qbank',title:'Rapid-Fire Q&A Bank',count:QBANK.length});
  allGroupsMeta.push({id:'quickref',title:'Quick Reference Table',count:REFTABLE.length});
  allGroupsMeta.push({id:'revision',title:'Revision Flow & Tips',count:null});

  navList.innerHTML = allGroupsMeta.map(g=>
    '<li><a href="#'+g.id+'" data-target="'+g.id+'">'+esc(g.title)+(g.count!==null?'<span class="n-count">'+g.count+'</span>':'')+'</a></li>'
  ).join('');

  content.innerHTML = DATA.map(groupHTML).join('') + qbankSectionHTML() + refTableSectionHTML() + revisionSectionHTML();

  let totalCards = 0;
  DATA.forEach(g=>totalCards+=g.items.length);
  statGroups.textContent = allGroupsMeta.length;
  statCards.textContent = totalCards + QBANK.length;

  // ---- Sidebar active-link highlight on scroll ----
  const navLinks = Array.from(navList.querySelectorAll('a'));
  const sections = Array.from(document.querySelectorAll('.group'));
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if(e.isIntersecting){
        navLinks.forEach(l=>l.classList.remove('current'));
        const link = navList.querySelector('a[data-target="'+e.target.id+'"]');
        if(link) link.classList.add('current');
      }
    });
  }, {rootMargin:'-10% 0px -75% 0px'});
  sections.forEach(s=>io.observe(s));

  // ---- Search filter ----
  function runSearch(){
    const term = searchInput.value.trim().toLowerCase();
    let visibleCount = 0;
    document.querySelectorAll('.card, .qitem').forEach(card=>{
      const blob = card.getAttribute('data-search') || '';
      const match = !term || blob.includes(term);
      card.classList.toggle('hidden', !match);
      if(match) visibleCount++;
    });
    // hide empty groups (skip quickref/revision, which don't have per-card search)
    sections.forEach(sec=>{
      if(sec.id==='quickref' || sec.id==='revision'){
        sec.classList.toggle('hidden', !!term);
        return;
      }
      const visibleInGroup = sec.querySelectorAll('.card:not(.hidden), .qitem:not(.hidden)').length;
      sec.classList.toggle('hidden', term && visibleInGroup===0);
    });
    matchCount.textContent = term ? (visibleCount + ' match' + (visibleCount===1?'':'es')) : '';
  }
  searchInput.addEventListener('input', runSearch);

  // ---- Rapid mode toggle ----
  const modeFull = document.getElementById('mode-full');
  const modeRapid = document.getElementById('mode-rapid');
  modeFull.addEventListener('click', ()=>{
    document.body.classList.remove('rapid');
    modeFull.classList.add('active'); modeRapid.classList.remove('active');
  });
  modeRapid.addEventListener('click', ()=>{
    document.body.classList.add('rapid');
    modeRapid.classList.add('active'); modeFull.classList.remove('active');
  });

  // keyboard shortcut: focus search with "/"
  document.addEventListener('keydown', (e)=>{
    if(e.key==='/' && document.activeElement!==searchInput){
      e.preventDefault(); searchInput.focus();
    }
  });
})();
