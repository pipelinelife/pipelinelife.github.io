document.getElementById('generate').addEventListener('click', function() {
    const numbers = Array.from({length: 6}, () => Math.floor(Math.random() * 45) + 1);
    document.getElementById('numbers').innerText = '생성된 번호: ' + numbers.join(', ');
});
