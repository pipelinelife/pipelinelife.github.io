document.addEventListener('DOMContentLoaded', function() {
    let drawCount = 0; // 추첨 횟수를 저장할 변수 초기화

    document.getElementById('generate-btn').addEventListener('click', function() {
        let lottoNumbers = new Set();
        while (lottoNumbers.size < 6) {
            lottoNumbers.add(Math.floor(Math.random() * 45) + 1);
        }
        const displayNumbersContainer = document.getElementById('display-numbers'); // 현재 번호를 표시할 컨테이너
        const pastNumbersContainer = document.getElementById('numbers-list'); // 과거 번호를 표시할 컨테이너

        // 현재 번호를 새로운 div로 생성
        const newCurrentNumbersDiv = document.createElement('div');
        newCurrentNumbersDiv.className = 'numbers-row';

        // 추첨 횟수 증가
        drawCount++;

        // 추첨 횟수 레이블 추가
        const drawLabel = document.createElement('div');
        drawLabel.textContent = `${drawCount} 추첨`;
        drawLabel.style.fontWeight = 'bold';
        drawLabel.style.display = 'inline-block';
        drawLabel.style.width = '80px';
        newCurrentNumbersDiv.appendChild(drawLabel);

        Array.from(lottoNumbers).forEach(num => {
            const numDiv = document.createElement('div');
            numDiv.className = 'number-box';
            numDiv.textContent = num;
            numDiv.style.backgroundColor = getColorForNumber(num);
            newCurrentNumbersDiv.appendChild(numDiv);
        });

        // 현재 번호가 있는 경우 이를 과거 번호로 이동
        if (displayNumbersContainer.firstChild) {
            pastNumbersContainer.insertBefore(displayNumbersContainer.firstChild, pastNumbersContainer.firstChild);
        }

        // 새로운 번호를 현재 번호 영역에 표시
        displayNumbersContainer.appendChild(newCurrentNumbersDiv);
    });
});

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
