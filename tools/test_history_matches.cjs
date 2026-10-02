const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname,'../script.js'),'utf8');
const context = vm.createContext({});
vm.runInContext(source.slice(source.indexOf('function findHistoricalMatches('),source.indexOf('function historicalMatchHTML(')),context);
const compare = context.findHistoricalMatches;
const draw=(round,numbers,bonus)=>({round,date:'2026-01-03',numbers,bonus});
test('All six main numbers match first prize regardless of order',()=>{
  const matches=compare([6,5,4,3,2,1],[draw(1,[1,2,3,4,5,6],7)]);
  assert.equal(matches.length,1);
  assert.equal(matches[0].rank,1);
});
test('Second prize requires five main numbers and the bonus',()=>{
  assert.equal(compare([1,2,3,4,5,7],[draw(1,[1,2,3,4,5,6],7)])[0].rank,2);
  assert.equal(compare([1,2,3,4,5,8],[draw(1,[1,2,3,4,5,6],7)]).length,0);
  assert.equal(compare([1,2,3,4,8,7],[draw(1,[1,2,3,4,5,6],7)]).length,0);
});
test('Reports every matching round with newest first',()=>{
  const matches=compare([1,2,3,4,5,6],[draw(1,[1,2,3,4,5,6],7),draw(3,[1,2,3,4,5,7],6),draw(2,[10,11,12,13,14,15],16)]);
  assert.equal(JSON.stringify(matches.map(m=>[m.round,m.rank])),JSON.stringify([[3,2],[1,1]]));
});
