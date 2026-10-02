const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../script.js'), 'utf8');
const prefix = source.slice(0, source.indexOf('const selected ='));
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
