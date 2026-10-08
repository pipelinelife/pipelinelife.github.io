import unittest
from html.parser import HTMLParser
from pathlib import Path
import json
import xml.etree.ElementTree as ET

ROOT=Path(__file__).resolve().parents[1]
class Parser(HTMLParser):
    def __init__(self):
        super().__init__();self.tags=[]
    def handle_starttag(self,tag,attrs):self.tags.append((tag,dict(attrs)))

class SearchPageTests(unittest.TestCase):
    def test_generator_has_static_content_and_unique_metadata(self):
        html=(ROOT/'generator/index.html').read_text(encoding='utf-8')
        parser=Parser();parser.feed(html)
        self.assertEqual(sum(tag=='h1' for tag,_ in parser.tags),1)
        self.assertIn('<h1>로또생성기',html)
        self.assertIn('로또 번호 생성 방법',html)
        self.assertIn('조건을 설정하면 당첨 확률이 올라가나요?',html)
        sections={attrs['id']:attrs for tag,attrs in parser.tags if tag=='section' and 'id' in attrs}
        self.assertNotIn('hidden',sections['generator']);self.assertIn('hidden',sections['home'])
        self.assertIn(('link',{'rel':'canonical','href':'https://pipelinelife.github.io/generator/'}),parser.tags)
        ids=[attrs['id'] for _,attrs in parser.tags if 'id' in attrs]
        self.assertEqual(len(ids),len(set(ids)))
        for key in ['odd-min','odd-max','high-min','high-max','generate','condition-preview']:self.assertIn(key,ids)
        for tag,attrs in parser.tags:
            if tag=='script' and 'src' in attrs and '://' not in attrs['src']:self.assertTrue(attrs['src'].startswith('/'))
            if tag=='a':self.assertNotEqual(attrs.get('href'),'#generator')
        schema=html.split('<script type="application/ld+json">')[1].split('</script>')[0]
        self.assertEqual(json.loads(schema)['url'],'https://pipelinelife.github.io/generator/')

    def test_sitemap_contains_only_real_canonical_entry_points(self):
        urls=[node.text for node in ET.parse(ROOT/'sitemap.xml').findall('.//{*}loc')]
        self.assertEqual(urls,['https://pipelinelife.github.io/','https://pipelinelife.github.io/generator/'])
        self.assertIn('href="/generator/"',(ROOT/'index.html').read_text(encoding='utf-8'))

    def test_build_is_repeatable(self):
        from build_search_pages import build
        before=(ROOT/'generator/index.html').read_text(encoding='utf-8')
        build()
        self.assertEqual(before,(ROOT/'generator/index.html').read_text(encoding='utf-8'))

if __name__=='__main__':unittest.main()
