document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('generate').addEventListener('click', function() {
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

        numbersContainer.appendChild(newNumbersDiv);
    });
});
