"""Build a crawlable generator entry from the shared GitHub Pages HTML."""
from pathlib import Path
import re
import json

ROOT=Path(__file__).resolve().parents[1]
BASE='https://pipelinelife.github.io'

def build():
    source=(ROOT/'index.html').read_text(encoding='utf-8')
    page=source.replace('<body>','<body data-page="generator">')
    page=re.sub(r'<div class="intro">.*?</div></div>(?=<div id="status")','',page,count=1)
    page=page.replace('<section id="home" class="page" aria-label="당첨 결과">','<section id="home" class="page" aria-label="당첨 결과" hidden>')
    page=page.replace('<section id="generator" class="page" hidden>','<section id="generator" class="page">')
    page=page.replace('<h2>나만의 번호 만들기</h2>','<h1>로또생성기 — 조건으로 만드는 로또 번호</h1>')
    title='로또생성기 | 홀짝·고저·합계 조건 번호 생성 - 파이프인생'
    description='무료 로또생성기에서 고정·제외 번호, 홀짝·고저 비율 범위, 번호 합계와 연속 번호 조건을 직접 설정하세요. 로그인 없이 1~10게임을 만들고 역대 1·2등 번호 일치를 확인합니다.'
    page=re.sub(r'<title>.*?</title>',f'<title>{title}</title>',page,count=1)
    page=re.sub(r'<meta name="description" content="[^"]*">',f'<meta name="description" content="{description}">',page,count=1)
    page=re.sub(r'<meta property="og:title" content="[^"]*">',f'<meta property="og:title" content="{title}">',page,count=1)
    page=re.sub(r'<meta property="og:description" content="[^"]*">',f'<meta property="og:description" content="{description}">',page,count=1)
    page=page.replace(f'rel="canonical" href="{BASE}/"',f'rel="canonical" href="{BASE}/generator/"').replace(f'property="og:url" content="{BASE}/"',f'property="og:url" content="{BASE}/generator/"')
    for name in ['home','history','stores','analysis','notice']:
        page=page.replace(f'href="#{name}"',f'href="/{"" if name=="home" else "#"+name}"')
    schema={'@context':'https://schema.org','@type':'WebApplication','name':'파이프인생 로또생성기','url':BASE+'/generator/','applicationCategory':'UtilitiesApplication','operatingSystem':'Web browser','description':description,'isAccessibleForFree':True,'inLanguage':'ko'}
    page=page.replace('</head>','<script type="application/ld+json">'+json.dumps(schema,ensure_ascii=False)+'</script></head>')
    output=ROOT/'generator/index.html';output.parent.mkdir(exist_ok=True)
    output.write_text(page,encoding='utf-8')

if __name__=='__main__':build()
