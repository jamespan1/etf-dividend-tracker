import json, urllib.request, datetime, re, pathlib
today=datetime.date.today()
start=datetime.date(today.year-2,1,1).strftime("%Y%m%d")
end=datetime.date(today.year+1,12,31).strftime("%Y%m%d")
url=f"https://www.twse.com.tw/rwd/zh/ETF/etfDiv?stkNo=&startDate={start}&endDate={end}&response=json"
req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0","Accept":"application/json"})
with urllib.request.urlopen(req,timeout=30) as r: obj=json.load(r)
def clean(v): return re.sub(r"<[^>]+>","",str(v)).strip()
def date(v):
 m=re.fullmatch(r"(\d{2,4})[年/.-](\d{1,2})[月/.-](\d{1,2})日?",clean(v))
 if not m: return ""
 y,month,day=map(int,m.groups())
 if y<1911: y+=1911
 try: return datetime.date(y,month,day).isoformat()
 except ValueError: return ""
items=[]
for row in obj.get("data",[]):
 if len(row)<6: continue
 try: amount=float(clean(row[5]).replace(",",""))
 except: continue
 ticker,name,ex,pay=clean(row[0]),clean(row[1]),date(row[2]),date(row[4])
 if ticker and ex and pay: items.append({"ticker":ticker,"name":name,"exDate":ex,"payDate":pay,"dividend":amount})
if not items: raise ValueError("No valid records; existing data preserved")
# Retain historical announcements outside the rolling query window.
path=pathlib.Path("dividends.json")
merged={}
if path.exists():
 for item in json.loads(path.read_text(encoding="utf-8")).get("items",[]):
  item={**item,"exDate":date(item.get("exDate")),"payDate":date(item.get("payDate"))}
  if item["exDate"] and item["payDate"]: merged[(item["ticker"],item["exDate"],item["payDate"])]=item
for item in items: merged[(item["ticker"],item["exDate"],item["payDate"])]=item
items=list(merged.values())
items.sort(key=lambda x:(x["exDate"],x["ticker"]))
payload={"source":"TWSE ETF e添富","updatedAt":datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=8))).isoformat(timespec="minutes"),"items":items}
path.with_suffix(".tmp").write_text(json.dumps(payload,ensure_ascii=False,separators=(",",":")),encoding="utf-8")
path.with_suffix(".tmp").replace(path)
print("Updated",len(items),"records")
