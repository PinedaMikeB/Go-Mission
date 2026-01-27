/**
 * Gospel Presentation Audio Controller
 * Syncs voiceover narration with slide transitions
 * 
 * Usage:
 *   GospelAudio.init() - Initialize audio system
 *   GospelAudio.playForSlide(slideIndex) - Play audio for specific slide range
 *   GospelAudio.pause() - Pause current audio
 *   GospelAudio.toggle() - Toggle play/pause
 */

const GospelAudio = {
    // Audio element
    audio: null,
    
    // Current state
    isPlaying: false,
    currentTrack: null,
    isMuted: false,
    
    // Audio tracks mapped to slide ranges
    // Format: { start: slideIndex, end: slideIndex, file: 'filename.wav', cues: [...] }
    tracks: [
        {
            id: 'intro-truth1',
            start: 0,  // Intro slide
            end: 2,    // John 3:16 verse slide
            file: '/assets/audio/gospel/slide_1_to_3.wav',
            // Timing cues in seconds for auto-advance (optional)
            cues: [
                { time: 0, slide: 0 },      // Intro
                { time: 8, slide: 1 },      // Truth 1 header (adjust based on actual audio)
                { time: 15, slide: 2 }      // John 3:16 verse (adjust based on actual audio)
            ]
        }
        // Add more tracks as they become available:
        // { id: 'truth2', start: 6, end: 15, file: '/assets/audio/gospel/truth2.wav', cues: [...] }
    ],
    
    /**
     * Initialize audio system
     */
    init() {
        // Create audio element if not exists
        if (!this.audio) {
            this.audio = new Audio();
            this.audio.preload = 'auto';
            
            // Event listeners
            this.audio.addEventListener('ended', () => this.onTrackEnd());
            this.audio.addEventListener('timeupdate', () => this.onTimeUpdate());
            this.audio.addEventListener('error', (e) => this.onError(e));
            this.audio.addEventListener('canplaythrough', () => this.onCanPlay());
        }
        
        // Load mute preference
        this.isMuted = localStorage.getItem('gospelAudioMuted') === 'true';
        this.audio.muted = this.isMuted;
        
        console.log('[GospelAudio] Initialized');
    },
    
    /**
     * Find track for a given slide index
     */
    getTrackForSlide(slideIndex) {
        return this.tracks.find(t => slideIndex >= t.start && slideIndex <= t.end);
    },
    
    /**
     * Play audio for a specific slide
     * Called by GospelPresentation.showSlide()
     */
    playForSlide(slideIndex) {
        const track = this.getTrackForSlide(slideIndex);
        
        if (!track) {
            // No audio for this slide, stop any playing audio
            this.stop();
            return;
        }
        
        // If same track is already playing, don't restart
        if (this.currentTrack?.id === track.id && this.isPlaying) {
            return;
        }
        
        // If different track or not playing, start new track
        this.loadAndPlay(track, slideIndex);
    },
    
    /**
     * Load and play a track
     */
    loadAndPlay(track, startSlide) {
        this.currentTrack = track;
        
        // Check if we need to seek to a specific position
        const cue = track.cues?.find(c => c.slide === startSlide);
        const startTime = cue?.time || 0;
        
        if (this.audio.src !== window.location.origin + track.file) {
            this.audio.src = track.file;
            this.audio.load();
        }
        
        this.audio.currentTime = startTime;
        
        if (!this.isMuted) {
            this.audio.play()
                .then(() => {
                    this.isPlaying = true;
                    this.updateUI();
                    console.log(`[GospelAudio] Playing: ${track.id} from ${startTime}s`);
                })
                .catch(e => {
                    console.warn('[GospelAudio] Autoplay blocked, user interaction needed:', e);
                    this.showPlayButton();
                });
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
        if (this.audio && this.currentTrack) {
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
            this.currentTrack = null;
            this.updateUI();
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
        
        if (this.isMuted) {
            this.pause();
        }
    },
    
    /**
     * Handle track end
     */
    onTrackEnd() {
        this.isPlaying = false;
        this.updateUI();
        console.log('[GospelAudio] Track ended');
    },
    
    /**
     * Handle time updates for auto-advance (optional feature)
     */
    onTimeUpdate() {
        // Optional: Auto-advance slides based on audio cues
        // Disabled by default - uncomment to enable
        /*
        if (!this.currentTrack?.cues) return;
        
        const currentTime = this.audio.currentTime;
        const nextCue = this.currentTrack.cues.find(c => 
            c.time > currentTime - 0.5 && c.time < currentTime + 0.5
        );
        
        if (nextCue && window.GospelPresentation) {
            const currentSlide = window.GospelPresentation.currentSlide;
            if (nextCue.slide !== currentSlide) {
                window.GospelPresentation.showSlide(nextCue.slide);
            }
        }
        */
    },
    
    /**
     * Handle audio errors
     */
    onError(e) {
        console.error('[GospelAudio] Error loading audio:', e);
        this.isPlaying = false;
        this.updateUI();
    },
    
    /**
     * Handle canplaythrough
     */
    onCanPlay() {
        console.log('[GospelAudio] Audio ready to play');
    },
    
    /**
     * Show manual play button (when autoplay is blocked)
     */
    showPlayButton() {
        // The UI button will show play state, user can click to start
        this.updateUI();
    },
    
    /**
     * Update UI to reflect current state
     */
    updateUI() {
        const audioBtn = document.getElementById('gospelAudioBtn');
        if (!audioBtn) return;
        
        if (this.isMuted) {
            audioBtn.innerHTML = `
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"/>
                </svg>
            `;
            audioBtn.title = 'Audio Muted - Click to unmute';
        } else if (this.isPlaying) {
            audioBtn.innerHTML = `
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/>
                </svg>
            `;
            audioBtn.title = 'Playing - Click to pause';
        } else {
            audioBtn.innerHTML = `
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/>
                </svg>
            `;
            audioBtn.title = 'Click to play audio';
        }
    },
    
    /**
     * Create audio control button HTML
     * To be injected into the modal header
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
     * Check if audio exists for current slide range
     */
    hasAudioForSlide(slideIndex) {
        return !!this.getTrackForSlide(slideIndex);
    }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => GospelAudio.init());
} else {
    GospelAudio.init();
}

window.GospelAudio = GospelAudio;
