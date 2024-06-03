import pandas as pd

# 현재 디렉토리에 있는 CSV 파일 로드
file_path = 'lottowinnerstores.csv'
df = pd.read_csv(file_path)

# 상호명, 소재지 열 분리
name_address_df = df[['상호명', '소재지']]

# 엑셀 파일로 저장
excel_file_path = 'lottowinnerstores_name_address_corrected.xlsx'
name_address_df.to_excel(excel_file_path, index=False)

print(f"엑셀 파일이 저장되었습니다: {excel_file_path}")
