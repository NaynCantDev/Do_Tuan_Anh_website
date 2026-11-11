/* Portfolio CNS&AI — Đỗ Tuấn Anh — "Live Session" interactions
   Âm thanh tổng hợp bằng Web Audio (không cần file).
   Mic check: dò cao độ bằng tự tương quan (autocorrelation), xử lý hoàn toàn trên máy. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;

  /* ---------- Audio engine ---------- */
  let ctx = null, master = null;
  const audio = () => {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.22;
      const comp = ctx.createDynamicsCompressor();
      master.connect(comp).connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  };
  // Một nốt synth ấm (2 osc lệch nhẹ + lọc thấp)
  const tone = (freq, dur = 0.5, { type = 'sawtooth', vol = 1, when = 0 } = {}) => {
    const c = audio(); if (!c) return;
    const t = c.currentTime + when;
    const g = c.createGain(), f = c.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.setValueAtTime(freq * 6, t); f.frequency.exponentialRampToValueAtTime(freq * 1.5, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5 * vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    [-6, 6].forEach(d => {
      const o = c.createOscillator(); o.type = type; o.frequency.value = freq; o.detune.value = d;
      o.connect(f); o.start(t); o.stop(t + dur + 0.05);
    });
    f.connect(g).connect(master);
  };

  /* ---------- Spotlight theo chuột ---------- */
  if (fine && !reduce) {
    const root = document.documentElement;
    addEventListener('pointermove', e => {
      root.style.setProperty('--mx', e.clientX + 'px');
      root.style.setProperty('--my', e.clientY + 'px');
    }, { passive: true });
  }

  /* ---------- Menu con ---------- */
  const subBtn = $('.sub-btn'), subnav = $('#subnav');
  if (subBtn && subnav) {
    subBtn.addEventListener('click', e => {
      e.stopPropagation();
      const open = subnav.classList.toggle('open');
      subBtn.setAttribute('aria-expanded', open);
    });
    document.addEventListener('click', e => {
      if (!subnav.contains(e.target)) { subnav.classList.remove('open'); subBtn.setAttribute('aria-expanded', 'false'); }
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') { subnav.classList.remove('open'); subBtn.setAttribute('aria-expanded', 'false'); } });
  }

  /* ---------- Reveal on scroll ---------- */
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => {
    es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.18 }) : null;
  $$('.reveal').forEach(el => io ? io.observe(el) : el.classList.add('in'));

  /* ---------- Sóng âm ở hero (idle) ---------- */
  const wave = $('#heroWave');
  const fitCanvas = cv => {
    const r = cv.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2);
    cv.width = Math.max(1, r.width * d); cv.height = Math.max(1, r.height * d);
    const g = cv.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0); return g;
  };
  if (wave) {
    let g = fitCanvas(wave), t0 = performance.now(), visible = true;
    addEventListener('resize', () => { g = fitCanvas(wave); });
    if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(wave);
    const draw = now => {
      const w = wave.clientWidth, h = wave.clientHeight, t = (now - t0) / 1000;
      if (visible) {
        g.clearRect(0, 0, w, h);
        [['rgba(141,107,255,.75)', 1, 0], ['rgba(232,76,176,.6)', 1.6, 1.3], ['rgba(95,216,255,.35)', 2.3, 2.1]].forEach(([col, k, ph]) => {
          g.beginPath(); g.strokeStyle = col; g.lineWidth = 1.6;
          for (let x = 0; x <= w; x += 3) {
            const env = Math.sin((x / w) * Math.PI);
            const y = h / 2 + env * (h * 0.36) * Math.sin(x * 0.012 * k + t * (1.4 + k * 0.3) + ph) * Math.sin(t * 0.5 + k);
            x ? g.lineTo(x, y) : g.moveTo(x, y);
          }
          g.stroke();
        });
      }
      if (!reduce) requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
  }

  /* ---------- Bàn mixer: bấm kênh để nghe ---------- */
  $$('.strip').forEach(s => {
    const play = () => {
      const f = +s.dataset.freq;
      tone(f, 0.9, { type: 'triangle' }); tone(f * 1.5, 0.9, { type: 'triangle', vol: 0.4 });
      s.classList.add('solo'); clearTimeout(s._t); s._t = setTimeout(() => s.classList.remove('solo'), 700);
    };
    s.addEventListener('click', play);
    s.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); play(); } });
  });

  /* ---------- Bản phối (DAW) ---------- */
  const daw = $('#daw'), playBtn = $('#dawPlay');
  if (daw && playBtn) {
    const head = $('.playhead', daw);
    const lanes = $$('.lane', daw);
    // mỗi track một vai: bass, pad, lead, arp, chuông
    const prog = [[130.81, 164.81, 196.0], [110.0, 130.81, 164.81], [87.31, 110.0, 130.81], [98.0, 123.47, 146.83]]; // C – Am – F – G
    const BPM = 112, beat = 60 / BPM, BAR = beat * 4, BARS = 12;
    let timer = null, raf = null, start = 0;
    const stop = () => {
      clearTimeout(timer); cancelAnimationFrame(raf); timer = null;
      daw.classList.remove('playing'); playBtn.setAttribute('aria-pressed', 'false');
      $$('.clip.hit', daw).forEach(c => c.classList.remove('hit'));
    };
    const placeHead = p => {
      const bars = $('.lane .bars', daw).getBoundingClientRect(), box = daw.getBoundingClientRect();
      head.style.left = (bars.left - box.left + bars.width * p) + 'px';
      head.style.top = (bars.top - box.top - 6) + 'px';
    };
    const playBar = i => {
      const ch = prog[i % 4];
      lanes.forEach((ln, k) => {
        const clips = $$('.clip', ln);
        const on = clips.find(c => i >= +c.dataset.a && i < +c.dataset.b);
        clips.forEach(c => c.classList.toggle('hit', c === on));
        if (!on) return;
        if (k === 0) { tone(ch[0] / 2, BAR * 0.9, { type: 'sawtooth', vol: 0.9 }); }
        if (k === 1) { ch.forEach(f => tone(f, BAR, { type: 'triangle', vol: 0.35 })); }
        if (k === 2) { [0, 1.5, 2, 3].forEach((b, j) => tone(ch[(j + i) % 3] * 2, beat * 0.9, { type: 'square', vol: 0.18, when: b * beat })); }
        if (k === 3) { for (let j = 0; j < 8; j++) tone(ch[j % 3] * 4, beat * 0.35, { type: 'triangle', vol: 0.14, when: j * beat / 2 }); }
        if (k === 4) { tone(ch[2] * 4, beat * 1.6, { type: 'sine', vol: 0.25 }); }
      });
      if (i + 1 < BARS) timer = setTimeout(() => playBar(i + 1), BAR * 1000); else timer = setTimeout(stop, BAR * 1000);
    };
    const anim = now => {
      const p = Math.min(1, (now - start) / (BARS * BAR * 1000));
      placeHead(p);
      if (timer) raf = requestAnimationFrame(anim);
    };
    playBtn.addEventListener('click', () => {
      if (timer) return stop();
      if (!audio()) return;
      daw.classList.add('playing', 'in'); playBtn.setAttribute('aria-pressed', 'true');
      start = performance.now(); playBar(0); raf = requestAnimationFrame(anim);
    });
  }

  /* ---------- Pads trang Dự án ---------- */
  $$('.pad').forEach(p => {
    const hit = () => { tone(+p.dataset.freq, 0.35, { type: 'triangle', vol: 0.7 }); };
    if (fine) p.addEventListener('pointerenter', hit);
    p.addEventListener('touchstart', hit, { passive: true });
  });

  /* ---------- Mic check: dò cao độ ---------- */
  const micBtn = $('#micBtn'), refBtn = $('#refBtn');
  if (micBtn) {
    const NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
    const SOLF = ['Đô', 'Đô thăng', 'Rê', 'Rê thăng', 'Mi', 'Fa', 'Fa thăng', 'Son', 'Son thăng', 'La', 'La thăng', 'Si'];
    const elNote = $('#tNote'), elSolf = $('#tSolf'), elHz = $('#tHz'), elNeedle = $('#tNeedle'), elCents = $('#tCents');
    const cv = $('#pitchCv');
    let g = fitCanvas(cv);
    addEventListener('resize', () => { g = fitCanvas(cv); drawTrail(); });
    let stream = null, analyser = null, src = null, buf = null, loop = null;
    const trail = [];  // các điểm midi gần nhất (null = im lặng)
    const MIDI_LO = 40, MIDI_HI = 84; // E2 → C6

    const detect = (b, sr) => {
      // RMS: im lặng thì bỏ qua
      let rms = 0; for (let i = 0; i < b.length; i++) rms += b[i] * b[i];
      rms = Math.sqrt(rms / b.length); if (rms < 0.012) return -1;
      // cắt phần đầu/cuối có biên độ nhỏ
      let a = 0, z = b.length - 1; const th = 0.2;
      for (let i = 0; i < b.length / 2; i++) if (Math.abs(b[i]) < th) { a = i; break; }
      for (let i = 1; i < b.length / 2; i++) if (Math.abs(b[b.length - i]) < th) { z = b.length - i; break; }
      const x = b.slice(a, z), n = x.length, c = new Float32Array(n);
      for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < n - i; j++) s += x[j] * x[j + i]; c[i] = s; }
      let d = 0; while (d < n - 1 && c[d] > c[d + 1]) d++;
      let mx = -1, mp = -1; for (let i = d; i < n; i++) if (c[i] > mx) { mx = c[i]; mp = i; }
      if (mp <= 0 || mp >= n - 1) return -1;
      const y1 = c[mp - 1], y2 = c[mp], y3 = c[mp + 1], A = (y1 + y3 - 2 * y2) / 2, B = (y3 - y1) / 2;
      const T = A ? mp - B / (2 * A) : mp;
      const f = sr / T; return f > 70 && f < 1200 ? f : -1;
    };

    const show = f => {
      if (f < 0) {
        elSolf.textContent = stream ? 'hãy ngân một nốt…' : 'chờ tín hiệu';
        elNote.classList.remove('ok'); return;
      }
      const m = 69 + 12 * Math.log2(f / 440), r = Math.round(m), cents = Math.round((m - r) * 100);
      const name = NAMES[((r % 12) + 12) % 12], oct = Math.floor(r / 12) - 1;
      elNote.textContent = name + oct;
      elSolf.textContent = SOLF[((r % 12) + 12) % 12] + (Math.abs(cents) <= 8 ? ' · chuẩn!' : cents > 0 ? ' · hơi cao' : ' · hơi thấp');
      elHz.textContent = f.toFixed(1) + ' Hz';
      elCents.textContent = (cents > 0 ? '+' : cents < 0 ? '' : '±') + cents + ' cent';
      elNeedle.style.left = (50 + cents) + '%';
      elNote.classList.toggle('ok', Math.abs(cents) <= 8);
    };

    const drawTrail = () => {
      const w = cv.clientWidth, h = cv.clientHeight;
      g.clearRect(0, 0, w, h);
      // khuông: vạch cho mỗi nốt C và A
      g.font = '10px "JB Mono", monospace'; g.textBaseline = 'middle';
      for (let m = MIDI_LO; m <= MIDI_HI; m++) {
        if (m % 12 !== 0 && m % 12 !== 9) continue;
        const y = h - ((m - MIDI_LO) / (MIDI_HI - MIDI_LO)) * h;
        g.strokeStyle = m % 12 === 0 ? 'rgba(190,175,255,.32)' : 'rgba(190,175,255,.14)';
        g.beginPath(); g.moveTo(34, y); g.lineTo(w, y); g.stroke();
        if (m % 12 === 0) { g.fillStyle = 'rgba(172,165,214,.7)'; g.fillText('C' + (m / 12 - 1), 6, y); }
      }
      if (!trail.some(v => v != null)) {
        g.fillStyle = 'rgba(172,165,214,.75)'; g.textAlign = 'center'; g.font = '13px "Archivo", sans-serif';
        g.fillText(stream ? 'Đang nghe… hãy ngân một nốt dài' : 'Đường cao độ giọng hát của bạn sẽ hiện ở đây', 17 + w / 2, h / 2);
        g.textAlign = 'start';
      }
      const N = 160, step = (w - 34) / N;
      g.lineWidth = 3; g.lineCap = 'round'; g.lineJoin = 'round';
      const grad = g.createLinearGradient(0, 0, w, 0); grad.addColorStop(0, 'rgba(141,107,255,.1)'); grad.addColorStop(1, '#e84cb0');
      g.strokeStyle = grad; g.beginPath(); let pen = false;
      trail.forEach((m, i) => {
        if (m == null) { pen = false; return; }
        const x = 34 + (i + N - trail.length) * step, y = h - ((m - MIDI_LO) / (MIDI_HI - MIDI_LO)) * h;
        pen ? g.lineTo(x, y) : g.moveTo(x, y); pen = true;
      });
      g.stroke();
      const last = trail[trail.length - 1];
      if (last != null) {
        const y = h - ((last - MIDI_LO) / (MIDI_HI - MIDI_LO)) * h;
        g.fillStyle = '#fff'; g.shadowColor = '#e84cb0'; g.shadowBlur = 14;
        g.beginPath(); g.arc(w - 4, y, 4, 0, Math.PI * 2); g.fill(); g.shadowBlur = 0;
      }
    };
    drawTrail();
    document.fonts && document.fonts.ready.then(drawTrail);

    let smooth = -1;
    const tick = () => {
      analyser.getFloatTimeDomainData(buf);
      let f = detect(buf, ctx.sampleRate);
      if (f > 0) smooth = smooth > 0 && Math.abs(f - smooth) / smooth < 0.06 ? smooth * 0.7 + f * 0.3 : f; else smooth = -1;
      show(smooth);
      trail.push(smooth > 0 ? 69 + 12 * Math.log2(smooth / 440) : null);
      if (trail.length > 160) trail.shift();
      drawTrail();
      loop = requestAnimationFrame(tick);
    };

    const stopMic = () => {
      cancelAnimationFrame(loop);
      stream && stream.getTracks().forEach(t => t.stop());
      src && src.disconnect(); stream = src = null;
      micBtn.textContent = 'Bật micro'; micBtn.setAttribute('aria-pressed', 'false');
      show(-1); elSolf.textContent = 'đã tắt micro'; trail.length = 0; drawTrail();
    };
    micBtn.addEventListener('click', async () => {
      if (stream) return stopMic();
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { elSolf.textContent = 'trình duyệt không hỗ trợ micro'; return; }
      const c = audio(); if (!c) return;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      } catch (e) { stream = null; elSolf.textContent = 'chưa được cấp quyền micro'; return; }
      src = c.createMediaStreamSource(stream);
      analyser = c.createAnalyser(); analyser.fftSize = 2048; buf = new Float32Array(analyser.fftSize);
      src.connect(analyser);
      micBtn.textContent = 'Tắt micro'; micBtn.setAttribute('aria-pressed', 'true');
      elSolf.textContent = 'hãy ngân một nốt…';
      tick();
    });
    refBtn && refBtn.addEventListener('click', () => { tone(440, 1.6, { type: 'sine', vol: 0.9 }); if (!stream) show(440); });
  }
})();
