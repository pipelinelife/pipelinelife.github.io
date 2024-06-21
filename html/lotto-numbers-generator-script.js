document.addEventListener('DOMContentLoaded', function() {
    let drawCount = 0; // 추첨 횟수를 저장할 변수 초기화

    document.getElementById('generate-btn').addEventListener('click', function() {
        const conditions = getConditions();
        loadCSVData('../CSV/lotto_number_frequency_combined.CSV', function(data) {
            const probabilities = calculateProbabilities(data, conditions);
            let lottoNumbers;
            let attempts = 0;
            const maxAttempts = 10000; // 최대 시도 횟수 설정
            do {
                lottoNumbers = generateLottoNumbers(probabilities);
                attempts++;
            } while (!filterNumbers(lottoNumbers, conditions) && attempts < maxAttempts);

            if (attempts >= maxAttempts) {
                alert('번호를 생성하는데 실패했습니다. 조건을 다시 설정해주세요.');
            } else {
                displayLottoNumbers(lottoNumbers);
            }
        });
    });

    document.getElementById('tooltip-icon').addEventListener('mouseover', function() {
        const conditions = getConditions();
        loadCSVData('../CSV/lotto_number_frequency_combined.CSV', function(data) {
            const probabilities = calculateProbabilities(data, conditions);
            displayProbabilities(probabilities);
        });
    });

    document.getElementById('tooltip-icon').addEventListener('mouseout', function() {
        document.getElementById('tooltip').style.display = 'none';
    });

    function getConditions() {
        return {
            frequencyAll: parseFloat(document.getElementById('frequency-all').value),
            frequency100: parseFloat(document.getElementById('frequency-100').value),
            frequency20: parseFloat(document.getElementById('frequency-20').value),
            frequency5: parseFloat(document.getElementById('frequency-5').value),
            frequency1: parseFloat(document.getElementById('frequency-1').value),
            oddEvenChecked: document.getElementById('odd-even').checked,
            highLowChecked: document.getElementById('high-low').checked,
            sumMin: parseInt(document.getElementById('sum-min').value),
            sumMax: parseInt(document.getElementById('sum-max').value),
            consecutiveLimit: parseInt(document.getElementById('consecutive').value),
            rangeLimit: parseInt(document.getElementById('range').value),
        };
    }

    function loadCSVData(filePath, callback) {
        fetch(filePath)
            .then(response => response.text())
            .then(data => {
                const parsedData = Papa.parse(data, { header: true }).data;
                callback(parsedData);
            })
            .catch(error => console.error('Error loading CSV data:', error));
    }

    function calculateProbabilities(data, conditions) {
        const probabilities = new Array(45).fill(0);
        let totalProbability = 0;

        data.forEach(row => {
            const number = parseInt(row.Number);
            const frequencyAll = parseFloat(row.FrequencyAll);
            const frequency100 = parseFloat(row.Frequency100);
            const frequency20 = parseFloat(row.Frequency20);
            const frequency5 = parseFloat(row.Frequency5);
            const frequency1 = parseFloat(row.Frequency1);

            const probability = (frequencyAll * conditions.frequencyAll) +
                                (frequency100 * conditions.frequency100) +
                                (frequency20 * conditions.frequency20) +
                                (frequency5 * conditions.frequency5) +
                                (frequency1 * conditions.frequency1);

            probabilities[number - 1] = probability;
            totalProbability += probability;
        });

        return probabilities.map(probability => probability / totalProbability);
    }

    function generateLottoNumbers(probabilities) {
        const lottoNumbers = new Set();
        while (lottoNumbers.size < 6) {
            const randomValue = Math.random();
            let cumulativeProbability = 0;

            for (let i = 0; i < probabilities.length; i++) {
                cumulativeProbability += probabilities[i];
                if (randomValue < cumulativeProbability) {
                    lottoNumbers.add(i + 1);
                    break;
                }
            }
        }
        return Array.from(lottoNumbers).sort((a, b) => a - b);
    }

    function filterNumbers(numbers, conditions) {
        const oddCount = numbers.filter(num => num % 2 !== 0).length;
        const highCount = numbers.filter(num => num > 23).length;
        const sum = numbers.reduce((a, b) => a + b, 0);
        const maxConsecutive = getMaxConsecutive(numbers);
        const rangeCounts = getRangeCounts(numbers);

        return !(
            (conditions.oddEvenChecked && (oddCount === 0 || oddCount === 6)) ||
            (conditions.highLowChecked && (highCount === 0 || highCount === 6)) ||
            (sum < conditions.sumMin || sum > conditions.sumMax) ||
            (maxConsecutive > conditions.consecutiveLimit) ||
            (rangeCounts.some(count => count > conditions.rangeLimit))
        );
    }

    function getMaxConsecutive(numbers) {
        let maxConsecutive = 1, currentConsecutive = 1;
        for (let i = 1; i < numbers.length; i++) {
            currentConsecutive = (numbers[i] === numbers[i - 1] + 1) ? currentConsecutive + 1 : 1;
            maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
        }
        return maxConsecutive;
    }

    function getRangeCounts(numbers) {
        const ranges = Array(5).fill(0);
        numbers.forEach(num => ranges[Math.floor((num - 1) / 10)]++);
        return ranges;
    }

    function displayLottoNumbers(lottoNumbers) {
        drawCount++;
        const displayNumbersContainer = document.getElementById('display-numbers');
        const pastNumbersContainer = document.getElementById('numbers-list');

        const newCurrentNumbersDiv = createNumbersDiv(lottoNumbers, drawCount);
        const infoDiv = createInfoDiv(lottoNumbers);

        displayNumbersContainer.insertBefore(infoDiv, displayNumbersContainer.firstChild);
        displayNumbersContainer.insertBefore(newCurrentNumbersDiv, displayNumbersContainer.firstChild);

        if (displayNumbersContainer.children.length > 2) {
            Array.from(displayNumbersContainer.children).slice(2).forEach(child => {
                pastNumbersContainer.appendChild(child);
            });
        }
    }

    function createNumbersDiv(lottoNumbers, drawCount) {
        const div = document.createElement('div');
        div.className = 'numbers-row';

        const drawLabel = document.createElement('div');
        drawLabel.textContent = `${drawCount} 추첨`;
        drawLabel.style.fontWeight = 'bold';
        drawLabel.style.display = 'inline-block';
        drawLabel.style.width = '70px';
        div.appendChild(drawLabel);

        lottoNumbers.forEach(num => {
            const numDiv = document.createElement('div');
            numDiv.className = 'number-box';
            numDiv.textContent = num;
            numDiv.style.backgroundColor = getColorForNumber(num);
            div.appendChild(numDiv);
        });

        return div;
    }

    function createInfoDiv(lottoNumbers) {
        const oddCount = lottoNumbers.filter(num => num % 2 !== 0).length;
        const evenCount = 6 - oddCount;
        const highCount = lottoNumbers.filter(num => num > 23).length;
        const lowCount = 6 - highCount;
        const sum = lottoNumbers.reduce((a, b) => a + b, 0);

        const div = document.createElement('div');
        div.className = 'info-row';
        div.textContent = `홀짝 비율: ${oddCount} : ${evenCount}, 고저 비율: ${highCount} : ${lowCount}, 총합: ${sum}`;
        return div;
    }

    function getColorForNumber(number) {
        if (number <= 10) return '#FBC400';
        if (number <= 20) return '#69C8F2';
        if (number <= 30) return '#FF7272';
        if (number <= 40) return '#AAAAAA';
        return '#B0D840';
    }

    function displayProbabilities(probabilities) {
        const tooltip = document.getElementById('tooltip');
        tooltip.style.display = 'block';
        tooltip.style.left = `${event.clientX}px`;
        tooltip.style.top = `${event.clientY}px`;

        let content = '<strong>번호별 확률:</strong><br>';
        probabilities.forEach((prob, index) => {
            content += `번호 ${index + 1}: ${(prob * 100).toFixed(2)}%<br>`;
        });

        tooltip.innerHTML = content;
    }
});
