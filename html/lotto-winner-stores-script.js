// 데이터를 fetch하는 함수
async function fetchData() {
    const response = await fetch('../CSV/lottowinnerstores.csv');
    const data = await response.text();
    return data;
}

// CSV 데이터를 파싱하는 함수
function parseCSV(data) {
    const rows = data.split('\n').slice(1);
    const results = {};

    rows.forEach((row, index) => {
        // 쉼표와 쌍따옴표를 고려한 정규 표현식으로 CSV 파싱
        const regex = /"([^"]*)"|([^,]+)/g;
        const columns = [];
        let match;
        while ((match = regex.exec(row)) !== null) {
            columns.push(match[1] || match[2]);
        }

        if (columns.length !== 4) {
            console.error(`Invalid data at line ${index + 2}: ${row}`);
            return;
        }

        const [round, name, category, address] = columns.map(column => column.trim());

        if (!address || !address.trim()) {
            console.error(`Invalid address at line ${index + 2}: ${row}`);
            return;
        }

        if (!results[round]) {
            results[round] = [];
        }

        results[round].push({ round, name, category, address });
    });

    return results;
}

// 비동기적으로 지연을 추가하는 함수
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Leaflet 지도를 초기화하는 함수
async function initMap(position) {
    const { latitude, longitude } = position.coords; // 현재 위치의 위도와 경도 가져오기

    // 현재 위치를 중심으로 지도 초기화
    const map = L.map('map').setView([latitude, longitude], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    fetchData().then(async data => {
        const parsedData = parseCSV(data);
        const allStores = Object.values(parsedData).flat();

        const uniqueStores = {};

        allStores.forEach(store => {
            const key = `${store.name}-${store.address}`;
            if (!uniqueStores[key]) {
                uniqueStores[key] = { ...store, details: [{ round: store.round, category: store.category }] };
            } else {
                uniqueStores[key].details.push({ round: store.round, category: store.category });
            }
        });

        for (const store of Object.values(uniqueStores)) {
            console.log(`Geocoding address: ${store.address}`);
            await delay(50); // 50ms 지연 추가
            geocodeAddress(store.address, result => {
                if (result) {
                    const coords = [result.lat, result.lng];
                    const marker = L.marker(coords).addTo(map);

                    const popupContent = `
                        <b>${store.name}</b><br>
                        ${store.details.map(detail => `${detail.round}회(${detail.category})`).join('<br>')}
                    `;
                    marker.bindPopup(popupContent);
                }
            });
        }
    }).catch(error => console.error('Error fetching data:', error));
}

// 주소를 OpenStreetMap을 통해 지오코딩하는 함수
function geocodeAddress(address, callback) {
    const query = encodeURIComponent(address.trim());
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}`;

    fetch(url)
        .then(response => response.json())
        .then(results => {
            if (results.length > 0) {
                callback(results[0]);
            } else {
                console.error(`No results found for address: ${address}`);
            }
        })
        .catch(error => console.error('Error fetching geocode:', error));
}

// window.onload 이벤트 핸들러
window.onload = function() {
    // 사용자의 현재 위치를 가져오는 함수
    navigator.geolocation.getCurrentPosition(initMap, error => {
        console.error('Error fetching location:', error);
        // 위치를 가져오지 못했을 때 기본 위치로 지도 초기화
        initMap({ coords: { latitude: 37.5665, longitude: 126.9780 } });
    });

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
    }).catch(error => console.error('Error processing data:', error));
};

// 당첨자 목록을 표시하는 함수
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
