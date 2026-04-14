// ==================== FUTURISTIC UI SOUND EFFECTS ====================
class UISound {
    constructor() {
        this.soundsEnabled = localStorage.getItem('uiSoundsEnabled') !== 'false';
        this.masterVolume = 0.4;
        
        // Sound file paths - users can add custom sounds to the /sounds folder
        this.sounds = {
            click: 'sounds/click.mp3',
            hover: 'sounds/hover.mp3',
            tabChange: 'sounds/tab-change.mp3'
        };

        // Audio elements cache
        this.audioCache = {};
    }

    playSound(soundType) {
        if (!this.soundsEnabled) return;

        const soundPath = this.sounds[soundType];
        if (!soundPath) {
            console.warn('Sound not found:', soundType);
            return;
        }

        try {
            // Create or reuse audio element
            if (!this.audioCache[soundType]) {
                const audio = new Audio(soundPath);
                audio.volume = this.masterVolume;
                this.audioCache[soundType] = audio;
            }

            const audio = this.audioCache[soundType];
            // Reset audio to start and play
            audio.currentTime = 0;
            const playPromise = audio.play();
            
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.log('Audio playback error:', error);
                });
            }
        } catch (error) {
            console.log('Error playing sound:', soundType, error);
        }
    }

    playClickSound() {
        this.playSound('click');
    }

    playHoverSound() {
        this.playSound('hover');
    }

    playTabChangeSound() {
        this.playSound('tabChange');
    }

    toggleSounds() {
        this.soundsEnabled = !this.soundsEnabled;
        localStorage.setItem('uiSoundsEnabled', this.soundsEnabled);
        return this.soundsEnabled;
    }
}

// Create global sound instance
const uiSounds = new UISound();

// ==================== INITIALIZE VIDEO TABS FUNCTION ====================

function initializeVideoTabs() {
    try {
        const tabButtons = document.querySelectorAll('.video-tab-button');
        const tabContents = document.querySelectorAll('.video-tab-content');
        
        if (tabButtons.length === 0) {
            console.log('No video tabs found');
            return;
        }
        
        console.log('Initializing video tabs with', tabButtons.length, 'buttons');
        
        tabButtons.forEach((button, index) => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                uiSounds.playTabChangeSound(); // Play sound on tab click
                const tabId = this.getAttribute('data-tab');
                
                console.log('Clicked tab:', tabId);
                
                // Remove active class from all buttons and contents
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));
                
                // Add active class to clicked button and corresponding content
                this.classList.add('active');
                const activeContent = document.getElementById(tabId);
                if (activeContent) {
                    activeContent.classList.add('active');
                    console.log('Activated tab content:', tabId);
                } else {
                    console.warn('Tab content not found:', tabId);
                }
            });

            // Add hover sound to tab buttons
            button.addEventListener('mouseenter', () => {
                uiSounds.playHoverSound();
            });
        });
    } catch (error) {
        console.error('Error initializing video tabs:', error);
    }
}

