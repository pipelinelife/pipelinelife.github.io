const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../script.js'), 'utf8');
const prefix = source.slice(0, source.indexOf('const selected ='));
test('All-store pins require zoom 13 and stay inside the viewport; round pins remain visible',()=>{
  const context=vm.createContext({document:{}});
  vm.runInContext(prefix,context);
  vm.runInContext(`points=[{lat:37.5,lon:127},{lat:35.1,lon:129}]; bounds={contains:([lat])=>lat>37}`,context);
  assert.equal(vm.runInContext('visibleStores(points,0,12,bounds).length',context),0);
  assert.equal(vm.runInContext('visibleStores(points,0,13,bounds).length',context),1);
  assert.equal(vm.runInContext('visibleStores(points,1243,7,bounds).length',context),2);
  assert.equal(vm.runInContext('visibleStores([],0,13,bounds).length',context),0);
});
test('Map movement refreshes pins, zooming out clears them, and unchanged pins preserve popups',()=>{
  let zoom=13, cleared=0, added=0;
  const note={};
  const context=vm.createContext({document:{getElementById:()=>note}, L:{divIcon:()=>({}),marker:()=>({addTo(){added++;return this},bindPopup(){return this}})},mockMap:{getZoom:()=>zoom,getBounds:()=>({contains:()=>true})},mockMarkers:{clearLayers(){cleared++;}}});
  vm.runInContext(prefix,context);
  vm.runInContext(source.slice(source.indexOf('function updateMapMarkers()'),source.indexOf('function locateMe()')),context);
  vm.runInContext(`map=mockMap;markers=mockMarkers;mapPoints=[{name:'A',address:'서울 하나',lat:37.5,lon:127,round:1}]; updateMapMarkers();updateMapMarkers()`,context);
  assert.equal(added,1); assert.equal(cleared,1);
  zoom=12;vm.runInContext('updateMapMarkers()',context);
  assert.equal(cleared,2); assert.match(note.textContent,/확대하면/);
  zoom=13;vm.runInContext('updateMapMarkers()',context);
  assert.equal(added,2); assert.match(note.textContent,/1곳/);
});
test('Counts tickets and distinct rounds, keeps different addresses separate', () => {
  const context = vm.createContext({document:{}});
  vm.runInContext(prefix, context);
  const result = vm.runInContext(`aggregateStores([
    {name:'A',address:'서울  하나',round:300,lat:37.5,lon:127},
    {name:' A ',address:'서울 하나',round:300},
    {name:'A',address:'서울 하나',round:301},
    {name:'A',address:'부산 둘',round:302}
  ])`, context);
  assert.equal(result.size, 2);
  const first=[...result.values()][0];
  assert.equal(first.winCount,3);
  assert.equal(first.rounds.size,2);
  assert.equal(first.lat,37.5);
});
function locationContext(mode) {
  const nodes={'locate-me':{},'location-status':{}};
  const events=[];
  const layer={addTo(){return this},bindPopup(){return this}};
  const context=vm.createContext({document:{getElementById:id=>nodes[id]},navigator:{geolocation:{getCurrentPosition(success,failure){
    if(mode==='success') success({coords:{latitude:37.5,longitude:127,accuracy:25}});
    else failure({code:mode==='denied'?1:3});
  }}},L:{circle:()=>layer,circleMarker:()=>layer}});
  vm.runInContext(prefix,context);
  vm.runInContext(`map={setView:(point,zoom)=>events.push([point,zoom]),removeLayer:()=>{}}`,Object.assign(context,{events}));
  vm.runInContext(source.slice(source.indexOf('function locateMe()'), source.indexOf('function renderAnalysis()')),context);
  vm.runInContext('locateMe()',context);
  return {nodes,events};
}
test('Locates and restores the button after success',()=>{
  const {nodes,events}=locationContext('success');
  assert.equal(nodes['locate-me'].disabled,false);
  assert.equal(events[0][1],13);
  assert.match(nodes['location-status'].textContent,/25m/);
});
test('Permission rejection and timeout leave a usable retry button',()=>{
  for(const mode of ['denied','timeout']) {
    const {nodes,events}=locationContext(mode);
    assert.equal(nodes['locate-me'].disabled,false);
    assert.equal(events.length,0);
    assert.ok(nodes['location-status'].textContent.length>10);
  }
});
