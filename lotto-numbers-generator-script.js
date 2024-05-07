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
        drawLabel.style.width = '70px';
        newCurrentNumbersDiv.appendChild(drawLabel);

        Array.from(lottoNumbers).forEach(num => {
            const numDiv = document.createElement('div');
            numDiv.className = 'number-box';
            numDiv.textContent = num;
            numDiv.style.backgroundColor = getColorForNumber(num);
            newCurrentNumbersDiv.appendChild(numDiv);
        });

        // 새로운 번호를 현재 번호 영역에 표시
        displayNumbersContainer.insertBefore(newCurrentNumbersDiv, displayNumbersContainer.firstChild);

        // 과거 번호를 "생성된 번호" 영역으로 이동
        if (displayNumbersContainer.children.length > 1) { // 첫 번째 이외의 요소가 있으면 이동
            Array.from(displayNumbersContainer.children).slice(1).forEach(child => {
                pastNumbersContainer.appendChild(child);
            });
        }

     
        
        // 로또 번호를 화면에 표시하는 함수입니다.
        function displayLottoNumbers(numbers) {
            // HTML에서 로또 번호를 표시할 요소를 가져옵니다.
            const container = document.getElementById('numbers-list');
            // 기존에 표시된 내용을 초기화합니다.
            container.innerHTML = '';

            // 가져온 로또 번호 배열을 순회하면서 화면에 표시합니다.
            numbers.forEach((week, index) => {
                // 각 회차의 번호를 표시할 div 요소를 생성합니다.
                const numberDiv = document.createElement('div');
                numberDiv.className = 'week';
                // 회차와 번호를 div 내부에 HTML로 설정합니다.
                numberDiv.innerHTML = `<strong>${index + 1}회차:</strong> ${week.join(', ')}`;
                // 생성한 div를 페이지에 추가합니다.
                container.appendChild(numberDiv);
            });
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
