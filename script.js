'use strict';
const $ = id => document.getElementById(id);
const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const money = value => Number(value).toLocaleString('ko-KR') + '원';
const ball = value => `<span class="ball ${value <= 10 ? 'yellow' : value <= 20 ? 'blue' : value <= 30 ? 'red' : value <= 40 ? 'gray' : 'green'}">${Number(value)}</span>`;
const balls = draw => draw.numbers.map(ball).join('') + `<span class="plus" aria-label="보너스">+</span><span class="bonus">${ball(draw.bonus)}<small>보너스</small></span>`;
let data, historyLimit = 30, generated = [], map, markers, leafletPromise;
let mapRenderVersion = 0;
const selected = new Map();
const knownPages = ['home','history','stores','analysis','generator','notice'];
function route() {
  const name = location.hash.slice(1).split('?')[0];
  const page = knownPages.includes(name) ? name : 'home';
  document.querySelector('.intro').hidden = page !== 'home';
  const period = new URLSearchParams(location.hash.split('?')[1] || '').get('period');
  if(page === 'analysis' && ['0','1','5','20','100'].includes(period)) $('analysis-period').value=period;
  document.querySelectorAll('.page').forEach(node => { node.hidden = node.id !== page; });
  document.querySelectorAll('[data-page]').forEach(node => { if (node.dataset.page === page) node.setAttribute('aria-current','page'); else node.removeAttribute('aria-current'); });
  if (data && page === 'analysis') renderAnalysis();
  if (data && page === 'stores') renderStores();
}
window.addEventListener('hashchange', route);
function storeCard(store, index) {
  const address = escapeHTML(store.address);
  const online = store.address.includes('dhlottery.co.kr');
  const link = online ? 'https://www.dhlottery.co.kr' : `https://map.naver.com/p/search/${encodeURIComponent(store.address + ' ' + store.name)}`;
  return `<article class="store-card"><div class="store-meta"><span>${String(index + 1).padStart(2,'0')} / ${online ? '온라인' : escapeHTML(store.address.trim().split(' ')[0])}</span><span>${escapeHTML(store.category)}</span></div><h3>${escapeHTML(store.name)}</h3><p>${address}</p><a target="_blank" rel="noopener" href="${link}" aria-label="${escapeHTML(store.name)} ${online ? '공식 사이트 보기' : '지도에서 보기'}">${online ? '공식 사이트 보기' : '지도에서 보기'} <span>↗</span></a></article>`;
}
function renderHome() {
  const latest = data.draws.at(-1);
  $('latest-round').textContent = `제 ${latest.round.toLocaleString('ko-KR')}회`;
  $('latest-date').textContent = latest.date.replaceAll('-','.');
  $('latest-date').dateTime = latest.date;
  $('latest-balls').innerHTML = balls(latest);
  $('latest-balls').setAttribute('aria-label',`당첨번호 ${latest.numbers.join(', ')}, 보너스 ${latest.bonus}`);
  const first = data.prizes[0];
  $('first-prize').textContent = money(first.amount);
  $('first-count').textContent = first.winners.toLocaleString('ko-KR') + '게임';
  const stores = data.stores.filter(store => store.round === latest.round);
  $('store-count').textContent = stores.length + ' 당첨 게임';
  const uniqueStores = [...new Map(stores.map(store => [store.name+'|'+store.address,store])).values()];
  $('featured-stores').innerHTML = uniqueStores.slice(0,3).map(storeCard).join('') || '<p>판매점 정보 확인 중입니다.</p>';
  const conditions = ['번호 6개 일치','번호 5개 + 보너스 일치','번호 5개 일치','번호 4개 일치','번호 3개 일치'];
  $('prize-table').innerHTML = data.prizes.map((prize, i) => `<tr><td>${prize.rank}등</td><td>${conditions[i]}</td><td>${money(prize.amount)}</td><td>${prize.winners.toLocaleString('ko-KR')}게임</td></tr>`).join('');
  const stale = Date.now() - new Date(latest.date+'T21:00:00+09:00').getTime() > 8 * 86400000;
  $('status').classList.toggle('stale',stale);
  $('status').textContent = `${stale ? '업데이트 지연 · 마지막 확인' : '동행복권 발표 기준'} ${latest.round}회 · ${latest.date} 추첨${stale ? ' · 최신 결과는 공식 사이트에서 확인하세요.' : ''}`;
}
function renderHistory() {
  const query = $('round-search').value.trim();
  const rows = [...data.draws].reverse().filter(draw => !query || String(draw.round).includes(query));
  $('history-list').innerHTML = rows.slice(0,historyLimit).map(draw => `<article class="archive-row"><div><strong>제 ${draw.round}회</strong><time datetime="${draw.date}">${draw.date}</time></div><div class="balls" aria-label="당첨번호 ${draw.numbers.join(', ')}, 보너스 ${draw.bonus}">${balls(draw)}</div></article>`).join('') || '<p class="empty">해당 회차를 찾지 못했습니다.</p>';
  $('more-history').hidden = rows.length <= historyLimit;
}
function renderStores() {
  const round = Number($('store-round').value), region = $('store-region').value, query = $('store-search').value.trim().toLocaleLowerCase();
  const rows = data.stores.filter(store => store.round === round && (!region || (store.address.includes('dhlottery.co.kr') ? '온라인' : store.address.trim().split(' ')[0]) === region) && (!query || (store.name + store.address).toLocaleLowerCase().includes(query)));
  $('store-summary').textContent = `${round}회 · ${rows.length}개 당첨 게임의 판매점`;
  $('stores-list').innerHTML = rows.map(storeCard).join('') || '<p class="empty">검색 결과가 없습니다.</p>';
  if (!$('stores').hidden) renderMap(rows, round);
}
async function renderMap(stores, round) {
  const version = ++mapRenderVersion;
  const locations = stores.filter(point => !point.address.includes('dhlottery.co.kr') && Number.isFinite(point.lat) && Number.isFinite(point.lon) && point.lat > 30 && point.lat < 40 && point.lon > 120 && point.lon < 140);
  const offline = stores.filter(store => !store.address.includes('dhlottery.co.kr'));
  const missing = offline.filter(store => !locations.includes(store)).length;
  $('store-map').hidden = false;
  $('map-note').textContent = `${round}회 · ${locations.length}개 당첨 게임의 판매점 위치${missing ? ` · 좌표 미확인 ${missing}개는 아래 지도 링크로 확인하세요.` : ''}${!offline.length ? ' · 표시할 오프라인 판매점이 없습니다.' : ''} 이동한 판매점은 지도에 현재 주소가 표시될 수 있습니다.`;
  try {
    if (!leafletPromise) leafletPromise = new Promise((resolve,reject)=>{
      const css = document.createElement('link'); css.rel='stylesheet';css.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';document.head.append(css);
      const script = document.createElement('script');script.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';script.onload=resolve;script.onerror=reject;document.head.append(script);
    });
    await leafletPromise;
    if (version !== mapRenderVersion || round !== Number($('store-round').value) || $('stores').hidden) return;
    if (!map) {
      map = L.map('store-map').setView([36.3,127.8],7);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
      markers=L.layerGroup().addTo(map);
    }
    markers.clearLayers();
    const distinct = [...new Map(locations.map(point=>[point.name+'|'+point.address,point])).values()];
    distinct.forEach(point=>L.marker([point.lat,point.lon]).addTo(markers).bindPopup(`<b>${escapeHTML(point.name)}</b><br>${escapeHTML(point.mapAddress || point.address)}${point.mapAddress && point.mapAddress !== point.address ? '<br><small>당첨 당시: '+escapeHTML(point.address)+'</small>' : ''}`));
    map.invalidateSize();
    if (distinct.length) map.fitBounds(distinct.map(point=>[point.lat,point.lon]),{padding:[25,25],maxZoom:13});
    else map.setView([36.3,127.8],7);
  } catch {
    if (version !== mapRenderVersion) return;
    leafletPromise=undefined;
    $('map-note').textContent='지도를 불러오지 못했습니다. 판매점별 지도 링크를 이용해주세요.';
  }
}
function renderAnalysis() {
  const period = Number($('analysis-period').value), rows = period ? data.draws.slice(-period) : data.draws;
  const counts = Array(46).fill(0);
  rows.forEach(draw => draw.numbers.forEach(n => counts[n]++));
  const max = Math.max(...counts), top = counts.indexOf(max), odd = rows.reduce((total, draw) => total + draw.numbers.filter(n => n % 2).length,0);
  $('analysis-summary').innerHTML = `<div><strong>${rows.length}</strong><span>분석한 회차</span></div><div><strong>${top}번</strong><span>가장 자주 나온 번호 · ${max}회</span></div><div><strong>${(odd / (rows.length * 6) * 100).toFixed(1)}%</strong><span>홀수 번호 비율</span></div>`;
  $('frequency-chart').innerHTML = Array.from({length:45}, (_,index) => index + 1).map(n => `<div class="frequency-row" aria-label="${n}번 ${counts[n]}회">${ball(n)}<span class="frequency-bar"><i style="width:${max ? counts[n]/max*100 : 0}%"></i></span><span>${counts[n]}회</span></div>`).join('');
}
function randomIndex(length) {
  const limit = Math.floor(4294967296/length)*length, bytes = new Uint32Array(1);
  do { crypto.getRandomValues(bytes); } while(bytes[0] >= limit);
  return bytes[0] % length;
}
function generateGames() {
  const fixed = [...selected].filter(([,state]) => state === 1).map(([n]) => n);
  const pool = Array.from({length:45},(_,i)=>i+1).filter(n => !selected.has(n));
  if (fixed.length > 6 || pool.length + fixed.length < 6) { $('generator-message').textContent = '고정 번호는 6개 이하, 사용 가능한 번호는 6개 이상으로 선택해주세요.'; return; }
  generated = Array.from({length:Number($('game-count').value)},() => {
    const available = [...pool], game = [...fixed];
    while(game.length < 6) game.push(available.splice(randomIndex(available.length),1)[0]);
    return game.sort((a,b)=>a-b);
  });
  $('generated-numbers').innerHTML = generated.map((game,index) => `<div class="ticket-row"><span>${String.fromCharCode(65+index)}</span><div class="balls">${game.map(ball).join('')}</div></div>`).join('');
  $('copy-numbers').disabled = false;$('generator-message').textContent = `${generated.length}게임을 만들었습니다.`;
}
for(let n=1;n<=45;n++) {
  const button = document.createElement('button');
  button.type='button';button.textContent=n;button.setAttribute('aria-label',`${n}번 선택 안 함`);
  button.addEventListener('click',()=>{
    const state = ((selected.get(n)||0)+1)%3;
    if(state === 1 && [...selected.values()].filter(v=>v===1).length>=6) { $('generator-message').textContent='고정 번호는 최대 6개입니다.'; return; }
    state ? selected.set(n,state) : selected.delete(n);
    button.className=state===1?'fixed':state===2?'excluded':'';button.setAttribute('aria-label',`${n}번 ${state===1?'고정':state===2?'제외':'선택 안 함'}`);$('generator-message').textContent='';
  });$('number-grid').append(button);
}
$('reset-numbers').addEventListener('click',()=>{selected.clear();[...$('number-grid').children].forEach((button,index)=>{button.className='';button.setAttribute('aria-label',`${index+1}번 선택 안 함`);});$('generator-message').textContent='선택을 초기화했습니다.';});
$('generate').addEventListener('click',generateGames);
$('copy-numbers').addEventListener('click',async()=>{try {await navigator.clipboard.writeText(generated.map(game=>game.join(', ')).join('\n'));$('generator-message').textContent='번호를 복사했습니다.';} catch {$('generator-message').textContent='복사할 수 없습니다. 표시된 번호를 직접 선택해 복사해주세요.';}});
$('round-search').addEventListener('input',()=>{historyLimit=30;if(data)renderHistory();});
$('more-history').addEventListener('click',()=>{historyLimit+=30;if(data)renderHistory();});
['store-round','store-region'].forEach(id=>$(id).addEventListener('change',()=>{if(data)renderStores();}));
$('store-search').addEventListener('input',()=>{if(data)renderStores();});
$('analysis-period').addEventListener('change',()=>{history.replaceState(null,'',`#analysis?period=${$('analysis-period').value}`);if(data)renderAnalysis();});
async function load() {
  $('load-error').hidden=true;
  try {
    const response = await fetch('CSV/snapshot.json',{cache:'no-cache'});
    if(!response.ok) throw new Error('Snapshot unavailable');
    data = await response.json();
    if(!data.draws?.length || !data.stores || !data.prizes?.length || data.round !== data.draws.at(-1).round) throw new Error('Invalid snapshot');
    data.draws.sort((a,b)=>a.round-b.round);renderHome();renderHistory();
    const rounds=[...new Set(data.stores.map(store=>store.round))].sort((a,b)=>b-a);
    $('store-round').replaceChildren(...rounds.map(n=>new Option(`${n}회`,n)));
    const regions=[...new Set(data.stores.map(store=>store.address.includes('dhlottery.co.kr') ? '온라인' : store.address.trim().split(' ')[0]))].sort();
    $('store-region').replaceChildren(new Option('전국',''),...regions.map(region=>new Option(region,region)));
    renderStores();renderAnalysis();route();
  } catch(error) {$('status').textContent='데이터 연결을 확인해주세요.';$('load-error').hidden=false;console.error('Lotto data load failed:',error.message);}
}
$('retry').addEventListener('click',load);route();load();
