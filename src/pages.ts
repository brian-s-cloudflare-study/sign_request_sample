export function renderMainPage(verifyToken: string, turnstileSiteKey: string): string {
	return `<!DOCTYPE html>
<html lang="ko">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title>테스트 예약 페이지</title>
	<script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" defer></script>
	<style>
		:root {
			--primary: #ff5a00;
			--primary-hover: #e64e00;
			--primary-light: #fff3ed;
			--primary-mid: #ffd4b8;
			--bg: #f2f3f5;
			--white: #ffffff;
			--text: #1a1a1a;
			--text-muted: #777;
			--text-faint: #c4c4c4;
			--border: #ebebeb;
			--border-focus: #d0d0d0;
			--shadow-xs: 0 1px 2px rgba(0,0,0,0.05);
			--shadow-sm: 0 2px 8px rgba(0,0,0,0.06);
			--shadow-md: 0 4px 20px rgba(0,0,0,0.08);
			--shadow-primary: 0 4px 14px rgba(255,90,0,0.3);
			--radius: 14px;
			--radius-sm: 10px;
			--radius-xs: 6px;
			--error: #e53e3e;
			--warning: #dd6b20;
			--success: #38a169;
		}
		* { margin: 0; padding: 0; box-sizing: border-box; }
		html { scroll-behavior: smooth; }
		body {
			font-family: 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', 'Helvetica Neue', sans-serif;
			background: var(--bg);
			color: var(--text);
			min-height: 100vh;
			-webkit-font-smoothing: antialiased;
			-moz-osx-font-smoothing: grayscale;
		}
		@media (min-width: 520px) {
			body { background: #e8e8e8; }
		}
		.page-wrap {
			max-width: 480px;
			margin: 0 auto;
			padding-bottom: 60px;
			min-height: 100vh;
			background: var(--bg);
		}
		@media (min-width: 520px) {
			.page-wrap { box-shadow: 0 0 60px rgba(0,0,0,0.12); }
		}

		.header {
			background: var(--white);
			height: 54px;
			padding: 0 20px;
			display: flex;
			align-items: center;
			gap: 10px;
			border-bottom: 1px solid var(--border);
			position: sticky;
			top: 0;
			z-index: 100;
			box-shadow: var(--shadow-xs);
		}
		.header-logo {
			font-size: 19px;
			font-weight: 800;
			letter-spacing: -0.6px;
			color: var(--text);
		}
		.header-logo em {
			color: var(--primary);
			font-style: normal;
		}
		.header-badge {
			font-size: 9px;
			font-weight: 800;
			letter-spacing: 0.8px;
			text-transform: uppercase;
			background: var(--primary);
			color: #fff;
			padding: 3px 8px;
			border-radius: 20px;
		}

		.shop-info {
			background: var(--white);
			margin-bottom: 8px;
			animation: fadeUp 0.35s ease both;
		}
		.shop-thumb {
			width: 100%;
			height: 180px;
			background: url('https://picsum.photos/seed/reservation/480/180') center/cover no-repeat;
			background-color: #e0e0e0;
			position: relative;
			overflow: hidden;
			display: flex;
			align-items: flex-end;
			padding: 20px;
		}
		.shop-thumb::after {
			content: '';
			position: absolute;
			inset: 0;
			background: linear-gradient(to top, rgba(0,0,0,0.35) 0%, transparent 60%);
		}
		.shop-thumb-name {
			position: relative;
			z-index: 1;
			color: rgba(255,255,255,0.95);
			font-size: 28px;
			font-weight: 800;
			letter-spacing: -1px;
			line-height: 1;
		}
		.shop-body {
			padding: 18px 20px 20px;
		}
		.shop-tags {
			display: flex;
			gap: 5px;
			margin-bottom: 10px;
		}
		.shop-tag {
			font-size: 11px;
			font-weight: 500;
			color: var(--text-muted);
			background: var(--bg);
			border: 1px solid var(--border);
			padding: 3px 10px;
			border-radius: 20px;
		}
		.shop-name {
			font-size: 20px;
			font-weight: 700;
			letter-spacing: -0.5px;
			line-height: 1.3;
			margin-bottom: 10px;
		}
		.shop-meta {
			display: flex;
			align-items: center;
			gap: 8px;
			font-size: 13px;
			color: var(--text-muted);
		}
		.shop-rating {
			display: flex;
			align-items: center;
			gap: 4px;
			font-weight: 700;
			font-size: 13px;
			color: var(--primary);
		}
		.shop-rating::before { content: '★'; }
		.meta-sep {
			width: 1px;
			height: 11px;
			background: var(--border-focus);
			border-radius: 1px;
		}

		.section {
			background: var(--white);
			padding: 20px;
			margin-bottom: 8px;
			animation: fadeUp 0.35s ease both;
		}
		.section:nth-of-type(3) { animation-delay: 0.07s; }
		.section:nth-of-type(4) { animation-delay: 0.14s; }
		.section-title {
			font-size: 14px;
			font-weight: 700;
			letter-spacing: -0.2px;
			color: var(--text);
			margin-bottom: 16px;
			display: flex;
			align-items: center;
			gap: 8px;
		}
		.section-title::before {
			content: '';
			display: block;
			width: 3px;
			height: 14px;
			background: var(--primary);
			border-radius: 3px;
			flex-shrink: 0;
		}

		.calendar-nav {
			display: flex;
			align-items: center;
			justify-content: space-between;
			margin-bottom: 14px;
		}
		.calendar-nav button {
			width: 34px;
			height: 34px;
			border-radius: 50%;
			border: 1.5px solid var(--border);
			background: var(--white);
			cursor: pointer;
			display: flex;
			align-items: center;
			justify-content: center;
			font-size: 13px;
			color: var(--text-muted);
			transition: border-color 0.15s, color 0.15s, background 0.15s, transform 0.1s;
		}
		.calendar-nav button:hover {
			border-color: var(--primary);
			color: var(--primary);
			background: var(--primary-light);
		}
		.calendar-nav button:active { transform: scale(0.92); }
		.month-label {
			font-size: 15px;
			font-weight: 700;
			letter-spacing: -0.3px;
		}

		.calendar-grid {
			display: grid;
			grid-template-columns: repeat(7, 1fr);
			gap: 1px;
		}
		.calendar-grid .dow {
			font-size: 10px;
			font-weight: 600;
			text-align: center;
			padding: 6px 0 8px;
			color: var(--text-faint);
			letter-spacing: 0.3px;
		}
		.calendar-grid .dow:first-child { color: #d94040; }
		.calendar-grid .dow:last-child { color: #3a7fc1; }
		.calendar-grid .day {
			aspect-ratio: 1;
			display: flex;
			align-items: center;
			justify-content: center;
			border-radius: 50%;
			font-size: 13px;
			font-weight: 400;
			font-family: inherit;
			cursor: pointer;
			border: none;
			background: none;
			color: var(--text);
			transition: background 0.15s, color 0.15s, transform 0.13s, box-shadow 0.15s;
			position: relative;
		}
		.calendar-grid .day:hover:not(.disabled):not(.selected) {
			background: var(--primary-light);
			color: var(--primary);
			transform: scale(1.1);
		}
		.calendar-grid .day.selected {
			background: var(--primary);
			color: #fff;
			font-weight: 700;
			transform: scale(0.9);
			box-shadow: var(--shadow-primary);
		}
		.calendar-grid .day.today:not(.selected) {
			font-weight: 700;
			color: var(--primary);
		}
		.calendar-grid .day.today:not(.selected)::after {
			content: '';
			position: absolute;
			bottom: 3px;
			left: 50%;
			transform: translateX(-50%);
			width: 3px;
			height: 3px;
			background: var(--primary);
			border-radius: 50%;
		}
		.calendar-grid .day.disabled {
			color: var(--text-faint);
			pointer-events: none;
			opacity: 0.45;
		}
		.calendar-grid .day.sun:not(.disabled):not(.selected) { color: #d94040; }
		.calendar-grid .day.sat:not(.disabled):not(.selected) { color: #3a7fc1; }
		.calendar-grid .day.sun.selected { background: #d94040; box-shadow: 0 4px 14px rgba(217,64,64,0.3); }
		@keyframes calFadeIn {
			from { opacity: 0; transform: translateX(16px); }
			to { opacity: 1; transform: translateX(0); }
		}
		@keyframes calFadeBack {
			from { opacity: 0; transform: translateX(-16px); }
			to { opacity: 1; transform: translateX(0); }
		}
		.cal-anim { animation: calFadeIn 0.22s ease; }
		.cal-anim-back { animation: calFadeBack 0.22s ease; }

		.slots-container { min-height: 90px; }
		.slots {
			display: flex;
			flex-wrap: wrap;
			gap: 8px;
		}
		.slot {
			padding: 10px 20px;
			border: 1.5px solid var(--border);
			border-radius: 30px;
			font-size: 14px;
			font-weight: 500;
			font-family: inherit;
			cursor: pointer;
			background: var(--white);
			color: var(--text);
			transition: border-color 0.15s, color 0.15s, background 0.15s, transform 0.13s, box-shadow 0.15s;
			animation: slotIn 0.28s ease both;
		}
		.slot:hover {
			border-color: var(--primary);
			color: var(--primary);
			background: var(--primary-light);
			transform: translateY(-2px);
			box-shadow: 0 4px 12px rgba(255,90,0,0.12);
		}
		@keyframes slotIn {
			from { opacity: 0; transform: translateY(10px); }
			to { opacity: 1; transform: translateY(0); }
		}

		.loading {
			display: flex;
			align-items: center;
			justify-content: center;
			gap: 7px;
			padding: 32px 0;
		}
		.ld {
			width: 7px;
			height: 7px;
			border-radius: 50%;
			background: var(--primary-mid);
			animation: ldPulse 1.1s ease-in-out infinite;
		}
		.ld:nth-child(2) { animation-delay: 0.18s; }
		.ld:nth-child(3) { animation-delay: 0.36s; }
		@keyframes ldPulse {
			0%, 80%, 100% { transform: scale(0.55); opacity: 0.35; }
			40% { transform: scale(1); opacity: 1; background: var(--primary); }
		}
		.empty-state {
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			padding: 32px 20px;
			gap: 8px;
			color: var(--text-muted);
		}
		.empty-icon { font-size: 30px; opacity: 0.5; }
		.empty-text { font-size: 14px; }
		.error-state {
			display: flex;
			align-items: center;
			justify-content: center;
			gap: 6px;
			padding: 28px 20px;
			color: var(--error);
			font-size: 14px;
		}

		.rate-wrap {
			padding: 24px 16px;
			background: linear-gradient(135deg, #fff9f5, #fff3eb);
			border: 1px solid #ffd5b5;
			border-radius: var(--radius-sm);
			text-align: center;
		}
		.rate-icon {
			font-size: 26px;
			margin-bottom: 10px;
			animation: rateBounce 1.4s ease-in-out infinite alternate;
		}
		@keyframes rateBounce {
			from { transform: scale(1) rotate(-5deg); }
			to { transform: scale(1.12) rotate(5deg); }
		}
		.rate-title {
			font-size: 14px;
			font-weight: 700;
			color: var(--warning);
			margin-bottom: 12px;
		}
		.rate-num {
			font-size: 42px;
			font-weight: 800;
			color: var(--primary);
			line-height: 1;
			letter-spacing: -2px;
			margin-bottom: 2px;
		}
		.rate-unit {
			font-size: 12px;
			color: var(--text-muted);
			margin-bottom: 14px;
		}
		.rate-bar-track {
			height: 3px;
			background: var(--border);
			border-radius: 3px;
			overflow: hidden;
		}
		.rate-bar-fill {
			height: 100%;
			background: linear-gradient(90deg, var(--primary), #ff9933);
			border-radius: 3px;
			transition: width 0.9s linear;
		}

		.debug-panel {
			background: #0f0f0f;
			margin-top: 8px;
			overflow: hidden;
		}
		.debug-toggle {
			width: 100%;
			background: none;
			border: none;
			color: #4a4a4a;
			font-size: 11px;
			font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
			padding: 13px 20px;
			cursor: pointer;
			display: flex;
			align-items: center;
			justify-content: space-between;
			transition: color 0.15s;
			letter-spacing: 0.3px;
		}
		.debug-toggle:hover { color: #7a7a7a; }
		.debug-toggle-label { display: flex; align-items: center; gap: 7px; }
		.debug-chevron {
			font-size: 9px;
			transition: transform 0.2s ease;
			color: #3a3a3a;
		}
		.debug-chevron.open { transform: rotate(90deg); }
		.debug-content {
			padding: 0 20px 14px;
			font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
			font-size: 11px;
			line-height: 2;
			color: #4a8a9f;
			display: none;
			max-height: 220px;
			overflow-y: auto;
			scrollbar-width: thin;
			scrollbar-color: #2a2a2a transparent;
		}
		.debug-content.visible {
			display: block;
			animation: debugOpen 0.18s ease;
		}
		@keyframes debugOpen {
			from { opacity: 0; transform: translateY(-6px); }
			to { opacity: 1; transform: translateY(0); }
		}
		.log-entry {
			border-bottom: 1px solid #1a1a1a;
			padding: 2px 0;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}
		.status-ok { color: #4ade80; }
		.status-warn { color: #fb923c; }
		.status-err { color: #f87171; }

		@keyframes fadeUp {
			from { opacity: 0; transform: translateY(14px); }
			to { opacity: 1; transform: translateY(0); }
		}

		.turnstile-overlay {
			display: none;
			position: fixed;
			inset: 0;
			z-index: 9999;
			background: rgba(0,0,0,0.5);
			backdrop-filter: blur(4px);
			-webkit-backdrop-filter: blur(4px);
			align-items: center;
			justify-content: center;
			animation: overlayIn 0.25s ease;
		}
		.turnstile-overlay.visible { display: flex; }
		@keyframes overlayIn {
			from { opacity: 0; }
			to { opacity: 1; }
		}
		.turnstile-modal {
			background: var(--white);
			border-radius: var(--radius);
			padding: 32px 28px;
			box-shadow: var(--shadow-md);
			text-align: center;
			max-width: 380px;
			width: 90%;
			animation: modalIn 0.3s ease;
		}
		@keyframes modalIn {
			from { opacity: 0; transform: translateY(20px) scale(0.95); }
			to { opacity: 1; transform: translateY(0) scale(1); }
		}
		.turnstile-modal h2 {
			font-size: 17px;
			font-weight: 700;
			margin-bottom: 6px;
			color: var(--text);
		}
		.turnstile-modal p {
			font-size: 13px;
			color: var(--text-muted);
			margin-bottom: 20px;
			line-height: 1.5;
		}
		.turnstile-widget {
			display: flex;
			justify-content: center;
			margin-bottom: 16px;
			min-height: 65px;
		}
		.turnstile-status {
			font-size: 12px;
			color: var(--text-muted);
			min-height: 18px;
		}
		.turnstile-status.success { color: var(--success); font-weight: 600; }
		.turnstile-status.error { color: var(--error); }
	</style>
</head>
<body>

<div class="page-wrap">

	<div class="header">
		<div class="header-logo">테스트 <em>예약</em></div>
		<span class="header-badge">SAMPLE</span>
	</div>

	<div class="shop-info">
		<div class="shop-thumb">
			<div class="shop-thumb-name">테스트 예약</div>
		</div>
		<div class="shop-body">
			<div class="shop-tags">
				<span class="shop-tag">성수</span>
				<span class="shop-tag">한식</span>
				<span class="shop-tag">코스요리</span>
			</div>
			<div class="shop-name">테스트 예약 페이지</div>
			<div class="shop-meta">
				<span class="shop-rating">4.7</span>
				<span class="meta-sep"></span>
				<span>리뷰 629개</span>
				<span class="meta-sep"></span>
				<span>서울 성동구</span>
			</div>
		</div>
	</div>

	<div class="section">
		<div class="section-title">날짜 선택</div>
		<div class="calendar-nav">
			<button id="prev-month">&#8592;</button>
			<span class="month-label" id="month-label"></span>
			<button id="next-month">&#8594;</button>
		</div>
		<div class="calendar-grid" id="calendar"></div>
	</div>

	<div class="section">
		<div class="section-title">시간 선택</div>
		<div class="slots-container" id="slots-container">
			<div class="empty-state">
				<div class="empty-icon">📅</div>
				<div class="empty-text">날짜를 선택해 주세요</div>
			</div>
		</div>
	</div>

	<div class="debug-panel">
		<button class="debug-toggle" onclick="toggleDebug()">
			<span class="debug-toggle-label">&#128269; API Request Log</span>
			<span class="debug-chevron" id="debug-chevron">&#9654;</span>
		</button>
		<div class="debug-content" id="debug-log"></div>
	</div>

</div>

<div class="turnstile-overlay" id="turnstile-overlay">
	<div class="turnstile-modal">
		<h2>보안 확인이 필요합니다</h2>
		<p>요청이 너무 빠릅니다. 아래 확인을 완료하면 다시 이용할 수 있습니다.</p>
		<div class="turnstile-widget" id="turnstile-widget"></div>
		<div class="turnstile-status" id="turnstile-status"></div>
	</div>
</div>

<script>
let TOKEN = '${verifyToken}';
const TURNSTILE_SITE_KEY = '${turnstileSiteKey}';
let currentDate = new Date();
let selectedDate = null;
let requestCount = 0;
let activeRetryInterval = null;
let isFetching = false;
let lastFetchTime = 0;
const FETCH_COOLDOWN = 300;

function formatDate(d) {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return y + '-' + m + '-' + day;
}

function toggleDebug() {
	const content = document.getElementById('debug-log');
	const chevron = document.getElementById('debug-chevron');
	const isOpen = content.classList.contains('visible');
	content.classList.toggle('visible', !isOpen);
	chevron.classList.toggle('open', !isOpen);
}

function log(method, url, status, detail) {
	const el = document.getElementById('debug-log');
	const cls = status < 300 ? 'status-ok' : status < 500 ? 'status-warn' : 'status-err';
	const time = new Date().toLocaleTimeString('ko-KR');
	el.innerHTML = '<div class="log-entry">' +
		'<span class="' + cls + '">[' + status + ']</span> ' +
		time + ' ' + method + ' ' + url +
		(detail ? ' \u2014 ' + detail : '') +
		'</div>' + el.innerHTML;
}

function renderCalendar(direction) {
	const year = currentDate.getFullYear();
	const month = currentDate.getMonth();
	const today = new Date();
	const calEl = document.getElementById('calendar');

	document.getElementById('month-label').textContent =
		year + '\ub144 ' + (month + 1) + '\uc6d4';

	const firstDay = new Date(year, month, 1).getDay();
	const daysInMonth = new Date(year, month + 1, 0).getDate();

	let html = ['\uc77c', '\uc6d4', '\ud654', '\uc218', '\ubaa9', '\uae08', '\ud1a0']
		.map(function(d) { return '<div class="dow">' + d + '</div>'; }).join('');

	for (let i = 0; i < firstDay; i++) {
		html += '<button class="day disabled"></button>';
	}

	for (let d = 1; d <= daysInMonth; d++) {
		const date = new Date(year, month, d);
		const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
		const isToday = date.toDateString() === today.toDateString();
		const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
		const isSun = date.getDay() === 0;
		const isSat = date.getDay() === 6;
		const isMon = date.getDay() === 1;

		let cls = 'day';
		if (isPast || isMon) cls += ' disabled';
		if (isToday) cls += ' today';
		if (isSelected) cls += ' selected';
		if (isSun) cls += ' sun';
		if (isSat && !isMon) cls += ' sat';

		html += '<button class="' + cls + '" data-date="' + formatDate(date) + '">' + d + '</button>';
	}

	calEl.innerHTML = html;
	calEl.classList.remove('cal-anim', 'cal-anim-back');
	void calEl.offsetWidth;
	calEl.classList.add(direction === 'back' ? 'cal-anim-back' : 'cal-anim');

	document.querySelectorAll('.day:not(.disabled)').forEach(function(btn) {
		btn.addEventListener('click', function() {
			const now = Date.now();
			if (isFetching || now - lastFetchTime < FETCH_COOLDOWN) return;
			selectedDate = new Date(btn.dataset.date + 'T00:00:00');
			if (activeRetryInterval) {
				clearInterval(activeRetryInterval);
				activeRetryInterval = null;
			}
			renderCalendar();
			fetchSlots(btn.dataset.date);
		});
	});
}

function showLoading() {
	document.getElementById('slots-container').innerHTML =
		'<div class="loading">' +
		'<div class="ld"></div>' +
		'<div class="ld"></div>' +
		'<div class="ld"></div>' +
		'</div>';
}

function startRetryCountdown(totalSeconds, date) {
	if (activeRetryInterval) clearInterval(activeRetryInterval);
	let remaining = totalSeconds;
	const container = document.getElementById('slots-container');

	const render = function(sec) {
		const pct = Math.max(0, (sec / totalSeconds) * 100);
		container.innerHTML =
			'<div class="rate-wrap">' +
			'<div class="rate-icon">\u23f1</div>' +
			'<div class="rate-title">\uc694\uccad\uc774 \ub108\ubb34 \ube60\ub985\ub2c8\ub2e4</div>' +
			'<div class="rate-num" id="countdown-num">' + sec + '</div>' +
			'<div class="rate-unit">\ucd08 \ud6c4 \uc790\ub3d9 \uc7ac\uc2dc\ub3c4</div>' +
			'<div class="rate-bar-track">' +
			'<div class="rate-bar-fill" id="rate-bar" style="width:' + pct + '%"></div>' +
			'</div>' +
			'</div>';
	};

	render(remaining);

	activeRetryInterval = setInterval(function() {
		remaining--;
		if (remaining <= 0) {
			clearInterval(activeRetryInterval);
			activeRetryInterval = null;
			fetchSlots(date);
			return;
		}
		const numEl = document.getElementById('countdown-num');
		const barEl = document.getElementById('rate-bar');
		if (numEl) numEl.textContent = remaining;
		if (barEl) barEl.style.width = Math.max(0, (remaining / totalSeconds) * 100) + '%';
	}, 1000);
}

async function fetchSlots(date) {
	isFetching = true;
	lastFetchTime = Date.now();
	showLoading();
	const url = '/slots?date=' + date + '&verify=' + encodeURIComponent(TOKEN);

	try {
		const res = await fetch(url);
		log('GET', '/slots?date=' + date, res.status, '');

		if (res.status === 429) {
			const retryAfter = parseInt(res.headers.get('Retry-After') || '10', 10);
			const requireTurnstile = res.headers.get('X-Require-Turnstile') === 'true';
			if (requireTurnstile) {
				showTurnstileModal(date);
			} else {
				startRetryCountdown(retryAfter, date);
			}
			return;
		}

		if (res.status === 403) {
			log('GET', '/slots?date=' + date, 403, 'HMAC invalid \u2014 Turnstile required');
			showTurnstileModal(date);
			return;
		}

		const data = await res.json();
		if (!data.slots || data.slots.length === 0) {
			document.getElementById('slots-container').innerHTML =
				'<div class="empty-state">' +
				'<div class="empty-icon">\uD83C\uDD9A</div>' +
				'<div class="empty-text">\uc608\uc57d \uac00\ub2a5\ud55c \uc2dc\uac04\uc774 \uc5c6\uc2b5\ub2c8\ub2e4</div>' +
				'</div>';
			return;
		}

		document.getElementById('slots-container').innerHTML = '<div class="slots">' +
			data.slots.map(function(s, i) {
				return '<div class="slot" style="animation-delay:' + (i * 0.05) + 's">' + s + '</div>';
			}).join('') +
			'</div>';
	} catch (err) {
		document.getElementById('slots-container').innerHTML =
			'<div class="error-state">\u26a0\ufe0f \ub124\ud2b8\uc6cc\ud06c \uc624\ub958</div>';
		log('GET', '/slots?date=' + date, 0, err.message);
	} finally {
		isFetching = false;
	}
}

document.getElementById('prev-month').addEventListener('click', function() {
	currentDate.setMonth(currentDate.getMonth() - 1);
	renderCalendar('back');
});
document.getElementById('next-month').addEventListener('click', function() {
	currentDate.setMonth(currentDate.getMonth() + 1);
	renderCalendar('forward');
});

let turnstileWidgetId = null;

function showTurnstileModal(date) {
	const overlay = document.getElementById('turnstile-overlay');
	const statusEl = document.getElementById('turnstile-status');
	statusEl.textContent = '';
	statusEl.className = 'turnstile-status';
	overlay.classList.add('visible');

	if (turnstileWidgetId !== null) {
		turnstile.remove(turnstileWidgetId);
		turnstileWidgetId = null;
	}

	turnstileWidgetId = turnstile.render('#turnstile-widget', {
		sitekey: TURNSTILE_SITE_KEY,
		callback: function(token) {
			onTurnstileSuccess(token, date);
		},
		'error-callback': function() {
			statusEl.textContent = '\ud655\uc778\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4. \ub2e4\uc2dc \uc2dc\ub3c4\ud574 \uc8fc\uc138\uc694.';
			statusEl.className = 'turnstile-status error';
		},
	});
}

function hideTurnstileModal() {
	const overlay = document.getElementById('turnstile-overlay');
	overlay.classList.remove('visible');
	if (turnstileWidgetId !== null) {
		turnstile.remove(turnstileWidgetId);
		turnstileWidgetId = null;
	}
}

async function onTurnstileSuccess(turnstileToken, date) {
	const statusEl = document.getElementById('turnstile-status');
	statusEl.textContent = '\ud655\uc778 \uc644\ub8cc, \ucc98\ub9ac \uc911...';
	statusEl.className = 'turnstile-status success';
	log('POST', '/verify-turnstile', 0, 'Turnstile token acquired');

	try {
		const form = new FormData();
		form.append('cf-turnstile-response', turnstileToken);
		form.append('redirect', '/slots?date=' + date);
		const res = await fetch('/verify-turnstile', {
			method: 'POST',
			body: form,
			headers: { 'Accept': 'application/json' },
		});
		log('POST', '/verify-turnstile', res.status, '');

		if (res.ok) {
			const data = await res.json();
			if (data.token) {
				TOKEN = data.token;
				log('INFO', '', 200, 'New token issued: ' + TOKEN.slice(0, 20) + '...');
			}
		}

		hideTurnstileModal();
		fetchSlots(date);
	} catch (err) {
		statusEl.textContent = '\uc624\ub958\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4.';
		statusEl.className = 'turnstile-status error';
		log('POST', '/verify-turnstile', 0, err.message);
	}
}

log('GET', '/', 200, 'Token issued: ' + TOKEN.slice(0, 20) + '...');

const todayStr = formatDate(new Date());
selectedDate = new Date();
renderCalendar();
fetchSlots(todayStr);
</script>
</body>
</html>`;
}
