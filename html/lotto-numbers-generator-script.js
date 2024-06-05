document.addEventListener('DOMContentLoaded', function() {
    let drawCount = 0; // 추첨 횟수를 저장할 변수 초기화

    document.getElementById('generate-btn').addEventListener('click', function() {
        // 조건 입력값을 가져옴
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

        // CSV 파일을 읽고 번호를 생성
        readCSV('../CSV/lotto_number_frequency_combined.csv', function(csvData) {
            const probabilities = calculateProbabilities(csvData, frequencyAll, frequency100, frequency20, frequency5, frequency1);
            let lottoNumbers;
            let maxAttempts = 1000; // 최대 시도 횟수
            let attempts = 0;

            do {
                lottoNumbers = generateLottoNumbers(probabilities);
                attempts++;
                if (attempts >= maxAttempts) {
                    alert('조건에 맞는 번호를 생성할 수 없습니다. 조건을 다시 설정해 주세요.');
                    return;
                }
            } while (!filterNumbers(lottoNumbers, oddEvenChecked, highLowChecked, sumMin, sumMax, consecutiveLimit, rangeLimit));

            // 번호 생성 후 표시하는 코드
            displayNumbers(lottoNumbers);
        });
    });

    // CSV 파일을 읽어오는 함수
    function readCSV(filePath, callback) {
        fetch(filePath)
            .then(response => response.text())
            .then(data => {
                const parsedData = Papa.parse(data, { header: true }).data;
                callback(parsedData);
            });
    }

    // 확률 계산 함수
    function calculateProbabilities(csvData, frequencyAll, frequency100, frequency20, frequency5, frequency1) {
        const probabilities = new Array(45).fill(0);

        csvData.forEach(row => {
            const number = parseInt(row.Number); // 각 행의 번호
            const freqAll = parseFloat(row.FrequencyAll) * frequencyAll;
            const freq100 = parseFloat(row.Frequency100) * frequency100;
            const freq20 = parseFloat(row.Frequency20) * frequency20;
            const freq5 = parseFloat(row.Frequency5) * frequency5;
            const freq1 = parseFloat(row.Frequency1) * frequency1;

            // 각 조건을 모두 더함
            probabilities[number - 1] = freqAll + freq100 + freq20 + freq5 + freq1;
        });

        // 확률로 변환
        const totalSum = probabilities.reduce((a, b) => a + b, 0);
        return probabilities.map(prob => prob / totalSum);
    }

    // 번호 생성 함수
    function generateLottoNumbers(probabilities) {
        const numbers = [];
        while (numbers.length < 6) {
            const rand = Math.random();
            let sum = 0;
            for (let i = 0; i < probabilities.length; i++) {
                sum += probabilities[i];
                if (rand < sum) {
                    if (!numbers.includes(i + 1)) {
                        numbers.push(i + 1);
                    }
                    break;
                }
            }
        }
        return numbers.sort((a, b) => a - b);
    }

    // 조건에 따라 번호 필터링 함수
    function filterNumbers(numbers, oddEvenChecked, highLowChecked, sumMin, sumMax, consecutiveLimit, rangeLimit) {
        let oddCount = numbers.filter(num => num % 2 !== 0).length;
        let evenCount = 6 - oddCount;
        let highCount = numbers.filter(num => num > 23).length;
        let lowCount = 6 - highCount;
        let sum = numbers.reduce((a, b) => a + b, 0);
        let maxConsecutive = getMaxConsecutive(numbers);
        let rangeCounts = getRangeCounts(numbers);

        // 홀짝 체크박스 조건 적용
        if (oddEvenChecked && (oddCount === 0 || oddCount === 6)) {
            return false;
        }

        // 고저 체크박스 조건 적용
        if (highLowChecked && (highCount === 0 || highCount === 6)) {
            return false;
        }

        // 총합 조건 적용
        if (sum < sumMin || sum > sumMax) {
            return false;
        }

        // 연속된 숫자 조건 적용
        if (maxConsecutive > consecutiveLimit) {
            return false;
        }

        // 10단위별 허용된 수 조건 적용
        if (rangeCounts.some(count => count > rangeLimit)) {
            return false;
        }

        return true;
    }

    // 연속된 숫자 최대 개수를 계산하는 함수
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

    // 10단위별 숫자 개수를 계산하는 함수
    function getRangeCounts(numbers) {
        let ranges = [0, 0, 0, 0, 0];
        numbers.forEach(num => {
            if (num <= 10) {
                ranges[0]++;
            } else if (num <= 20) {
                ranges[1]++;
            } else if (num <= 30) {
                ranges[2]++;
            } else if (num <= 40) {
                ranges[3]++;
            } else {
                ranges[4]++;
            }
        });
        return ranges;
    }

    // 번호에 따른 배경색 결정 함수
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

    function displayNumbers(lottoNumbers) {
        // 홀짝 비율 계산
        let oddCount = lottoNumbers.filter(num => num % 2 !== 0).length;
        let evenCount = 6 - oddCount;

        // 고저 비율 계산
        let highCount = lottoNumbers.filter(num => num > 23).length;
        let lowCount = 6 - highCount;

        // 총합 계산
        let sum = lottoNumbers.reduce((a, b) => a + b, 0);

        // 현재 번호를 표시할 컨테이너
        const displayNumbersContainer = document.getElementById('display-numbers');
        const pastNumbersContainer = document.getElementById('numbers-list');

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
        drawLabel.style.width = '70px';
        newCurrentNumbersDiv.appendChild(drawLabel);

        // 생성된 로또 번호를 div 요소에 추가
        lottoNumbers.forEach(num => {
            const numDiv = document.createElement('div');
            numDiv.className = 'number-box';
            numDiv.textContent = num;
            numDiv.style.backgroundColor = getColorForNumber(num);
            newCurrentNumbersDiv.appendChild(numDiv);
        });

        // 정보 표시
        const infoDiv = document.createElement('div');
        infoDiv.className = 'info-row';
        infoDiv.textContent = `홀짝 비율: ${oddCount} : ${evenCount}, 고저 비율: ${highCount} : ${lowCount}, 총합: ${sum}`;
        displayNumbersContainer.insertBefore(infoDiv, displayNumbersContainer.firstChild);
        displayNumbersContainer.insertBefore(newCurrentNumbersDiv, displayNumbersContainer.firstChild);


        // 과거 번호를 "생성된 번호" 영역으로 이동
        if (displayNumbersContainer.children.length > 2) {
            Array.from(displayNumbersContainer.children).slice(2).forEach(child => {
                pastNumbersContainer.appendChild(child);
            });
        }
    }
});

// 번호에 따른 배경색 결정 함수
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
