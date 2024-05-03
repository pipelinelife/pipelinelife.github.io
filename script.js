document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('generate').addEventListener('click', function() {
        let lottoNumbers = new Set();
        while (lottoNumbers.size < 6) {
            lottoNumbers.add(Math.floor(Math.random() * 45) + 1);
        }
        const numbersContainer = document.getElementById('numbers');
        const newNumbersDiv = document.createElement('div');
        newNumbersDiv.className = 'numbers-row';
        newNumbersDiv.textContent = Array.from(lottoNumbers).join(', ');

        // numbersContainer의 첫 번째 자식 요소로 새 번호 세트를 추가
        if (numbersContainer.firstChild) {
            numbersContainer.insertBefore(newNumbersDiv, numbersContainer.firstChild);
        } else {
            numbersContainer.appendChild(newNumbersDiv);
        }
    });
});
