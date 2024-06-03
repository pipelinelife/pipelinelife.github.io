document.addEventListener('DOMContentLoaded', function () {
    const numberCountsContainer = document.getElementById('number-counts');
    const oddEvenRatiosContainer = document.getElementById('odd-even-ratios');
    const highLowRatiosContainer = document.getElementById('high-low-ratios');
    const sumRangesContainer = document.getElementById('sum-ranges');
    const csvUrl = '../CSV/lottoRes.csv'; // GitHub Raw URL

    fetch(csvUrl)
        .then(response => response.text())
        .then(data => {
            const rows = data.trim().split('\n'); // 모든 줄을 처리
            const last020Rows = rows.slice(-20); // 마지막 20개의 데이터만 가져옴
            const numbers = [];
            const oddEvenRatios = {};
            const highLowRatios = {};
            const sumRanges = {
                '21 ~ 40': 0, '41 ~ 60': 0, '61 ~ 80': 0, '81 ~ 100': 0,
                '101 ~ 120': 0, '121 ~ 140': 0, '141 ~ 160': 0, '161 ~ 180': 0,
                '181 ~ 200': 0, '201 ~ 220': 0, '221 ~ 240': 0, '241 ~ 260': 0
            };

            last020Rows.forEach(row => {
                const cols = row.split(',');
                const nums = cols.slice(2, 8).map(Number); // 필요한 번호만 추출
                numbers.push(...nums);

                // 홀짝 비율
                const oddCount = nums.filter(n => n % 2 !== 0).length;
                const evenCount = nums.length - oddCount;
                const oddEvenKey = `홀 ${oddCount} : 짝 ${evenCount}`;
                oddEvenRatios[oddEvenKey] = (oddEvenRatios[oddEvenKey] || 0) + 1;

                // 고저 비율
                const highCount = nums.filter(n => n > 23).length;
                const lowCount = nums.length - highCount;
                const highLowKey = `고 ${highCount} : 저 ${lowCount}`;
                highLowRatios[highLowKey] = (highLowRatios[highLowKey] || 0) + 1;

                // 번호 합
                const sum = nums.reduce((a, b) => a + b, 0);
                if (sum >= 21 && sum <= 40) sumRanges['21 ~ 40'] += 1;
                else if (sum >= 41 && sum <= 60) sumRanges['41 ~ 60'] += 1;
                else if (sum >= 61 && sum <= 80) sumRanges['61 ~ 80'] += 1;
                else if (sum >= 81 && sum <= 100) sumRanges['81 ~ 100'] += 1;
                else if (sum >= 101 && sum <= 120) sumRanges['101 ~ 120'] += 1;
                else if (sum >= 121 && sum <= 140) sumRanges['121 ~ 140'] += 1;
                else if (sum >= 141 && sum <= 160) sumRanges['141 ~ 160'] += 1;
                else if (sum >= 161 && sum <= 180) sumRanges['161 ~ 180'] += 1;
                else if (sum >= 181 && sum <= 200) sumRanges['181 ~ 200'] += 1;
                else if (sum >= 201 && sum <= 220) sumRanges['201 ~ 220'] += 1;
                else if (sum >= 221 && sum <= 240) sumRanges['221 ~ 240'] += 1;
                else if (sum >= 241 && sum <= 260) sumRanges['241 ~ 260'] += 1;
            });

            const numberCounts = numbers.reduce((acc, num) => {
                acc[num] = (acc[num] || 0) + 1;
                return acc;
            }, {});

            const totalNumbers = numbers.length;
            const maxCount = Math.max(...Object.values(numberCounts)); // 최대 출현 횟수
            const minCount = Math.min(...Object.values(numberCounts)); // 최소 출현 횟수
            const maxBarWidth = 150; // 막대의 최대 너비 설정

            // 색상 계산 함수 (출현 비율 배경)
            function getBackgroundColor(value, max, min) {
                const minColor = [255, 255, 255]; // 흰색 (RGB)
                const maxColor = [255, 0, 0]; // 빨간색 (RGB)
                const ratio = (value - min) / (max - min);
                const color = minColor.map((min, i) => Math.round(min + ratio * (maxColor[i] - min)));
                return `rgb(${color.join(',')})`;
            }

            let numberCountsHTML = `
                <table class="analysis-table">
                    <tr>
                        <th class="first-child">번호</th>
                        <th class="count-column">출현 횟수</th>
                        <th class="last-child">출현 비율</th>
                    </tr>
            `;
            for (let num = 1; num <= 45; num++) { // 번호를 1에서부터 45까지 표시해줌
                const count = numberCounts[num] || 0;
                const percentage = ((count / totalNumbers) * 100).toFixed(2);
                const barWidth = (count / maxCount) * maxBarWidth; // 막대의 너비를 최대 너비에 비례하여 설정
                const backgroundColor = getBackgroundColor(count, maxCount, minCount); // 출현 비율 배경색 설정
                numberCountsHTML += `
                    <tr>
                        <td class="first-child">${num}</td>
                        <td class="count-column">
                            <div style="display: flex; align-items: center;">
                                <div class="bar" style="width: ${barWidth}px; height: 20px; background-color: orange;"></div>
                                <span style="margin-left: 5px;">${count}</span>
                            </div>
                        </td>
                        <td class="last-child" style="background-color: ${backgroundColor};">${percentage}%</td>
                    </tr>
                `;
            }
            numberCountsHTML += '</table>';

            // 홀짝 비율 테이블
            const oddEvenOrder = ['홀 6 : 짝 0', '홀 5 : 짝 1', '홀 4 : 짝 2', '홀 3 : 짝 3', '홀 2 : 짝 4', '홀 1 : 짝 5', '홀 0 : 짝 6'];
            const totalOddEven = Object.values(oddEvenRatios).reduce((acc, count) => acc + count, 0);
            const maxOddEvenCount = Math.max(...Object.values(oddEvenRatios));
            const minOddEvenCount = Math.min(...Object.values(oddEvenRatios));
            let oddEvenRatiosHTML = `
                <table class="analysis-table">
                    <tr>
                        <th class="first-child">홀짝 비율</th>
                        <th class="count-column">출현 횟수</th>
                        <th class="last-child">출현 비율</th>
                    </tr>
            `;
            oddEvenOrder.forEach(key => {
                const count = oddEvenRatios[key] || 0;
                const percentage = ((count / totalOddEven) * 100).toFixed(2);
                const barWidth = (count / maxOddEvenCount) * maxBarWidth;
                const backgroundColor = getBackgroundColor(count, maxOddEvenCount, minOddEvenCount);
                oddEvenRatiosHTML += `
                    <tr>
                        <td class="first-child">${key}</td>
                        <td class="count-column">
                            <div style="display: flex; align-items: center;">
                                <div class="bar" style="width: ${barWidth}px; height: 20px; background-color: orange;"></div>
                                <span style="margin-left: 5px;">${count}</span>
                            </div>
                        </td>
                        <td class="last-child" style="background-color: ${backgroundColor};">${percentage}%</td>
                    </tr>
                `;
            });
            oddEvenRatiosHTML += '</table>';

            // 고저 비율 테이블
            const highLowOrder = ['고 6 : 저 0', '고 5 : 저 1', '고 4 : 저 2', '고 3 : 저 3', '고 2 : 저 4', '고 1 : 저 5', '고 0 : 저 6'];
            const totalHighLow = Object.values(highLowRatios).reduce((acc, count) => acc + count, 0);
            const maxHighLowCount = Math.max(...Object.values(highLowRatios));
            const minHighLowCount = Math.min(...Object.values(highLowRatios));
            let highLowRatiosHTML = `
                <table class="analysis-table">
                    <tr>
                        <th class="first-child">고저 비율</th>
                        <th class="count-column">출현 횟수</th>
                        <th class="last-child">출현 비율</th>
                    </tr>
            `;
            highLowOrder.forEach(key => {
                const count = highLowRatios[key] || 0;
                const percentage = ((count / totalHighLow) * 100).toFixed(2);
                const barWidth = (count / maxHighLowCount) * maxBarWidth;
                const backgroundColor = getBackgroundColor(count, maxHighLowCount, minHighLowCount);
                highLowRatiosHTML += `
                    <tr>
                        <td class="first-child">${key}</td>
                        <td class="count-column">
                            <div style="display: flex; align-items: center;">
                                <div class="bar" style="width: ${barWidth}px; height: 20px; background-color: orange;"></div>
                                <span style="margin-left: 5px;">${count}</span>
                            </div>
                        </td>
                        <td class="last-child" style="background-color: ${backgroundColor};">${percentage}%</td>
                    </tr>
                `;
            });
            highLowRatiosHTML += '</table>';

            // 번호의 합 테이블
            const totalSumRanges = Object.values(sumRanges).reduce((acc, count) => acc + count, 0);
            const maxSumRangeCount = Math.max(...Object.values(sumRanges));
            const minSumRangeCount = Math.min(...Object.values(sumRanges));
            let sumRangesHTML = `
                <table class="analysis-table">
                    <tr>
                        <th class="first-child">번호의 합 범위</th>
                        <th class="count-column">출현 횟수</th>
                        <th class="last-child">출현 비율</th>
                    </tr>
            `;
            for (const [key, count] of Object.entries(sumRanges)) {
                const percentage = ((count / totalSumRanges) * 100).toFixed(2);
                const barWidth = (count / maxSumRangeCount) * maxBarWidth;
                const backgroundColor = getBackgroundColor(count, maxSumRangeCount, minSumRangeCount);
                sumRangesHTML += `
                    <tr>
                        <td class="first-child">${key}</td>
                        <td class="count-column">
                            <div style="display: flex; align-items: center;">
                                <div class="bar" style="width: ${barWidth}px; height: 20px; background-color: orange;"></div>
                                <span style="margin-left: 5px;">${count}</span>
                            </div>
                        </td>
                        <td class="last-child" style="background-color: ${backgroundColor};">${percentage}%</td>
                    </tr>
                `;
            }
            sumRangesHTML += '</table>';

            numberCountsContainer.innerHTML = numberCountsHTML;
            oddEvenRatiosContainer.innerHTML = oddEvenRatiosHTML;
            highLowRatiosContainer.innerHTML = highLowRatiosHTML;
            sumRangesContainer.innerHTML = sumRangesHTML;
        })
        .catch(error => {
            console.error('Error fetching the CSV file:', error);
            numberCountsContainer.innerHTML = '<p>데이터를 가져오는 중 오류가 발생했습니다.</p>';
        });
});
