// 데이터를 fetch하는 함수
async function fetchData() {
    const response = await fetch('https://raw.githubusercontent.com/ablanksheet/lottonumber/main/lottowinnerstores.csv');
    const data = await response.text();
    return data;
}
