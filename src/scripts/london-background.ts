// "London at night": the home page hero's canvas background. A low skyline of
// our own drawings (clock tower, dome, glass tower, wheel, terraces) with
// twinkling windows, the Thames as gentle waves in front of it, and a sky of
// drifting "code stars" that link up into constellations around the pointer.
// A click or tap sends a ripple (stretched like water on the river) and a
// small burst of code glyphs. Colours come from the theme tokens and are read
// again when the theme changes. With reduced motion it draws one still frame.

/** How strongly the skyline silhouette covers the hero background. */
export const SKYLINE_ALPHA = 0.35;
/** How strongly the river band covers the hero background. */
export const RIVER_ALPHA = 0.14;

const MAX_DPR = 2;
const LINK_RADIUS = 120;
const STAR_LINK = 90;
const GLYPHS = ["{ }", "</>", ";", "()"];
const PULSE_LIFE = 60;
const BURST_LIFE = 70;

interface Palette {
    border: string;
    window: string;
    stars: string[];
    river: string;
}

interface Star {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: number;
    glyph: string | null;
    phase: number;
}

interface CityLight {
    x: number;
    y: number;
    phase: number;
    speed: number;
}

interface Pulse {
    x: number;
    y: number;
    age: number;
    water: boolean;
}

interface Spark {
    x: number;
    y: number;
    vx: number;
    vy: number;
    age: number;
    glyph: string;
    color: number;
}

