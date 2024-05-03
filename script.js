document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('generate').addEventListener('click', function() {
        let lottoNumbers = new Set();
        while (lottoNumbers.size < 6) {
            lottoNumbers.add(Math.floor(Math.random() * 45) + 1);
        }
        const currentNumbersContainer = document.getElementById('currentNumbers');
        const pastNumbersContainer = document.getElementById('pastNumbers');

        // 현재 번호를 새로운 div로 생성
        const newCurrentNumbersDiv = document.createElement('div');
        newCurrentNumbersDiv.className = 'numbers-row';
        Array.from(lottoNumbers).forEach(num => {
            const numDiv = document.createElement('div');
            numDiv.className = 'number-box';
            numDiv.textContent = num;
            newCurrentNumbersDiv.appendChild(numDiv);
        });

        // 이전 번호를 "생성된 번호" 영역으로 이동
        if (currentNumbersContainer.firstChild) {
            pastNumbersContainer.insertBefore(currentNumbersContainer.firstChild, pastNumbersContainer.firstChild);
        }

        // 새로운 번호를 현재 번호 영역에 표시
        currentNumbersContainer.appendChild(newCurrentNumbersDiv);
    });
});
