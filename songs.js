(function () {
    'use strict';

    const songs = [
        { theme: 'keyhearts', title: 'KEY HEARTS OG', file: 'sounds/Rythm Game songs/KeyHeartsOG.mp3', bpm: 126, color: '#ffd400', accent: '#ff4a1c', blurb: 'Bright arcade energy' },
        { theme: 'lightning', title: 'LIGHTNING', file: 'sounds/Rythm Game songs/Lightning.mp3', bpm: 142, color: '#2fa8ff', accent: '#13e6d8', blurb: 'Fast. Sharp. Electric.' },
        { theme: 'limbo', title: 'LIMBO', file: 'sounds/Rythm Game songs/Limbo.mp3', bpm: 110, color: '#a89acb', accent: '#e8213a', blurb: 'Float through the haze' },
        { theme: 'loveletter', title: 'LOVE LETTER', file: 'sounds/Rythm Game songs/LoveLetter.mp3', bpm: 118, color: '#ff7190', accent: '#ffd400', blurb: 'Sweet with a sting' },
        { theme: 'sweet', title: 'SWEET', file: 'sounds/Rythm Game songs/Sweet.mp3', bpm: 132, color: '#55c866', accent: '#fff3a0', blurb: 'Sugar rush combo fuel' }
    ];
    const keys = ['ArrowLeft', 'ArrowDown', 'ArrowUp', 'ArrowRight'];
    const keyLabels = ['←', '↓', '↑', '→'];
    const leadTime = 0.9;
    const difficultySettings = {
        easy:   { label: 'EASY',   hitWindow: 0.34, missLimit: 14, minGap: 0.42, mult: 1.9 },
        normal: { label: 'NORMAL', hitWindow: 0.27, missLimit: 10, minGap: 0.28, mult: 1.5 },
        hard:   { label: 'HARD',   hitWindow: 0.20, missLimit: 7,  minGap: 0.18, mult: 1.2 }
    };
    let difficulty = 'easy';
    // Latency calibration in seconds (press [ or ] during play to nudge by 10 ms). Saved per browser.
    let offset = 0.03;
    try { offset = parseFloat(localStorage.getItem('rhythmOffset')) || offset; } catch (e) { /* storage blocked */ }

    const state = {
        selected: null, index: 0, chart: [], nextNote: 0, active: [], running: false,
        score: 0, combo: 0, hits: 0, misses: 0, raf: 0, token: 0,
        clockAudio: 0, clockPerf: 0, boardH: 0
    };

    const $ = id => document.getElementById(id);
    const list = $('songList'), audio = $('songAudio'), stage = $('gameStage'), board = $('laneBoard');
    const stageCopy = $('stageCopy'), startButton = $('startButton'), stopButton = $('stopButton');
    const status = $('gameStatus'), judgement = $('judgement'), title = $('game-title');
    const scoreValue = $('scoreValue'), comboValue = $('comboValue'), accuracyValue = $('accuracyValue');
    const difficultyButtons = [...document.querySelectorAll('.difficulty-button')];
    const laneEls = [...board.querySelectorAll('.lane')];
    const body = document.body;
    const getDifficulty = () => difficultySettings[difficulty];

    /* ---------- Audio analysis (analysed once per song, cached) ---------- */
    const analyses = new Map();   // songIndex -> Promise<analysis>
    const charts = new Map();     // "song:difficulty" -> chart
    let audioCtx = null;

    function fft(re, im, cos, sin, rev) {
        const n = re.length;
        for (let i = 0; i < n; i++) {
            const j = rev[i];
            if (j > i) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
        }
        for (let size = 2; size <= n; size <<= 1) {
            const half = size >> 1, step = n / size;
            for (let start = 0; start < n; start += size) {
                for (let k = 0, t = 0; k < half; k++, t += step) {
                    const a = start + k, b = a + half;
                    const tr = re[b] * cos[t] + im[b] * sin[t];
                    const ti = im[b] * cos[t] - re[b] * sin[t];
                    re[b] = re[a] - tr; im[b] = im[a] - ti;
                    re[a] += tr; im[a] += ti;
                }
            }
        }
    }

    // Spectral flux in 4 frequency bands: bass -> left, low-mid -> down, high-mid -> up, treble -> right.
    function analyse(decoded) {
        const N = 1024, HOP = 512, sr = decoded.sampleRate;
        const chans = [...Array(decoded.numberOfChannels).keys()].map(i => decoded.getChannelData(i));
        const frames = Math.max(0, Math.floor((chans[0].length - N) / HOP));
        const cos = new Float32Array(N / 2), sin = new Float32Array(N / 2), win = new Float32Array(N), rev = new Uint16Array(N);
        for (let i = 0; i < N / 2; i++) { cos[i] = Math.cos(2 * Math.PI * i / N); sin[i] = Math.sin(2 * Math.PI * i / N); }
        for (let i = 0; i < N; i++) {
            win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1));
            let r = 0; for (let b = 0, x = i; b < 10; b++, x >>= 1) r = (r << 1) | (x & 1);
            rev[i] = r;
        }
        const edgesHz = [40, 200, 800, 3000, 10000];
        const edges = edgesHz.map(hz => Math.min(N / 2, Math.max(1, Math.round(hz * N / sr))));
        const flux = [0, 1, 2, 3].map(() => new Float32Array(frames));
        const prev = new Float32Array(N / 2);
        const re = new Float32Array(N), im = new Float32Array(N);
        const inv = 1 / chans.length;
        for (let f = 0; f < frames; f++) {
            const base = f * HOP;
            for (let i = 0; i < N; i++) {
                let s = 0; for (let c = 0; c < chans.length; c++) s += chans[c][base + i];
                re[i] = s * inv * win[i]; im[i] = 0;
            }
            fft(re, im, cos, sin, rev);
            for (let b = 0; b < 4; b++) {
                let sum = 0;
                for (let k = edges[b]; k < edges[b + 1]; k++) {
                    const mag = Math.log(1 + 80 * Math.hypot(re[k], im[k]) / N * 8);
                    const d = mag - prev[k];
                    if (d > 0) sum += d;
                    prev[k] = mag;
                }
                flux[b][f] = sum;
            }
        }
        // Equalise bands so quiet treble still gets lanes, then combine.
        const total = new Float32Array(frames);
        flux.forEach(band => {
            let mean = 0; for (let i = 0; i < frames; i++) mean += band[i];
            mean = mean / Math.max(1, frames) || 1;
            for (let i = 0; i < frames; i++) { band[i] /= mean; total[i] += band[i]; }
        });
        return { flux, total, frames, hopSec: HOP / sr, centreSec: (N / 2) / sr, duration: decoded.duration };
    }

    function getAnalysis(index) {
        if (!analyses.has(index)) {
            const promise = (async () => {
                const Ctx = window.AudioContext || window.webkitAudioContext;
                if (!Ctx) throw new Error('no audio context');
                audioCtx = audioCtx || new Ctx();
                const res = await fetch(encodeURI(songs[index].file));
                if (!res.ok) throw new Error('fetch failed');
                const decoded = await audioCtx.decodeAudioData(await res.arrayBuffer());
                return analyse(decoded);
            })();
            promise.catch(() => analyses.delete(index));
            analyses.set(index, promise);
        }
        return analyses.get(index);
    }

    function pickChart(a, diff) {
        const { total, flux, frames, hopSec, centreSec, duration } = a;
        const prefix = new Float64Array(frames + 1);
        for (let i = 0; i < frames; i++) prefix[i + 1] = prefix[i] + total[i];
        const span = Math.round(1 / hopSec), peakW = 3;
        const chart = [];
        for (let i = peakW; i < frames - peakW; i++) {
            const v = total[i];
            let isMax = true;
            for (let k = 1; k <= peakW && isMax; k++) if (v < total[i - k] || v <= total[i + k]) isMax = false;
            if (!isMax) continue;
            const lo = Math.max(0, i - span), hi = Math.min(frames, i + span);
            const localMean = (prefix[hi] - prefix[lo]) / (hi - lo);
            if (v < localMean * diff.mult + 0.35) continue;
            const time = i * hopSec + centreSec;
            if (time < 1.2 || time > duration - 0.35) continue;
            const last = chart[chart.length - 1];
            if (last && time - last.time < diff.minGap) {
                if (v > last.strength) { last.time = time; last.strength = v; last.lane = laneFor(flux, i, last.prev); }
                continue;
            }
            chart.push({ time, strength: v, lane: laneFor(flux, i, last ? last.lane : -1), prev: last ? last.lane : -1, hit: false, missed: false, el: null });
        }
        return chart;
    }

    function laneFor(flux, i, prevLane) {
        const order = [0, 1, 2, 3].sort((x, y) => flux[y][i] - flux[x][i]);
        return order[0] === prevLane ? order[1] : order[0];
    }

    function tempoFallback(duration) {
        const beat = 60 / state.selected.bpm, step = Math.max(beat, getDifficulty().minGap);
        const pattern = [0, 1, 2, 3, 1, 0, 2, 3], chart = [];
        for (let t = 1.5, n = 0; t < duration - 0.35; t += step, n++) chart.push({ time: t, lane: pattern[n % 8], hit: false, missed: false, el: null });
        return chart;
    }

    async function buildChart(index, duration) {
        const key = `${index}:${difficulty}`;
        if (charts.has(key)) return charts.get(key).map(n => ({ ...n, hit: false, missed: false, el: null }));
        let chart;
        try {
            chart = pickChart(await getAnalysis(index), getDifficulty());
            if (chart.length < 4) chart = tempoFallback(duration);
        } catch (e) { chart = tempoFallback(duration); }
        charts.set(key, chart);
        return chart.map(n => ({ ...n, hit: false, missed: false, el: null }));
    }

    /* ---------- Theme ---------- */
    function applyTheme(song) {
        body.dataset.theme = song.theme;
        body.style.setProperty('--song-color', song.color);
        body.style.setProperty('--song-accent', song.accent);
        body.style.setProperty('--beat', `${(60 / song.bpm).toFixed(3)}s`);
        body.classList.remove('theme-swap'); void body.offsetWidth; body.classList.add('theme-swap');
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', song.color);
    }

    /* ---------- UI ---------- */
    function renderSongList() {
        list.innerHTML = songs.map((song, i) => `
            <button class="song-card" type="button" data-song="${i}" style="--song-color:${song.color};--song-accent:${song.accent}">
                <span class="song-card__number">0${i + 1}</span>
                <span class="song-card__disc" aria-hidden="true"><span>♪</span></span>
                <span class="song-card__info"><strong>${song.title}</strong><small>${song.blurb} / ${song.bpm} BPM</small></span>
                <span class="song-card__arrow" aria-hidden="true">↗</span>
            </button>`).join('');
        list.addEventListener('click', e => {
            const card = e.target.closest('[data-song]');
            if (card) selectSong(Number(card.dataset.song));
        });
    }

    function selectSong(index) {
        if (state.running) stopGame(false);
        state.token++;
        state.index = index;
        state.selected = songs[index];
        list.querySelectorAll('.song-card').forEach((c, i) => c.classList.toggle('is-selected', i === index));
        audio.src = encodeURI(state.selected.file);
        audio.load();
        title.textContent = state.selected.title;
        stage.style.setProperty('--song-color', state.selected.color);
        stage.style.setProperty('--song-accent', state.selected.accent);
        applyTheme(state.selected);
        stageCopy.innerHTML = `<span class="stage-copy__eyebrow">TRACK 0${index + 1} / ${state.selected.bpm} BPM</span><strong>${state.selected.title}</strong><span>Press start, then hit the arrows on the line</span>`;
        stageCopy.classList.remove('is-hidden');
        startButton.disabled = false;
        startButton.textContent = 'START RUN';
        stopButton.disabled = true;
        status.textContent = `${state.selected.title} loaded. Analysing the track so every note lands on a real hit.`;
        resetStats();
        getAnalysis(index).then(() => { if (state.index === index && !state.running) status.textContent = `${state.selected.title} is charted. Press start.`; }).catch(() => {});
    }

    function clearNotes() {
        state.active.forEach(n => n.el && n.el.remove());
        state.active = [];
    }

    function resetStats() {
        state.score = state.combo = state.hits = state.misses = 0;
        clearNotes(); state.nextNote = 0;
        updateStats();
    }

    function updateStats() {
        scoreValue.textContent = String(state.score).padStart(6, '0');
        comboValue.textContent = state.combo;
        const tries = state.hits + state.misses;
        accuracyValue.textContent = `${tries ? Math.round(state.hits / tries * 100) : 100}%`;
    }

    /* ---------- Game ---------- */
    // audio.currentTime only updates in coarse steps; interpolate between updates for a smooth clock.
    function songTime(perfNow) {
        const t = audio.currentTime;
        if (t !== state.clockAudio) { state.clockAudio = t; state.clockPerf = perfNow; }
        return state.clockAudio + (audio.paused ? 0 : (perfNow - state.clockPerf) / 1000) - offset;
    }

    async function startGame() {
        if (!state.selected || state.running) return;
        if (!Number.isFinite(audio.duration)) {
            status.textContent = 'Loading the track audio...';
            audio.addEventListener('loadedmetadata', startGame, { once: true });
            return;
        }
        resetStats();
        const token = ++state.token;
        startButton.disabled = true;
        startButton.textContent = 'ANALYZING TRACK...';
        const chart = await buildChart(state.index, audio.duration);
        if (token !== state.token) return;
        state.chart = chart;
        state.boardH = board.clientHeight;
        state.running = true;
        stage.classList.add('is-playing'); body.classList.add('is-playing');
        stageCopy.classList.add('is-hidden');
        stopButton.disabled = false;
        status.textContent = `DROP IN — ${chart.length} notes. If timing feels off, tap [ or ] to adjust.`;
        audio.currentTime = 0;
        state.clockAudio = 0; state.clockPerf = performance.now();
        audio.play().then(() => {
            state.clockAudio = audio.currentTime; state.clockPerf = performance.now();
        }).catch(() => {
            state.running = false;
            cancelAnimationFrame(state.raf);
            stage.classList.remove('is-playing'); body.classList.remove('is-playing');
            stageCopy.classList.remove('is-hidden');
            status.textContent = 'Audio playback was blocked. Press START RUN again to allow the track.';
            startButton.disabled = false; startButton.textContent = 'START RUN'; stopButton.disabled = true;
        });
        state.raf = requestAnimationFrame(gameLoop);
    }

    function stopGame(showMessage) {
        state.running = false;
        cancelAnimationFrame(state.raf);
        audio.pause();
        clearNotes();
        stage.classList.remove('is-playing'); body.classList.remove('is-playing');
        stageCopy.classList.remove('is-hidden');
        startButton.disabled = !state.selected;
        startButton.textContent = state.selected ? 'PLAY AGAIN' : 'SELECT A SONG';
        stopButton.disabled = true;
        if (showMessage) status.textContent = 'Run stopped. Pick a song or play again when ready.';
    }

    function endGame(won, message) {
        stopGame(false);
        stage.classList.add(won ? 'is-won' : 'is-lost');
        stageCopy.innerHTML = `<span class="stage-copy__eyebrow">${won ? 'FULL COMBO ENERGY' : 'SIGNAL LOST'}</span><strong>${won ? 'YOU WIN!' : 'YOU LOSE!'}</strong><span>${message}</span>`;
        status.textContent = won
            ? `Track cleared with ${state.score.toLocaleString()} points. Choose another song to keep the set going.`
            : `Too many misses. You scored ${state.score.toLocaleString()} points — try a different track or run it back.`;
        setTimeout(() => stage.classList.remove('is-won', 'is-lost'), 500);
    }

    function spawnNotes(now) {
        while (state.nextNote < state.chart.length && state.chart[state.nextNote].time - now <= leadTime) {
            const note = state.chart[state.nextNote++];
            const el = document.createElement('span');
            el.className = 'note';
            el.textContent = keyLabels[note.lane];
            el.style.setProperty('--lane', note.lane);
            board.appendChild(el);
            note.el = el;
            state.active.push(note);
        }
    }

    function gameLoop(perfNow) {
        if (!state.running) return;
        const now = songTime(perfNow), win = getDifficulty().hitWindow, H = state.boardH;
        spawnNotes(now);
        let w = 0;
        for (let i = 0; i < state.active.length; i++) {
            const note = state.active[i], delta = note.time - now;
            const y = H * 0.82 - (delta / leadTime) * H * 0.94 - 17;
            note.el.style.transform = `translate3d(0,${y.toFixed(1)}px,0)`;
            if (!note.hit && !note.missed && delta < -win) markMiss(note);
            if ((note.hit || note.missed) && delta < -0.25 || y > H + 40) { note.el.remove(); continue; }
            state.active[w++] = note;
        }
        state.active.length = w;
        if (state.misses >= getDifficulty().missLimit) return endGame(false, 'You missed too many notes.');
        if (audio.ended || (state.nextNote >= state.chart.length && w === 0)) return endGame(true, 'Every section of the song survived.');
        state.raf = requestAnimationFrame(gameLoop);
    }

    function markMiss(note) {
        note.missed = true;
        state.misses++; state.combo = 0;
        note.el.style.opacity = '.3';
        showJudgement('MISS', 'bad');
        updateStats();
    }

    function handleInput(lane) {
        if (!state.running) return;
        const now = songTime(performance.now());
        let best = null, bestDiff = Infinity;
        for (const n of state.active) {
            if (n.hit || n.missed || n.lane !== lane) continue;
            // Early presses must not count: a note is hittable only once it
            // reaches the line, then remains hittable for the timing window.
            const d = now - n.time;
            if (d >= 0 && d < bestDiff) { best = n; bestDiff = d; }
        }
        if (!best || bestDiff > getDifficulty().hitWindow) {
            // Pressing with nothing nearby only breaks combo; it no longer costs a life.
            state.combo = 0; showJudgement('MISS', 'bad'); updateStats();
            return;
        }
        const quality = bestDiff < 0.06 ? 'PERFECT' : bestDiff < 0.12 ? 'GREAT' : 'GOOD';
        best.hit = true; state.hits++; state.combo++;
        state.score += (quality === 'PERFECT' ? 1000 : quality === 'GREAT' ? 700 : 450) * (1 + Math.min(state.combo, 50) / 50);
        state.score = Math.round(state.score);
        best.el.classList.add('is-hit');
        showJudgement(quality, quality === 'PERFECT' ? 'perfect' : 'good');
        updateStats();
    }

    function showJudgement(text, type) {
        judgement.textContent = text;
        judgement.dataset.type = type;
        judgement.classList.remove('is-visible'); void judgement.offsetWidth; judgement.classList.add('is-visible');
    }

    function nudge(delta) {
        offset = Math.round((offset + delta) * 1000) / 1000;
        try { localStorage.setItem('rhythmOffset', offset); } catch (e) { /* ignore */ }
        status.textContent = `Timing offset: ${Math.round(offset * 1000)} ms`;
    }

    /* ---------- Events ---------- */
    document.addEventListener('keydown', e => {
        if (e.repeat) return;
        if (e.key === '[') return nudge(-0.01);
        if (e.key === ']') return nudge(0.01);
        const lane = keys.indexOf(e.key);
        if (lane === -1) return;
        e.preventDefault();
        laneEls[lane].classList.add('is-pressed');
        handleInput(lane);
    });
    document.addEventListener('keyup', e => {
        const lane = keys.indexOf(e.key);
        if (lane !== -1) laneEls[lane].classList.remove('is-pressed');
    });
    laneEls.forEach((el, lane) => {
        el.addEventListener('pointerdown', () => { el.classList.add('is-pressed'); handleInput(lane); });
        ['pointerup', 'pointerleave', 'pointercancel'].forEach(t => el.addEventListener(t, () => el.classList.remove('is-pressed')));
    });
    startButton.addEventListener('click', startGame);
    stopButton.addEventListener('click', () => stopGame(true));
    difficultyButtons.forEach(button => button.addEventListener('click', () => {
        if (state.running) return;
        difficulty = button.dataset.difficulty;
        difficultyButtons.forEach(o => o.classList.toggle('is-selected', o === button));
        status.textContent = `${getDifficulty().label} selected. Notes follow the track's real hits.`;
    }));
    audio.addEventListener('error', () => {
        if (state.selected) status.textContent = `Could not load ${state.selected.title}. Check that its local audio file is available.`;
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden && state.running) stopGame(true); });
    new ResizeObserver(() => { state.boardH = board.clientHeight; }).observe(board);

    renderSongList();
    selectSong(0);
}());