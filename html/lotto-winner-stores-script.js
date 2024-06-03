// 데이터를 fetch하는 함수
async function fetchData(url) {
    const response = await fetch(url);
    const data = await response.text();
    return data;
}

// CSV 데이터를 파싱하는 함수
function parseCSV(data) {
    const rows = data.split('\n').slice(1);
    const results = {};

    rows.forEach((row, index) => {
        const columns = row.split(',');
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

// 주소 데이터를 파싱하는 함수 (주소 파일 전용)
function parseAddrCSV(data) {
    const rows = data.split('\n').slice(1);
    const results = {};

    rows.forEach((row, index) => {
        const columns = row.split(',');
        if (columns.length !== 3) {
            console.error(`Invalid data at line ${index + 2}: ${row}`);
            return;
        }

        const [name, lon, lat] = columns.map(column => column.trim());

        if (!lon || !lat || isNaN(lon) || isNaN(lat)) {
            console.error(`Invalid coordinates at line ${index + 2}: ${row}`);
            return;
        }

        results[name] = { lon: parseFloat(lon), lat: parseFloat(lat) };
    });

    return results;
}

// Leaflet 지도를 초기화하는 함수
async function initMap(position) {
    const { latitude, longitude } = position.coords; // 현재 위치의 위도와 경도 가져오기

    // 현재 위치를 중심으로 지도 초기화
    const map = L.map('map').setView([latitude, longitude], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // 주소 데이터와 상호명 데이터를 fetch
    try {
        const [storeData, addrData] = await Promise.all([
            fetchData('../CSV/lottowinnerstores.csv'),
            fetchData('../CSV/lottowinnerstores_addr.csv')
        ]);

        const parsedStoreData = parseCSV(storeData);
        const parsedAddrData = parseAddrCSV(addrData);
        const allStores = Object.values(parsedStoreData).flat();

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
            const addrInfo = parsedAddrData[store.name];
            if (addrInfo) {
                const coords = [addrInfo.lat, addrInfo.lon];
                const marker = L.marker(coords).addTo(map);

                const popupContent = `
                    <b>${store.name}</b><br>
                    ${store.details.map(detail => `${detail.round}회(${detail.category})`).join('<br>')}
                `;
                marker.bindPopup(popupContent);
            } else {
                console.error(`No coordinates found for store: ${store.name}`);
            }
        }
    } catch (error) {
        console.error('Error fetching or processing data:', error);
    }
}

// window.onload 이벤트 핸들러
window.onload = function() {
    // 사용자의 현재 위치를 가져오는 함수
    navigator.geolocation.getCurrentPosition(initMap, error => {
        console.error('Error fetching location:', error);
        // 위치를 가져오지 못했을 때 기본 위치로 지도 초기화
        initMap({ coords: { latitude: 37.5665, longitude: 126.9780 } });
    });

    fetchData('../CSV/lottowinnerstores.csv').then(data => {
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
