document.querySelector('.generate-btn').addEventListener('click', function() {
    let numbers = [];
    while(numbers.length < 6) {
        let r = Math.floor(Math.random() * 45) + 1;
        if(numbers.indexOf(r) === -1) numbers.push(r);
    }
    const display = document.querySelector('.number-display');
    display.innerHTML = '';  // Clear previous numbers
    numbers.forEach(num => {
        let div = document.createElement('div');
        div.className = 'number-box';
        div.textContent = num;
        display.appendChild(div);
    });
});
