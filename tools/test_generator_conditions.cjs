const test=require('node:test');
const assert=require('node:assert/strict');
const engine=require('../generator-engine.js');
const snapshot=require('../CSV/snapshot.json');
const pool=Array.from({length:45},(_,i)=>i+1);
const base={oddEven:true,highLow:true,odd:null,high:null,sumMin:81,sumMax:200,consecutive:3,range:3};
const uniform=Array(46).fill(1);
let seed=345672;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
test('Ratio ranges allow all three combinations and preset sum boundaries are inclusive',async()=>{
  const conditions={...base,odd:[2,4],high:[2,4],sumMin:110,sumMax:170};
  const odds=new Set(),highs=new Set();
  for(let i=0;i<60;i++) {
    const games=await engine.generate({conditions,fixed:[],pool,weights:uniform,count:10,random});
    for(const game of games) {
      const m=engine.metrics(game);
      assert.ok(m.odd>=2&&m.odd<=4&&m.high>=2&&m.high<=4&&m.sum>=110&&m.sum<=170);
      odds.add(m.odd);highs.add(m.high);
    }
  }
  assert.deepEqual([...odds].sort(),[2,3,4]);assert.deepEqual([...highs].sort(),[2,3,4]);
  for(const game of [[1,10,20,24,25,30],[10,20,23,30,42,45]]) assert.ok(engine.accepts(game,conditions));
  assert.equal(engine.accepts([1,9,20,24,25,30],conditions),false);
  assert.equal(engine.accepts([11,20,23,30,42,45],conditions),false);
  for(const options of [{conditions:{...conditions,odd:[4,2]}},{conditions:{...conditions,high:[2,7]}},{fixed:[1,3,5,7,9]}])
    await assert.rejects(engine.generate({conditions,fixed:[],weights:uniform,count:1,random,...options,pool:pool.filter(n=>!(options.fixed||[]).includes(n))}));
});
test('Metric boundaries match the original high/low, range and consecutive definitions',()=>{
  const m=engine.metrics([10,11,22,23,24,45]);
  assert.deepEqual(m,{odd:3,high:2,sum:135,consecutive:3,ranges:[1,1,3,0,1]});
  assert.equal(engine.accepts([10,11,22,23,24,45],{...base,consecutive:2}),false);
  assert.equal(engine.accepts([1,2,3,4,5,6],{...base,sumMin:21,range:3}),false);
});
test('Combined exact ratios, sum, consecutive and range limits apply to every generated game',async()=>{
  const conditions={...base,odd:3,high:3,sumMin:130,sumMax:140,consecutive:1,range:2};
  for(let i=0;i<30;i++) {
    const games=await engine.generate({conditions,fixed:[7],pool:pool.filter(n=>n!==7&&n!==8),weights:uniform,count:10,random});
    for(const game of games) {
      assert.ok(engine.accepts(game,conditions));
      assert.ok(game.includes(7));assert.ok(!game.includes(8));
      assert.equal(new Set(game).size,6);
      assert.deepEqual(game,[...game].sort((a,b)=>a-b));
    }
  }
});
test('All three original frequency presets produce finite nonnegative scores and valid games',async()=>{
  assert.deepEqual(engine.presets,[[1,15,5,10,-300],[2,30,5,5,-200],[1,30,150,200,300]]);
  for(const preset of engine.presets) {
    const weights=engine.scores(snapshot.draws,preset);
    assert.ok(weights.every(w=>Number.isFinite(w)&&w>=0));
    for(let i=0;i<10;i++) {
      const games=await engine.generate({conditions:base,fixed:[],pool,weights,count:10,random});
      assert.ok(games.every(game=>engine.accepts(game,base)));
    }
  }
});
test('Negative scores are excluded; fixed zero-score numbers still remain fixed',async()=>{
  const weights=Array(46).fill(0);[2,3,4,5,6].forEach(n=>weights[n]=1);
  const conditions={...base,oddEven:false,highLow:false,sumMin:21,sumMax:255,consecutive:6,range:6};
  const games=await engine.generate({conditions,fixed:[1],pool:pool.filter(n=>n!==1),weights,count:1,random});
  assert.deepEqual(games,[[1,2,3,4,5,6]]);
  const score=engine.scores([{numbers:[1,2,3,4,5,6]}],[-1,0,0,0,0]);
  assert.equal(score.reduce((a,b)=>a+b,0),0);
});
test('Conflicting and impossible settings fail without producing invalid games',async()=>{
  for(const options of [
    {conditions:{...base,sumMin:200,sumMax:100}},
    {conditions:{...base,sumMin:NaN}},
    {conditions:{...base,odd:0}},
    {conditions:{...base,high:6}},
    {conditions:{...base,sumMin:21,sumMax:50},fixed:[40,41,42]},
    {conditions:{...base,consecutive:1},fixed:[22,23]},
    {conditions:{...base,range:2},fixed:[1,4,8]},
    {conditions:{...base,odd:5},fixed:[2,4]},
    {weights:Array(46).fill(0)}
  ]) await assert.rejects(engine.generate({conditions:base,fixed:[],pool,weights:uniform,count:1,random,...options,pool:pool.filter(n=>!(options.fixed||[]).includes(n))}));
});
test('Rejection limit returns an error and yields to the UI instead of silently ignoring constraints',async()=>{
  let yields=0;
  await assert.rejects(engine.generate({conditions:{...base,odd:3},fixed:[],pool,weights:uniform,count:1,random:()=>0,maxAttempts:500,yieldUI:async()=>{yields++;}}));
  assert.equal(yields,2);
});
