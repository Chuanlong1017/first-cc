const circle = document.querySelector('.progress-ring-fill');
const radius = circle.r.baseVal.value;
const circumference = radius * 2 * Math.PI;

circle.style.strokeDasharray = `${circumference} ${circumference}`;
circle.style.strokeDashoffset = 0;

let timeLeft = 25 * 60;
let totalTime = 25 * 60;
let timerId = null;
let isRunning = false;
let currentMode = 'work';

const timerText = document.getElementById('timerText');
const toggleBtn = document.getElementById('toggleBtn');
const resetBtn = document.getElementById('resetBtn');
const modeBtns = document.querySelectorAll('.mode-btn');
const todayCountEl = document.getElementById('todayCount');
const totalMinutesEl = document.getElementById('totalMinutes');

// Stats
const STORAGE_KEY = 'pomodoro_stats';

function getStats() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
        return {};
    }
}

function getTodayKey() {
    return new Date().toISOString().slice(0, 10);
}

function loadStats() {
    const stats = getStats();
    const today = getTodayKey();
    todayCountEl.textContent = stats[today]?.count || 0;
    totalMinutesEl.textContent = stats[today]?.minutes || 0;
}

function recordSession(minutes) {
    const stats = getStats();
    const today = getTodayKey();
    if (!stats[today]) {
        stats[today] = { count: 0, minutes: 0 };
    }
    stats[today].count += 1;
    stats[today].minutes += minutes;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
    loadStats();
}

function updateDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const text = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    timerText.textContent = text;

    const offset = circumference - (timeLeft / totalTime) * circumference;
    circle.style.strokeDashoffset = offset;

    document.title = `${text} - 番茄钟`;

    if (window.electronAPI) {
        window.electronAPI.updateTrayTooltip(`${text} - ${getModeLabel()}`);
    }
}

function getModeLabel() {
    if (currentMode === 'work') return '专注';
    if (currentMode === 'shortBreak') return '短休息';
    return '长休息';
}

function playNotification() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.5);
}

function showNotification(title, body) {
    if (window.electronAPI) {
        window.electronAPI.showNotification(title, body);
    } else {
        new Notification(title, { body });
    }
}

function onTimerComplete() {
    clearInterval(timerId);
    isRunning = false;
    toggleBtn.textContent = '开始';
    playNotification();

    if (currentMode === 'work') {
        const completedMinutes = Math.floor(totalTime / 60);
        recordSession(completedMinutes);
        showNotification('专注完成！', `恭喜你完成了 ${completedMinutes} 分钟的专注时间，休息一下吧。`);
    } else {
        showNotification('休息结束！', '休息结束，准备开始新的专注吧。');
    }
}

function start() {
    if (isRunning) return;
    isRunning = true;
    toggleBtn.textContent = '暂停';
    timerId = setInterval(() => {
        timeLeft--;
        if (timeLeft <= 0) {
            onTimerComplete();
        }
        updateDisplay();
    }, 1000);
}

function pause() {
    clearInterval(timerId);
    isRunning = false;
    toggleBtn.textContent = '继续';
}

function reset() {
    pause();
    timeLeft = totalTime;
    toggleBtn.textContent = '开始';
    updateDisplay();
}

function setMode(mode, time) {
    currentMode = mode;
    totalTime = time * 60;
    reset();

    // Update UI
    modeBtns.forEach(b => b.classList.remove('active'));
    document.querySelector(`[data-mode="${mode}"]`).classList.add('active');

    // Update color
    const color = mode === 'work' ? '#e94560' : '#4ecca3';
    circle.style.stroke = color;
    document.querySelector('h1').style.color = color;
    document.querySelector('.btn-primary').style.background = color;
    document.querySelectorAll('.stat-value').forEach(el => el.style.color = color);
}

toggleBtn.addEventListener('click', () => {
    if (isRunning) {
        pause();
    } else {
        start();
    }
});

resetBtn.addEventListener('click', reset);

modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        setMode(btn.dataset.mode, parseInt(btn.dataset.time));
    });
});

// Keyboard shortcut: Space to toggle
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        toggleBtn.click();
    }
});

// Request notification permission
if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
}

loadStats();
updateDisplay();
