document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('generate').addEventListener('click', function() {
        console.log('버튼이 클릭되었습니다.'); // 콘솔에 클릭 로그를 출력합니다.

        let lottoNumbers = new Set();
        while (lottoNumbers.size < 6) {
            lottoNumbers.add(Math.floor(Math.random() * 45) + 1);
        }
        const numbersContainer = document.getElementById('numbers');
        const newNumbersDiv = document.createElement('div');
        newNumbersDiv.className = 'numbers-row';

        Array.from(lottoNumbers).forEach(num => {
            const numDiv = document.createElement('div');
            numDiv.className = 'number-box';
            numDiv.textContent = num;
            newNumbersDiv.appendChild(numDiv);
        });

        // 최신 번호를 페이지의 맨 위에 추가합니다.
        if (numbersContainer.firstChild) {
            numbersContainer.insertBefore(newNumbersDiv, numbersContainer.firstChild);
        } else {
            numbersContainer.appendChild(newNumbersDiv);
        }
    });
});
