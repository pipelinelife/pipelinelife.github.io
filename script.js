// lotto-home-script.js
// CSV 데이터를 가져와서 처리하는 함수
function fetchCSVData(url, callback) {
    fetch(url)
      .then(response => response.text())
      .then(data => callback(data));
}

// CSV 데이터를 HTML 테이블로 파싱하는 함수
function parseCSVToHTMLTable(csvData) {
    const lines = csvData.trim().split("\n");
    const tbody = document.querySelector("#resultsTable tbody");
    lines.forEach(line => {
        const cols = line.split(",");
        const tr = document.createElement("tr");
        const formattedAmount = parseInt(cols[1]/cols[2]).toLocaleString() + "원"; // 금액을 원화 형식으로 포맷
        tr.innerHTML = `<td>${cols[0]}</td><td>${formattedAmount}</td><td>${cols[2]}</td>`;
        tbody.appendChild(tr);
    });
}

// 최신 로또 결과를 디스플레이하는 함수
function displayLatestLotto(csvData) {
    const lines = csvData.trim().split("\n");  // CSV 데이터를 줄바꿈 단위로 분리
    const latest = lines[lines.length - 1].split(",");  // 마지막 줄을 쉼표로 분리하여 최신 로또 데이터 추출
    const div = document.getElementById("latestLotto");  // 최신 로또 결과를 표시할 div 요소 선택

    // 로또 번호 HTML 생성
    let numbersHtml = latest.slice(2, 8).map(num => formatLottoBallHtml(num)).join("");  // 각 번호를 공 모양 HTML로 변환
    let bonusHtml = formatLottoBallHtml(latest[8], true);  // 보너스 번호를 공 모양 HTML로 변환

    // div에 로또 결과 HTML 삽입
    div.innerHTML = `
        <strong>${latest[0]}회차</strong><br>
        (${latest[1]})<br>
        당첨번호 ${numbersHtml} + ${bonusHtml}
    `;
}

// 번호와 범위에 따라 클래스를 설정하는 함수
function formatLottoBallHtml(num, isBonus = false) {
    const number = parseInt(num);
    let className;  // 클래스 이름을 결정할 변수
    // 번호 범위에 따른 클래스 할당
    if (number <= 10) className = 'lotto-past-number1-10';
    else if (number <= 20) className = 'lotto-past-number11-20';
    else if (number <= 30) className = 'lotto-past-number21-30';
    else if (number <= 40) className = 'lotto-past-number31-40';
    else className = 'lotto-past-number41-45';

    return `<div class="lotto-ball ${className}">${num}</div>`;  // 공 모양의 HTML 문자열 반환
}


// 문서 로딩 완료 후 함수 호출
document.addEventListener('DOMContentLoaded', function() {
    fetchCSVData('https://raw.githubusercontent.com/ablanksheet/lottonumber/main/lastlotto_results.csv', parseCSVToHTMLTable);
    fetchCSVData('https://raw.githubusercontent.com/ablanksheet/lottonumber/main/lottoRes.csv', displayLatestLotto);
});



