document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('generate').addEventListener('click', function() {
        let lottoNumbers = new Set();
        while (lottoNumbers.size < 6) {
            lottoNumbers.add(Math.floor(Math.random() * 45) + 1);
        }
        const numbersContainer = document.getElementById('numbers');
        const newNumbersDiv = document.createElement('div');
        newNumbersDiv.className = 'numbers-row'; // 새로운 번호 세트를 위한 div 생성
        newNumbersDiv.textContent = Array.from(lottoNumbers).join(', '); // 번호 추가
        numbersContainer.appendChild(newNumbersDiv); // 번호 세트를 numbersContainer에 추가
    });
});
