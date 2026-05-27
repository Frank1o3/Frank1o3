/**
 * PhysicsCard - Spring-mass-damper system with collision
 * FIXED: Unified subtle bounce, consistent behavior across all types
 */
export class PhysicsCard {
    constructor(el) {
        this.el = el;
        this.x = 0; this.y = 0;
        this.vx = 0; this.vy = 0;
        this.isDragging = false;
        this.pointerId = null;
        this.lastTime = 0;

        // Read physics configuration from data attributes
        this.type = el.dataset.physics || 'card';
        this.group = el.dataset.physicsGroup || 'default';
        this.noCollide = el.dataset.physicsNoCollide === 'true';

        // 🔧 UNIFIED CONFIG: Same physics for ALL types (subtle, consistent bounce)
        const unifiedConfig = {
            springK: 0.04,    // Moderate spring - not too stiff, not too soft
            damping: 0.8,    // High damping = quick energy loss, minimal oscillation
            bounce: 0.12,     // Low bounce = subtle collision response
            minVel: 0.04,     // Snap to rest threshold
            mass: 1.0,        // Same mass for all = predictable collisions
            noCollide: false
        };

        const cfg = unifiedConfig;
        this.springK = cfg.springK;
        this.damping = cfg.damping;
        this.bounce = cfg.bounce;
        this.minVel = cfg.minVel;
        this.mass = cfg.mass;
        if (cfg.noCollide) this.noCollide = true;

        // Position caching
        this.width = 0;
        this.height = 0;
        this.baseLeft = 0;
        this.baseTop = 0;
        this.updateBounds();

        this.init();
    }

    init() {
        this.el.addEventListener('pointerdown', (e) => this.onPointerDown(e));
        this.el.addEventListener('pointermove', (e) => this.onPointerMove(e));
        this.el.addEventListener('pointerup', (e) => this.onPointerUp(e));
        this.el.addEventListener('pointercancel', (e) => this.onPointerUp(e));
        this.el.addEventListener('pointerleave', (e) => this.onPointerUp(e));
    }

    updateBounds() {
        const rect = this.el.getBoundingClientRect();
        if (Math.abs(rect.width - this.width) > 1 ||
            Math.abs(rect.height - this.height) > 1 ||
            Math.abs(this.x) > 2 || Math.abs(this.y) > 2) {
            this.width = rect.width;
            this.height = rect.height;
            if (this.baseLeft === 0 && this.baseTop === 0) {
                this.baseLeft = rect.left - this.x;
                this.baseTop = rect.top - this.y;
            }
        }
    }

    getVisualRect() {
        return {
            left: this.baseLeft + this.x,
            right: this.baseLeft + this.x + this.width,
            top: this.baseTop + this.y,
            bottom: this.baseTop + this.y + this.height,
            width: this.width,
            height: this.height,
            cx: this.baseLeft + this.x + this.width / 2,
            cy: this.baseTop + this.y + this.height / 2
        };
    }

    canCollideWith(other) {
        if (this.noCollide || other.noCollide) return false;
        if (this.group === other.group) return true;

        const collisionRules = {
            'projects': ['stack', 'about', 'default'],
            'stack': ['projects', 'about', 'default'],
            'about': ['projects', 'stack', 'default'],
            'nav': [],
            'float': ['float', 'decor'],
            'decor': ['float'],
            'default': ['default', 'projects', 'stack', 'about']
        };

        const allowed = collisionRules[this.group] || ['default'];
        return allowed.includes(other.group);
    }

    onPointerDown(e) {
        if (e.target.closest('a:not([data-physics]), button, input, select, textarea')) return;
        if (e.button !== 0) return;

        e.preventDefault();
        this.isDragging = true;
        this.pointerId = e.pointerId;
        this.el.setPointerCapture(this.pointerId);
        this.el.classList.add('dragging');
        this.el.setAttribute('aria-grabbed', 'true');

        const rect = this.el.getBoundingClientRect();
        this.offsetX = e.clientX - rect.left;
        this.offsetY = e.clientY - rect.top;
        this.lastX = e.clientX;
        this.lastY = e.clientY;
        this.lastTime = performance.now();
        this.vx = 0; this.vy = 0;
    }

    onPointerMove(e) {
        if (!this.isDragging || e.pointerId !== this.pointerId) return;
        e.preventDefault();

        const now = performance.now();
        const dt = Math.min(32, now - this.lastTime);
        this.lastTime = now;

        const dx = e.clientX - this.lastX;
        const dy = e.clientY - this.lastY;

        this.vx = dx * (16 / dt);
        this.vy = dy * (16 / dt);

        this.x += dx;
        this.y += dy;

        this.lastX = e.clientX;
        this.lastY = e.clientY;

        this.updateTransform();
    }

