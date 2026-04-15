import zipfile
import xml.etree.ElementTree as ET

def read_docx(p):
    try:
        with zipfile.ZipFile(p) as d:
            t = ET.XML(d.read('word/document.xml'))
            return ''.join([n.text for n in t.iterfind('.//w:t', {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}) if n.text])
    except Exception as e:
        return str(e)

print('--- 13秒标准模版 ---')
print(read_docx('13秒标准模版.docx'))
print('--- 主题文案 ---')
print(read_docx('主题文案.docx'))
print('--- 新文案 ---')
print(read_docx('新文案.docx'))
