// 바람 자료: Aeolus 궤도 233지점의 지상 바람 세기 (아래 8개 고도 평균, 2026-10-20 기상 모델 값, m/s) 와 그 그래프
(function (global) {
  const SP = [1.1,3.1,4.0,1.3,10.1,11.3,7.4,6.5,10.4,12.1,3.9,5.9,4.0,6.4,12.6,18.2,29.8,33.3,33.1,32.5,29.3,26.4,20.1,14.2,12.1,10.0,9.6,10.0,10.8,12.4,12.3,13.3,14.0,8.7,14.4,16.2,14.9,12.5,7.6,3.8,0.9,3.5,5.4,6.0,5.5,6.0,5.2,3.9,4.8,4.4,3.0,0.3,4.9,7.0,6.2,3.2,4.8,6.4,10.5,15.3,18.1,18.9,24.5,27.8,21.6,11.1,7.1,10.0,14.0,17.9,18.7,15.0,10.1,8.0,5.7,9.3,9.6,12.4,14.4,13.9,8.8,8.8,6.2,5.4,5.2,7.5,8.8,1.7,1.1,8.8,19.0,26.5,38.8,37.4,29.5,24.4,14.9,8.5,6.1,5.7,3.8,7.1,3.0,5.3,4.8,5.9,5.1,3.9,5.2,5.3,2.2,2.9,4.0,2.7,3.8,3.7,4.6,4.4,4.6,3.5,3.7,2.9,2.5,2.6,1.6,1.1,2.4,0.8,2.3,4.1,6.6,10.3,12.7,13.3,14.8,14.3,12.7,11.5,14.7,19.1,22.6,26.0,29.9,12.7,16.0,13.3,11.2,6.2,12.3,5.9,3.3,2.0,4.5,10.0,9.5,7.7,2.8,4.2,11.9,12.7,5.3,1.2,3.8,11.7,14.4,8.6,6.9,12.5,24.9,21.1,16.6,17.6,25.1,32.2,35.9,34.2,26.8,21.9,17.3,12.5,6.7,12.1,14.5,10.8,13.8,21.0,27.6,20.5,14.9,10.5,4.1,2.0,3.0,2.7,4.2,4.0,3.5,5.1,5.1,7.0,6.7,4.0,3.1,3.5,5.9,8.0,10.3,12.3,9.1,7.3,3.4,1.8,7.1,15.2,23.9,29.0,30.0,22.5,17.6,15.5,12.4,11.5,2.7,7.4,4.2,8.0,11.1,12.9,13.4,10.2,8.5,6.4,4.6], PICK = { 51: 1, 74: 78, 77: 155, 92: 233 };   // 고른 지점 -> 233곳 중 약한 순서
  console.assert(SP.length === 233 && SP[51] === 0.3 && SP[92] === 38.8, 'wind series matches the four picked points');
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  // on: 강조할 궤도 지점 목록 (없으면 네 곳 모두)
  function chart(cv, on) {
    const g = cv.getContext('2d'), dpr = Math.min(2, devicePixelRatio || 1), W = cv.clientWidth, H = cv.clientHeight;
    if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    const ink = css('--ink'), mute = css('--mute'), blue = css('--blue'), line = css('--line');
    const L = 34, R = 10, T = 14, B = 22, X = i => L + (W - L - R) * i / 232, Y = v => T + (H - T - B) * (1 - v / 40);
    g.font = '11px "IBM Plex Mono",monospace'; g.textBaseline = 'middle'; g.lineWidth = 1;
    for (const v of [0, 15, 30]) { g.strokeStyle = line; g.setLineDash(v === 15 ? [4, 4] : []); g.beginPath(); g.moveTo(L, Y(v)); g.lineTo(W - R, Y(v)); g.stroke();
      g.fillStyle = mute; g.textAlign = 'right'; g.fillText(v, L - 6, Y(v)); }
    g.setLineDash([]); g.textAlign = 'left'; g.fillStyle = mute; g.fillText('15 m/s 에서 s = 1', L + 6, Y(15) - 8);
    g.textAlign = 'right'; g.fillText('궤도 지점 →', W - R, H - 9); g.textAlign = 'left'; g.fillText('m/s', 4, 8);
    g.strokeStyle = mute; g.beginPath(); SP.forEach((v, i) => i ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v))); g.stroke();
    for (const o of Object.keys(PICK).map(Number)) { const hit = !on || on.includes(o), x = X(o), y = Y(SP[o]);
      g.strokeStyle = hit ? blue : mute; g.lineWidth = hit ? 1.5 : 1; g.setLineDash(hit ? [] : [2, 3]); g.beginPath(); g.moveTo(x, Y(0)); g.lineTo(x, y); g.stroke(); g.setLineDash([]);
      g.fillStyle = hit ? blue : css('--sheet'); g.beginPath(); g.arc(x, y, hit ? 5 : 3.5, 0, 7); g.fill(); g.stroke();
      g.fillStyle = hit ? ink : mute; g.textAlign = 'center'; g.fillText(o, x + (o === 74 ? -6 : o === 77 ? 6 : 0), H - 9); }
  }
  global.KirkeWind = { SP, PICK, chart };
})(window);
