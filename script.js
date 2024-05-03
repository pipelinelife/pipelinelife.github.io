document.addEventListener('DOMContentLoaded', function() {
    // "generate" ID를 가진 버튼에 이벤트 리스너를 추가합니다.
    document.getElementById('generate').addEventListener('click', function() {
        console.log('버튼이 클릭되었습니다.');  // 콘솔에 클릭 로그를 출력합니다.

        // 로또 번호를 저장할 새로운 Set을 생성합니다.
        let lottoNumbers = new Set();
        // Set에 로또 번호가 6개가 될 때까지 번호를 추가합니다.
        while (lottoNumbers.size < 6) {
            lottoNumbers.add(Math.floor(Math.random() * 45) + 1);
        }

        // 번호를 화면에 표시할 div를 생성합니다.
        const numbersContainer = document.getElementById('numbers');
        const newNumbersDiv = document.createElement('div');
        newNumbersDiv.className = 'numbers-row';
        newNumbersDiv.textContent = Array.from(lottoNumbers).join(', ');

        // 생성된 번호를 numbersContainer의 가장 위에 추가합니다.
        if (numbersContainer.firstChild) {
            numbersContainer.insertBefore(newNumbersDiv, numbersContainer.firstChild);
        } else {
            numbersContainer.appendChild(newNumbersDiv);
        }
    });
});
