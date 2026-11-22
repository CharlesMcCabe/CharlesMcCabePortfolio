// Hero telemetry animation: a car follows the raceline with a pure-pursuit lookahead,
// switches to a disparity-extender offset to pass an obstacle, and reports to the HUD.
(function () {
    const svg = document.querySelector('.telemetry-svg');
    if (!svg) return;

    const track = document.getElementById('tl-track');
    const car = document.getElementById('tl-car');
    const sweep = document.getElementById('tl-sweep');
    const look = document.getElementById('tl-look');
    const target = document.getElementById('tl-target');
    const trail = document.getElementById('tl-trail');
    const obstacle = document.getElementById('tl-obstacle');
    const hud = {
        mode: document.getElementById('hud-mode'),
        v: document.getElementById('hud-v'),
        ttc: document.getElementById('hud-ttc'),
        lap: document.getElementById('hud-lap'),
    };

    const L = track.getTotalLength();
    const OBST_S = L * 0.56;       // obstacle position along the track
    const OBST_OFFSET = 10;        // obstacle sits slightly off the centreline
    const PASS_OFFSET = -16;       // car swings to the other side
    const PASS_WINDOW = L * 0.07;  // half-width of the avoidance manoeuvre
    const LOOKAHEAD = 46;
    const PX_PER_M = 22;           // display scale for the HUD speed

    const wrap = (s) => ((s % L) + L) % L;
    const gap = (a, b) => { const d = wrap(b - a); return d > L / 2 ? d - L : d; };

    function frameAt(s) {
        const p = track.getPointAtLength(wrap(s));
        const q = track.getPointAtLength(wrap(s + 1));
        const a = Math.atan2(q.y - p.y, q.x - p.x);
        return { x: p.x, y: p.y, a, nx: -Math.sin(a), ny: Math.cos(a) };
    }

    function lateral(s) {
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
        const a0 = frameAt(s - 12).a, a1 = frameAt(s + 12).a;
        let d = a1 - a0;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        return Math.abs(d) / 24;
    }

    // Place the obstacle
    const of = frameAt(OBST_S);
    obstacle.setAttribute('x', of.x + of.nx * OBST_OFFSET - 7);
    obstacle.setAttribute('y', of.y + of.ny * OBST_OFFSET - 7);

    let s = L * 0.05, v = 60, lapStart = 0, last = null, sweepAngle = -135;
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

        const toObst = gap(s, OBST_S);
        const avoiding = Math.abs(gap(OBST_S, s)) < PASS_WINDOW;
        hud.mode.textContent = avoiding ? 'DISPARITY_EXT' : 'PURE_PURSUIT';
        hud.mode.classList.toggle('hud-warn', avoiding);
        hud.v.textContent = (v / PX_PER_M).toFixed(1) + ' m/s';
        hud.ttc.textContent = toObst > 0 && toObst < L * 0.2 ? (toObst / v).toFixed(2) + ' s' : '—';
        const lap = Math.max(0, (now - lapStart) / 1000);
        hud.lap.textContent = String(Math.floor(lap / 60)).padStart(2, '0') + ':' + (lap % 60).toFixed(1).padStart(4, '0');
    }

    function tick(now) {
        if (last === null) { last = now; lapStart = now; }
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;

        const vTarget = 150 - Math.min(90, curvature(s + 30) * 2600);
        v += (vTarget - v) * Math.min(1, dt * 2.5);
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

    // Static frame for reduced motion; otherwise animate only while visible.
    s = OBST_S - PASS_WINDOW * 0.4;
    v = 110;
    render(performance.now());
    if (reduced.matches) { hud.lap.textContent = '—'; return; }
    s = L * 0.05;
    history.length = 0;

    new IntersectionObserver((entries) => {
        entries[0].isIntersecting ? start() : stop();
    }).observe(svg);
    reduced.addEventListener('change', () => (reduced.matches ? stop() : start()));
})();
