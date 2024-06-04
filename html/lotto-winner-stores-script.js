// 데이터를 fetch하는 함수
async function fetchData(url) {
    const response = await fetch(url);
    const data = await response.text();
    return data;
}

// CSV 데이터를 파싱하는 함수
function parseCSV(data, hasCoordinates = false) {
    const rows = data.split('\n').slice(1);
    const results = {};

    rows.forEach((row, index) => {
        const columns = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(col => col.replace(/^"|"$/g, '').trim());
        if (hasCoordinates && columns.length !== 6) {
            console.error(`Invalid data at line ${index + 2}: ${row}`);
            console.log('Expected 6 columns, but got:', columns.length, columns);
            return;
        }
        if (!hasCoordinates && columns.length !== 4) {
            console.error(`Invalid data at line ${index + 2}: ${row}`);
            console.log('Expected 4 columns, but got:', columns.length, columns);
            return;
        }

        if (hasCoordinates) {
            const [name, addr, geocoding, lon, lat, note] = columns;
            if (!results[name]) {
                results[name] = { lon: parseFloat(lon), lat: parseFloat(lat) };
            }
        } else {
            const [round, name, category, address] = columns;
            if (!results[name]) {
                results[name] = [];
            }
            results[name].push({ round, name, category, address });
        }
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
        const parsedAddrData = parseCSV(addrData, true);

        // 매칭되는 데이터가 제대로 있는지 확인하기 위한 디버깅 로그 추가
        console.log('Parsed Store Data:', parsedStoreData);
        console.log('Parsed Address Data:', parsedAddrData);

        // 마커를 저장할 레이어 그룹 생성
        const markerLayer = L.layerGroup().addTo(map);

        function updateMarkers() {
            markerLayer.clearLayers();  // 기존 마커 제거
            const bounds = map.getBounds();  // 현재 보이는 범위 가져오기
            const zoom = map.getZoom();  // 현재 확대 수준 가져오기

            if (zoom >= 12) {  // 확대 수준이 12 이상일 때만 마커 표시
                Object.keys(parsedStoreData).forEach(storeName => {
                    const storeDataArray = parsedStoreData[storeName];
                    const addrInfo = parsedAddrData[storeName];

                    if (addrInfo && bounds.contains([addrInfo.lat, addrInfo.lon])) {
                        const coords = [addrInfo.lat, addrInfo.lon];
                        const marker = L.marker(coords).addTo(markerLayer);

                        // 모든 회차와 구분 정보를 하나의 팝업 내용으로 합침
                        const popupContent = `
                            <b>${storeName}</b><br>
                            ${storeDataArray.map(store => `${store.round}회 (${store.category})`).join('<br>`)}
                        `;
                        marker.bindPopup(popupContent);
                    }
                });
            } else {
                markerLayer.clearLayers();  // 확대 수준이 11 이하일 때 모든 마커 제거
            }
        }

        map.on('moveend', updateMarkers);  // 지도 이동/확대가 끝난 후 마커 업데이트
        updateMarkers();  // 초기 마커 설정
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
