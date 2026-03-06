export function renderMainPage(verifyToken: string): string {
	return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>온�� — 예약 샘플</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f7f8fa; color: #1a1a1a; }

.header {
  background: #fff; padding: 16px 20px; border-bottom: 1px solid #eee;
  display: flex; align-items: center; gap: 12px;
}
.header h1 { font-size: 18px; font-weight: 600; }
.header .badge {
  font-size: 11px; background: #ff5a00; color: #fff;
  padding: 2px 8px; border-radius: 10px;
}

.shop-info {
  background: #fff; padding: 20px; margin-bottom: 8px;
}
.shop-info .tags { font-size: 13px; color: #888; margin-bottom: 4px; }
.shop-info .name { font-size: 24px; font-weight: 700; margin-bottom: 8px; }
.shop-info .meta { font-size: 13px; color: #666; display: flex; gap: 8px; align-items: center; }
.shop-info .star { color: #ff5a00; font-weight: 600; }

.section {
  background: #fff; padding: 20px; margin-bottom: 8px;
}
.section h2 {
  font-size: 16px; font-weight: 600; margin-bottom: 16px;
}

.calendar-nav {
  display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;
}
.calendar-nav button {
  background: none; border: 1px solid #ddd; border-radius: 8px;
  padding: 6px 12px; cursor: pointer; font-size: 14px;
}
.calendar-nav .month { font-size: 16px; font-weight: 600; }

.calendar-grid {
  display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; text-align: center;
}
.calendar-grid .dow { font-size: 12px; color: #999; padding: 4px 0; }
.calendar-grid .day {
  padding: 10px 0; border-radius: 8px; font-size: 14px; cursor: pointer;
  border: none; background: none; transition: background 0.15s;
}
.calendar-grid .day:hover { background: #f0f0f0; }
.calendar-grid .day.selected { background: #ff5a00; color: #fff; font-weight: 600; }
.calendar-grid .day.disabled { color: #ccc; pointer-events: none; }
.calendar-grid .day.today { font-weight: 700; }
.calendar-grid .day.sun { color: #e74c3c; }

.slots-container { min-height: 80px; }
.slots {
  display: flex; flex-wrap: wrap; gap: 8px;
}
.slot {
  padding: 10px 16px; border: 1px solid #ddd; border-radius: 8px;
  font-size: 14px; cursor: pointer; background: #fff; transition: all 0.15s;
}
.slot:hover { border-color: #ff5a00; color: #ff5a00; }

.loading { text-align: center; padding: 20px; color: #999; font-size: 14px; }
.error { text-align: center; padding: 20px; color: #e74c3c; font-size: 14px; }
.rate-limited {
  text-align: center; padding: 20px; color: #e67e22; font-size: 14px;
  background: #fff8f0; border-radius: 8px;
}

.debug-panel {
  background: #1a1a2e; color: #a0d2db; padding: 16px 20px; margin-top: 8px;
  font-family: 'SF Mono', monospace; font-size: 12px; line-height: 1.8;
}
.debug-panel h3 { color: #e0e0e0; margin-bottom: 8px; font-size: 13px; }
.debug-panel .log-entry { border-bottom: 1px solid #2a2a4a; padding: 4px 0; }
.debug-panel .status-ok { color: #2ecc71; }
.debug-panel .status-err { color: #e74c3c; }
.debug-panel .status-warn { color: #e67e22; }
</style>
</head>
<body>

<div class="header">
  <h1>온류</h1>
  <span class="badge">SAMPLE</span>
</div>

<div class="shop-info">
  <div class="tags">성수 · 한식</div>
  <div class="name">온류 (Sign Request Sample)</div>
  <div class="meta">
    <span class="star">★ 4.7</span>
    <span>·</span>
    <span>리뷰 629개</span>
  </div>
</div>

<div class="section">
  <h2>예약</h2>
  <div class="calendar-nav">
    <button id="prev-month">&lt;</button>
    <span class="month" id="month-label"></span>
    <button id="next-month">&gt;</button>
  </div>
  <div class="calendar-grid" id="calendar"></div>
</div>

<div class="section">
  <h2>시간 선택</h2>
  <div class="slots-container" id="slots-container">
    <div class="loading">날짜를 선택해 주세요</div>
  </div>
</div>

<div class="debug-panel">
  <h3>🔍 API Request Log</h3>
  <div id="debug-log"></div>
</div>

<script>
const TOKEN = '${verifyToken}';
let currentDate = new Date();
let selectedDate = null;
let requestCount = 0;

function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function log(method, url, status, detail) {
  const el = document.getElementById('debug-log');
  const cls = status < 300 ? 'status-ok' : status < 500 ? 'status-warn' : 'status-err';
  const time = new Date().toLocaleTimeString('ko-KR');
  el.innerHTML = '<div class="log-entry">' +
    '<span class="' + cls + '">[' + status + ']</span> ' +
    time + ' ' + method + ' ' + url +
    (detail ? ' — ' + detail : '') +
    '</div>' + el.innerHTML;
}

function renderCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = new Date();

  document.getElementById('month-label').textContent =
    year + '년 ' + (month + 1) + '월';

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let html = ['일','월','화','수','목','금','토']
    .map(d => '<div class="dow">' + d + '</div>').join('');

  for (let i = 0; i < firstDay; i++) {
    html += '<button class="day disabled"></button>';
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const isToday = date.toDateString() === today.toDateString();
    const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
    const isSun = date.getDay() === 0;
    const isMon = date.getDay() === 1;

    let cls = 'day';
    if (isPast || isMon) cls += ' disabled';
    if (isToday) cls += ' today';
    if (isSelected) cls += ' selected';
    if (isSun) cls += ' sun';

    html += '<button class="' + cls + '" data-date="' + formatDate(date) + '">' + d + '</button>';
  }

  document.getElementById('calendar').innerHTML = html;

  document.querySelectorAll('.day:not(.disabled)').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedDate = new Date(btn.dataset.date + 'T00:00:00');
      renderCalendar();
      fetchSlots(btn.dataset.date);
    });
  });
}

async function fetchSlots(date) {
  requestCount++;
  const container = document.getElementById('slots-container');
  container.innerHTML = '<div class="loading">로딩 중...</div>';

  const url = '/slots?date=' + date + '&verify=' + encodeURIComponent(TOKEN);

  try {
    const res = await fetch(url);
    log('GET', '/slots?date=' + date, res.status, '');

    if (res.status === 429) {
      const retryAfter = res.headers.get('Retry-After') || '5';
      container.innerHTML =
        '<div class="rate-limited">⚠️ 요청이 너무 빠릅니다. ' +
        retryAfter + '초 후 다�� 시도해 주세요.</div>';
      log('GET', '/slots?date=' + date, 429, 'Rate limited — retry after ' + retryAfter + 's');
      return;
    }

    if (res.status === 403) {
      const text = await res.text();
      if (text.includes('cf-turnstile')) {
        document.open();
        document.write(text);
        document.close();
        return;
      }
      container.innerHTML = '<div class="error">🚫 ' + text + '</div>';
      return;
    }

    const data = await res.json();
    if (!data.slots || data.slots.length === 0) {
      container.innerHTML = '<div class="loading">예약 가능한 시간이 없습니다</div>';
      return;
    }

    container.innerHTML = '<div class="slots">' +
      data.slots.map(s => '<div class="slot">' + s + '</div>').join('') +
      '</div>';
  } catch (err) {
    container.innerHTML = '<div class="error">네트워크 오류</div>';
    log('GET', '/slots?date=' + date, 0, err.message);
  }
}

document.getElementById('prev-month').addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
});
document.getElementById('next-month').addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
});

log('GET', '/', 200, 'Token issued: ' + TOKEN.slice(0, 20) + '...');
renderCalendar();

const todayStr = formatDate(new Date());
selectedDate = new Date();
renderCalendar();
fetchSlots(todayStr);
</script>
</body>
</html>`;
}
