/**
 * PhysicsCard - Spring-mass-damper system with collision
 * Fixed: Energy-conserving collisions + proper position handling
 */
export class PhysicsCard {
    constructor(el) {
        this.el = el;
        this.x = 0; this.y = 0;      // Physics offset from original position
        this.vx = 0; this.vy = 0;
        this.isDragging = false;
        this.pointerId = null;
        this.lastTime = 0;

        // Tuned physics constants (more damping for stability)
        this.springK = 0.02;         // Softer spring
        this.damping = 0.94;         // Higher damping = less oscillation
        this.bounce = 0.45;          // Lower bounce = less energy retention
        this.minVel = 0.08;

        this.width = 0;
        this.height = 0;
        this.baseLeft = 0;  // Cache original position
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
        this.width = rect.width;
        this.height = rect.height;
        // Cache the base position (when x=0, y=0)
        if (this.baseLeft === 0 && this.baseTop === 0) {
            this.baseLeft = rect.left - this.x;
            this.baseTop = rect.top - this.y;
        }
    }

    // Get current visual bounds including physics offset
    getVisualRect() {
        return {
            left: this.baseLeft + this.x,
            right: this.baseLeft + this.x + this.width,
            top: this.baseTop + this.y,
            bottom: this.baseTop + this.y + this.height,
            width: this.width,
            height: this.height,
            cx: this.baseLeft + this.x + this.width / 2,  // Center X
            cy: this.baseTop + this.y + this.height / 2   // Center Y
        };
    }

    onPointerDown(e) {
        if (e.target.closest('a, button')) return;
        if (e.button !== 0) return;

        e.preventDefault();
        this.isDragging = true;
        this.pointerId = e.pointerId;
        this.el.setPointerCapture(this.pointerId);
        this.el.classList.add('dragging');

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

        // Smooth velocity with frame-rate independence
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
        this.el.releasePointerCapture?.(this.pointerId);
    }

    applyPhysics() {
        if (this.isDragging) return;

        // Spring force (Hooke's law)
        const fx = -this.springK * this.x;
        const fy = -this.springK * this.y;

        this.vx += fx;
        this.vy += fy;

        // Damping (energy dissipation)
        this.vx *= this.damping;
        this.vy *= this.damping;

        // Update position
        this.x += this.vx;
        this.y += this.vy;

        // Snap to rest when nearly stationary
        if (Math.abs(this.x) < this.minVel && Math.abs(this.vx) < this.minVel) {
            this.x = 0; this.vx = 0;
        }
        if (Math.abs(this.y) < this.minVel && Math.abs(this.vy) < this.minVel) {
            this.y = 0; this.vy = 0;
        }
    }

    updateTransform() {
        // Subtle tilt based on horizontal velocity, clamped
        const tilt = Math.max(-5, Math.min(5, this.vx * 0.06));
        this.el.style.transform = `translate3d(${this.x}px, ${this.y}px, 0) rotate(${tilt}deg)`;
    }
}

/**
 * CollisionSystem - Energy-conserving pairwise collision resolution
 */
export class CollisionSystem {
    constructor(cards) {
        this.cards = cards;
        this.lastCheck = 0;
        this.interval = 16; // ~60fps
    }

    check() {
        const now = performance.now();
        if (now - this.lastCheck < this.interval) return;
        this.lastCheck = now;

        // Update bounds for cards that have moved significantly
        this.cards.forEach(card => {
            if (!card.isDragging && (Math.abs(card.x) > 0.5 || Math.abs(card.y) > 0.5)) {
                card.updateBounds();
            }
        });

        // Pairwise collision detection & resolution
        for (let i = 0; i < this.cards.length; i++) {
            for (let j = i + 1; j < this.cards.length; j++) {
                this.resolve(this.cards[i], this.cards[j]);
            }
        }
    }

    resolve(a, b) {
        if (a.isDragging || b.isDragging) return;

        // Get visual bounds (includes physics offset)
        const r1 = a.getVisualRect();
        const r2 = b.getVisualRect();

        // AABB overlap check
        const overlapX = Math.min(r1.right, r2.right) - Math.max(r1.left, r2.left);
        const overlapY = Math.min(r1.bottom, r2.bottom) - Math.max(r1.top, r2.top);

        if (overlapX <= 0 || overlapY <= 0) return; // No collision

        // Calculate collision normal (direction to separate)
        const ndx = r2.cx - r1.cx;
        const ndy = r2.cy - r1.cy;
        const dist = Math.sqrt(ndx * ndx + ndy * ndy) || 1;
        const nx = ndx / dist;
        const ny = ndy / dist;

        // Relative velocity along collision normal
        const dvx = a.vx - b.vx;
        const dvy = a.vy - b.vy;
        const velAlongNormal = dvx * nx + dvy * ny;

        // Skip if objects are moving apart
        if (velAlongNormal > 0) return;

        // Coefficient of restitution (bounce factor)
        const e = Math.min(a.bounce, b.bounce);

        // Impulse scalar for equal-mass elastic collision
        const j = -(1 + e) * velAlongNormal / 2;

        // Apply impulse to both objects (equal mass assumption)
        const impulseX = j * nx;
        const impulseY = j * ny;

        a.vx -= impulseX;
        a.vy -= impulseY;
        b.vx += impulseX;
        b.vy += impulseY;

        // Positional correction with energy damping
        // Only correct if penetration is significant
        const penetration = Math.min(overlapX, overlapY);
        if (penetration > 1) {
            // Very small correction factor to avoid energy injection
            const correctionPercent = 0.08;
            const correction = penetration * correctionPercent;

            // Separate objects along collision normal
            a.x -= correction * nx * 0.5;
            a.y -= correction * ny * 0.5;
            b.x += correction * nx * 0.5;
            b.y += correction * ny * 0.5;

            // Additional velocity damping on collision to dissipate energy
            a.vx *= 0.5;
            a.vy *= 0.5;
            b.vx *= 0.5;
            b.vy *= 0.5;
        }
    }
}