// src/js/main.js
import { PhysicsCard, CollisionSystem } from './physics.js';

// ===== Mobile Menu =====
const menuBtn = document.getElementById('menuToggle');
const closeBtn = document.getElementById('menuClose');
const mobileMenu = document.getElementById('mobileMenu');
const mobileLinks = document.querySelectorAll('.mobile-link');

const toggleMenu = () => {
    mobileMenu?.classList.toggle('hidden');
    document.body?.classList.toggle('overflow-hidden');
};

menuBtn?.addEventListener('click', toggleMenu);
closeBtn?.addEventListener('click', toggleMenu);
mobileLinks.forEach(link => link.addEventListener('click', toggleMenu));

// ===== Navbar Scroll Effect =====
const nav = document.getElementById('navbar');
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        nav?.classList.add('bg-surface-900/80', 'backdrop-blur-sm');
    } else {
        nav?.classList.remove('bg-surface-900/80', 'backdrop-blur-sm');
    }
}, { passive: true });

// ===== Fade-Up Animations =====
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
        } else {
            entry.target.classList.remove('in-view');
        }
    });
}, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));

// ===== Footer Year =====
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// ===== Cursor Glow =====
const cursorGlow = document.getElementById('cursor-glow');
let cursorX = 0, cursorY = 0, glowX = 0, glowY = 0;

document.addEventListener('mousemove', (e) => {
    cursorX = e.clientX;
    cursorY = e.clientY;
}, { passive: true });

function animateCursor() {
    glowX += (cursorX - glowX) * 0.1;
    glowY += (cursorY - glowY) * 0.1;
    if (cursorGlow) {
        cursorGlow.style.left = glowX + 'px';
        cursorGlow.style.top = glowY + 'px';
    }
    requestAnimationFrame(animateCursor);
}
animateCursor();

// ===== Reset Physics Button =====
const resetBtn = document.getElementById('resetPhysics');
if (resetBtn) {
    resetBtn.addEventListener('click', () => {
        document.querySelectorAll('[data-physics]').forEach(el => {
            el.style.transform = '';
        });
        // Visual feedback
        resetBtn.textContent = 'Reset!';
        setTimeout(() => { resetBtn.textContent = 'Reset Positions'; }, 1000);
    });
}

// ===== Initialize Physics =====
function initPhysics() {
    // Select ALL elements with data-physics attribute
    const elements = document.querySelectorAll('[data-physics]');

    // Filter: skip elements that are children of other physics elements (prevent nesting)
    const physicsElements = Array.from(elements).filter(el => {
        const parentPhysics = el.parentElement?.closest('[data-physics]');
        return !parentPhysics || parentPhysics === el;
    });

    // Mobile performance: limit total physics elements
    const isMobile = window.innerWidth < 768;
    const maxElements = isMobile ? 12 : 30;
    const selectedElements = physicsElements.slice(0, maxElements);

    // Initialize physics cards
    const physicsCards = selectedElements.map(el => new PhysicsCard(el));
    const collisions = new CollisionSystem(physicsCards);

    // Main game loop
    function gameLoop() {
        physicsCards.forEach(card => {
            card.applyPhysics();
            card.updateTransform();
        });
        collisions.check();
        requestAnimationFrame(gameLoop);
    }

    // Handle window resize for mobile detection
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            collisions.isMobile = window.innerWidth < 768;
            if (collisions.isMobile) collisions.interval = 24;
            else collisions.interval = 16;
        }, 150);
    });

    gameLoop();
}

// Start after DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPhysics);
} else {
    initPhysics();
}