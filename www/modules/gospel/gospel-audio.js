/**
 * Gospel Presentation Audio Controller
 * Supports bilingual audio (Tagalog/English)
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
    currentAudioType: 'default',
    
    // Base paths for audio files (support both file:// local preview and deployed web root)
    basePaths: ['assets/audio/gospel/', '/assets/audio/gospel/'],
    
    // Tagalog audio files mapped to slide index
    // Slide index (0-based) → filename
    slideAudioTL: {
        // SLIDE 1: Intro
        0: 'Gospel Slide 1.wav',
        
        // SLIDE 2: Truth 1 Header
        1: 'Gospel Slide 2.wav',
        
        // SLIDE 3: John 3:16
        2: 'Gospel Slide 3.wav',
        
        // SLIDE 4: Question 1
        3: { 
            question: 'Gospel Slide 4 Question.wav',
            correct: 'Gospel Slide 4 Correct Answer.wav',
            wrong: 'Gospel Slide 4 Wrong Answer.wav'
        },
        
        // SLIDE 5: Question 2
        4: {
            question: 'Gospel Slide 5 Question.wav',
            correct: 'Gospel Slide 5 Correct Answer.wav',
            wrong: 'Gospel Slide 5 Wrong Answer.wav'
        },
        
        // SLIDE 6: Transition
        5: 'Gospel Slide 6.wav',
        
        // SLIDE 7: Truth 2 Header
        6: 'Gospel Slide 7.wav',
        
        // SLIDE 8: Romans 3:23
        7: 'Gospel Slide 8.wav',
        
        // SLIDE 9: Question 3
        8: {
            question: 'Gospel Slide 9 Question.wav',
            correct: 'Gospel Slide 9 Correct Answer.wav',
            wrong: 'Gospel Slide 9 Wrong Answer.wav'
        },
        
        // SLIDE 10: Transition
        9: 'Gospel Slide 10.wav',
        
        // SLIDE 11: Romans 6:23a
        10: 'Gospel Slide 11.wav',
        
        // SLIDE 12: Question 4
        11: {
            question: 'Gospel Slide 12 Question.wav',
            correct: 'Gospel Slide 12 Correct Answer.wav',
            wrong: 'Gospel Slide 12 Wrong Answer.wav'
        },
        
        // SLIDE 13: Transition
        12: 'Gospel Slide 13.wav',
        
        // SLIDE 14: Two Deaths
        13: 'Gospel Slide 14.wav',
        
        // SLIDE 15: Revelation 21:8
        14: 'Gospel Slide 15.wav',
        
        // SLIDE 16: Question 5
        15: {
            question: 'Gospel Slide 16 Question.wav',
            correct: 'Gopel Slide 16 Correct Answer.wav',  // Note: typo in filename
            wrong: 'Gospel Slide 16 Wrong Answer.wav'
        },
        
        // SLIDE 17: Truth 3 Intro
        16: 'Gospel Slide 17.wav',
        
        // SLIDE 18: Proverbs 14:12
        17: 'Gospel Slide 18.wav',
        
        // SLIDE 19: Human Efforts
        18: 'Gospel Slide 19.wav',
        
        // SLIDE 20: Transition
        19: 'Gospel Slide 20.wav',
        
        // SLIDE 21: Jesus is the Way Header
        20: 'Gospel Slide 21.wav',
        
        // SLIDE 22: John 14:6
        21: 'Gospel Slide 22.wav',
        
        // SLIDE 23: Question 6
        22: {
            question: 'Gospel Slide 23 Question.wav',
            correct: 'Gospel Slide 23 Correct Answer.wav',
            wrong: 'Gospel Slide 23 Wrong Answer.wav'
        },
        
        // SLIDE 24: Transition
        23: 'Gospel Slide 24.wav',
        
        // SLIDE 25: 1 Peter 3:18
        24: 'Gospel Slide 25.wav',
        
        // SLIDE 26: Question 7
        25: {
            question: 'Gospel Slide 26 Question.wav',
            correct: 'Gospel Slide 26 Correct Answer.wav',
            wrong: 'Gospel Slide 26 Wrong Answer.wav'
        },
        
        // SLIDE 27: Transition
        26: 'Gospel Slide 27.wav',
        
        // SLIDE 28: Truth 4 Header
        27: 'Gospel Slide 28.wav',
        
        // SLIDE 29: Ephesians 2:8-9
        28: 'Gospel Slide 29.wav',
        
        // SLIDE 30: Formula Question
        29: {
            question: 'Gospel Slide 30 Question.wav',
            correct: 'Gospel Slide 30 Correct Answer.wav',
            wrong: 'Gospel Slide 30 Wrong Answer.wav'
        },
        
        // SLIDE 31: Decision Choice (no audio - user reads)
        // 30: null,
        
        // SLIDE 32: Not Ready (no audio for now)
        // 31: null,
        
        // SLIDE 33: Prayer Intro (no audio for now)
        // 32: null,
        
        // SLIDE 34: Prayer
        33: {
            prayer: 'Gospel Slide 34 Prayer.wav',
            notAccepted: 'Gospel Slide 34 Button Hindi.wav'
        },
        
        // SLIDE 35: Not Accepted (uses Button Hindi audio)
        34: 'Gospel Slide 34 Button Hindi.wav',
        
        // SLIDE 36: Celebration
        35: 'Gospel Slide 35.wav',
        
        // SLIDE 37: Promise 1
        36: 'Gospel Slide 36.wav',
        
        // SLIDE 38: Promise 2
        37: 'Gospel Slide 37.wav',
        
        // SLIDE 39: Promise 3
        38: 'Gospel Slide 38.wav',
        
        // SLIDE 40: Final
        39: 'Gospel Slide 39.wav'
    },
    
    // English audio files - Located in /assets/audio/gospel/Gospel Audio English/
    slideAudioEN: {
        // SLIDE 1: Intro
        0: 'Gospel Audio English/Gospel Slide 1 EN.wav',
        
        // SLIDE 2: Truth 1 Header
        1: 'Gospel Audio English/Gospel Slide 2 EN.wav',
        
        // SLIDE 3: John 3:16
        2: 'Gospel Audio English/Gospel Slide 3 EN.wav',
        
        // SLIDE 4: Question 1
        3: { 
            question: 'Gospel Audio English/Gospel Slide 4 EN Question .wav',
            correct: 'Gospel Audio English/Gospel Slide 4 EN Correct Answer.wav',
            wrong: 'Gospel Audio English/Gospel Slide 4 EN Wrong Answer.wav'
        },
        
        // SLIDE 5: Question 2
        4: {
            question: 'Gospel Audio English/Gospel Slide 5 EN Question.wav',
            correct: 'Gospel Audio English/Gospel Slide 5 EN Correct Answer.wav',
            wrong: 'Gospel Audio English/Gospel Slide 5 EN Wrong Answer.wav'
        },
        
        // SLIDE 6: Transition
        5: 'Gospel Audio English/Gospel Slide  6 EN.wav',
        
        // SLIDE 7: Truth 2 Header
        6: 'Gospel Audio English/Gospel Slide 7 EN.wav',
        
        // SLIDE 8: Romans 3:23
        7: 'Gospel Audio English/Gospel Slide 8 EN.wav',
        
        // SLIDE 9: Question 3
        8: {
            question: 'Gospel Audio English/Gospel Slide 9 EN Question.wav',
            correct: 'Gospel Audio English/Gospel Slide 9 EN Correct Answer.wav',
            wrong: 'Gospel Audio English/Gospel Slide 9 EN Wrong Answer.wav'
        },
        
        // SLIDE 10: Transition
        9: 'Gospel Audio English/Gospel Slide 10 EN.wav',
        
        // SLIDE 11: Romans 6:23a
        10: 'Gospel Audio English/Gospel Slide 11 EN.wav',
        
        // SLIDE 12: Question 4
        11: {
            question: 'Gospel Audio English/Gospel Slide 12 EN Question.wav',
            correct: 'Gospel Audio English/Gospel Slide 12 EN Correct Answer.wav',
            wrong: 'Gospel Audio English/Gospel Slide 12 EN Wrong Answer.wav'
        },
        
        // SLIDE 13: Transition
        12: 'Gospel Audio English/Gospel Slide 13 EN.wav',
        
        // SLIDE 14: Two Deaths
        13: 'Gospel Audio English/Gospel Slide 14 EN.wav',
        
        // SLIDE 15: Revelation 21:8
        14: 'Gospel Audio English/Gospel Slide 15 EN.wav',
        
        // SLIDE 16: Question 5
        15: {
            question: 'Gospel Audio English/Gospel Slide 16 EN Question.wav',
            correct: 'Gospel Audio English/Gospel Slide 16 EN Correct Answer.wav',
            wrong: 'Gospel Audio English/Gospel Slide 16 EN Wrong Answer.wav'
        },
        
        // SLIDE 17: Truth 3 Intro
        16: 'Gospel Audio English/Gospel Slide 17 EN.wav',
        
        // SLIDE 18: Proverbs 14:12
        17: 'Gospel Audio English/Gospel Slide 18 EN.wav',
        
        // SLIDE 19: Human Efforts
        18: 'Gospel Audio English/Gospel Slide 19 EN.wav',
        
        // SLIDE 20: Transition
        19: 'Gospel Audio English/Gospel Slide 20 EN.wav',
        
        // SLIDE 21: Jesus is the Way Header
        20: 'Gospel Audio English/Gospel Slide 21 EN.wav',
        
        // SLIDE 22: John 14:6
        21: 'Gospel Audio English/Gospel Slide 22 EN.wav',
        
        // SLIDE 23: Question 6
        22: {
            question: 'Gospel Audio English/Gospel Slide 23 EN Question.wav',
            correct: 'Gospel Audio English/Gospel Slide 23 EN Correct Answer.wav',
            wrong: 'Gospel Audio English/Gospel Slide 23 EN Wrong Answer.wav'
        },
        
        // SLIDE 24: Transition
        23: 'Gospel Audio English/Gospel Slide 24 EN .wav',
        
        // SLIDE 25: 1 Peter 3:18
        24: 'Gospel Audio English/Gospel Slide 25 EN.wav',
        
        // SLIDE 26: Question 7
        25: {
            question: 'Gospel Audio English/Gospel Slide 26 EN Question.wav',
            correct: 'Gospel Audio English/Gospel Slide 26 EN Correct Answer.wav',
            wrong: 'Gospel Audio English/Gospel Slide 26 EN Wrong Answer.wav'
        },
        
        // SLIDE 27: Transition
        26: 'Gospel Audio English/Gospel Slide 27 EN .wav',
        
        // SLIDE 28: Truth 4 Header
        27: 'Gospel Audio English/Gospel Slide 28 EN.wav',
        
        // SLIDE 29: Ephesians 2:8-9
        28: 'Gospel Audio English/Gospel Slide 29 EN.wav',
        
        // SLIDE 30: Formula Question
        29: {
            question: 'Gospel Audio English/Gospel Slide 30 EN Question.wav',
            correct: 'Gospel Audio English/Gospel Slide 30 EN Correct Answer.wav',
            wrong: 'Gospel Audio English/Gospel Slide 30 EN Wrong Answer.wav'
        },
        
        // SLIDE 31: Decision Choice
        30: 'Gospel Audio English/Gospel Slide 31 EN.wav',
        
        // SLIDE 32: Not Ready
        31: 'Gospel Audio English/Gospel Slide 32 EN.wav',
        
        // SLIDE 33: Prayer Intro
        32: 'Gospel Audio English/Gospel Slide 33 EN.wav',
        
        // SLIDE 34: Prayer
        33: {
            prayer: 'Gospel Audio English/Gospel Slide 34 EN Prayer.wav'
        },
        
        // SLIDE 35: Not Accepted
        34: 'Gospel Audio English/Gospel Slide 35 EN.wav',
        
        // SLIDE 36: Celebration
        35: 'Gospel Audio English/Gospel Slide 36 EN.wav',
        
        // SLIDE 37: Promise 1
        36: 'Gospel Audio English/Gospel Slide 37 EN.wav',
        
        // SLIDE 38: Promise 2
        37: 'Gospel Audio English/Gospel Slide 38 EN.wav',
        
        // SLIDE 39: Promise 3
        38: 'Gospel Audio English/Gospel Slide 39 EN.wav',
        
        // SLIDE 40: Final
        39: 'Gospel Audio English/Gospel Slide 40 EN.wav'
    },
    
    /**
     * Get current language
     */
    getLang() {
        if (window.i18n && window.i18n.currentLang) {
            return window.i18n.currentLang;
        }
        return localStorage.getItem('goMission_language') || 'tl';
    },
    
    /**
     * Get audio mapping for current language
     */
    getAudioMap() {
        return this.getLang() === 'en' ? this.slideAudioEN : this.slideAudioTL;
    },

    /**
     * Build possible source URLs for an audio file.
     */
    getAudioSourceCandidates(audioFile) {
        const encodedPath = audioFile.split('/').map(part => encodeURIComponent(part)).join('/');
        const isFileProtocol = window.location.protocol === 'file:';
        const orderedBasePaths = isFileProtocol ? this.basePaths : [...this.basePaths].reverse();
        const candidates = orderedBasePaths.map(base => `${base}${encodedPath}`);
        return [...new Set(candidates)];
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
        
        console.log('[GospelAudio] Initialized - bilingual mode');
    },
    
    /**
     * Play audio for a specific slide
     * Called by GospelPresentation.showSlide()
     */
    playForSlide(slideIndex, audioType = 'default') {
        // Stop any currently playing audio
        this.stop();
        
        const audioMap = this.getAudioMap();
        const slideAudio = audioMap[slideIndex];
        
        if (!slideAudio) {
            console.log(`[GospelAudio] No audio for slide ${slideIndex}`);
            return;
        }
        
        let audioFile;
        
        // Handle different audio types for the same slide
        if (typeof slideAudio === 'string') {
            audioFile = slideAudio;
        } else if (typeof slideAudio === 'object') {
            // For slides with multiple audio options (questions, prayer)
            if (audioType === 'correct' && slideAudio.correct) {
                audioFile = slideAudio.correct;
            } else if (audioType === 'wrong' && slideAudio.wrong) {
                audioFile = slideAudio.wrong;
            } else if (audioType === 'prayer' && slideAudio.prayer) {
                audioFile = slideAudio.prayer;
            } else if (audioType === 'notAccepted' && slideAudio.notAccepted) {
                audioFile = slideAudio.notAccepted;
            } else {
                // Default to question audio for question slides
                audioFile = slideAudio.question || slideAudio.prayer || Object.values(slideAudio)[0];
            }
        }
        
        if (!audioFile) {
            console.log(`[GospelAudio] No ${audioType} audio for slide ${slideIndex}`);
            return;
        }
        
        this.currentSlide = slideIndex;
        this.currentAudioType = audioType;
        const sourceCandidates = this.getAudioSourceCandidates(audioFile);
        if (!sourceCandidates.length) return;

        const tryPlaySource = (candidateIndex) => {
            if (candidateIndex >= sourceCandidates.length) {
                console.warn(`[GospelAudio] No playable source found for slide ${slideIndex}: ${audioFile}`);
                this.isPlaying = false;
                this.updateUI();
                return;
            }

            this.audio.src = sourceCandidates[candidateIndex];
            this.audio.load();
        
            if (this.isMuted) {
                this.isPlaying = false;
                this.updateUI();
                return;
            }

            this.audio.play()
                .then(() => {
                    this.isPlaying = true;
                    this.updateUI();
                    console.log(`[GospelAudio] Playing slide ${slideIndex} (${audioType}): ${this.audio.src}`);
                })
                .catch(e => {
                    // Autoplay restrictions should not trigger path fallback.
                    if (e?.name === 'NotAllowedError') {
                        console.warn('[GospelAudio] Autoplay blocked:', e.message);
                        this.showPlayPrompt();
                        return;
                    }
                    console.warn(`[GospelAudio] Source failed (${candidateIndex + 1}/${sourceCandidates.length}):`, this.audio.src);
                    tryPlaySource(candidateIndex + 1);
                });
        };

        tryPlaySource(0);
    },
    
    /**
     * Play correct answer audio
     */
    playCorrect(slideIndex) {
        this.playForSlide(slideIndex, 'correct');
    },
    
    /**
     * Play wrong answer audio
     */
    playWrong(slideIndex) {
        this.playForSlide(slideIndex, 'wrong');
    },
    
    /**
     * Replay current slide's audio
     */
    replay() {
        if (this.currentSlide !== null) {
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
        // If currently muted, unmute and replay current narration.
        if (this.isMuted) {
            this.isMuted = false;
            this.audio.muted = false;
            localStorage.setItem('gospelAudioMuted', 'false');
            if (this.currentSlide !== null) this.replay();
            this.updateUI();
            return;
        }

        // If not muted but not currently playing (e.g., autoplay blocked), play on user gesture.
        if (!this.isPlaying && this.currentSlide !== null) {
            this.play();
            this.updateUI();
            return;
        }

        // Otherwise, mute.
        this.isMuted = true;
        this.audio.muted = true;
        localStorage.setItem('gospelAudioMuted', 'true');
        this.updateUI();
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
        console.warn('[GospelAudio] Error loading audio:', this.audio?.src, e);
        this.isPlaying = false;
        this.updateUI();
    },
    
    /**
     * Show prompt when autoplay is blocked
     */
    showPlayPrompt() {
        this.updateUI();
    },
    
    /**
     * Update UI to reflect current state
     */
    updateUI() {
        const audioBtn = document.getElementById('gospelAudioBtn');
        if (!audioBtn) return;
        
        const audioMap = this.getAudioMap();
        const hasAudio = this.currentSlide !== null && audioMap[this.currentSlide];
        
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
                onclick="GospelAudio.toggleMute()" 
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
        const audioMap = this.getAudioMap();
        return !!audioMap[slideIndex];
    }
};

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => GospelAudio.init());
} else {
    GospelAudio.init();
}

window.GospelAudio = GospelAudio;