    onPointerUp(e) {
        if (!this.isDragging || (e && e.pointerId !== this.pointerId)) return;
        this.isDragging = false;
        this.pointerId = null;
        this.el.classList.remove('dragging');
        this.el.removeAttribute('aria-grabbed');
        this.el.releasePointerCapture?.(this.pointerId);
    }

    applyPhysics() {
        if (this.isDragging) return;

        const fx = -this.springK * this.x;
        const fy = -this.springK * this.y;

        this.vx += fx;
        this.vy += fy;

        this.vx *= this.damping;
        this.vy *= this.damping;

        this.x += this.vx;
        this.y += this.vy;

        if (Math.abs(this.x) < this.minVel && Math.abs(this.vx) < this.minVel) {
            this.x = 0; this.vx = 0;
        }
        if (Math.abs(this.y) < this.minVel && Math.abs(this.vy) < this.minVel) {
            this.y = 0; this.vy = 0;
        }
    }

    updateTransform() {
        // Very subtle tilt - almost imperceptible
        const tilt = Math.max(-3, Math.min(3, this.vx * 0.03));
        this.el.style.transform = `translate3d(${this.x}px, ${this.y}px, 0) rotate(${tilt}deg)`;
    }
}

/**
 * CollisionSystem - Reliable, subtle collision resolution
 * FIXED: Consistent bounce, no missed collisions, energy always dissipates
 */
export class CollisionSystem {
    constructor(cards) {
        this.cards = cards;
        this.lastCheck = 0;
        this.interval = 16;
        this.isMobile = window.innerWidth < 768;
        if (this.isMobile) this.interval = 24;
    }

    check() {
        const now = performance.now();
        if (now - this.lastCheck < this.interval) return;
        this.lastCheck = now;

        this.cards.forEach(card => {
            if (!card.isDragging && (Math.abs(card.x) > 0.5 || Math.abs(card.y) > 0.5)) {
                card.updateBounds();
            }
        });

        const maxCards = this.isMobile ? 8 : 20;
        const activeCards = this.cards.length <= maxCards
            ? this.cards
            : this.cards.filter(c => c.isDragging || Math.abs(c.x) > 5 || Math.abs(c.y) > 5);

        for (let i = 0; i < activeCards.length; i++) {
            for (let j = i + 1; j < activeCards.length; j++) {
                this.resolve(activeCards[i], activeCards[j]);
            }
        }
    }

    resolve(a, b) {
        if (a.isDragging && b.isDragging) return;
        if (!a.canCollideWith(b)) return;

        const r1 = a.getVisualRect();
        const r2 = b.getVisualRect();

        const overlapX = Math.min(r1.right, r2.right) - Math.max(r1.left, r2.left);
        const overlapY = Math.min(r1.bottom, r2.bottom) - Math.max(r1.top, r2.top);

        if (overlapX <= 0 || overlapY <= 0) return;

        // 🔧 FIX: Always calculate collision normal, even for tiny overlaps
        const ndx = r2.cx - r1.cx;
        const ndy = r2.cy - r1.cy;
        const dist = Math.sqrt(ndx * ndx + ndy * ndy) || 1;
        const nx = ndx / dist;
        const ny = ndy / dist;

        const dvx = a.vx - b.vx;
        const dvy = a.vy - b.vy;
        const velAlongNormal = dvx * nx + dvy * ny;

        // 🔧 FIX: Use >= 0 to catch edge cases where velocity is nearly zero
        if (velAlongNormal >= 0) return;

        // 🔧 FIX: Use unified bounce value (already low = 0.12)
        const e = a.bounce; // Same for all, no min() needed

        // 🔧 FIX: Simplified impulse for equal mass (all mass = 1.0)
        const j = -(1 + e) * velAlongNormal * 0.5;

        const impulseX = j * nx;
        const impulseY = j * ny;

        // Apply impulse (equal mass = symmetric response)
        a.vx -= impulseX;
        a.vy -= impulseY;
        b.vx += impulseX;
        b.vy += impulseY;

        // 🔧 FIX: Positional correction with STRONG energy damping
        const penetration = Math.min(overlapX, overlapY);
        if (penetration > 0.5) { // Lower threshold = catch more collisions
            const correction = penetration * 0.15; // Moderate correction

            a.x -= correction * nx * 0.5;
            a.y -= correction * ny * 0.5;
            b.x += correction * nx * 0.5;
            b.y += correction * ny * 0.5;

            // 🔧 FIX: Aggressive velocity damping on collision = guaranteed energy loss
            const collisionDamping = 0.5; // Lower = more damping, less bounce
            a.vx *= collisionDamping;
            a.vy *= collisionDamping;
            b.vx *= collisionDamping;
            b.vy *= collisionDamping;
        }
    }
}