import json, urllib.request, datetime, re, pathlib
today=datetime.date.today()
start=datetime.date(today.year-2,1,1).strftime('%Y%m%d')
end=datetime.date(today.year+1,12,31).strftime('%Y%m%d')
url=f'https://www.twse.com.tw/rwd/zh/ETF/etfDiv?stkNo=&startDate={start}&endDate={end}&response=json'
req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0','Accept':'application/json'})
with urllib.request.urlopen(req,timeout=30) as r:
    obj=json.load(r)
fields=obj.get('fields',[])
rows=obj.get('data',[])
def roc_date(s):
    if not s:return ''
    m=re.search(r'(\d{2,3})年(\d{1,2})月(\d{1,2})日',str(s))
    if m:return f'{int(m.group(1))+1911:04d}-{int(m.group(2)):02d}-{int(m.group(3)):02d}'
    s=str(s).replace('/','-').strip()
    p=s.split('-')
    if len(p)==3 and p[0].isdigit() and int(p[0])<1911:p[0]=str(int(p[0])+1911)
    return '-'.join(p)
items=[]
for row in rows:
    if len(row)<6:continue
    ticker=re.sub('<[^>]+>','',str(row[0])).strip()
    name=re.sub('<[^>]+>','',str(row[1])).strip()
    ex=roc_date(re.sub('<[^>]+>','',str(row[2])))
    pay=roc_date(re.sub('<[^>]+>','',str(row[4])))
    amt=re.sub('<[^>]+>','',str(row[5])).strip().replace(',','')
    try: amt=float(amt)
    except: continue
    if ticker and ex and pay:items.append({'ticker':ticker,'name':name,'exDate':ex,'payDate':pay,'dividend':amt})
items.sort(key=lambda x:(x['exDate'],x['ticker']))
path=pathlib.Path('data/dividends.json');path.parent.mkdir(exist_ok=True)
payload={'source':'TWSE ETF e添富','updatedAt':datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=8))).isoformat(timespec='minutes'),'items':items}
path.write_text(json.dumps(payload,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
print('rows',len(items))
