// Hero telemetry animation.
//
// Two modes:
//  - REPLAY: if resources/data/arcus-lap.js defines window.ARCUS_LAP (generated from a rosbag by
//    tools/bag_to_lap.py), the car replays that real lap: real path, real speeds, real lap time.
//  - SIM (fallback): the car follows a drawn raceline with a pure-pursuit lookahead and switches to a
//    disparity-extender offset to pass an obstacle. Clearly labelled as a simulation.
(function () {
    const svg = document.querySelector('.telemetry-svg');
    if (!svg) return;

    const $ = (id) => document.getElementById(id);
    const track = $('tl-track');
    const car = $('tl-car');
    const sweep = $('tl-sweep');
    const look = $('tl-look');
    const target = $('tl-target');
    const trail = $('tl-trail');
    const obstacle = $('tl-obstacle');
    const hud = { mode: $('hud-mode'), v: $('hud-v'), ttc: $('hud-ttc'), lap: $('hud-lap') };

    const lapData = window.ARCUS_LAP;
    const REAL = !!(lapData && Array.isArray(lapData.points) && lapData.points.length > 10);

    // ---------- Real lap: fit the logged path into the 600x600 view ----------
    let realCum = null, realV = null, realMode = null, pxPerM = 22;
    if (REAL) {
        const pts = lapData.points;
        const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
        const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
        const margin = 70;
        pxPerM = (600 - 2 * margin) / Math.max(maxX - minX, maxY - minY);
        const ox = (600 - (maxX - minX) * pxPerM) / 2, oy = (600 - (maxY - minY) * pxPerM) / 2;
        // ROS y points up, SVG y points down.
        const view = pts.map((p) => [ox + (p[0] - minX) * pxPerM, oy + (maxY - p[1]) * pxPerM]);
        const d = 'M ' + view.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L ') + ' Z';
        svg.querySelectorAll('.tl-track-edge, .tl-track-surface, .tl-raceline').forEach((el) => el.setAttribute('d', d));

        realCum = [0];
        for (let i = 1; i < view.length; i++) {
            realCum.push(realCum[i - 1] + Math.hypot(view[i][0] - view[i - 1][0], view[i][1] - view[i - 1][1]));
        }
        realV = pts.map((p) => p[2]);
        realMode = pts.map((p) => p[3] || lapData.mode || 'AUTONOMOUS');

        obstacle.style.display = 'none';
        hud.ttc.closest('.hud-row').style.display = 'none';
        const badge = document.querySelector('.hud-sim');
        if (badge) { badge.textContent = 'REPLAY'; badge.classList.add('hud-replay'); }
        const caption = document.querySelector('.hud-caption');
        if (caption) caption.textContent = lapData.caption || 'Real lap replay — logged on the ARCUS car';
        const wrapper = svg.closest('.telemetry');
        if (wrapper) wrapper.setAttribute('aria-label', 'Replay of a real lap logged by the ARCUS autonomous race car');
    }

    const L = track.getTotalLength();
    const wrap = (s) => ((s % L) + L) % L;
    const gap = (a, b) => { const d = wrap(b - a); return d > L / 2 ? d - L : d; };

    // Index into the real lap for an arc length (in view units).
    function realIndex(s) {
        const total = realCum[realCum.length - 1];
        const t = wrap(s) * total / L;
        let lo = 0, hi = realCum.length - 1;
        while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (realCum[mid] <= t) lo = mid; else hi = mid; }
        const f = (t - realCum[lo]) / Math.max(1e-6, realCum[hi] - realCum[lo]);
        return { lo, hi, f };
    }

    // ---------- Simulated obstacle pass (SIM mode only) ----------
    const OBST_S = L * 0.56;
    const OBST_OFFSET = 10;
    const PASS_OFFSET = -16;
    const PASS_WINDOW = L * 0.07;
    const LOOKAHEAD = 46;

    function frameAt(s) {
        const p = track.getPointAtLength(wrap(s));
        const q = track.getPointAtLength(wrap(s + 1));
        const a = Math.atan2(q.y - p.y, q.x - p.x);
        return { x: p.x, y: p.y, a, nx: -Math.sin(a), ny: Math.cos(a) };
    }

    function lateral(s) {
        if (REAL) return 0;
        const d = gap(OBST_S, s);
        if (Math.abs(d) > PASS_WINDOW) return 0;
        return PASS_OFFSET * 0.5 * (1 + Math.cos((Math.PI * d) / PASS_WINDOW));
    }

    function poseAt(s) {
        const f = frameAt(s);
        const off = lateral(s);
        return { x: f.x + f.nx * off, y: f.y + f.ny * off, a: f.a };
    }

    function curvature(s) {
        let d = frameAt(s + 12).a - frameAt(s - 12).a;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        return Math.abs(d) / 24;
    }

    // Speed in view units per second at arc length s.
    function speedAt(s, current, dt) {
        if (REAL) {
            const { lo, hi, f } = realIndex(s);
            // Floor at 0.5 m/s so a stop in the log (e.g. the start line) can't freeze the replay.
            return Math.max(0.5, realV[lo] + (realV[hi] - realV[lo]) * f) * pxPerM;
        }
        const vTarget = 150 - Math.min(90, curvature(s + 30) * 2600);
        return current + (vTarget - current) * Math.min(1, dt * 2.5);
    }

    function modeAt(s) {
        if (REAL) return realMode[realIndex(s).lo];
        return Math.abs(gap(OBST_S, s)) < PASS_WINDOW ? 'DISPARITY_EXT' : 'PURE_PURSUIT';
    }

    if (!REAL) {
        const of = frameAt(OBST_S);
        obstacle.setAttribute('x', of.x + of.nx * OBST_OFFSET - 7);
        obstacle.setAttribute('y', of.y + of.ny * OBST_OFFSET - 7);
    }

    let s = 0, v = 60, lapStart = 0, last = null, sweepAngle = -135;
    const history = [];

    function render(now) {
        const pose = poseAt(s);
        const deg = (pose.a * 180) / Math.PI;
        car.setAttribute('transform', `translate(${pose.x.toFixed(1)} ${pose.y.toFixed(1)}) rotate(${deg.toFixed(1)})`);
        sweep.setAttribute('transform', `rotate(${sweepAngle.toFixed(1)})`);

        const t = poseAt(s + LOOKAHEAD);
        look.setAttribute('x1', pose.x); look.setAttribute('y1', pose.y);
        look.setAttribute('x2', t.x); look.setAttribute('y2', t.y);
        target.setAttribute('cx', t.x); target.setAttribute('cy', t.y);

        history.push(`${pose.x.toFixed(1)},${pose.y.toFixed(1)}`);
        if (history.length > 70) history.shift();
        trail.setAttribute('points', history.join(' '));

        const mode = modeAt(s);
        hud.mode.textContent = mode;
        hud.mode.classList.toggle('hud-warn', mode === 'DISPARITY_EXT');
        hud.v.textContent = (v / pxPerM).toFixed(1) + ' m/s';
        if (!REAL) {
            const toObst = gap(s, OBST_S);
            hud.ttc.textContent = toObst > 0 && toObst < L * 0.2 ? (toObst / v).toFixed(2) + ' s' : '—';
        }
        const lap = Math.max(0, (now - lapStart) / 1000);
        hud.lap.textContent = String(Math.floor(lap / 60)).padStart(2, '0') + ':' + (lap % 60).toFixed(1).padStart(4, '0');
    }

    function tick(now) {
        if (last === null) { last = now; lapStart = now; }
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;

        v = speedAt(s, v, dt);
        const prev = s;
        s = wrap(s + v * dt);
        if (s < prev) lapStart = now;
        sweepAngle += dt * 540;
        if (sweepAngle > 135) sweepAngle = -135;

        render(now);
        if (running) requestAnimationFrame(tick);
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let running = false;

    function start() {
        if (running || reduced.matches) return;
        running = true; last = null;
        requestAnimationFrame(tick);
    }
    function stop() { running = false; }

    // Static frame for reduced motion (mid-manoeuvre in SIM mode); otherwise animate only while visible.
    s = REAL ? L * 0.3 : OBST_S - PASS_WINDOW * 0.4;
    v = REAL ? speedAt(s, 0, 0) : 110;
    render(performance.now());
    if (reduced.matches) {
        hud.lap.textContent = REAL && lapData.lap_time ? lapData.lap_time.toFixed(2) + ' s' : '—';
        return;
    }
    s = REAL ? 0 : L * 0.05;
    v = REAL ? speedAt(s, 0, 0) : 60;
    history.length = 0;

    new IntersectionObserver((entries) => {
        entries[0].isIntersecting ? start() : stop();
    }).observe(svg);
    reduced.addEventListener('change', () => (reduced.matches ? stop() : start()));
})();
