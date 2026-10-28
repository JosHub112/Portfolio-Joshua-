// ==================== UI SOUNDS (lazy, throttled, fails quietly) ====================
class UISound {
    constructor() {
        this.soundsEnabled = localStorage.getItem('uiSoundsEnabled') !== 'false';
        this.masterVolume = 0.4;
        this.sounds = {
            click: 'sounds/click.mp3',
            hover: 'sounds/hover.mp3',
            tabChange: 'sounds/tab-change.mp3'
        };
        this.audioCache = {};
        this.broken = new Set();   // sound files that failed to load are skipped from then on
        this.lastHover = 0;
    }

    playSound(type) {
        if (!this.soundsEnabled || this.broken.has(type) || !this.sounds[type]) return;
        let audio = this.audioCache[type];
        if (!audio) {
            audio = new Audio(this.sounds[type]);
            audio.volume = this.masterVolume;
            audio.addEventListener('error', () => this.broken.add(type), { once: true });
            this.audioCache[type] = audio;
        }
        try {
            audio.currentTime = 0;
            const p = audio.play();
            if (p) p.catch(() => {});
        } catch (e) { /* ignore */ }
    }

    playClickSound() { this.playSound('click'); }
    playTabChangeSound() { this.playSound('tabChange'); }
    playHoverSound() {
        const now = performance.now();
        if (now - this.lastHover < 90) return;   // throttle so hover sounds never stack up
        this.lastHover = now;
        this.playSound('hover');
    }

    toggleSounds() {
        this.soundsEnabled = !this.soundsEnabled;
        localStorage.setItem('uiSoundsEnabled', this.soundsEnabled);
        return this.soundsEnabled;
    }
}

const uiSounds = new UISound();

