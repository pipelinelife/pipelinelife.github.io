# 파이프인생 로또

동행복권 공식 데이터로 당첨번호, 1등 판매점, 당첨금과 번호별 기록을 제공하는 정적 웹사이트입니다. 별도의 유료 서버나 브라우저에 노출되는 API 키 없이 GitHub Pages에서 운영합니다.

## 운영 전환

1. 이 변경안을 `main`에 적용합니다.
2. Settings → Pages → Build and deployment → Source를 **GitHub Actions**로 설정합니다.
3. Actions의 `Update official Lotto data`를 수동 실행해 수집·배포 성공을 확인합니다.
4. 그다음 `lotto_CSV`의 유지보수 PR을 적용합니다. 기존 예약 작업을 제거하고 수동 유지보수만 남겨 오래된 데이터가 사이트에 덮어써지는 것을 막습니다.
5. 기존 수집 코드에 직접 포함돼 있던 접근 토큰을 폐기합니다. 새 자동화는 해당 토큰을 필요로 하지 않습니다. 과거 Git 기록에는 토큰이 남으므로 현재 코드 삭제만으로 폐기된 것은 아닙니다.

자동 수집: 토요일 21:17~23:47 KST에 30분 간격으로 시도합니다. 누락되면 일요일 00:23~23:23 KST에 매시간, 월~금 13:23 KST에 추가 확인합니다. 이미 최신 회차이면 공식 사이트를 재요청하지 않습니다. 수동 실행은 최신 회차도 다시 검증합니다. 모든 실행은 현재 한국 시간에 필요한 회차까지 갱신됐는지 확인하며, 실패 시 기존 데이터를 유지하고 실행을 실패 처리합니다.

GitHub 예약 실행은 부하에 따라 지연되거나 누락될 수 있으므로 정확한 시각의 발행을 보장하지 않습니다. Actions 실행 요약의 `Published round`와 `expected round`로 최신 상태를 확인할 수 있습니다. 토요일 밤 실행 자체가 없으면 `Update official Lotto data`를 수동 실행할 수 있으며, 다음 날과 평일 확인도 누락 회차를 보충합니다. 예약 동작 안내: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule .

번호 → 판매점·당첨금 → 통계가 같은 작업에서 계산됩니다. 프런트엔드는 회차가 일치하는 `CSV/snapshot.json`을 읽습니다. 기존 CSV 형식도 유지합니다. 같은 판매점의 복수 당첨 게임은 삭제하지 않습니다. 최신 회차 지도에는 공식 좌표를 사용하며 상호명만으로 과거 좌표를 매칭하지 않습니다.

공식 출처: https://www.dhlottery.co.kr/lt645/result 및 https://www.dhlottery.co.kr/wnprchsplcsrch/home . 조회 경로는 공식 사이트 내부 경로이며 버전이 보장되는 공개 API가 아니므로 변경 시 검증 단계가 실패하도록 설계했습니다.

## 로컬 실행 및 검증

## 번호 생성 조건과 분석

기존 생성기의 전체·최근 100/20/5/1회 출현 빈도 계수와 세 가지 프리셋, 홀짝·고저 극단 제외, 합계 81~200 기본 범위, 연속 번호 최대 3개, 구간별 최대 3개를 복원했습니다. 고번호는 기존과 같이 24~45, 저번호는 1~23입니다. 추가로 홀짝·고저 비율을 직접 지정하거나 균등 추출로 전환할 수 있습니다.

생성된 모든 게임에 고정·제외와 설정 조건을 적용하며 결과에 실제 비율·합계·연속 개수 및 적용 조건을 표시합니다. 설정 충돌이나 제한된 시도 횟수 안에 조합을 찾지 못하면 오류를 안내하고 이전 결과를 유지합니다. 조건을 무시한 결과나 일부 게임만을 성공 결과로 표시하지 않습니다. 빈도 점수의 음수는 0으로 처리하여 음수 확률·무한 추출을 방지합니다. 표시한 가중치 비중은 첫 무작위 선택 기준이며 당첨 확률이 아닙니다.

역대 번호의 회차별 비율·합계와 분석 기간별 번호 출현 횟수/비율, 홀짝·고저·합계 분포를 제공합니다. 생성 번호는 영구 저장하지 않고 역대 1·2등 일치만 표시합니다.

조건 엔진 검증: `node --test tools/test_generator_conditions.cjs tools/test_history_matches.cjs tools/test_store_map.cjs`

## 로컬 실행

`python -m http.server 8765` 실행 후 http://localhost:8765 를 엽니다. HTML 파일을 직접 열면 데이터 요청이 제한될 수 있습니다.

수집: `python tools/update_data.py`

검증: `python -m unittest discover -s tools -p 'test_*.py'`, `python tools/check_snapshot.py`, `node --check script.js`

## 도메인 연결

도메인을 구매한 뒤 Settings → Pages → Custom domain에 도메인을 입력합니다. DNS는 GitHub Pages 공식 안내대로 설정하고 도메인 소유권을 검증한 뒤 HTTPS를 적용합니다. 도메인이 결정되면 `robots.txt`, `sitemap.xml`, OG 이미지 주소도 함께 변경합니다. 미정인 도메인의 CNAME 파일은 만들지 않습니다.

안내: https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site

## 광고·분석

기존 Google Tag Manager, AdSense 게시자 ID와 Kakao 광고 단위를 유지합니다. Kakao 광고는 주요 결과 아래 하단에 배치합니다. 도메인이 정해지면 게시자 계정의 사이트 등록 상태도 확인하세요.

기존 `/html/` 주소는 새 화면으로 연결됩니다. 번호 통계는 과거 기록이며 번호 생성이 당첨 확률을 높이지 않습니다.
