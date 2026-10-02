const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const engine=require('../generator-engine.js');
const source=fs.readFileSync(path.join(__dirname,'../script.js'),'utf8');
function setup() {
  const nodes={};
  for(const [id,value] of Object.entries({'odd-min':'0','odd-max':'6','high-min':'0','high-max':'6','sum-min':'81','sum-max':'200','consecutive':'3','range':'3'})) {
    let stored=value;nodes[id]={get value(){return stored;},set value(next){stored=String(next);}};
  }
  for(const id of ['odd-even','high-low']) nodes[id]={checked:true};
  for(const id of ['condition-preview','generator-message','generated-numbers','copy-numbers']) nodes[id]={};
  const context=vm.createContext({document:{getElementById:id=>nodes[id]}});
  vm.runInContext(source.slice(0,source.indexOf('const selected =')),context);
  vm.runInContext(source.slice(source.indexOf('function readGenerationConditions()'),source.indexOf('function extractionWeights()')),context);
  return {nodes,context};
}
test('One-click button passes ratio ranges and sum bounds to generator, clearing old results',async()=>{
  const {nodes,context}=setup();
  vm.runInContext('generated=[[1,2,3,4,5,6]]; applyBalancedConditions()',context);
  const conditions=JSON.parse(vm.runInContext('JSON.stringify(readGenerationConditions())',context));
  assert.deepEqual(conditions.odd,[2,4]);assert.deepEqual(conditions.high,[2,4]);
  assert.equal(conditions.sumMin,110);assert.equal(conditions.sumMax,170);
  assert.equal(vm.runInContext('generated.length',context),0);
  assert.equal(nodes['copy-numbers'].disabled,true);
  assert.match(nodes['generated-numbers'].innerHTML,/새 조건/);
  assert.match(nodes['condition-preview'].textContent,/2:4 \/ 3:3 \/ 4:2/);
  const games=await engine.generate({conditions,fixed:[],pool:Array.from({length:45},(_,i)=>i+1),weights:Array(46).fill(1),count:10,random:Math.random});
  assert.ok(games.every(game=>engine.accepts(game,conditions)));
});
test('Manual min/max controls allow an exact ratio and reject reversed boundaries',async()=>{
  const {nodes,context}=setup();
  nodes['odd-min'].value=nodes['odd-max'].value='4';
  nodes['high-min'].value=nodes['high-max'].value='2';
  let conditions=JSON.parse(vm.runInContext('JSON.stringify(readGenerationConditions())',context));
  const options={fixed:[],pool:Array.from({length:45},(_,i)=>i+1),weights:Array(46).fill(1),count:10,random:Math.random};
  const games=await engine.generate({...options,conditions});
  for(const game of games) {assert.equal(engine.metrics(game).odd,4);assert.equal(engine.metrics(game).high,2);}
  nodes['odd-max'].value='2';
  vm.runInContext('generationSettingsChanged()',context);
  assert.match(nodes['condition-preview'].textContent,/최소 비율이 최대 비율보다/);
  conditions=JSON.parse(vm.runInContext('JSON.stringify(readGenerationConditions())',context));
  await assert.rejects(engine.generate({...options,conditions}));
});
