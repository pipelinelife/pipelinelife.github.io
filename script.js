document.addEventListener('DOMContentLoaded', function() {
    // 'generate-btn' ID에 맞춰 리스너 추가
    document.getElementById('generate-btn').addEventListener('click', function() {
        let lottoNumbers = new Set();
        while (lottoNumbers.size < 6) {
            lottoNumbers.add(Math.floor(Math.random() * 45) + 1);
        }
        const currentNumbersContainer = document.getElementById('display-numbers'); // 현재 번호를 표시할 컨테이너
        const pastNumbersContainer = document.getElementById('numbers-list'); // 과거 번호를 표시할 컨테이너

        // 현재 번호를 새로운 div로 생성
        const newCurrentNumbersDiv = document.createElement('div');
        newCurrentNumbersDiv.className = 'numbers-row';
        Array.from(lottoNumbers).forEach(num => {
            const numDiv = document.createElement('div');
            numDiv.className = 'number-box';
            numDiv.textContent = num;
            numDiv.style.backgroundColor = getColorForNumber(num);
            newCurrentNumbersDiv.appendChild(numDiv);
        });

        // 이전 번호를 "생성된 번호" 영역으로 이동
        if (currentNumbersContainer.firstChild) {
            pastNumbersContainer.insertBefore(newCurrentNumbersDiv, pastNumbersContainer.firstChild);
        } else {
            currentNumbersContainer.appendChild(newCurrentNumbersDiv);
        }
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
