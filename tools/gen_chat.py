# 구글 시트(xlsx) → ver2/index.html 문자 대화 생성기
# 사용: python3 tools/gen_chat.py 시트.xlsx ver2/index.html  (openpyxl 필요)
import sys,html,re,datetime as dt
from openpyxl import load_workbook
from openpyxl.cell.rich_text import CellRichText, TextBlock
wb=load_workbook(sys.argv[1],rich_text=True)
ws=wb['30일 기록']; book=wb['오만과 편견']
RED,BLUE='FFFF0000','FF0000FF'
def color(f):
    c=f.color if f else None
    return c.rgb if c is not None and c.type=='rgb' else None
def parts(cell):
    v=cell.value
    if v is None: return []
    if isinstance(v,CellRichText):
        return [(b.text,color(b.font)) if isinstance(b,TextBlock) else (b,color(cell.font)) for b in v]
    return [(str(v),color(cell.font))]
def esc(t): return html.escape(t).replace('\n','<br>')
def render(cell, mark, cls):
    # mark 색 글자만 <span class=cls>로 감쌈 (앞뒤 공백은 밖으로)
    out=''
    for t,c in parts(cell):
        # 앞뒤 공백(그리고 블러 쪽에선 🖕)은 span 밖으로
        edge=r'[\s🖕]*' if cls=='censor' else r'\s*'
        m=re.match(rf'^({edge})(.*?)({edge})$',t,re.S)
        if c==mark and m.group(2):
            out+=esc(m.group(1))+f'<span class="{cls}">{esc(m.group(2))}</span>'+esc(m.group(3))
        else: out+=esc(t)
    return re.sub(r'\s+$','',re.sub(r'^\s+','',out))

# ---------- 오만과 편견 쪽번호 대조 ----------
import difflib
PARTS=[(1,7,184),(2,185,328),(3,329,518)]  # (부, 시작 쪽, 끝 쪽)
def part_of(page):
    for k,lo,hi in PARTS:
        if lo<=page<=hi: return k
    raise ValueError(f'{page}쪽은 부 범위 밖')
norm=lambda t: re.sub(r'[\s“”"\'‘’]','',t)
ENTRIES=[]
for rr in range(2,book.max_row+1):
    for pc,tc in ((1,2),(4,3)):
        pg,tx=book.cell(rr,pc).value,book.cell(rr,tc).value
        if pg is None or not tx: continue
        if isinstance(pg,float): pg=int(pg)
        ENTRIES.append((str(pg),str(tx)))
def find_page(seg):
    ns=norm(seg)
    if not ns: return None
    best=None
    for pg,tx in ENTRIES:
        lines=[norm(l) for l in tx.split('\n')]
        if ns in lines: score=3            # 한 줄과 똑같음
        elif any(l.startswith(ns) for l in lines): score=2  # 줄 첫머리
        elif ns in norm(tx): score=1       # 어딘가에 포함
        elif len(ns)>20 and difflib.SequenceMatcher(None,ns,norm(tx)).ratio()>0.9: score=0.5  # 오타 허용
        else: continue
        if best is None or score>best[0]: best=(score,pg)
    return best[1] if best else None
def pages_for(cell):
    found=[]; miss=[]
    for t,c in parts(cell):
        if c!=BLUE or not t.strip(): continue
        pg=find_page(t)
        if pg: found.append(pg); continue
        # 통째로 안 맞으면 문장 단위로 나눠서
        for sent in re.findall(r'[^.!?]+[.!?]*',t):
            if len(norm(sent))<2: continue
            pg=find_page(sent.strip())
            (found if pg else miss).append(pg or sent.strip())
    return found,miss
def first_page(pg): return int(str(pg).split('-')[0])
def book_caption(found):
    if not found: return ''
    uniq=sorted(set(found),key=first_page)  # 쪽 순서 = 부 순서
    groups={}
    for pg in uniq: groups.setdefault(part_of(first_page(pg)),[]).append(pg+'p')
    return '오만과 편견 '+' · '.join(f'{k}부 '+', '.join(v) for k,v in groups.items())
MISSES={}
UNKNOWN='알 수 없음'
def caption(r):
    cnt=ws.cell(r,3).value; place=ws.cell(r,4).value
    place=str(place).strip() if place is not None else UNKNOWN
    if isinstance(cnt,float) and cnt.is_integer(): cnt=int(cnt)
    cnt=str(cnt).strip() if cnt is not None else UNKNOWN
    p = place if place==UNKNOWN else place+'에서'
    n = cnt if cnt==UNKNOWN else '+'+cnt
    return f'{p}, {n}'
MONTHS=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
DAYS=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]
start=dt.date(2026,9,11)
out=['    <main class="chat">']; empty=[]
for r in range(2,32):
    n=int(ws.cell(r,1).value)
    d=start+dt.timedelta(days=n-1)
    if n>1: out.append('')
    out.append(f'      <!-- {n} -->')
    out.append(f'      <p class="date"><b>{MONTHS[d.month-1]} {d.day} ({DAYS[d.weekday()]})</b></p>')
    out.append(f'      <p class="msg me">{render(ws.cell(r,2),RED,"censor")}</p>')
    out.append(f'      <p class="caption">{html.escape(caption(r))}</p>')
    left=render(ws.cell(r,6),BLUE,'serif')
    if n==26: left=left.replace('사람 알부의','사람 일부의')  # 시트 오타 보정
    if not left:  # F열이 비어 있으면 B열 원문(블러 없이)
        empty.append(n); left=render(ws.cell(r,2),None,'')
    out.append(f'      <p class="msg them">{left}</p>')
    found,miss=pages_for(ws.cell(r,6))
    if miss: MISSES[n]=miss
    cap=book_caption(found)
    if cap: out.append(f'      <p class="caption left">{html.escape(cap)}</p>')
assert n==30
out.append('    </main>')
p=sys.argv[2]; s=open(p,encoding='utf-8').read()
s=re.sub(r'    <main class="chat">.*?    </main>','\n'.join(out),s,flags=re.S)
open(p,'w',encoding='utf-8').write(s)
print('F empty:',empty); print('unmatched:',MISSES)
