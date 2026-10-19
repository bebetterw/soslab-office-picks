const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = n => new Intl.NumberFormat('ko-KR').format(n);
let products = [], category = '전체', query = '', sort = 'default', onlySaved = false, toastTimer;
let saved = new Set();
try { const parsed = JSON.parse(localStorage.getItem('soslab-favorites') || '[]'); if (Array.isArray(parsed)) saved = new Set(parsed.filter(x => typeof x === 'string')); } catch {}
function toast(message) { $('#toast').textContent = message; $('#toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 2200); }
function productPhoto(p, detail = false) {
  if (!p.image) return '<span class="photo-unavailable">제품 사진 준비 중</span>';
  return `<img class="product-photo" src="${esc(p.image)}" alt="${esc(p.name)} 제품 사진" ${detail ? 'loading="eager"' : 'loading="lazy"'} decoding="async" width="500" height="500">`;
}
function updateSaved() {
  $('#saved-count').textContent = saved.size;
  $('#favorites-filter').setAttribute('aria-pressed', onlySaved);
  $('#favorites-filter').textContent = onlySaved ? '♥ 즐겨찾기만' : '♡ 즐겨찾기만';
}
function render() {
  const term = query.trim().toLocaleLowerCase().replace(/\s/g, '');
  let shown = products.filter(p => (category === '전체' || category === p.category || category === '간식' && ['음료','스낵','커피'].includes(p.category)) && (!onlySaved || saved.has(p.id)) && (p.name + p.original + p.category + p.note).toLocaleLowerCase().replace(/\s/g,'').includes(term));
  if (sort === 'price-asc') shown.sort((a,b) => a.price-b.price);
  if (sort === 'price-desc') shown.sort((a,b) => b.price-a.price);
  if (sort === 'name') shown.sort((a,b) => a.name.localeCompare(b.name,'ko'));
  $('#total-count').textContent = products.length;
  $('#result-count').innerHTML = `${onlySaved ? '즐겨찾기 ' : '총 '}<b>${shown.length}</b>개의 상품`;
  $('#products').innerHTML = shown.map(p => `<article class="card"><div class="product-art"><button class="art-button" data-detail="${p.id}" aria-label="${esc(p.name)} 상세 보기">${productPhoto(p)}</button>${p.check?'<span class="check-badge">옵션 확인</span>':''}<button class="favorite" data-save="${p.id}" aria-label="${esc(p.name)} 즐겨찾기" aria-pressed="${saved.has(p.id)}">${saved.has(p.id)?'♥':'♡'}</button></div><div class="card-info"><span class="card-category">${esc(p.category === '커피' ? '원두·커피' : p.category)}</span><button class="name-button" data-detail="${p.id}">${esc(p.name)}</button>${p.linkedOption ? `<p class="option-note">연결 옵션: ${esc(p.linkedOption)}</p>` : ''}<div class="card-bottom"><span class="price">${money(p.price)}<small>원</small></span><a class="buy-link" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer sponsored" aria-label="${esc(p.name)} 쿠팡에서 보기">쿠팡에서 보기 <span>↗</span></a></div></div></article>`).join('');
  $('#products').querySelectorAll('img').forEach(img => img.addEventListener('error', () => { img.replaceWith(Object.assign(document.createElement('span'), {className:'photo-unavailable',textContent:'사진을 불러올 수 없어요'})); }, {once:true}));
  $('#empty').hidden = shown.length > 0;
  document.querySelectorAll('[data-category]').forEach(b => { b.classList.toggle('active', b.dataset.category === category); b.setAttribute('aria-pressed', b.dataset.category === category); });
  document.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('nav-current', a.dataset.nav === category || a.dataset.nav === '간식' && ['음료','스낵','커피'].includes(category)));
  updateSaved();
}
function chooseCategory(c, scroll = false) { category = c; onlySaved = false; render(); if (scroll) $('#collection').scrollIntoView({behavior:'smooth'}); }
function openSaved() { category = '전체'; query = ''; $('#search').value = ''; onlySaved = true; render(); $('#collection').scrollIntoView({behavior:'smooth'}); }
function openDetail(id) {
  const p = products.find(p => p.id === id); if (!p) return;
  $('#detail-content').innerHTML = `<div class="detail-art">${productPhoto(p,true)}</div><span class="detail-category">${esc(p.category)}</span><h2>${esc(p.name)}</h2><p class="detail-price">${money(p.price)}원 <small>목록 등록 가격</small></p><div class="detail-note">${p.check?'<b>구매 전 옵션을 확인해 주세요.</b>':'<b>상품 구성 안내</b>'}${esc(p.note)}${p.linkedOption ? `<p class="linked-option"><b>연결 옵션 참고</b>${esc(p.linkedOption)}<br>요청한 수량·규격과 다를 수 있습니다. 판매 페이지의 최종 옵션을 확인해 주세요.</p>` : ''}</div>${p.name!==p.original?`<p class="detail-original">원래 요청 항목: ${esc(p.original)}</p>`:''}${p.photoSource ? `<p class="photo-credit"><a href="${esc(p.photoSource)}" target="_blank" rel="noopener noreferrer">제품 사진 출처 ↗</a><span>대표 이미지 · 구매 수량은 옵션 확인</span></p>` : ''}<p class="detail-disclaimer">가격과 재고는 실시간 정보가 아닙니다. 판매 페이지에서 최종 가격·수량·규격을 확인해 주세요.</p><a class="detail-buy" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer sponsored">쿠팡에서 상품 보기 ↗</a>`;
  $('#detail').showModal();
}
document.addEventListener('click', e => {
  const save = e.target.closest('[data-save]');
  if (save) {
    const id = save.dataset.save, isSaved = saved.has(id); if (isSaved) saved.delete(id); else saved.add(id);
    let persisted = true; try { localStorage.setItem('soslab-favorites',JSON.stringify([...saved])); } catch { persisted = false; }
    if (onlySaved) render(); else { save.setAttribute('aria-pressed', !isSaved); save.textContent = isSaved ? '♡' : '♥'; updateSaved(); }
    toast(persisted ? isSaved ? '즐겨찾기에서 삭제했어요.' : '즐겨찾기에 담았어요.' : '이 화면에서만 즐겨찾기를 유지할 수 있어요.');
  }
  const detail = e.target.closest('[data-detail]'); if (detail) openDetail(detail.dataset.detail);
  const cat = e.target.closest('[data-category]'); if (cat) chooseCategory(cat.dataset.category);
  const quick = e.target.closest('[data-quick]'); if (quick) chooseCategory(quick.dataset.quick,true);
  const nav = e.target.closest('[data-nav]'); if (nav) { e.preventDefault(); chooseCategory(nav.dataset.nav,true); }
});
$('#search').addEventListener('input', e => {query=e.target.value; render();});
$('#sort').addEventListener('change', e => {sort=e.target.value;render();});
$('#favorites-filter').addEventListener('click', () => {onlySaved=!onlySaved;render();});
$('#saved-nav').addEventListener('click',openSaved); $('#closing-saved').addEventListener('click',openSaved);
$('#reset-filters').addEventListener('click',()=>{query='';category='전체';onlySaved=false;sort='default';$('#search').value='';$('#sort').value='default';render();});
$('.dialog-close').addEventListener('click',()=>$('#detail').close());
$('#detail').addEventListener('click', e => { if (e.target === $('#detail')) { const rect = $('#detail').getBoundingClientRect(); if(e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) $('#detail').close(); } });
window.addEventListener('storage',e=>{if(e.key==='soslab-favorites'){try{const ids=JSON.parse(e.newValue||'[]');if(Array.isArray(ids)){saved=new Set(ids.filter(x=>typeof x==='string'));render();}}catch{}}});
async function init() {
  try { const response = await fetch('products.json'); if (!response.ok) throw new Error('상품 목록을 불러오지 못했습니다.'); products = await response.json(); products.forEach(p => { if (['14','15'].includes(p.id)) p.category = '스낵'; }); saved = new Set([...saved].filter(id => products.some(p=>p.id===id))); render(); }
  catch { $('#products').innerHTML = '<p>상품 목록을 불러오지 못했어요. <button onclick="location.reload()">새로고침</button>해 주세요.</p>'; $('#result-count').textContent='목록을 불러올 수 없어요.'; }
}
init();
