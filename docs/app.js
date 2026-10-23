const $ = (selector) => document.querySelector(selector);
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = value => new Intl.NumberFormat('ko-KR').format(value);
const favoriteKey = 'wires-favorites-v1';
let products = [], category = '전체', query = '', sort = 'default', status = 'all', onlySaved = false, toastTimer;
let saved = new Set();
try { const value = JSON.parse(localStorage.getItem(favoriteKey) || '[]'); if (Array.isArray(value)) saved = new Set(value.filter(id => typeof id === 'string')); } catch {}
function toast(message) { $('#toast').textContent = message; $('#toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 2200); }
function productPhoto(p, detail = false) {
  if (!p.image) return `<span class="photo-unavailable"><span aria-hidden="true">${p.availability === 'missing' ? '—' : '◇'}</span>${p.availability === 'missing' ? '구매 링크 미확보' : '제품 사진 미확보'}</span>`;
  return `<img class="product-photo" src="${esc(p.image)}" alt="${esc(p.name)} 제품 사진" loading="${detail ? 'eager' : 'lazy'}" decoding="async" width="500" height="500">`;
}
function handlePhotoErrors(root) {
  root.querySelectorAll('img').forEach(img => img.addEventListener('error', () => { img.replaceWith(Object.assign(document.createElement('span'), {className:'photo-unavailable',textContent:'사진을 불러올 수 없어요'})); }, {once:true}));
}
function renderSummary() {
  const counts = {all:products.length,linked:products.filter(p=>p.url).length,approximate:products.filter(p=>p.availability==='approximate').length,missing:products.filter(p=>p.availability==='missing').length};
  $('#catalog-summary').innerHTML = [['all','전체 품목'],['linked','구매 링크 있음'],['approximate','옵션 확인 필요'],['missing','구매 링크 없음']].map(([key,label])=>`<button data-status="${key}" aria-pressed="${status===key}"><span>${esc(label)}</span><strong>${counts[key]}<small>개</small></strong></button>`).join('');
}
function renderHero() {
  const preferred = ['wires-049','wires-037','wires-054','wires-003','wires-063'];
  const picks = preferred.map(id => products.find(p=>p.id===id && p.image)).filter(Boolean);
  for (const p of products) { if(picks.length >= 2) break; if(p.image && !picks.includes(p)) picks.push(p); }
  ['#hero-photo-main','#hero-photo-small'].forEach((selector,i)=>{ const p = picks[i]; $(selector).hidden = !p; $(selector).innerHTML = p ? `<img src="${esc(p.image)}" alt="" decoding="async"><span>${esc(p.category)}</span>` : ''; });
}
function updateSaved() {
  $('#saved-count').textContent = saved.size;
  $('#favorites-filter').setAttribute('aria-pressed', onlySaved);
  $('#favorites-filter').textContent = onlySaved ? '♥ 즐겨찾기만' : '♡ 즐겨찾기만';
}
function matchesStatus(p) { return status === 'all' || (status === 'linked' && !!p.url) || status === p.availability; }
function render() {
  const term = query.trim().toLocaleLowerCase().replace(/\s/g,'');
  let shown = products.filter(p => (category === '전체' || category === p.category) && matchesStatus(p) && (!onlySaved || saved.has(p.id)) && (p.name + p.category + p.note).toLocaleLowerCase().replace(/\s/g,'').includes(term));
  if (sort === 'price-asc' || sort === 'price-desc') shown.sort((a,b) => {
    if (a.price === null && b.price === null) return a.sourceNumber-b.sourceNumber;
    if (a.price === null) return 1; if (b.price === null) return -1;
    return sort === 'price-asc' ? a.price-b.price : b.price-a.price;
  });
  if (sort === 'name') shown.sort((a,b)=>a.name.localeCompare(b.name,'ko'));
  $('#total-count').textContent = products.length;
  $('#result-count').innerHTML = `${onlySaved ? '즐겨찾기 ' : '총 '}<b>${shown.length}</b>개의 품목`;
  $('#products').innerHTML = shown.map(p=>`<article class="card ${p.availability==='missing'?'card-missing':''}"><div class="product-art"><button class="art-button" data-detail="${p.id}" aria-label="${esc(p.name)} 상세 보기">${productPhoto(p)}</button>${p.availability==='missing'?'<span class="check-badge missing-badge">링크 없음</span>':p.check?'<span class="check-badge">옵션 확인</span>':''}<button class="favorite" data-save="${p.id}" aria-label="${esc(p.name)} 즐겨찾기" aria-pressed="${saved.has(p.id)}">${saved.has(p.id)?'♥':'♡'}</button></div><div class="card-info"><span class="card-category">${esc(p.category)} <span class="source-number">NO. ${String(p.sourceNumber).padStart(2,'0')}</span></span><button class="name-button" data-detail="${p.id}">${esc(p.name)}</button>${p.check?'<p class="option-note">요청 구성과 다를 수 있어요.</p>':''}<div class="card-bottom">${p.price!==null?`<span class="price">${money(p.price)}<small>원</small></span>`:'<span class="price-unavailable">가격 미확보</span>'}${p.url?`<a class="buy-link" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer sponsored" aria-label="${esc(p.name)} 쿠팡에서 보기">쿠팡에서 보기 <span>↗</span></a>`:`<button class="buy-link unavailable-link" data-detail="${p.id}">사유 보기 <span>↗</span></button>`}</div></div></article>`).join('');
  handlePhotoErrors($('#products'));
  $('#empty').hidden = shown.length > 0;
  $('#status-filter').value = status;
  document.querySelectorAll('[data-category]').forEach(button=>{button.classList.toggle('active',button.dataset.category===category);button.setAttribute('aria-pressed',button.dataset.category===category);});
  document.querySelectorAll('[data-nav]').forEach(a=>a.classList.toggle('nav-current',a.dataset.nav===category));
  renderSummary();updateSaved();
}
function chooseCategory(value, scroll = false) {category=value;onlySaved=false;render();if(scroll)$('#collection').scrollIntoView({behavior:'smooth'});}
function openSaved() {category='전체';query='';status='all';$('#search').value='';onlySaved=true;render();$('#collection').scrollIntoView({behavior:'smooth'});}
function openDetail(id) {
  const p=products.find(p=>p.id===id);if(!p)return;
  $('#detail-content').innerHTML=`<div class="detail-art">${productPhoto(p,true)}</div><span class="detail-category">${esc(p.category)} · NO. ${p.sourceNumber}</span><h2 id="detail-title">${esc(p.name)}</h2>${p.price!==null?`<p class="detail-price">${money(p.price)}원 <small>첨부 목록의 API 가격</small></p>`:'<p class="detail-price unavailable-price">가격·구매 링크 미확보</p>'}<div class="detail-note"><b>${p.availability==='missing'?'구매 링크를 찾지 못한 품목입니다.':p.check?'근사 상품 · 구매 전 옵션 확인':'상품 구성 안내'}</b>${esc(p.note)}</div>${p.imageNote?`<p class="detail-original">사진 안내: ${esc(p.imageNote)}</p>`:''}${p.photoSource?`<p class="photo-credit"><a href="${esc(p.photoSource)}" target="_blank" rel="noopener noreferrer">제품 사진 출처 ↗</a><span>대표 이미지 · 구성은 옵션 확인</span></p>`:''}<p class="detail-disclaimer">${p.url?'첨부 목록의 조회 결과이며 판매 페이지에서 검증된 정보가 아닙니다. 최종 가격·수량·규격은 판매 페이지에서 확인해 주세요.':'첨부 목록에서 구매 링크와 가격을 확보하지 못했습니다. 임의의 대체 구매 링크는 연결하지 않았습니다.'}</p>${p.url?`<a class="detail-buy" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer sponsored">쿠팡에서 상품 보기 ↗</a>`:'<div class="detail-buy disabled-buy" aria-disabled="true">구매 링크 없음</div>'}`;
  handlePhotoErrors($('#detail-content'));$('#detail').showModal();
}
document.addEventListener('click',e=>{
  const save=e.target.closest('[data-save]');if(save){const id=save.dataset.save,wasSaved=saved.has(id);if(wasSaved)saved.delete(id);else saved.add(id);let persisted=true;try{localStorage.setItem(favoriteKey,JSON.stringify([...saved]));}catch{persisted=false;}if(onlySaved)render();else{save.setAttribute('aria-pressed',!wasSaved);save.textContent=wasSaved?'♡':'♥';updateSaved();}toast(persisted?(wasSaved?'즐겨찾기에서 삭제했어요.':'즐겨찾기에 담았어요.'):'이 화면에서만 즐겨찾기를 유지할 수 있어요.');}
  const detail=e.target.closest('[data-detail]');if(detail)openDetail(detail.dataset.detail);
  const cat=e.target.closest('[data-category]');if(cat)chooseCategory(cat.dataset.category);
  const quick=e.target.closest('[data-quick]');if(quick)chooseCategory(quick.dataset.quick,true);
  const nav=e.target.closest('[data-nav]');if(nav){e.preventDefault();chooseCategory(nav.dataset.nav,true);}
  const filter=e.target.closest('[data-status]');if(filter){status=filter.dataset.status;render();}
});
$('#search').addEventListener('input',e=>{query=e.target.value;render();});
$('#sort').addEventListener('change',e=>{sort=e.target.value;render();});
$('#status-filter').addEventListener('change',e=>{status=e.target.value;render();});
$('#favorites-filter').addEventListener('click',()=>{onlySaved=!onlySaved;render();});
$('#saved-nav').addEventListener('click',openSaved);$('#closing-saved').addEventListener('click',openSaved);
$('#reset-filters').addEventListener('click',()=>{query='';category='전체';onlySaved=false;sort='default';status='all';$('#search').value='';$('#sort').value='default';render();});
$('.dialog-close').addEventListener('click',()=>$('#detail').close());
$('#detail').addEventListener('click',e=>{if(e.target===$('#detail')){const r=$('#detail').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('#detail').close();}});
window.addEventListener('storage',e=>{if(e.key===favoriteKey){try{const ids=JSON.parse(e.newValue||'[]');if(Array.isArray(ids)){saved=new Set(ids.filter(x=>typeof x==='string'));render();}}catch{}}});
async function init(){try{const r=await fetch('products.json?v=wires-20261023', {cache:'no-store'});if(!r.ok)throw new Error();products=await r.json();saved=new Set([...saved].filter(id=>products.some(p=>p.id===id)));renderHero();render();}catch{$('#products').innerHTML='<p>품목 목록을 불러오지 못했어요. <button onclick="location.reload()">새로고침</button>해 주세요.</p>';$('#result-count').textContent='목록을 불러올 수 없어요.';}}
init();
