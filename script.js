document.addEventListener('DOMContentLoaded', function() {
    const generateBtn = document.getElementById('generate');
    if (generateBtn) {
        generateBtn.addEventListener('click', function() {
            console.log('번호 생성 버튼 클릭됨');
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

            if (numbersContainer.firstChild) {
                numbersContainer.insertBefore(newNumbersDiv, numbersContainer.firstChild);
            } else {
                numbersContainer.appendChild(newNumbersDiv);
            }
        });
    } else {
        console.error('번호 생성 버튼을 찾을 수 없습니다');
    }
});
