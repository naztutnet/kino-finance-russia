#!/usr/bin/env python3
from __future__ import annotations
import json,re
from datetime import date
from pathlib import Path
from typing import Any

ROOT=Path(__file__).resolve().parents[1]
MONTHS={'января':1,'февраля':2,'марта':3,'апреля':4,'мая':5,'июня':6,'июля':7,'августа':8,'сентября':9,'октября':10,'ноября':11,'декабря':12}

def read(path:Path,default:Any):
    try:return json.loads(path.read_text(encoding='utf-8'))
    except (FileNotFoundError,json.JSONDecodeError):return default

def http(v:Any)->str:return str(v) if isinstance(v,str) and v.startswith(('http://','https://')) else ''

def dates(text:Any,year:int=2026)->list[date]:
    s=str(text or '').lower().replace('ё','е'); out=[]
    rp=r'(\d{1,2})\s*[–—-]\s*(\d{1,2})\s+('+'|'.join(MONTHS)+r')\s+(20\d{2})'
    for m in re.finditer(rp,s):
        for d in (int(m.group(1)),int(m.group(2))):
            try:out.append(date(int(m.group(4)),MONTHS[m.group(3)],d))
            except ValueError:pass
    ys=[int(x) for x in re.findall(r'\b(20\d{2})\b',s)]; fallback=ys[-1] if ys else year
    dp=r'(?<!\d)(\d{1,2})\s+('+'|'.join(MONTHS)+r')(?:\s+(20\d{2}))?'
    for m in re.finditer(dp,s):
        try:out.append(date(int(m.group(3) or fallback),MONTHS[m.group(2)],int(m.group(1))))
        except ValueError:pass
    return sorted(set(out))

def deadline_days(text:Any)->list[date]:
    s=str(text or '')
    if ';' in s:
        return sorted(set(max(ds) for part in s.split(';') if (ds:=dates(part))))
    ds=dates(s); return [max(ds)] if ds else []

def event(i:dict[str,Any],day:date|None,kind:str,status:str,label:str,note:str,apply='',results='',source='',display=''):
    e={'source_id':i.get('id',''),'year':day.year if day else 2026,'date':display or (day.strftime('%d.%m.%Y') if day else 'Дата ожидается'),'kind':kind,'status':status,'statusText':label,'organizer':i.get('org',''),'title':i.get('program') or i.get('title',''),'note':note.strip(),'apply':apply,'results':results,'source':source}
    if day:e['date_iso']=day.isoformat()
    return e

def main():
    items=[]
    for p in sorted(ROOT.glob('data-*.json')):
        v=read(p,{})
        if isinstance(v,dict):items.extend(x for x in v.get('items',[]) if isinstance(x,dict))
    links=read(ROOT/'result-links.json',{}); today=date.today(); out=[]
    for i in items:
        sid=str(i.get('id','')); source=http(i.get('link')); result=http(links.get(sid)); apply=http(i.get('apply_link')) or source
        added=False; raw_status=str(i.get('status','')); raw_deadline=str(i.get('deadline_text',''))
        dls=deadline_days(raw_deadline)
        for d in dls:
            opened=d>=today
            out.append(event(i,d,'Подача','open' if opened else 'closed','Приём открыт' if opened else 'Приём завершён',f'Срок приёма: {raw_deadline}. {raw_status}',apply if opened else '',result,source));added=True
        if not dls and 'непрерыв' in (raw_deadline+' '+raw_status).lower():
            out.append(event(i,None,'Подача','open','Приём открыт постоянно',f'{raw_deadline}. {raw_status}',apply,result,source,'Непрерывно'));added=True
        for d in dates(i.get('defense_date')):
            future=d>=today
            out.append(event(i,d,'Защита / питчинг','wait' if future else 'closed','Защита запланирована' if future else 'Защита состоялась',f"Дата защиты/питчинга: {i.get('defense_date','')}.",results=result,source=source));added=True
        rd=dates(i.get('results_date'))
        if rd:
            d=rd[0]; published='результат' in raw_status.lower() and 'опублик' in raw_status.lower() and d<=today; future=d>=today
            status,label=('published','Результаты опубликованы') if published else (('wait','Результаты ожидаются') if future else ('closed','Срок результатов прошёл'))
            out.append(event(i,d,'Результаты',status,label,f"{i.get('results_summary') or 'Публикация результатов'}. Срок: {i.get('results_date','')}.",results=result or (source if published else ''),source=source));added=True
        if not added:
            raw=(raw_deadline+' '+raw_status).strip(); low=raw.lower()
            if 'приостанов' in low:status,label='closed','Программа приостановлена'
            elif 'не входит' in low or 'недоступ' in low:status,label='closed','Недоступно'
            elif any(x in low for x in ('открыт','актуал','действует','работает')):status,label='open','Действует / дата уточняется'
            else:status,label='wait','Дата ожидается'
            out.append(event(i,None,'Статус программы',status,label,raw,apply if status=='open' else '',result,source))
    uniq={(e['source_id'],e['kind'],e.get('date_iso',e['date'])):e for e in out}
    out=sorted(uniq.values(),key=lambda e:(e.get('date_iso','9999-99-99'),e['organizer'],e['kind']))
    (ROOT/'deadlines.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'sources':len({e['source_id'] for e in out}),'events':len(out)},ensure_ascii=False))

if __name__=='__main__':main()