// ==================== OPTIMIZED PAGES INTERACTION HANDLER ====================
document.addEventListener('DOMContentLoaded', function() {
    'use strict';
    
    // Efficient navigation link handling
    const navLinks = document.querySelectorAll('.nav__link');
    const currentPath = window.location.pathname;
    
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (currentPath.includes(href) || (currentPath.endsWith('/') && href === 'index.html')) {
            link.classList.add('active');
        }
        
        link.addEventListener('click', function() {
            uiSounds.playClickSound(); // Play click sound
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });

        // Add hover sound to nav links
        link.addEventListener('mouseenter', () => {
            uiSounds.playHoverSound();
        });
    });
    
    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^=\"#\"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
    
    // Skill/Project card interaction
    const skillItems = document.querySelectorAll('.skill-item, .project-card');
    skillItems.forEach((item, index) => {
        item.addEventListener('mouseenter', function() {
            uiSounds.playHoverSound(); // Play hover sound
            requestAnimationFrame(() => {
                this.classList.add('hovered');
            });
        });
        
        item.addEventListener('mouseleave', function() {
            requestAnimationFrame(() => {
                this.classList.remove('hovered');
            });
        });

        item.addEventListener('click', function() {
            uiSounds.playClickSound(); // Play click sound
        });
    });
    
    // Lazy initialization for heavy elements
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    
    document.querySelectorAll('.dialogue-content, .skill-item, .project-card').forEach(el => {
        observer.observe(el);
    });
    
    // Add click sound to ALL buttons on the page
    document.querySelectorAll('button').forEach(button => {
        button.addEventListener('click', function(e) {
            uiSounds.playClickSound();
        });
    });
    
    // Initialize video tabs
    initializeVideoTabs();

    // UI Sounds Toggle Button
    const soundsToggle = document.getElementById('uiSoundsToggle');
    if (soundsToggle) {
        // Update button state on load
        if (!uiSounds.soundsEnabled) {
            soundsToggle.classList.add('disabled');
        }

        soundsToggle.addEventListener('click', function(e) {
            e.preventDefault();
            const enabled = uiSounds.toggleSounds();
            
            if (enabled) {
                soundsToggle.classList.remove('disabled');
                uiSounds.playClickSound(); // Play sound when enabled
                console.log('UI sounds enabled');
            } else {
                soundsToggle.classList.add('disabled');
                console.log('UI sounds disabled');
            }
        });

        // Add hover sound to toggle button
        soundsToggle.addEventListener('mouseenter', () => {
            if (uiSounds.soundsEnabled) {
                uiSounds.playHoverSound();
            }
        });
    }
});

    
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    commentForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const name = document.getElementById('commentName').value.trim();
        const email = document.getElementById('commentEmail').value.trim();
        const text = document.getElementById('commentText').value.trim();
        
        if (name && email && text) {
            const comments = JSON.parse(localStorage.getItem('portfolioComments')) || [];
            comments.unshift({ name, email, text });
            localStorage.setItem('portfolioComments', JSON.stringify(comments));
            
            commentForm.reset();
            loadComments();
        }
    });
    
    loadComments();

    
// Background Music Handler (optimized)
function initializeAudioPlayer() {
    const bgMusic = document.getElementById('bgMusic');
    const muteButton = document.getElementById('muteButton');
    
    if (!bgMusic || !muteButton) return;
    
    const isMuted = localStorage.getItem('audioMuted') === 'true';
    const savedCurrentTime = parseFloat(localStorage.getItem('audioCurrentTime')) || 0;
    
    if (isMuted) {
        bgMusic.muted = true;
        muteButton.classList.add('muted');
    }
    
    // Restore playback position
    bgMusic.addEventListener('loadedmetadata', function() {
        if (bgMusic.readyState >= 2) {
            bgMusic.currentTime = Math.min(savedCurrentTime, bgMusic.duration);
        }
    });
    
    // Save on page navigation
    window.addEventListener('beforeunload', function() {
        localStorage.setItem('audioCurrentTime', bgMusic.currentTime.toString());
        localStorage.setItem('audioWasPlaying', !bgMusic.paused);
    });
    
    // Mute toggle
    muteButton.addEventListener('click', function(e) {
        e.stopPropagation();
        bgMusic.muted = !bgMusic.muted;
        
        if (bgMusic.muted) {
            muteButton.classList.add('muted');
            localStorage.setItem('audioMuted', 'true');
        } else {
            muteButton.classList.remove('muted');
            localStorage.setItem('audioMuted', 'false');
            bgMusic.play().catch(err => console.log('Audio play failed:', err));
        }
    });
    
    // Play on first user interaction
    function playAudio() {
        if (!bgMusic.muted && bgMusic.paused) {
            bgMusic.play().catch(err => console.log('Audio play failed:', err));
        }
    }
    
    document.addEventListener('click', playAudio, { once: true });
    document.addEventListener('keydown', playAudio, { once: true });
}

// Initialize on DOM ready - call early initialization functions
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        if (typeof initializeAudioPlayer === 'function') {
            initializeAudioPlayer();
        }
    });
} else {
    if (typeof initializeAudioPlayer === 'function') {
        initializeAudioPlayer();
    }
}

// Scroll optimization with throttling
let scrollTimeout = null;
window.addEventListener('scroll', function() {
    if (!scrollTimeout) {
        scrollTimeout = requestAnimationFrame(() => {
            // Lazy load logic can go here
            scrollTimeout = null;
        });
    }
}, { passive: true });

// Prevent layout thrashing
requestAnimationFrame(function() {
    // Batch DOM reads here if needed
});
