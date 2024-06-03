// 문서가 로드되면 함수 실행
document.addEventListener('DOMContentLoaded', function() {
    // CSV 파일의 URL
    const csvUrl = 'https://raw.githubusercontent.com/ablanksheet/lottonumber/main/lottoRes.csv';
    // CSV 파일을 가져오기
    fetch(csvUrl)
        .then(response => response.text()) // 응답을 텍스트로 변환
        .then(data => {
            displayLottoNumbers(parseCSV(data)); // 변환된 데이터를 처리하는 함수 호출
        })
        .catch(error => console.error('Error loading the CSV file:', error)); // 오류 처리
});

// CSV 데이터를 파싱하는 함수
function parseCSV(csvData) {
    const rows = csvData.split('\n'); // 데이터를 줄바꿈으로 분리
    return rows.map(row => {
        const columns = row.split(','); // 각 줄을 쉼표로 분리
        return [
            columns[0], // 회차
            columns[2], // 로또번호1
            columns[3], // 로또번호2
            columns[4], // 로또번호3
            columns[5], // 로또번호4
            columns[6], // 로또번호5
            columns[7], // 로또번호6
            columns[8]  // 보너스번호
        ].map(Number); // 모든 요소를 숫자로 변환
    }).filter(row => row[0] > 0 && !row.includes(NaN)) // 유효한 데이터만 선택
    .reverse(); // 데이터 순서를 역전시켜 최신 데이터가 위로 오도록 함
}

// 로또 데이터를 화면에 표시하는 함수
function displayLottoNumbers(lottoData) {
    const container = document.getElementById('lotto-past-result'); // 결과를 표시할 컨테이너 선택
    container.innerHTML = ''; // 컨테이너 초기화
    lottoData.forEach((row, index) => {
        if (row && row.length > 1) {
            const lottoRow = document.createElement('div');
            lottoRow.className = 'lotto-past-row';
            const drawNumber = document.createElement('span');
            drawNumber.textContent = `${row[0]} 회`; // 회차 정보 표시
            drawNumber.style.fontWeight = 'bold';
            drawNumber.style.display = 'inline-block';
            drawNumber.style.width = '70px';
            drawNumber.className = 'lotto-past-draw';
            lottoRow.appendChild(drawNumber);

            // 로또 번호를 각각의 스팬에 표시하고 색상 지정
            for (let i = 1; i <= 6; i++) {
                const number = document.createElement('span');
                number.className = 'lotto-past-number';
                number.textContent = row[i];
                number.style.backgroundColor = getColor(row[i]); // 번호에 따른 색상 지정
                lottoRow.appendChild(number);
            }

            // 보너스 번호 설정
            const plusSign = document.createElement('span');
            plusSign.className = 'lotto-past-plus';
            plusSign.textContent = '+';
            plusSign.style.backgroundColor = '#FFFFFF'; // 흰색 배경
            lottoRow.appendChild(plusSign);

            const bonus = document.createElement('span');
            bonus.className = 'lotto-past-bonus';
            bonus.textContent = row[7];
            bonus.style.backgroundColor = getColor(row[7]); // 보너스 번호 색상 지정
            lottoRow.appendChild(bonus);

            container.appendChild(lottoRow); // 컨테이너에 로우 추가
        }
    });
}

// 번호에 따른 색상을 결정하는 함수
function getColor(number) {
    if (number <= 10) {
        return '#FBC400'; // Yellow
    } else if (number <= 20) {
        return '#69C8F2'; // Blue
    } else if (number <= 30) {
        return '#FF7272'; // Red
    } else if (number <= 40) {
        return '#AAAAAA'; // Grey
    } else {
        return '#B0D840'; // Green
    }
}
