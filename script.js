document.addEventListener('DOMContentLoaded', function() {
    let drawCount = 0;  // 추첨 횟수를 저장할 변수

    document.getElementById('generate-btn').addEventListener('click', function() {
        let lottoNumbers = new Set();
        while (lottoNumbers.size < 6) {
            lottoNumbers.add(Math.floor(Math.random() * 45) + 1);
        }
        const pastNumbersContainer = document.getElementById('past-numbers');
        const newNumbersDiv = document.createElement('div');
        newNumbersDiv.className = 'numbers-row';

        // 추첨 번호 세트 위에 추첨 순서 레이블 추가
        drawCount++; // 추첨 횟수 증가
        const drawLabel = document.createElement('div');
        drawLabel.textContent = `${drawCount} 추첨`;
        drawLabel.style.fontWeight = 'bold';
        newNumbersDiv.appendChild(drawLabel);

        Array.from(lottoNumbers).forEach(num => {
            const numDiv = document.createElement('div');
            numDiv.className = 'number-box';
            numDiv.textContent = num;
            numDiv.style.backgroundColor = getColorForNumber(num);
            newNumbersDiv.appendChild(numDiv);
        });

        pastNumbersContainer.insertBefore(newNumbersDiv, pastNumbersContainer.firstChild);
    });
});

function getColorForNumber(number) {
    if (number <= 10) {
        return '#FBC400';
    } else if (number <= 20) {
        return '#69C8F2';
    } else if (number <= 30) {
        return '#FF7272';
    } else if (number <= 40) {
        return '#AAAAAA';
    } else {
        return '#B0D840';
    }
}