/** Small seeded random numbers, so the skyline is the same on every visit. */
function seeded(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function readPalette(): Palette {
    const style = getComputedStyle(document.documentElement);
    const token = (name: string, fallback: string) =>
        style.getPropertyValue(`--${name}`).trim() || fallback;
    const via = token("brand-via", "#7cb8ff");
    return {
        border: token("border", "#5b6b86"),
        window: token("kyu-yellow", "#f2d46b"),
        stars: [
            token("brand-from", "#5ee39a"),
            via,
            token("brand-to", "#ff7a6e"),
            token("text", "#f4f6fa"),
        ],
        river: via,
    };
}

/**
 * Starts the background on `canvas`, sized to `hero`. Returns a function that
 * stops it and removes its listeners.
 */
export function startLondonBackground(
    hero: HTMLElement,
    canvas: HTMLCanvasElement,
): () => void {
    const context = canvas.getContext("2d");
    if (!context) {
        return () => {};
    }
    const ctx = context;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const skyline = document.createElement("canvas");
    const skylineCtx = skyline.getContext("2d");

    let palette = readPalette();
    let width = 0;
    let height = 0;
    let dpr = 1;
    let riverTop = 0;
    let stars: Star[] = [];
    let windows: CityLight[] = [];
    const pulses: Pulse[] = [];
    const sparks: Spark[] = [];
    const pointer = { x: 0, y: 0, active: false };
    let time = 0;
    let frame = 0;
    let lastTime = 0;
    let onScreen = true;

    function resize(): void {
        dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
        width = hero.clientWidth;
        height = hero.clientHeight;
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        riverTop = height - Math.max(24, Math.min(48, height * 0.08));
        seedStars();
        drawSkyline();
        if (!running()) {
            draw(0);
        }
    }

    function seedStars(): void {
        const random = seeded(7);
        const cap = width < 640 ? 35 : 80;
        const count = Math.min(cap, Math.round((width * height) / 12000));
        stars = Array.from({ length: count }, () => ({
            x: random() * width,
            y: random() * riverTop * 0.85,
            vx: (random() - 0.5) * 0.12 + 0.04,
            vy: (random() - 0.5) * 0.04,
            size: random() * 1.4 + 0.8,
            color: Math.floor(random() * palette.stars.length),
            glyph:
                random() < 0.15
                    ? GLYPHS[Math.floor(random() * GLYPHS.length)]
                    : null,
            phase: random() * Math.PI * 2,
        }));
    }

    // The skyline is drawn once per size and theme into an offscreen canvas in
    // a single colour, then laid over the scene at SKYLINE_ALPHA, so
    // overlapping buildings do not get darker.
    function drawSkyline(): void {
        if (!skylineCtx) {
            return;
        }
        skyline.width = canvas.width;
        skyline.height = canvas.height;
        const sky = skylineCtx;
        sky.setTransform(dpr, 0, 0, dpr, 0, 0);
        sky.clearRect(0, 0, width, height);
        sky.fillStyle = palette.border;
        sky.strokeStyle = palette.border;
        windows = [];

        const random = seeded(2026);
        const base = riverTop;
        const tall = Math.min(height * 0.22, 150);

        // Filler: offices with flat roofs and terraces with pitched roofs
        for (let x = -10; x < width + 10;) {
            const w = 22 + random() * 40;
            const h = tall * (0.18 + random() * 0.4);
            if (random() < 0.45) {
                const roof = Math.min(14, w * 0.35);
                sky.fillRect(x, base - h, w, h);
                sky.beginPath();
                sky.moveTo(x, base - h);
                sky.lineTo(x + w / 2, base - h - roof);
                sky.lineTo(x + w, base - h);
                sky.fill();
                sky.fillRect(x + w * 0.7, base - h - roof, 4, roof * 0.8);
            } else {
                sky.fillRect(x, base - h, w, h);
                if (random() < 0.3) {
                    sky.fillRect(x + w / 2, base - h - 10, 1.5, 10);
                }
            }
            addWindows(random, x, base - h, w);
            x += w + random() * 6;
        }

        // Landmarks: clock tower, dome, wheel and a pointed glass tower
        clockTower(sky, width * 0.14, base, tall * 0.95);
        dome(sky, width * 0.34, base, Math.min(30, tall * 0.26));
        wheel(sky, width * 0.58, base, Math.min(52, tall * 0.42));
        glassTower(sky, width * 0.82, base, tall * 1.05);
    }

    function addWindows(
        random: () => number,
        x: number,
        top: number,
        w: number,
    ): void {
        for (let wy = top + 6; wy < riverTop - 6; wy += 9) {
            for (let wx = x + 5; wx < x + w - 6; wx += 8) {
                if (random() < 0.22) {
                    windows.push({
                        x: wx,
                        y: wy,
                        phase: random() * Math.PI * 2,
                        speed: 0.004 + random() * 0.012,
                    });
                }
            }
        }
    }

    function clockTower(
        sky: CanvasRenderingContext2D,
        cx: number,
        base: number,
        h: number,
    ): void {
        const w = 16;
        sky.fillRect(cx - w / 2, base - h, w, h);
        sky.fillRect(cx - w / 2 - 2, base - h, w + 4, 18);
        sky.beginPath();
        sky.moveTo(cx - w / 2 - 2, base - h);
        sky.lineTo(cx, base - h - 26);
        sky.lineTo(cx + w / 2 + 2, base - h);
        sky.fill();
        sky.fillRect(cx - 0.75, base - h - 34, 1.5, 9);
        // A long, low building at its foot
        sky.fillRect(cx + w / 2, base - h * 0.32, 70, h * 0.32);
        windows.push({ x: cx - 1.5, y: base - h + 7, phase: 0, speed: 0 });
    }

    function dome(
        sky: CanvasRenderingContext2D,
        cx: number,
        base: number,
        r: number,
    ): void {
        const body = r * 1.9;
        sky.fillRect(cx - r * 1.6, base - body, r * 3.2, body);
        sky.fillRect(cx - r * 0.75, base - body - r * 0.45, r * 1.5, r * 0.45);
        sky.beginPath();
        sky.arc(cx, base - body - r * 0.45, r * 0.75, Math.PI, 0);
        sky.fill();
        sky.fillRect(cx - 2, base - body - r * 1.4, 4, r * 0.3);
        sky.fillRect(cx - 0.75, base - body - r * 1.7, 1.5, r * 0.35);
    }

    function wheel(
        sky: CanvasRenderingContext2D,
        cx: number,
        base: number,
        r: number,
    ): void {
        const cy = base - r - 6;
        sky.lineWidth = 1.5;
        sky.beginPath();
        sky.arc(cx, cy, r, 0, Math.PI * 2);
        sky.stroke();
        sky.lineWidth = 0.75;
        for (let i = 0; i < 16; i++) {
            const angle = (i / 16) * Math.PI * 2;
            sky.beginPath();
            sky.moveTo(cx, cy);
            sky.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
            sky.stroke();
            sky.beginPath();
            sky.arc(
                cx + Math.cos(angle) * r,
                cy + Math.sin(angle) * r,
                2,
                0,
                Math.PI * 2,
            );
            sky.fill();
        }
        sky.lineWidth = 2;
        sky.beginPath();
        sky.moveTo(cx - r * 0.45, base);
        sky.lineTo(cx, cy);
        sky.lineTo(cx + r * 0.45, base);
        sky.stroke();
    }

    function glassTower(
        sky: CanvasRenderingContext2D,
        cx: number,
        base: number,
        h: number,
    ): void {
        const w = Math.min(46, h * 0.36);
        sky.beginPath();
        sky.moveTo(cx - w / 2, base);
        sky.lineTo(cx - 3, base - h);
        sky.lineTo(cx + 1, base - h * 0.95);
        sky.lineTo(cx + 5, base - h * 0.99);
        sky.lineTo(cx + w / 2, base);
        sky.fill();
    }

    function drawStars(delta: number, still: boolean): void {
        ctx.font = "12px ui-monospace, Menlo, Consolas, monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        for (const star of stars) {
            if (!still) {
                star.x += star.vx * delta;
                star.y += star.vy * delta;
                if (star.x > width + 20) {
                    star.x = -20;
                } else if (star.x < -20) {
                    star.x = width + 20;
                }
                if (star.y < 0 || star.y > riverTop * 0.9) {
                    star.vy = -star.vy;
                }
            }
            const twinkle = 0.55 + Math.sin(time * 0.02 + star.phase) * 0.25;
            ctx.globalAlpha = still ? 0.6 : twinkle;
            ctx.fillStyle = palette.stars[star.color];
            if (star.glyph) {
                ctx.globalAlpha *= 0.7;
                ctx.fillText(star.glyph, star.x, star.y);
            } else {
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1;
    }

    // Stars near the pointer join it and each other, like a constellation
    function drawConstellation(): void {
        if (!pointer.active) {
            return;
        }
        const near = stars.filter(
            (star) =>
                Math.hypot(star.x - pointer.x, star.y - pointer.y) <
                LINK_RADIUS,
        );
        ctx.lineWidth = 1;
        for (let i = 0; i < near.length; i++) {
            const a = near[i];
            const distance = Math.hypot(a.x - pointer.x, a.y - pointer.y);
            ctx.strokeStyle = palette.stars[a.color];
            ctx.globalAlpha = (1 - distance / LINK_RADIUS) * 0.45;
            ctx.beginPath();
            ctx.moveTo(pointer.x, pointer.y);
            ctx.lineTo(a.x, a.y);
            ctx.stroke();
            for (let j = i + 1; j < near.length; j++) {
                const b = near[j];
                const gap = Math.hypot(a.x - b.x, a.y - b.y);
                if (gap < STAR_LINK) {
                    ctx.globalAlpha = (1 - gap / STAR_LINK) * 0.3;
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.stroke();
                }
            }
        }
        ctx.globalAlpha = 1;
    }

    function drawCity(still: boolean): void {
        ctx.globalAlpha = SKYLINE_ALPHA;
        ctx.drawImage(skyline, 0, 0, width, height);
        ctx.fillStyle = palette.window;
        for (const light of windows) {
            const glow = still
                ? Math.sin(light.phase) > 0
                    ? 0.55
                    : 0.15
                : 0.35 + Math.sin(time * light.speed + light.phase) * 0.3;
            ctx.globalAlpha = Math.max(0.08, glow);
            ctx.fillRect(light.x, light.y, 3, 4);
        }
        ctx.globalAlpha = 1;
    }

    function drawRiver(): void {
        ctx.globalAlpha = RIVER_ALPHA;
        ctx.fillStyle = palette.river;
        ctx.fillRect(0, riverTop, width, height - riverTop);
        ctx.strokeStyle = palette.river;
        ctx.lineWidth = 1;
        const depth = height - riverTop;
        for (let line = 0; line < 3; line++) {
            const y = riverTop + depth * (0.25 + line * 0.25);
            ctx.globalAlpha = 0.35 - line * 0.08;
            ctx.beginPath();
            for (let x = 0; x <= width; x += 8) {
                const wave =
                    Math.sin(x * 0.03 + time * (0.02 + line * 0.006) + line) *
                    (1.5 + line);
                if (x === 0) {
                    ctx.moveTo(x, y + wave);
                } else {
                    ctx.lineTo(x, y + wave);
                }
            }
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    }

    function drawEffects(delta: number): void {
        ctx.lineWidth = 2;
        for (let i = pulses.length - 1; i >= 0; i--) {
            const pulse = pulses[i];
            pulse.age += delta;
            const progress = pulse.age / PULSE_LIFE;
            if (progress >= 1) {
                pulses.splice(i, 1);
                continue;
            }
            const radius = 8 + progress * 70;
            ctx.globalAlpha = (1 - progress) * 0.8;
            ctx.strokeStyle = palette.river;
            ctx.beginPath();
            if (pulse.water) {
                ctx.ellipse(
                    pulse.x,
                    pulse.y,
                    radius * 2.2,
                    radius * 0.35,
                    0,
                    0,
                    Math.PI * 2,
                );
            } else {
                ctx.arc(pulse.x, pulse.y, radius, 0, Math.PI * 2);
            }
            ctx.stroke();
        }
        ctx.font = "bold 14px ui-monospace, Menlo, Consolas, monospace";
        for (let i = sparks.length - 1; i >= 0; i--) {
            const spark = sparks[i];
            spark.age += delta;
            if (spark.age >= BURST_LIFE) {
                sparks.splice(i, 1);
                continue;
            }
            spark.x += spark.vx * delta;
            spark.y += spark.vy * delta;
            spark.vy += 0.015 * delta;
            ctx.globalAlpha = 1 - spark.age / BURST_LIFE;
            ctx.fillStyle = palette.stars[spark.color];
            ctx.fillText(spark.glyph, spark.x, spark.y);
        }
        ctx.globalAlpha = 1;
    }

    function draw(delta: number): void {
        const still = !running();
        time += delta;
        ctx.clearRect(0, 0, width, height);
        drawStars(delta, still);
        if (!still) {
            drawConstellation();
        }
        drawCity(still);
        drawRiver();
        if (!still) {
            drawEffects(delta);
        }
    }

    function loop(now: number): void {
        // Delta in 60fps frames, clamped so a long pause does not jump the scene
        const delta = lastTime
            ? Math.min(3, (now - lastTime) / (1000 / 60))
            : 1;
        lastTime = now;
        draw(delta);
        frame = requestAnimationFrame(loop);
    }

    function running(): boolean {
        return frame !== 0;
    }

    function start(): void {
        if (
            running() ||
            reducedMotion.matches ||
            document.hidden ||
            !onScreen
        ) {
            return;
        }
        lastTime = 0;
        canvas.dataset.mode = "animated";
        frame = requestAnimationFrame(loop);
    }

    function stop(): void {
        cancelAnimationFrame(frame);
        frame = 0;
    }

    function still(): void {
        stop();
        canvas.dataset.mode = "static";
        draw(0);
    }

    const ignored = (event: Event) =>
        !!(event.target as Element | null)?.closest?.("a, button");

    function onPointerMove(event: PointerEvent): void {
        const bounds = hero.getBoundingClientRect();
        pointer.x = event.clientX - bounds.left;
        pointer.y = event.clientY - bounds.top;
        pointer.active = true;
    }

    function onPointerLeave(): void {
        pointer.active = false;
    }

    function onPointerDown(event: PointerEvent): void {
        if (!running() || ignored(event)) {
            return;
        }
        const bounds = hero.getBoundingClientRect();
        const x = event.clientX - bounds.left;
        const y = event.clientY - bounds.top;
        pulses.push({ x, y, age: 0, water: y >= riverTop });
        const count = 6 + Math.floor(Math.random() * 5);
        for (let i = 0; i < count; i++) {
            const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9;
            const speed = 0.8 + Math.random() * 1.2;
            sparks.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                age: 0,
                glyph: GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
                color: Math.floor(Math.random() * 3),
            });
        }
    }

    function onVisibility(): void {
        if (document.hidden) {
            stop();
        } else {
            start();
        }
    }

    function onMotionChange(): void {
        if (reducedMotion.matches) {
            still();
        } else {
            start();
        }
    }

    hero.addEventListener("pointermove", onPointerMove, { passive: true });
    hero.addEventListener("pointerleave", onPointerLeave);
    hero.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("visibilitychange", onVisibility);
    reducedMotion.addEventListener("change", onMotionChange);

    // New colours when the theme toggle changes data-theme on <html>
    const themeObserver = new MutationObserver(() => {
        palette = readPalette();
        drawSkyline();
        if (!running()) {
            draw(0);
        }
    });
    themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-theme"],
    });

    // Pause while the hero is scrolled out of view
    const viewObserver = new IntersectionObserver((entries) => {
        onScreen = entries.some((entry) => entry.isIntersecting);
        if (onScreen) {
            start();
        } else {
            stop();
        }
    });
    viewObserver.observe(hero);

    const sizeObserver = new ResizeObserver(resize);
    sizeObserver.observe(hero);

    resize();
    if (reducedMotion.matches) {
        still();
    } else {
        start();
    }

    return () => {
        stop();
        hero.removeEventListener("pointermove", onPointerMove);
        hero.removeEventListener("pointerleave", onPointerLeave);
        hero.removeEventListener("pointerdown", onPointerDown);
        document.removeEventListener("visibilitychange", onVisibility);
        reducedMotion.removeEventListener("change", onMotionChange);
        themeObserver.disconnect();
        viewObserver.disconnect();
        sizeObserver.disconnect();
    };
}
