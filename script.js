'use strict';
const $ = id => document.getElementById(id);
const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const money = value => Number(value).toLocaleString('ko-KR') + '원';
const ball = value => `<span class="ball ${value <= 10 ? 'yellow' : value <= 20 ? 'blue' : value <= 30 ? 'red' : value <= 40 ? 'gray' : 'green'}">${Number(value)}</span>`;
const balls = draw => draw.numbers.map(ball).join('') + `<span class="plus" aria-label="보너스">+</span><span class="bonus">${ball(draw.bonus)}<small>보너스</small></span>`;
let data, historyLimit = 30, generated = [], map, markers, leafletPromise;
let mapRenderVersion = 0;
let storeTotals = new Map(), userPosition, userMarker, userAccuracy;
let storeListLimit = 60;
let mapPoints = [], mapRound = 0, mapNote = '', markerSignature = '';
const allStoresMinZoom = 13;
function visibleStores(points, round, zoom, bounds) {
  if (round !== 0) return points;
  if (zoom < allStoresMinZoom) return [];
  return points.filter(point => bounds.contains([point.lat, point.lon]));
}
const storeKey = store => JSON.stringify([store.name.trim().replace(/\s+/g,' '),store.address.trim().replace(/\s+/g,' ')]);
function aggregateStores(stores) {
  const totals = new Map();
  for (const store of stores) {
    const key = storeKey(store), previous = totals.get(key);
    if (previous) {
      previous.winCount++; previous.rounds.add(store.round);
      if (Number.isFinite(store.lat) && Number.isFinite(store.lon)) Object.assign(previous,{lat:store.lat,lon:store.lon,mapAddress:store.mapAddress});
    } else totals.set(key,{...store,winCount:1,rounds:new Set([store.round]),category:'누적 당첨'});
  }
  return totals;
}
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
  const total = storeTotals.get(storeKey(store));
  return `<article class="store-card"><div class="store-meta"><span>${String(index + 1).padStart(2,'0')} / ${online ? '온라인' : escapeHTML(store.address.trim().split(' ')[0])}</span><span>${escapeHTML(store.category)}</span></div><h3>${escapeHTML(store.name)}</h3><strong class="win-count">1등 누적 ${total?.winCount || 1}게임 · ${total?.rounds.size || 1}개 회차</strong><p>${address}</p><a target="_blank" rel="noopener" href="${link}" aria-label="${escapeHTML(store.name)} ${online ? '공식 사이트 보기' : '지도에서 보기'}">${online ? '공식 사이트 보기' : '지도에서 보기'} <span>↗</span></a></article>`;
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
  $('history-list').innerHTML = rows.slice(0,historyLimit).map(draw => `<article class="archive-row"><div><strong>제 ${draw.round}회</strong><time datetime="${draw.date}">${draw.date}</time><div class="archive-metrics">${metricText(draw.numbers)}</div></div><div class="balls" aria-label="당첨번호 ${draw.numbers.join(', ')}, 보너스 ${draw.bonus}">${balls(draw)}</div></article>`).join('') || '<p class="empty">해당 회차를 찾지 못했습니다.</p>';
  $('more-history').hidden = rows.length <= historyLimit;
}
function renderStores() {
  const round = Number($('store-round').value), region = $('store-region').value, query = $('store-search').value.trim().toLocaleLowerCase();
  const source = round === 0 ? [...storeTotals.values()].sort((a,b)=>b.winCount-a.winCount) : data.stores.filter(store=>store.round===round);
  const rows = source.filter(store => (!region || (store.address.includes('dhlottery.co.kr') ? '온라인' : store.address.trim().split(' ')[0]) === region) && (!query || (store.name + store.address).toLocaleLowerCase().includes(query)));
  $('store-summary').textContent = round === 0 ? `전체 회차 · ${rows.length.toLocaleString('ko-KR')}개 판매점 · 누적 당첨 게임 수 순` : `${round}회 · ${rows.length}개 당첨 게임의 판매점`;
  $('stores-list').innerHTML = rows.slice(0,storeListLimit).map(storeCard).join('') || '<p class="empty">검색 결과가 없습니다.</p>';
  $('more-stores').hidden=rows.length<=storeListLimit;
  if (!$('stores').hidden) renderMap(rows, round);
}
async function renderMap(stores, round) {
  const version = ++mapRenderVersion;
  const locations = stores.filter(point => !point.address.includes('dhlottery.co.kr') && Number.isFinite(point.lat) && Number.isFinite(point.lon) && point.lat > 30 && point.lat < 40 && point.lon > 120 && point.lon < 140);
  const offline = stores.filter(store => !store.address.includes('dhlottery.co.kr'));
  const missing = offline.filter(store => !locations.includes(store)).length;
  $('store-map').hidden = false;
  const note = `${round ? round+'회' : '전체 회차'} · ${locations.length}개 위치 기록${missing ? ` · 좌표 미확인 ${missing}개는 아래 지도 링크로 확인하세요.` : ''}${!offline.length ? ' · 표시할 오프라인 판매점이 없습니다.' : ''} 핀을 누르면 누적 당첨 수와 회차를 볼 수 있습니다. 이동한 판매점은 현재 주소가 표시될 수 있습니다.`;
  $('map-note').textContent = note;
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
      map.on('moveend', updateMapMarkers);
    }
    const distinct = [...new Map(locations.map(point=>[storeKey(point),point])).values()];
    mapPoints=distinct; mapRound=round; mapNote=note; markerSignature='';
    map.invalidateSize();
    if (userPosition) map.setView(userPosition,13);
    else if (distinct.length) map.fitBounds(distinct.map(point=>[point.lat,point.lon]),{padding:[25,25],maxZoom:13});
    else map.setView([36.3,127.8],7);
    updateMapMarkers();
  } catch {
    if (version !== mapRenderVersion) return;
    leafletPromise=undefined;
    $('map-note').textContent='지도를 불러오지 못했습니다. 판매점별 지도 링크를 이용해주세요.';
  }
}
function updateMapMarkers() {
  if (!map || !markers) return;
  const visible=visibleStores(mapPoints,mapRound,map.getZoom(),map.getBounds());
  const hint=mapRound===0 && mapPoints.length ? (map.getZoom()<allStoresMinZoom ? '지도를 확대하면 1등 판매점이 표시됩니다. ' : `현재 화면의 1등 판매점 ${visible.length}곳 · 지도를 이동하면 주변 판매점을 볼 수 있습니다. `) : '';
  $('map-note').textContent=hint+mapNote;
  const signature=JSON.stringify([mapRound,visible.map(point=>[storeKey(point),point.lat,point.lon])]);
  if (signature===markerSignature) return;
  markerSignature=signature;
  markers.clearLayers();
  visible.forEach(point=>{
      const total=storeTotals.get(storeKey(point)), count=total?.winCount || 1;
      const icon=L.divIcon({className:'winner-marker',html:`<span>${count}</span>`,iconSize:[34,34],iconAnchor:[17,34]});
      L.marker([point.lat,point.lon],{icon}).addTo(markers).bindPopup(`<b>${escapeHTML(point.name)}</b><br><strong>1등 누적 ${count}게임 · ${total?.rounds.size || 1}개 회차</strong><br>${escapeHTML(point.mapAddress || point.address)}${point.mapAddress && point.mapAddress !== point.address ? '<br><small>당첨 당시: '+escapeHTML(point.address)+'</small>' : ''}<details><summary>당첨 회차 보기</summary>${[...(total?.rounds || [point.round])].sort((a,b)=>b-a).map(n=>n+'회').join(', ')}</details>`);
    });
}
function locateMe() {
  const button=$('locate-me'), status=$('location-status');
  if (!navigator.geolocation) { status.textContent='이 브라우저는 위치 확인을 지원하지 않습니다.'; return; }
  if (!map) { status.textContent='지도를 불러온 뒤 다시 눌러주세요.'; return; }
  button.disabled=true; status.textContent='현재 위치를 확인하고 있습니다…';
  navigator.geolocation.getCurrentPosition(position=>{
    button.disabled=false;
    userPosition=[position.coords.latitude,position.coords.longitude];
    if(userMarker) map.removeLayer(userMarker);
    if(userAccuracy) map.removeLayer(userAccuracy);
    userAccuracy=L.circle(userPosition,{radius:position.coords.accuracy,color:'#367ac3',weight:1,fillOpacity:.08}).addTo(map);
    userMarker=L.circleMarker(userPosition,{radius:8,color:'white',weight:3,fillColor:'#367ac3',fillOpacity:1}).addTo(map).bindPopup('내 위치');
    map.setView(userPosition,13);
    status.textContent=`내 위치를 표시했습니다 · 오차 약 ${Math.round(position.coords.accuracy)}m`;
  },error=>{
    button.disabled=false;
    status.textContent=error.code===1 ? '위치 권한이 허용되지 않았습니다. 브라우저 설정에서 위치를 허용한 뒤 다시 눌러주세요.' : error.code===3 ? '위치 확인 시간이 초과되었습니다. 다시 시도해주세요.' : '현재 위치를 확인하지 못했습니다. 위치 설정을 확인해주세요.';
  },{enableHighAccuracy:true,timeout:10000,maximumAge:60000});
}
function renderAnalysis() {
  const period = Number($('analysis-period').value), rows = period ? data.draws.slice(-period) : data.draws;
  const counts = Array(46).fill(0);
  rows.forEach(draw => draw.numbers.forEach(n => counts[n]++));
  const max = Math.max(...counts), top = counts.indexOf(max), odd = rows.reduce((total, draw) => total + draw.numbers.filter(n => n % 2).length,0);
  $('analysis-summary').innerHTML = `<div><strong>${rows.length}</strong><span>분석한 회차</span></div><div><strong>${top}번</strong><span>가장 자주 나온 번호 · ${max}회</span></div><div><strong>${(odd / (rows.length * 6) * 100).toFixed(1)}%</strong><span>홀수 번호 비율</span></div>`;
  $('frequency-chart').innerHTML = Array.from({length:45}, (_,index) => index + 1).map(n => `<div class="frequency-row" aria-label="${n}번 ${counts[n]}회">${ball(n)}<span class="frequency-bar"><i style="width:${max ? counts[n]/max*100 : 0}%"></i></span><span>${counts[n]}회<small>${rows.length ? (counts[n]/(rows.length*6)*100).toFixed(2) : '0.00'}%</small></span></div>`).join('');
  const oddCounts=Array(7).fill(0),highCounts=Array(7).fill(0),sums=Array(12).fill(0);
  rows.forEach(draw=>{const m=LottoEngine.metrics(draw.numbers);oddCounts[m.odd]++;highCounts[m.high]++;sums[Math.floor((m.sum-21)/20)]++;});
  const distribution=(label,entries)=>`<table><thead><tr><th>${label}</th><th>출현 횟수</th><th>비율</th></tr></thead><tbody>${entries.map(([name,count])=>`<tr><td>${name}</td><td><i class="distribution-bar" style="width:${rows.length ? count/rows.length*90 : 0}px"></i>${count}회</td><td>${rows.length ? (count/rows.length*100).toFixed(2) : '0.00'}%</td></tr>`).join('')}</tbody></table>`;
  $('odd-even-ratios').innerHTML=distribution('홀짝 비율',Array.from({length:7},(_,i)=>[ `홀 ${6-i} : 짝 ${i}`,oddCounts[6-i]]));
  $('high-low-ratios').innerHTML=distribution('고저 비율',Array.from({length:7},(_,i)=>[ `고 ${6-i} : 저 ${i}`,highCounts[6-i]]));
  $('sum-ranges').innerHTML=distribution('번호 합계',sums.map((count,i)=>[`${21+i*20} ~ ${40+i*20}`,count]));
}
function metricText(game) {
  const m=LottoEngine.metrics(game);
  return `홀 ${m.odd} : 짝 ${6-m.odd} · 고 ${m.high} : 저 ${6-m.high} · 합계 ${m.sum} · 연속 ${m.consecutive}개`;
}
function readGenerationConditions() {
  const value=id=>$(id).value.trim()==='' ? NaN : Number($(id).value);
  const ratio=id=>{const min=value(id+'-min'),max=value(id+'-max');return min===0&&max===6 ? null : [min,max];};
  return {oddEven:$('odd-even').checked,highLow:$('high-low').checked,odd:ratio('odd'),high:ratio('high'),sumMin:value('sum-min'),sumMax:value('sum-max'),consecutive:value('consecutive'),range:value('range')};
}
function ratioText(value,extreme) {
  if(value===null) return extreme ? '극단 제외' : '제한 없음';
  return Array.isArray(value) ? Array.from({length:value[1]-value[0]+1},(_,i)=>`${value[0]+i}:${6-value[0]-i}`).join(' / ') : `${value}:${6-value}`;
}
function applyBalancedConditions() {
  $('odd-min').value=2;$('odd-max').value=4;$('high-min').value=2;$('high-max').value=4;
  $('sum-min').value=110;$('sum-max').value=170;
  generationSettingsChanged();
  $('generator-message').textContent='홀짝·고저 각각 2:4 / 3:3 / 4:2, 합계 110~170을 적용했습니다. 번호 만들기를 누르면 생성합니다.';
}
function updateConditionPreview() {
  const c=readGenerationConditions();
  const label=(value,extreme)=>{
    if(value && value[0]>value[1]) return '최소 비율이 최대 비율보다 큽니다';
    const values=value || [0,6];
    const allowed=Array.from({length:values[1]-values[0]+1},(_,i)=>values[0]+i).filter(n=>!extreme||(n>0&&n<6));
    return allowed.length ? allowed.map(n=>`${n}:${6-n}`).join(' / ') : '극단 제외 조건과 충돌합니다';
  };
  $('condition-preview').textContent=`생성할 비율 · 홀짝 ${label(c.odd,c.oddEven)} · 고저 ${label(c.high,c.highLow)} · 합계 ${c.sumMin}~${c.sumMax}`;
}
function generationSettingsChanged() {
  updateConditionPreview();
  if(generated.length) {
    generated=[];$('copy-numbers').disabled=true;
    $('generated-numbers').innerHTML='<p class="empty">조건이 변경됐습니다.<br>번호 만들기를 눌러 새 조건으로 생성해주세요.</p>';
  }
  $('generator-message').textContent='조건이 변경됐습니다. 번호 만들기를 누르면 현재 조건으로 생성합니다.';
}
function extractionWeights() {
  if($('weight-mode').value==='uniform') return Array(46).fill(1);
  const coefficients=['all','100','20','5','1'].map(id=>$('frequency-'+id).value.trim()==='' ? NaN : Number($('frequency-'+id).value));
  if(coefficients.some(n=>!Number.isFinite(n)||Math.abs(n)>1000000)) throw new Error('빈도 계수를 -1,000,000~1,000,000 사이의 숫자로 입력해주세요.');
  return LottoEngine.scores(data.draws,coefficients);
}
function updateWeightPreview() {
  $('frequency-settings').hidden=$('weight-mode').value==='uniform';
  if(!data) return;
  try {
    const weights=extractionWeights(),pool=Array.from({length:45},(_,i)=>i+1).filter(n=>!selected.has(n)),total=pool.reduce((sum,n)=>sum+weights[n],0);
    $('probability-list').innerHTML=Array.from({length:45},(_,i)=>i+1).map(n=>`<span class="probability-item"><strong>${n}번</strong> ${selected.get(n)===1 ? '고정' : selected.get(n)===2 ? '제외' : total ? (weights[n]/total*100).toFixed(2)+'%' : '0.00%'}</span>`).join('');
  } catch(error) { $('probability-list').textContent=error.message; }
}
function randomIndex(length) {
  const limit = Math.floor(4294967296/length)*length, bytes = new Uint32Array(1);
  do { crypto.getRandomValues(bytes); } while(bytes[0] >= limit);
  return bytes[0] % length;
}
function findHistoricalMatches(game, draws) {
  const numbers = new Set(game);
  return draws.flatMap(draw => {
    const matched = draw.numbers.filter(number => numbers.has(number)).length;
    const rank = matched === 6 ? 1 : matched === 5 && numbers.has(draw.bonus) ? 2 : null;
    return rank ? [{round:draw.round,date:draw.date,rank}] : [];
  }).sort((a,b)=>b.round-a.round);
}
function historicalMatchHTML(game) {
  const matches = findHistoricalMatches(game,data.draws);
  if (!matches.length) return '<p class="historical-empty">역대 1·2등 번호 일치 없음</p>';
  return `<div class="historical-matches">${matches.map(match=>`<p><strong>${match.rank}등 번호 일치</strong><span>제 ${match.round}회 · ${escapeHTML(match.date)}</span></p>`).join('')}</div>`;
}
async function generateGames() {
  if($('generate').disabled) return;
  if (!data?.draws?.length) { $('generator-message').textContent='당첨 데이터를 불러온 뒤 다시 시도해주세요.'; return; }
  const fixed = [...selected].filter(([,state]) => state === 1).map(([n]) => n);
  const pool = Array.from({length:45},(_,i)=>i+1).filter(n => !selected.has(n));
  if (fixed.length > 6 || pool.length + fixed.length < 6) { $('generator-message').textContent = '고정 번호는 6개 이하, 사용 가능한 번호는 6개 이상으로 선택해주세요.'; return; }
  $('generate').disabled=true;$('generation-settings').disabled=true;
  $('generator-message').textContent='설정 조건을 만족하는 번호를 만들고 있습니다…';
  try {
    const conditions=readGenerationConditions(), weights=extractionWeights(),mode=$('weight-mode').value;
    const games=await LottoEngine.generate({conditions,fixed,pool,weights,count:Number($('game-count').value),random:()=>randomIndex(4294967296)/4294967296,yieldUI:()=>new Promise(resolve=>setTimeout(resolve,0))});
    generated=games;
    const summary=`${mode==='uniform' ? '균등 무작위' : '빈도 가중치'} · 홀짝 ${ratioText(conditions.odd,conditions.oddEven)} · 고저 ${ratioText(conditions.high,conditions.highLow)} · 합계 ${conditions.sumMin}~${conditions.sumMax} · 연속 ≤${conditions.consecutive} · 구간별 ≤${conditions.range}`;
    $('generated-numbers').innerHTML=`<p class="applied-conditions">적용 조건<br>${escapeHTML(summary)}</p>`+generated.map((game,index) => `<div class="generated-game"><div class="ticket-row"><span>${String.fromCharCode(65+index)}</span><div class="balls">${game.map(ball).join('')}</div></div><p class="game-metrics">${metricText(game)}</p>${historicalMatchHTML(game)}</div>`).join('');
    $('copy-numbers').disabled = false;$('generator-message').textContent = `${generated.length}게임 생성 · 모든 조건 충족 · 1~${data.round}회 1·2등 번호 비교 완료`;
  } catch(error) { $('generator-message').textContent=error.message+(generated.length ? ' 이전 생성 결과는 그대로 표시됩니다.' : ''); }
  finally { $('generate').disabled=false;$('generation-settings').disabled=false; }
}
for(let n=1;n<=45;n++) {
  const button = document.createElement('button');
  button.type='button';button.textContent=n;button.setAttribute('aria-label',`${n}번 선택 안 함`);
  button.addEventListener('click',()=>{
    const state = ((selected.get(n)||0)+1)%3;
    if(state === 1 && [...selected.values()].filter(v=>v===1).length>=6) { $('generator-message').textContent='고정 번호는 최대 6개입니다.'; return; }
    state ? selected.set(n,state) : selected.delete(n);
    button.className=state===1?'fixed':state===2?'excluded':'';button.setAttribute('aria-label',`${n}번 ${state===1?'고정':state===2?'제외':'선택 안 함'}`);$('generator-message').textContent='';updateWeightPreview();
  });$('number-grid').append(button);
}
$('reset-numbers').addEventListener('click',()=>{selected.clear();[...$('number-grid').children].forEach((button,index)=>{button.className='';button.setAttribute('aria-label',`${index+1}번 선택 안 함`);});$('generator-message').textContent='선택을 초기화했습니다.';updateWeightPreview();});
['weight-mode','frequency-all','frequency-100','frequency-20','frequency-5','frequency-1'].forEach(id=>$(id).addEventListener('input',updateWeightPreview));
document.querySelectorAll('[data-preset]').forEach(button=>button.addEventListener('click',()=>{
  ['all','100','20','5','1'].forEach((id,i)=>$('frequency-'+id).value=LottoEngine.presets[Number(button.dataset.preset)][i]);
  $('weight-mode').value='frequency';generationSettingsChanged();updateWeightPreview();$('generator-message').textContent=`기존 프리셋 ${Number(button.dataset.preset)+1}의 빈도 계수를 적용했습니다. 비율·합계 제한은 유지됩니다.`;
}));
$('reset-conditions').addEventListener('click',()=>{
  $('odd-even').checked=false;$('high-low').checked=false;$('odd-min').value=0;$('odd-max').value=6;$('high-min').value=0;$('high-max').value=6;
  $('sum-min').value=21;$('sum-max').value=255;$('consecutive').value=6;$('range').value=6;$('weight-mode').value='uniform';
  generationSettingsChanged();updateWeightPreview();$('generator-message').textContent='비율·합계·연속·구간 제한을 해제했습니다. 고정·제외 번호는 유지됩니다.';
});
$('balanced-conditions').addEventListener('click',applyBalancedConditions);
$('generation-settings').addEventListener('input',generationSettingsChanged);
updateConditionPreview();
$('generate').addEventListener('click',generateGames);
$('copy-numbers').addEventListener('click',async()=>{try {await navigator.clipboard.writeText(generated.map(game=>game.join(', ')).join('\n'));$('generator-message').textContent='번호를 복사했습니다.';} catch {$('generator-message').textContent='복사할 수 없습니다. 표시된 번호를 직접 선택해 복사해주세요.';}});
$('round-search').addEventListener('input',()=>{historyLimit=30;if(data)renderHistory();});
$('more-history').addEventListener('click',()=>{historyLimit+=30;if(data)renderHistory();});
['store-round','store-region'].forEach(id=>$(id).addEventListener('change',()=>{storeListLimit=60;if(data)renderStores();}));
$('store-search').addEventListener('input',()=>{storeListLimit=60;if(data)renderStores();});
$('more-stores').addEventListener('click',()=>{storeListLimit+=60;if(data)renderStores();});
$('locate-me').addEventListener('click',locateMe);
$('analysis-period').addEventListener('change',()=>{history.replaceState(null,'',`#analysis?period=${$('analysis-period').value}`);if(data)renderAnalysis();});
async function load() {
  $('load-error').hidden=true;
  try {
    const response = await fetch('CSV/snapshot.json',{cache:'no-cache'});
    if(!response.ok) throw new Error('Snapshot unavailable');
    data = await response.json();
    if(!data.draws?.length || !data.stores || !data.prizes?.length || data.round !== data.draws.at(-1).round) throw new Error('Invalid snapshot');
    storeTotals=aggregateStores(data.stores);
    data.draws.sort((a,b)=>a.round-b.round);renderHome();renderHistory();
    const rounds=[...new Set(data.stores.map(store=>store.round))].sort((a,b)=>b-a);
    $('store-round').replaceChildren(new Option('전체 판매점 · 누적 1등','0'),...rounds.map(n=>new Option(`${n}회`,n)));
    const regions=[...new Set(data.stores.map(store=>store.address.includes('dhlottery.co.kr') ? '온라인' : store.address.trim().split(' ')[0]))].sort();
    $('store-region').replaceChildren(new Option('전국',''),...regions.map(region=>new Option(region,region)));
    renderStores();renderAnalysis();updateWeightPreview();route();
  } catch(error) {$('status').textContent='데이터 연결을 확인해주세요.';$('load-error').hidden=false;console.error('Lotto data load failed:',error.message);}
}
$('retry').addEventListener('click',load);route();load();
