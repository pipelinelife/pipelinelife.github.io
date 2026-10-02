'use strict';
const LottoEngine = (() => {
  const presets = [[1,15,5,10,-300],[2,30,5,5,-200],[1,30,150,200,300]];
  const ratioBounds=value=>value===null ? [0,6] : Array.isArray(value) ? value : [value,value];
  const ratioMatches=(count,value)=>{const [min,max]=ratioBounds(value);return count>=min&&count<=max;};
  function metrics(numbers) {
    const sorted=[...numbers].sort((a,b)=>a-b), ranges=Array(5).fill(0);
    let consecutive=0,run=0,last=-2;
    for (const n of sorted) { run=n===last+1 ? run+1 : 1; consecutive=Math.max(consecutive,run);last=n;ranges[Math.floor((n-1)/10)]++; }
    return {odd:sorted.filter(n=>n%2).length,high:sorted.filter(n=>n>23).length,sum:sorted.reduce((a,b)=>a+b,0),consecutive,ranges};
  }
  function accepts(numbers,c) {
    if(numbers.length!==6 || new Set(numbers).size!==6 || numbers.some(n=>!Number.isInteger(n)||n<1||n>45)) return false;
    const m=metrics(numbers);
    return (!c.oddEven || (m.odd>0&&m.odd<6)) && ratioMatches(m.odd,c.odd)
      && (!c.highLow || (m.high>0&&m.high<6)) && ratioMatches(m.high,c.high)
      && m.sum>=c.sumMin && m.sum<=c.sumMax && m.consecutive<=c.consecutive && m.ranges.every(n=>n<=c.range);
  }
  function scores(draws,weights) {
    const counts=[0,100,20,5,1].map(period=>{
      const count=Array(46).fill(0);
      (period ? draws.slice(-period) : draws).forEach(draw=>draw.numbers.forEach(n=>count[n]++));
      return count;
    });
    return Array.from({length:46},(_,n)=>n ? Math.max(0,weights.reduce((total,w,i)=>total+w*counts[i][n],0)) : 0);
  }
  function validate(c,fixed,pool,weights) {
    const integer=(n,min,max)=>Number.isInteger(n)&&n>=min&&n<=max;
    if(!integer(c.sumMin,21,255)||!integer(c.sumMax,21,255)||c.sumMin>c.sumMax) throw new Error('합계는 21~255 사이이며 최소값이 최대값 이하이어야 합니다.');
    if(!integer(c.consecutive,1,6)||!integer(c.range,1,6)) throw new Error('연속 번호와 구간별 최대 개수는 1~6 사이로 설정해주세요.');
    for(const [value,extreme,label] of [[c.odd,c.oddEven,'홀짝'],[c.high,c.highLow,'고저']]) {
      const [min,max]=ratioBounds(value);
      if((Array.isArray(value)&&value.length!==2)||!integer(min,0,6)||!integer(max,0,6)||min>max) throw new Error('비율 설정을 확인해주세요.');
      if(extreme&&(max===0||min===6)) throw new Error(`${label} 극단 제외와 ${label} 비율이 충돌합니다.`);
    }
    if(fixed.length>6||new Set([...fixed,...pool]).size!==fixed.length+pool.length) throw new Error('고정·제외 번호 선택을 확인해주세요.');
    const usable=pool.filter(n=>weights[n]>0), need=6-fixed.length;
    if(usable.length<need) throw new Error('가중치가 양수인 사용 가능 번호가 부족합니다. 빈도 계수 또는 제외 번호를 바꿔주세요.');
    const m=metrics(fixed), sorted=usable.sort((a,b)=>a-b);
    if(m.sum+sorted.slice(0,need).reduce((a,b)=>a+b,0)>c.sumMax || m.sum+(need ? sorted.slice(-need) : []).reduce((a,b)=>a+b,0)<c.sumMin) throw new Error('고정·제외 번호로는 설정한 합계 범위를 만들 수 없습니다.');
    if(m.consecutive>c.consecutive||m.ranges.some(n=>n>c.range)) throw new Error('고정 번호가 연속 번호 또는 구간별 최대 개수를 초과합니다.');
    for(const [value,check,extreme,predicate,label] of [[m.odd,c.odd,c.oddEven,n=>n%2,'홀짝'],[m.high,c.high,c.highLow,n=>n>23,'고저']]) {
      const available=usable.filter(predicate).length, other=usable.length-available;
      const min=value+Math.max(0,need-other), max=value+Math.min(need,available);
      const [lower,upper]=ratioBounds(check);
      if(Math.max(min,lower,extreme ? 1 : 0)>Math.min(max,upper,extreme ? 5 : 6)) throw new Error(`고정·제외 번호로는 설정한 ${label} 비율을 만들 수 없습니다.`);
    }
    if(!need&&!accepts(fixed,c)) throw new Error('고정한 6개 번호가 설정 조건을 충족하지 않습니다.');
    return usable;
  }
  function sample(fixed,pool,weights,random) {
    const available=[...pool],result=[...fixed];
    while(result.length<6) {
      const total=available.reduce((sum,n)=>sum+weights[n],0), target=random()*total;
      let cumulative=0,index=available.length-1;
      for(let i=0;i<available.length;i++) { cumulative+=weights[available[i]];if(target<cumulative){index=i;break;} }
      result.push(available.splice(index,1)[0]);
    }
    return result.sort((a,b)=>a-b);
  }
  async function generate({conditions,fixed,pool,weights,count,random,yieldUI=()=>Promise.resolve(),maxAttempts=10000}) {
    if(!Number.isInteger(count)||count<1||count>10) throw new Error('게임 수는 1~10 사이로 선택해주세요.');
    if(weights.length!==46||weights.some(w=>!Number.isFinite(w)||w<0)) throw new Error('빈도 가중치를 확인해주세요.');
    const usable=validate(conditions,fixed,pool,weights), games=[];
    for(let i=0;i<count;i++) {
      let found=false;
      for(let attempt=0;attempt<maxAttempts;attempt++) {
        const game=sample(fixed,usable,weights,random);
        if(accepts(game,conditions)) {games.push(game);found=true;break;}
        if(attempt%250===249) await yieldUI();
      }
      if(!found) throw new Error('시도 횟수 안에 조건을 모두 만족하는 번호를 찾지 못했습니다. 합계·비율·연속·구간 조건을 완화해주세요.');
    }
    return games;
  }
  return {presets,metrics,accepts,scores,validate,sample,generate};
})();
if(typeof module!=='undefined') module.exports=LottoEngine;
