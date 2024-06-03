import pandas as pd

# 엑셀 파일 로드
file_path = 'lottowinnerstores_name_address_corrected.xlsx'
df = pd.read_excel(file_path)

# 상호명이 중복되는 줄은 마지막 줄을 제외하고 삭제
deduped_df = df.drop_duplicates(subset=['상호명'], keep='last')

# 엑셀 파일로 저장
excel_file_path = 'lottowinnerstores_name_address_deduped_final.xlsx'
deduped_df.to_excel(excel_file_path, index=False)

excel_file_path
