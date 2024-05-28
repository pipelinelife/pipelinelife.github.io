// 데이터를 fetch하는 함수
async function fetchData() {
    const response = await fetch('https://raw.githubusercontent.com/ablanksheet/lottonumber/main/lottowinnerstores.csv');
    const data = await response.text();
    return data;
}

// CSV 데이터를 파싱하는 함수
function parseCSV(data) {
    const rows = data.split('\n').slice(1);
    const results = {};

    rows.forEach(row => {
        const [round, name, category, address] = row.split(',');

        if (!results[round]) {
            results[round] = [];
        }

        results[round].push({ category, name, address });
    });

    return results;
}

// Leaflet 지도를 초기화하는 함수
function initMap() {
    const map = L.map('map').setView([37.5665, 126.9780], 8);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    fetchData().then(data => {
        const parsedData = parseCSV(data);
        const latestRound = Object.keys(parsedData).sort((a, b) => b - a)[0];
        const stores = parsedData[latestRound];

        stores.forEach(store => {
            const geocoder = new L.Control.Geocoder.Nominatim();

            geocoder.geocode(store.address, function(results) {
                const result = results[0];
                if (result) {
                    const coords = result.center;
                    const marker = L.marker([coords.lat, coords.lng]).addTo(map);

                    marker.bindPopup(`<b>${store.name}</b><br>${store.category}<br>${store.address}`);
                }
            });
        });
    });
}

window.onload = function() {
    initMap();
    fetchData().then(data => {
        const parsedData = parseCSV(data);
        const rounds = Object.keys(parsedData).sort((a, b) => b - a);
        const roundSelect = document.getElementById('round-select');

        rounds.forEach(round => {
            const option = document.createElement('option');
            option.value = round;
            option.textContent = round;
            roundSelect.appendChild(option);
        });

        document.getElementById('round-go').addEventListener('click', function() {
            const selectedRound = roundSelect.value;
            displayLottoWinners(parsedData[selectedRound], selectedRound);
        });

        displayLottoWinners(parsedData[rounds[0]], rounds[0]);
    });
};

function displayLottoWinners(stores, round) {
    const container = document.getElementById('lotto-winner-container');
    container.innerHTML = '';

    const table = document.createElement('table');
    table.innerHTML = `
        <thead>
            <tr>
                <th>구분</th>
                <th>상호명</th>
                <th>소재지</th>
            </tr>
        </thead>
        <tbody>
            ${stores.map(store => `
                <tr>
                    <td class="category">${store.category}</td>
                    <td class="name">${store.name}</td>
                    <td class="address">${store.address}</td>
                </tr>
            `).join('')}
        </tbody>
    `;
    container.appendChild(table);
}
