document.addEventListener('DOMContentLoaded', function() {
    let drawCount = 0; // 추첨 횟수를 저장할 변수 초기화
    let probabilities = []; // 확률 저장 변수 추가

    // CSV 데이터 로드 및 확률 계산
    function loadCSVAndCalculateProbabilities() {
        fetch('../CSV/lotto_number_frequency_combined.csv') // 파일 경로 수정
            .then(response => response.text())
            .then(data => {
                let parsedData = Papa.parse(data, { header: true }).data;
                console.log('Parsed Data:', parsedData); // 디버깅: 로드된 CSV 데이터 출력

                // 빈 행 제거
                parsedData = parsedData.filter(row => row['번호'] !== undefined && row['번호'].trim() !== '');

                const conditions = getConditions();
                probabilities = calculateProbabilities(parsedData, conditions);
                displayProbabilities(probabilities);
            })
            .catch(error => console.error('Error loading CSV data:', error));
    }

    document.getElementById('generate-btn').addEventListener('click', function() {
        loadCSVAndCalculateProbabilities();
        const conditions = getConditions();
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

    // 조건 설정 필드에 이벤트 리스너 추가
    document.querySelectorAll('#frequency-all, #frequency-100, #frequency-20, #frequency-5, #frequency-1').forEach(input => {
        input.addEventListener('input', () => {
            const conditions = getConditions();
            probabilities = calculateProbabilities(parsedData, conditions);
            displayProbabilities(probabilities);
        });
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

    function calculateProbabilities(data, conditions) {
        const probabilities = new Array(45).fill(0);
        let totalProbability = 0;

        data.forEach(row => {
            console.log('Processing Row:', row); // 디버깅: 각 행 데이터 출력
            const number = parseInt(row['번호']);
            const frequencyAll = parseFloat(row['출현 횟수 전체']);
            const frequency100 = parseFloat(row['출현 횟수 100']);
            const frequency20 = parseFloat(row['출현 횟수 020']);
            const frequency5 = parseFloat(row['출현 횟수 005']);
            const frequency1 = parseFloat(row['출현 횟수 001']);

            if (isNaN(number) || isNaN(frequencyAll) || isNaN(frequency100) || isNaN(frequency20) || isNaN(frequency5) || isNaN(frequency1)) {
                console.error('Invalid data:', row);
                return;
            }

            const probability = (frequencyAll * conditions.frequencyAll) +
                                (frequency100 * conditions.frequency100) +
                                (frequency20 * conditions.frequency20) +
                                (frequency5 * conditions.frequency5) +
                                (frequency1 * conditions.frequency1);

            probabilities[number - 1] = probability;
            totalProbability += probability;
        });

        probabilities.forEach((probability, index) => {
            probabilities[index] = probability / totalProbability;
        });

        return probabilities;
    }

    function displayProbabilities(probabilities) {
        const probabilityList = document.getElementById('probability-list');
        probabilityList.innerHTML = '';

        let rowDiv = document.createElement('div');
        rowDiv.className = 'probability-row';

        probabilities.forEach((prob, index) => {
            const listItem = document.createElement('span');
            listItem.className = 'probability-item';
            listItem.textContent = `번호 ${index + 1}: ${(prob * 100).toFixed(2)}%`;

            rowDiv.appendChild(listItem);

            if ((index + 1) % 3 === 0) {
                probabilityList.appendChild(rowDiv);
                rowDiv = document.createElement('div');
                rowDiv.className = 'probability-row';
            }
        });

        if (rowDiv.children.length > 0) {
            probabilityList.appendChild(rowDiv);
        }
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
    
    document.addEventListener('DOMContentLoaded', () => {
        const toggleButton = document.getElementById('toggle-probabilities');
        const probabilityContent = document.getElementById('probability-content');

        toggleButton.addEventListener('click', () => {
            if (probabilityContent.style.display === 'none') {
                probabilityContent.style.display = 'block';
                toggleButton.textContent = '접기';
            } else {
                probabilityContent.style.display = 'none';
                toggleButton.textContent = '펼치기';
            }
         }   
            probabilityContent.style.display = 'block';
        }
    // 페이지 로드 시 초기 확률 표시
    loadCSVAndCalculateProbabilities();
});

