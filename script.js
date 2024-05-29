// CSV 데이터를 가져와서 처리하는 함수
function fetchCSVData(url, callback) {
    fetch(url)
        .then(response => response.text()) // 서버에서 응답을 텍스트로 변환
        .then(data => callback(data)); // 변환된 데이터를 콜백 함수로 전달
}

// CSV 데이터를 HTML 테이블로 파싱하는 함수
function parseCSVToHTMLTable(csvData) {
    const lines = csvData.trim().split("\n"); // CSV 데이터를 줄 단위로 분리
    const tbody = document.querySelector("#resultsTable tbody"); // 테이블 본문 선택
    lines.forEach(line => {
        const cols = line.split(","); // 각 줄을 쉼표로 분리하여 열 생성
        const tr = document.createElement("tr"); // 새로운 테이블 행 생성
        const formattedAmount = parseInt(cols[1] / cols[2]).toLocaleString() + "원"; // 금액을 원화 형식으로 포맷
        const formattedPeople = parseInt(cols[2]).toLocaleString() + "명"; // 숫자를 사람 형식으로 포맷
        tr.innerHTML = `<td>${cols[0]}</td><td>${formattedAmount}</td><td>${formattedPeople}</td>`; // 행의 내용 설정
        tbody.appendChild(tr); // 테이블 본문에 행 추가
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

    // 최신 회차 번호 저장
    const latestRound = latest[0];
    fetchCSVData('https://raw.githubusercontent.com/ablanksheet/lottonumber/main/lottowinnerstores.csv', data => displayWinnerStores(data, latestRound));
}

// 번호와 범위에 따라 클래스를 설정하는 함수
function formatLottoBallHtml(num, isBonus = false) {
    const number = parseInt(num); // 숫자를 정수로 변환
    let className;  // 클래스 이름을 결정할 변수
    // 번호 범위에 따른 클래스 할당
    if (number <= 10) className = 'lotto-past-number1-10';
    else if (number <= 20) className = 'lotto-past-number11-20';
    else if (number <= 30) className = 'lotto-past-number21-30';
    else if (number <= 40) className = 'lotto-past-number31-40';
    else className = 'lotto-past-number41-45';

    return `<div class="lotto-ball ${className}">${num}</div>`;  // 공 모양의 HTML 문자열 반환
}

// 1등 배출점을 디스플레이하는 함수
function displayWinnerStores(csvData, latestRound) {
    const lines = csvData.trim().split("\n"); // CSV 데이터를 줄 단위로 분리
    const tbody = document.querySelector("#winnerStoresTable tbody"); // 테이블 본문 선택
    tbody.innerHTML = ""; // 기존 테이블 내용을 비움
    lines.forEach(line => {
        const cols = line.split(","); // 각 줄을 쉼표로 분리하여 열 생성
        if (cols[0] === latestRound) { // 최신 회차와 일치하는 데이터만 추가
            const tr = document.createElement("tr"); // 새로운 테이블 행 생성
            tr.innerHTML = `
                <td class="category">${cols[2]}</td>
                <td class="name">${cols[1]}</td>
                <td class="address">${cols[3]}</td>
            `; // 행의 내용 설정
            tbody.appendChild(tr); // 테이블 본문에 행 추가
        }
    });
}

// 문서 로딩 완료 후 함수 호출
document.addEventListener('DOMContentLoaded', function() {
    fetchCSVData('https://raw.githubusercontent.com/ablanksheet/lottonumber/main/lastlotto_results.csv', parseCSVToHTMLTable); // 로또 결과 테이블 생성
    fetchCSVData('https://raw.githubusercontent.com/ablanksheet/lottonumber/main/lottoRes.csv', displayLatestLotto); // 최신 로또 결과 표시
});
