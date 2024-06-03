// 데이터를 fetch하는 함수
async function fetchData() {
    const response = await fetch('lottowinnerstores.csv');
    const data = await response.text();
    return data;
}

// CSV 데이터를 파싱하는 함수
function parseCSV(data) {
    const rows = data.split('\n').slice(1);
    const results = {};

    rows.forEach((row, index) => {
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

// 주소 좌표 데이터를 fetch하는 함수
async function fetchAddrData() {
    const response = await fetch('lottowinnerstores_addr.csv');
    const data = await response.text();
    return data;
}

// 주소 좌표 데이터를 파싱하는 함수
function parseAddrCSV(data) {
    const rows = data.split('\n').slice(1);
    const addrData = {};

    rows.forEach(row => {
        const [name, lon, lat] = row.split(',').map(column => column.trim());
        addrData[name] = { lon: parseFloat(lon), lat: parseFloat(lat) };
    });

    return addrData;
}

// Leaflet 지도를 초기화하는 함수
async function initMap(position) {
    const { latitude, longitude } = position.coords; // 현재 위치의 위도와 경도 가져오기

    // 현재 위치를 중심으로 지도 초기화
    const map = L.map('map').setView([latitude, longitude], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // 데이터 fetch 및 파싱
    const [storeData, addrDataText] = await Promise.all([fetchData(), fetchAddrData()]);
    const parsedData = parseCSV(storeData);
    const addrData = parseAddrCSV(addrDataText);
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

    // 상호명과 좌표 데이터를 이용하여 마커 추가
    Object.values(uniqueStores).forEach(store => {
        const coords = addrData[store.name];
        if (coords) {
            const marker = L.marker([coords.lat, coords.lon]).addTo(map);
            const popupContent = `
                <b>${store.name}</b><br>
                ${store.details.map(detail => `${detail.round}회(${detail.category})`).join('<br>')}
            `;
            marker.bindPopup(popupContent);
        } else {
            console.error(`Coordinates not found for store: ${store.name}`);
        }
    });
}

// window.onload 이벤트 핸들러
window.onload = function() {
    navigator.geolocation.getCurrentPosition(initMap, error => {
        console.error('Error fetching location:', error);
        initMap({ coords: { latitude: 37.5665, longitude: 126.9780 } }); // 기본 위치 서울
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