document.addEventListener('DOMContentLoaded', function () {
    'use strict';
    const root = document.documentElement;

    // ---------- Active nav link ----------
    const page = location.pathname.split('/').pop() || 'index.html';
    const links = [...document.querySelectorAll('.nav__link')];
    if (links.some(l => l.getAttribute('href') === page)) {
        links.forEach(l => l.classList.toggle('active', l.getAttribute('href') === page));
    }

    // ---------- Page transition (shard wipe) ----------
    document.addEventListener('click', function (e) {
        const a = e.target.closest('a[href]');
        if (!a) return;
        const href = a.getAttribute('href');

        if (href.startsWith('#')) {                       // smooth in-page anchors
            if (href.length > 1) {
                const target = document.querySelector(href);
                if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
            }
            return;
        }
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        if (a.target === '_blank' || a.hasAttribute('download') || /^(mailto:|tel:|javascript:)/i.test(href)) return;
        if (a.origin !== location.origin || a.href === location.href) return;

        e.preventDefault();
        uiSounds.playClickSound();
        root.classList.remove('ready');
        root.classList.add('leaving');
        setTimeout(() => { location.href = a.href; }, 620);
    });

    // Back/forward cache: make sure the wipe panels are not left covering the page
    window.addEventListener('pageshow', function (e) {
        if (e.persisted) { root.classList.remove('leaving'); root.classList.add('ready'); }
    });

    // ---------- Skill level bars (Crystarium style) ----------
    document.querySelectorAll('.skill-box[data-level]').forEach(box => {
        box.parentElement.style.setProperty('--lvl', Math.min(1, Number(box.dataset.level) / 100));
    });

    // ---------- Stagger CV sections ----------
    document.querySelectorAll('.cv-section').forEach((el, i) => {
        el.style.animationDelay = (0.2 + i * 0.07) + 's';
    });

    // ---------- Heavy media: preload the active tab so its first frame is visible ----------
    document.querySelectorAll('video').forEach(v => {
        const isActive = v.closest('.video-tab-content.active');
        v.preload = isActive ? 'auto' : 'metadata';
        if (isActive) v.load();
    });
    document.querySelectorAll('img').forEach(img => { img.loading = 'lazy'; img.decoding = 'async'; });

    // ---------- Code snippet lightbox ----------
    const snippetImages = document.querySelectorAll('.soulbond-snippet img');
    if (snippetImages.length) {
        const lightbox = document.createElement('div');
        lightbox.className = 'snippet-lightbox';
        lightbox.setAttribute('aria-hidden', 'true');
        lightbox.innerHTML = `
            <div class="snippet-lightbox__backdrop" data-lightbox-close></div>
            <div class="snippet-lightbox__dialog" role="dialog" aria-modal="true" aria-label="Expanded SoulBond code snippet">
                <button class="snippet-lightbox__close" type="button" aria-label="Close expanded image" data-lightbox-close>&times;</button>
                <img class="snippet-lightbox__image" alt="">
                <p class="snippet-lightbox__caption"></p>
            </div>
        `;
        document.body.appendChild(lightbox);

        const expandedImage = lightbox.querySelector('.snippet-lightbox__image');
        const caption = lightbox.querySelector('.snippet-lightbox__caption');
        const closeLightbox = () => {
            lightbox.classList.remove('is-open');
            lightbox.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('lightbox-open');
        };

        snippetImages.forEach(image => {
            image.setAttribute('tabindex', '0');
            image.setAttribute('role', 'button');
            image.setAttribute('aria-label', `${image.alt}. Click to expand.`);

            const openLightbox = () => {
                expandedImage.src = image.currentSrc || image.src;
                expandedImage.alt = image.alt;
                caption.textContent = image.closest('figure')?.querySelector('figcaption')?.textContent || '';
                lightbox.classList.add('is-open');
                lightbox.setAttribute('aria-hidden', 'false');
                document.body.classList.add('lightbox-open');
                lightbox.querySelector('.snippet-lightbox__close').focus();
            };

            image.addEventListener('click', openLightbox);
            image.addEventListener('keydown', event => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openLightbox();
                }
            });
        });

        lightbox.addEventListener('click', event => {
            if (event.target.closest('[data-lightbox-close]')) closeLightbox();
        });
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && lightbox.classList.contains('is-open')) closeLightbox();
        });
    }

    // ---------- Project tabs ----------
    const tabButtons = [...document.querySelectorAll('.video-tab-button')];
    const tabPanels = [...document.querySelectorAll('.video-tab-content')];
    tabButtons.forEach(btn => {
        btn.addEventListener('click', function () {
            if (btn.classList.contains('active')) return;
            uiSounds.playTabChangeSound();
            tabPanels.forEach(p => {
                p.classList.remove('active');
                p.querySelectorAll('video').forEach(v => v.pause());   // stop hidden videos
            });
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const panel = document.getElementById(btn.dataset.tab);
            if (panel) {
                panel.classList.add('active');
                panel.querySelectorAll('video').forEach(video => {
                    video.preload = 'auto';
                    video.load();
                });
            }
        });
    });

    // ---------- Sounds: delegated listeners (3 total instead of one per element) ----------
    const hoverSel = '.nav__link,.video-tab-button,.skill-item:not(.empty-slot),.cta-button,.contact-link,.ui-sounds-button';
    document.addEventListener('mouseover', function (e) {
        const t = e.target.closest(hoverSel);
        if (t && !t.contains(e.relatedTarget)) uiSounds.playHoverSound();
    }, { passive: true });

    document.addEventListener('click', function (e) {
        if (e.target.closest('button:not(.video-tab-button):not(#uiSoundsToggle), .skill-item:not(.empty-slot)')) {
            uiSounds.playClickSound();
        }
    });

    const toggle = document.getElementById('uiSoundsToggle');
    if (toggle) {
        const icon = toggle.querySelector('.ui-sounds-icon');
        const sync = on => {
            toggle.classList.toggle('disabled', !on);
            if (icon) icon.textContent = on ? '\uD83D\uDD0A' : '\uD83D\uDD07';
        };
        sync(uiSounds.soundsEnabled);
        toggle.addEventListener('click', function (e) {
            e.preventDefault();
            const on = uiSounds.toggleSounds();
            sync(on);
            if (on) uiSounds.playClickSound();
        });
    }

    // ---------- Local visitor reviews ----------
    const reviewForm = document.getElementById('reviewForm');
    const reviewEntries = document.getElementById('reviewEntries');
    const reviewStatus = document.getElementById('reviewStatus');
    if (reviewForm && reviewEntries) {
        const reviewStorageKey = 'portfolioReviews';
        const getReviews = () => {
            try {
                return JSON.parse(localStorage.getItem(reviewStorageKey) || '[]');
            } catch (error) {
                return [];
            }
        };

        const renderReviews = () => {
            const reviews = getReviews();
            reviewEntries.replaceChildren();
            if (!reviews.length) {
                const empty = document.createElement('p');
                empty.className = 'review-list__empty';
                empty.textContent = 'No reviews yet. Be the first to leave one.';
                reviewEntries.appendChild(empty);
                return;
            }

            reviews.slice().reverse().forEach(review => {
                const article = document.createElement('article');
                article.className = 'review-entry';

                const avatar = document.createElement('span');
                avatar.className = `review-entry__avatar review-entry__avatar--${review.avatar.toLowerCase()}`;
                avatar.textContent = review.avatar;
                avatar.setAttribute('aria-hidden', 'true');

                const content = document.createElement('div');
                content.className = 'review-entry__content';
                const heading = document.createElement('h4');
                heading.className = 'review-entry__name';
                heading.textContent = review.name;
                const comment = document.createElement('p');
                comment.className = 'review-entry__comment';
                comment.textContent = review.comment;
                content.append(heading, comment);
                article.append(avatar, content);
                reviewEntries.appendChild(article);
            });
        };

        reviewForm.addEventListener('submit', event => {
            event.preventDefault();
            const formData = new FormData(reviewForm);
            const review = {
                name: String(formData.get('name')).trim(),
                avatar: String(formData.get('avatar') || 'A'),
                comment: String(formData.get('comment')).trim()
            };
            if (!review.name || !review.comment) return;

            const reviews = getReviews();
            reviews.push(review);
            localStorage.setItem(reviewStorageKey, JSON.stringify(reviews.slice(-20)));
            reviewForm.reset();
            renderReviews();
            if (reviewStatus) reviewStatus.textContent = 'Your review has been added.';
        });

        renderReviews();
    }
});