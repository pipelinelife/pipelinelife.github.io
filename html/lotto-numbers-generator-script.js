document.addEventListener('DOMContentLoaded', function() {
    let drawCount = 0;

    document.getElementById('generate-btn').addEventListener('click', function() {
        let frequencyAll = document.getElementById('frequency-all').value;
        let frequency100 = document.getElementById('frequency-100').value;
        let frequency20 = document.getElementById('frequency-20').value;
        let frequency5 = document.getElementById('frequency-5').value;
        let frequency1 = document.getElementById('frequency-1').value;
        let oddEvenChecked = document.getElementById('odd-even').checked;
        let highLowChecked = document.getElementById('high-low').checked;
        let sumMin = parseInt(document.getElementById('sum-min').value);
        let sumMax = parseInt(document.getElementById('sum-max').value);
        let consecutiveLimit = parseInt(document.getElementById('consecutive').value);
        let rangeLimit = parseInt(document.getElementById('range').value);

        function generateLottoNumbers() {
            let lottoNumbers = new Set();
            while (lottoNumbers.size < 6) {
                lottoNumbers.add(Math.floor(Math.random() * 45) + 1);
            }
            return Array.from(lottoNumbers).sort((a, b) => a - b);
        }

        function filterNumbers(numbers) {
            let oddCount = numbers.filter(num => num % 2 !== 0).length;
            let evenCount = 6 - oddCount;
            let highCount = numbers.filter(num => num > 23).length;
            let lowCount = 6 - highCount;
            let sum = numbers.reduce((a, b) => a + b, 0);
            let maxConsecutive = getMaxConsecutive(numbers);
            let rangeCounts = getRangeCounts(numbers);

            if (oddEvenChecked && (oddCount === 0 || oddCount === 6)) return false;
            if (highLowChecked && (highCount === 0 || highCount === 6)) return false;
            if (sum < sumMin || sum > sumMax) return false;
            if (maxConsecutive > consecutiveLimit) return false;
            if (rangeCounts.some(count => count > rangeLimit)) return false;

            return true;
        }

        function getMaxConsecutive(numbers) {
            let maxConsecutive = 1;
            let currentConsecutive = 1;

            for (let i = 1; i < numbers.length; i++) {
                if (numbers[i] === numbers[i - 1] + 1) {
                    currentConsecutive++;
                } else {
                    if (currentConsecutive > maxConsecutive) {
                        maxConsecutive = currentConsecutive;
                    }
                    currentConsecutive = 1;
                }
            }

            return Math.max(maxConsecutive, currentConsecutive);
        }

        function getRangeCounts(numbers) {
            let ranges = [0, 0, 0, 0, 0];
            numbers.forEach(num => {
                if (num <= 10) ranges[0]++;
                else if (num <= 20) ranges[1]++;
                else if (num <= 30) ranges[2]++;
                else if (num <= 40) ranges[3]++;
                else ranges[4]++;
            });
            return ranges;
        }

        let lottoNumbers;
        let maxAttempts = 1000; // 최대 시도 횟수
        let attempts = 0;

        do {
            lottoNumbers = generateLottoNumbers();
            attempts++;
            if (attempts >= maxAttempts) {
                alert('조건에 맞는 번호를 생성할 수 없습니다. 조건을 다시 설정해 주세요.');
                return;
            }
        } while (!filterNumbers(lottoNumbers));

        let oddCount = lottoNumbers.filter(num => num % 2 !== 0).length;
        let evenCount = 6 - oddCount;
        let highCount = lottoNumbers.filter(num => num > 23).length;
        let lowCount = 6 - highCount;
        let sum = lottoNumbers.reduce((a, b) => a + b, 0);

        const displayNumbersContainer = document.getElementById('display-numbers');
        const pastNumbersContainer = document.getElementById('numbers-list');

        const newCurrentNumbersDiv = document.createElement('div');
        newCurrentNumbersDiv.className = 'numbers-row';

        drawCount++;
        const drawLabel = document.createElement('div');
        drawLabel.textContent = `${drawCount} 추첨`;
        drawLabel.style.fontWeight = 'bold';
        drawLabel.style.display = 'inline-block';
        drawLabel.style.width = '70px';
        newCurrentNumbersDiv.appendChild(drawLabel);

        lottoNumbers.forEach(num => {
            const numDiv = document.createElement('div');
            numDiv.className = 'number-box';
            numDiv.textContent = num;
            numDiv.style.backgroundColor = getColorForNumber(num);
            newCurrentNumbersDiv.appendChild(numDiv);
        });

        const infoDiv = document.createElement('div');
        infoDiv.className = 'info-row';
        infoDiv.textContent = `홀짝 비율: ${oddCount} : ${evenCount}, 고저 비율: ${highCount} : ${lowCount}, 총합: ${sum}`;
        displayNumbersContainer.insertBefore(infoDiv, displayNumbersContainer.firstChild);
        displayNumbersContainer.insertBefore(newCurrentNumbersDiv, displayNumbersContainer.firstChild);

        if (displayNumbersContainer.children.length > 2) {
            Array.from(displayNumbersContainer.children).slice(2).forEach(child => {
                pastNumbersContainer.appendChild(child);
            });
        }
    });
});

function getColorForNumber(number) {
    if (number <= 10) return '#FBC400'; // Yellow
    else if (number <= 20) return '#69C8F2'; // Blue
    else if (number <= 30) return '#FF7272'; // Red
    else if (number <= 40) return '#AAAAAA'; // Grey
    else return '#B0D840'; // Green
}
