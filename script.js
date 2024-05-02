document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('generate').addEventListener('click', function() {
        let lottoNumbers = new Set();
        while (lottoNumbers.size < 6) {
            lottoNumbers.add(Math.floor(Math.random() * 45) + 1);
        }
        document.getElementById('numbers').innerText = '생성된 번호: ' + Array.from(lottoNumbers).join(', ');
    });
});
