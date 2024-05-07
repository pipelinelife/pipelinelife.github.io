function fetchLotteryResults() {
    // 요청할 URL 설정
    const url = 'https://dhlottery.co.kr/gameResult.do?method=byWin&drwNo=1188'; // 변경 가능
    
    // fetch API를 사용하여 데이터 요청
    fetch(url)
        .then(response => response.text()) // 응답을 텍스트로 변환
        .then(data => {
            const parser = new DOMParser(); // DOMParser 인스턴스 생성
            const doc = parser.parseFromString(data, 'text/html'); // 응답 데이터를 HTML 문서로 파싱
            
            // 적절한 선택자로 필요한 데이터 추출
            const resultSection = doc.querySelector('.your-result-selector'); // 수정 필요
            document.getElementById('resultTable').innerHTML = resultSection.outerHTML; // 결과를 페이지에 삽입
        })
        .catch(err => { // 오류 처리
            console.error('Error fetching data: ', err);
            document.getElementById('resultTable').innerText = '결과를 불러오는데 실패했습니다.';
        });
}

// 페이지 로드 시 함수 실행
window.onload = fetchLotteryResults;

function getColorForNumber(number) {
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
