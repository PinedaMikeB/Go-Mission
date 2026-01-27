/**
 * Gospel Presentation Audio Controller
 * One audio file per slide - plays when slide is shown
 * 
 * Usage:
 *   GospelAudio.init() - Initialize audio system
 *   GospelAudio.playForSlide(slideIndex) - Play audio for specific slide
 *   GospelAudio.pause() - Pause current audio
 *   GospelAudio.toggle() - Toggle play/pause
 */

const GospelAudio = {
    // Audio element
    audio: null,
    
    // Current state
    isPlaying: false,
    currentSlide: null,
    isMuted: false,
    
    // Audio files mapped to slide index
    // Add entries as audio files become available
    slideAudio: {
        0: '/assets/audio/gospel/slide_0.wav',  // Intro
        1: '/assets/audio/gospel/slide_1.wav',  // Truth 1 header
        2: '/assets/audio/gospel/slide_2.wav',  // John 3:16
        // Add more as recorded:
        // 3: '/assets/audio/gospel/slide_3.wav',  // Question 1
        // 4: '/assets/audio/gospel/slide_4.wav',  // Question 2
        // ...
    },
    
    /**
     * Initialize audio system
     */
    init() {
        if (!this.audio) {
            this.audio = new Audio();
            this.audio.preload = 'auto';
            
            this.audio.addEventListener('ended', () => this.onTrackEnd());
            this.audio.addEventListener('error', (e) => this.onError(e));
        }
        
        // Load mute preference
        this.isMuted = localStorage.getItem('gospelAudioMuted') === 'true';
        this.audio.muted = this.isMuted;
        
        console.log('[GospelAudio] Initialized - slide-per-slide mode');
    },
    
    /**
     * Play audio for a specific slide
     * Called by GospelPresentation.showSlide()
     */
    playForSlide(slideIndex) {
        // Stop any currently playing audio
        this.stop();
        
        // Check if this slide has audio
        const audioFile = this.slideAudio[slideIndex];
        if (!audioFile) {
            console.log(`[GospelAudio] No audio for slide ${slideIndex}`);
            return;
        }
        
        this.currentSlide = slideIndex;
        this.audio.src = audioFile;
        this.audio.load();
        
        if (!this.isMuted) {
            this.audio.play()
                .then(() => {
                    this.isPlaying = true;
                    this.updateUI();
                    console.log(`[GospelAudio] Playing slide ${slideIndex}`);
                })
                .catch(e => {
                    console.warn('[GospelAudio] Autoplay blocked:', e.message);
                    this.showPlayPrompt();
                });
        }
    },
    
    /**
     * Replay current slide's audio
     */
    replay() {
        if (this.currentSlide !== null && this.slideAudio[this.currentSlide]) {
            this.audio.currentTime = 0;
            this.audio.play()
                .then(() => {
                    this.isPlaying = true;
                    this.updateUI();
                })
                .catch(e => console.warn('[GospelAudio] Replay failed:', e));
        }
    },
    
    /**
     * Pause audio
     */
    pause() {
        if (this.audio) {
            this.audio.pause();
            this.isPlaying = false;
            this.updateUI();
        }
    },
    
    /**
     * Resume audio
     */
    play() {
        if (this.audio && this.currentSlide !== null) {
            this.audio.play()
                .then(() => {
                    this.isPlaying = true;
                    this.updateUI();
                })
                .catch(e => console.warn('[GospelAudio] Play failed:', e));
        }
    },
    
    /**
     * Toggle play/pause
     */
    toggle() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    },
    
    /**
     * Stop and reset
     */
    stop() {
        if (this.audio) {
            this.audio.pause();
            this.audio.currentTime = 0;
            this.isPlaying = false;
        }
    },
    
    /**
     * Toggle mute
     */
    toggleMute() {
        this.isMuted = !this.isMuted;
        this.audio.muted = this.isMuted;
        localStorage.setItem('gospelAudioMuted', this.isMuted);
        this.updateUI();
        
        // If unmuting and on a slide with audio, play it
        if (!this.isMuted && this.currentSlide !== null && this.slideAudio[this.currentSlide]) {
            this.replay();
        }
    },
    
    /**
     * Handle track end
     */
    onTrackEnd() {
        this.isPlaying = false;
        this.updateUI();
        console.log(`[GospelAudio] Slide ${this.currentSlide} audio ended`);
    },
    
    /**
     * Handle audio errors
     */
    onError(e) {
        console.warn('[GospelAudio] Error loading audio:', e);
        this.isPlaying = false;
        this.updateUI();
    },
    
    /**
     * Show prompt when autoplay is blocked
     */
    showPlayPrompt() {
        this.updateUI();
        // User can click the audio button to start
    },
    
    /**
     * Update UI to reflect current state
     */
    updateUI() {
        const audioBtn = document.getElementById('gospelAudioBtn');
        if (!audioBtn) return;
        
        const hasAudio = this.currentSlide !== null && this.slideAudio[this.currentSlide];
        
        if (this.isMuted) {
            audioBtn.innerHTML = `
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"/>
                </svg>
            `;
            audioBtn.classList.remove('text-[var(--mission-gold)]');
            audioBtn.classList.add('text-[var(--text-muted)]');
        } else if (this.isPlaying) {
            audioBtn.innerHTML = `
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/>
                </svg>
            `;
            audioBtn.classList.add('text-[var(--mission-gold)]');
            audioBtn.classList.remove('text-[var(--text-muted)]');
        } else {
            audioBtn.innerHTML = `
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/>
                </svg>
            `;
            audioBtn.classList.remove('text-[var(--mission-gold)]');
            audioBtn.classList.add(hasAudio ? 'text-[var(--text-color)]' : 'text-[var(--text-muted)]');
        }
    },
    
    /**
     * Create audio control button HTML
     */
    getButtonHTML() {
        return `
            <button 
                id="gospelAudioBtn" 
                onclick="GospelAudio.toggle()" 
                class="p-2 text-[var(--text-muted)] hover:text-[var(--mission-gold)] transition-colors"
                title="Toggle audio narration"
            >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/>
                </svg>
            </button>
        `;
    },
    
    /**
     * Check if audio exists for a slide
     */
    hasAudioForSlide(slideIndex) {
        return !!this.slideAudio[slideIndex];
    }
};

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => GospelAudio.init());
} else {
    GospelAudio.init();
}

window.GospelAudio = GospelAudio;
