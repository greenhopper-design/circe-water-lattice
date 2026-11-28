"""물격자에 넣을 기후 값: Aeolus 궤도 233지점 (2026-11-28)
이미 있는 바람 파일에서: 지상 바람 방향, 고도 5띠의 바람(동·북)
Open-Meteo 에서 새로 받음 (지점의 위도·경도, 그 시각에 가장 가까운 정시): 습도·구름양(예보 모델의 지난 값), 파도 높이(해양), 미세먼지 PM2.5(대기질)
값이 없는 곳(땅 위의 파도 등)은 null 로 둠 -> 화면에서는 손으로 정한 값을 씀
Run:  python make_climate.py   -> climate.js (window.KirkeClimate), climate_233.csv
"""
import csv, json, sys, time, urllib.request, urllib.parse, urllib.error
from datetime import datetime, timedelta
import numpy as np

WIND = r'D:\코덱스\작업공간\2026-11-08\ai\outputs\Circe_Wind_Coupling\source_wind_233x32.csv'
rows = {}
for r in csv.DictReader(open(WIND, encoding='utf-8-sig')):
    rows.setdefault(int(r['orbit_index']), []).append(r)
assert len(rows) == 233 and all(len(v) == 32 for v in rows.values())
lat = [float(rows[o][0]['latitude']) for o in range(233)]; lon = [float(rows[o][0]['longitude']) for o in range(233)]
when = [datetime.fromisoformat(rows[o][0]['utc']).replace(tzinfo=None) for o in range(233)]
hour = [(w + timedelta(minutes=30)).replace(minute=0, second=0, microsecond=0) for w in when]      # 가장 가까운 정시
uv = np.array([[(float(r['east_m_s']), float(r['north_m_s'])) for r in rows[o]] for o in range(233)])   # (233, 32, 2)
BANDS = [(0, 8), (8, 14), (14, 20), (20, 26), (26, 32)]                                              # 고도 띠: 0~6, 6~10.5, 10.5~15, 15~19.5, 19.5~24 km
band = np.stack([uv[:, a:b].mean(1) for a, b in BANDS], 1)                                           # (233, 5, 2)
d0, d1 = min(hour).date().isoformat(), max(hour).date().isoformat(); print('dates', d0, d1, 'first', when[0], 'last', when[-1])


def fetch_each(host, path, var):
    """한 곳씩 받음: 묶어서 물으면 값이 없는 곳(땅 위의 파도) 하나 때문에 전부 거절됨. 거절된 곳은 None"""
    out = []
    for o in range(233):
        q = urllib.parse.urlencode({'latitude': '%.4f' % lat[o], 'longitude': '%.4f' % lon[o], 'start_date': d0, 'end_date': d1, 'hourly': var, 'timezone': 'GMT'})
        for attempt in range(5):
            try:
                d = json.load(urllib.request.urlopen(urllib.request.Request('https://%s%s?%s' % (host, path, q), headers={'User-Agent': 'climate-fetch'}), timeout=20))
                t = d['hourly']['time']; want = hour[o].strftime('%Y-%m-%dT%H:%M'); out.append(d['hourly'][var][t.index(want)] if want in t else None); break
            except urllib.error.HTTPError as e:
                if e.code != 400: raise
                out.append(None); break
            except Exception as e:                                # 잠깐 끊긴 것은 다시 물음
                print('retry', var, o, e, file=sys.stderr); time.sleep(2)
        else: raise SystemExit('could not fetch %s at point %d' % (var, o))
        time.sleep(0.15)
    got = [v for v in out if v is not None]; print(var, 'got', len(got), 'of 233, range', min(got), max(got), flush=True); return out


def fetch(host, path, var):
    """233지점의 var 를 그 지점의 정시 값으로. 없으면 None"""
    out = []
    for a in range(0, 233, 40):
        q = urllib.parse.urlencode({'latitude': ','.join('%.4f' % v for v in lat[a:a + 40]), 'longitude': ','.join('%.4f' % v for v in lon[a:a + 40]),
                                    'start_date': d0, 'end_date': d1, 'hourly': var, 'timezone': 'GMT'})
        for attempt in range(3):
            try:
                data = json.load(urllib.request.urlopen(urllib.request.Request('https://%s%s?%s' % (host, path, q), headers={'User-Agent': 'climate-fetch'}), timeout=25)); break
            except Exception as e:
                print('retry', var, a, e, file=sys.stderr); time.sleep(3)
        else: raise SystemExit('could not fetch ' + var)
        data = data if isinstance(data, list) else [data]; assert len(data) == len(lat[a:a + 40])
        for k, d in enumerate(data):
            t = d['hourly']['time']; want = hour[a + k].strftime('%Y-%m-%dT%H:%M'); out.append(d['hourly'][var][t.index(want)] if want in t else None)
        time.sleep(1)
    print(var, 'got', sum(v is not None for v in out), 'of 233, range', min(v for v in out if v is not None), max(v for v in out if v is not None)); return out


import os
CACHE = json.load(open('_climate_cache.json')) if os.path.exists('_climate_cache.json') else {}
def cached(fn, host, path, var):
    if var not in CACHE: CACHE[var] = fn(host, path, var); json.dump(CACHE, open('_climate_cache.json', 'w'))
    return CACHE[var]
rh = cached(fetch, 'api.open-meteo.com', '/v1/forecast', 'relative_humidity_2m')
cloud = cached(fetch, 'api.open-meteo.com', '/v1/forecast', 'cloud_cover')
wave = cached(fetch_each, 'marine-api.open-meteo.com', '/v1/marine', 'wave_height')
pm = cached(fetch, 'air-quality-api.open-meteo.com', '/v1/air-quality', 'pm2_5')
r1 = lambda x: None if x is None else round(float(x), 1)
K = {'date': d0, 'bands_km': [[0, 6], [6, 10.5], [10.5, 15], [15, 19.5], [19.5, 24]],
     'U': [[r1(v) for v in band[o, :, 0]] for o in range(233)], 'V': [[r1(v) for v in band[o, :, 1]] for o in range(233)],   # 고도 띠의 동·북 바람 m/s (첫 띠 = 지상)
     'RH': [r1(v) for v in rh], 'CLOUD': [r1(v) for v in cloud], 'WAVE': [r1(v) for v in wave], 'PM': [r1(v) for v in pm]}
open('climate.js', 'w', encoding='utf-8').write('// 기후 값: Aeolus 궤도 233지점, ' + d0 + ' (make_climate.py 가 만듦. 바람 = 고도 5띠의 동·북 m/s, RH 습도 %, CLOUD 구름양 %, WAVE 파도 높이 m, PM = PM2.5 ㎍/㎥, null = 값 없음)\nwindow.KirkeClimate = ' + json.dumps(K, separators=(',', ':')) + ';\n')
with open('climate_233.csv', 'w', newline='', encoding='utf-8-sig') as f:
    w = csv.writer(f); w.writerow(['orbit_index', 'utc', 'latitude', 'longitude', 'east_ground', 'north_ground', 'humidity_pct', 'cloud_pct', 'wave_m', 'pm2_5'])
    for o in range(233): w.writerow([o, when[o].isoformat(), lat[o], lon[o], K['U'][o][0], K['V'][o][0], K['RH'][o], K['CLOUD'][o], K['WAVE'][o], K['PM'][o]])
sp = np.hypot(band[:, 0, 0], band[:, 0, 1]); print('ground speed at 51/74/77/92:', [round(float(sp[o]), 1) for o in (51, 74, 77, 92)], '(site: 0.3 5.7 12.4 38.8)')
