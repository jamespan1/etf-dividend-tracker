import json, urllib.request, datetime, re, pathlib
today=datetime.date.today()
start=datetime.date(today.year-2,1,1).strftime("%Y%m%d")
end=datetime.date(today.year+1,12,31).strftime("%Y%m%d")
url=f"https://www.twse.com.tw/rwd/zh/ETF/etfDiv?stkNo=&startDate={start}&endDate={end}&response=json"
req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0","Accept":"application/json"})
with urllib.request.urlopen(req,timeout=30) as r: obj=json.load(r)
def clean(v): return re.sub(r"<[^>]+>","",str(v)).strip()
def date(v):
 s=clean(v).replace("/","-"); p=s.split("-")
 if len(p)==3 and p[0].isdigit() and int(p[0])<1911: p[0]=str(int(p[0])+1911)
 return "-".join(p)
items=[]
for row in obj.get("data",[]):
 if len(row)<6: continue
 try: amount=float(clean(row[5]).replace(",",""))
 except: continue
 ticker,name,ex,pay=clean(row[0]),clean(row[1]),date(row[2]),date(row[4])
 if ticker and ex and pay: items.append({"ticker":ticker,"name":name,"exDate":ex,"payDate":pay,"dividend":amount})
items.sort(key=lambda x:(x["exDate"],x["ticker"]))
payload={"source":"TWSE ETF e添富","updatedAt":datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=8))).isoformat(timespec="minutes"),"items":items}
pathlib.Path("dividends.json").write_text(json.dumps(payload,ensure_ascii=False,separators=(",",":")),encoding="utf-8")
print("Updated",len(items),"records")
