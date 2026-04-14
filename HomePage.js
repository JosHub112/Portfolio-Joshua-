// Optimized Home Page Interaction Handler
document.addEventListener('DOMContentLoaded', function() {
    'use strict';
    
    // Initialize hero text animation
    const heroTitle = document.querySelector('h1');
    if (heroTitle) {
        // Stagger text reveal animation
        heroTitle.style.animation = 'pageSlideIn 0.4s ease-out forwards';
    }
    
    // Mute button initialization
    const muteButton = document.getElementById('muteButton');
    const bgMusic = document.getElementById('bgMusic');
    
    if (muteButton && bgMusic) {
        // Restore mute state from localStorage
        const isMuted = localStorage.getItem('audioMuted') === 'true';
        if (isMuted) {
            bgMusic.muted = true;
            muteButton.classList.add('muted');
        }
        
        // Toggle mute on button click
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
        
        // Restore playback position
        const savedCurrentTime = parseFloat(localStorage.getItem('audioCurrentTime')) || 0;
        if (bgMusic.readyState >= 2) {
            bgMusic.currentTime = Math.min(savedCurrentTime, bgMusic.duration);
        } else {
            bgMusic.addEventListener('loadedmetadata', function() {
                bgMusic.currentTime = Math.min(savedCurrentTime, bgMusic.duration);
            }, { once: true });
        }
        
        // Save playback state before page unload
        window.addEventListener('beforeunload', function() {
            localStorage.setItem('audioCurrentTime', bgMusic.currentTime.toString());
            localStorage.setItem('audioWasPlaying', !bgMusic.paused);
        });
        
        // Play on first user interaction (respects browser autoplay policies)
        function resumeAudio() {
            if (!bgMusic.muted && bgMusic.paused) {
                bgMusic.play().catch(err => console.log('Audio play failed:', err));
            }
            document.removeEventListener('click', resumeAudio);
            document.removeEventListener('keydown', resumeAudio);
        }
        
        document.addEventListener('click', resumeAudio);
        document.addEventListener('keydown', resumeAudio);
    }
    
    // Smooth scroll for navigation links
    const navLinks = document.querySelectorAll('.nav__link');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            // Only handle anchor links, let normal navigation work for page links
            if (href.startsWith('#')) {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        });
    });
    
    // Add active state to current nav link
    const currentPath = window.location.pathname;
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (currentPath.includes(href) || (currentPath.endsWith('/') && href === 'index.html')) {
            link.classList.add('active');
        }
    });
    
    // Optimize scroll performance with requestAnimationFrame
    let scrollFrameId = null;
    window.addEventListener('scroll', function() {
        if (scrollFrameId === null) {
            scrollFrameId = requestAnimationFrame(function() {
                // Parallax or scroll-triggered effects can go here
                scrollFrameId = null;
            });
        }
    }, { passive: true });
});

// Preload critical assets for better performance
window.addEventListener('load', function() {
    // Heavy operations after page load
    const images = document.querySelectorAll('img');
    const videos = document.querySelectorAll('video');
    
    // Lazy load images if supported
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(function(entries) {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const el = entry.target;
                    if (el.tagName === 'IMG' && el.dataset.src) {
                        el.src = el.dataset.src;
                        el.removeAttribute('data-src');
                    } else if (el.tagName === 'VIDEO' && el.dataset.src) {
                        el.src = el.dataset.src;
                        el.removeAttribute('data-src');
                    }
                    observer.unobserve(el);
                }
            });
        });
        
        images.forEach(img => observer.observe(img));
        videos.forEach(video => observer.observe(video));
    }
});

// Handle visibility changes
document.addEventListener('visibilitychange', function() {
    const bgMusic = document.getElementById('bgMusic');
    if (!bgMusic) return;
    
    if (document.hidden) {
        // Page is hidden
        localStorage.setItem('audioCurrentTime', bgMusic.currentTime.toString());
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    const bgMusic = document.getElementById('bgMusic');
    if (bgMusic) {
        localStorage.setItem('audioCurrentTime', bgMusic.currentTime.toString());
        localStorage.setItem('audioWasPlaying', !bgMusic.paused);
    }
});
