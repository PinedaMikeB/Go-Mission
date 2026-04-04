/**
 * Next Steps Modal Module - Bilingual
 * Dynamic modal that shows stage-appropriate next steps for the user's journey
 */

const NextStepsModal = {
    
    // Bilingual content
    content: {
        en: {
            title: 'What\'s your next step?',
            subtitle: 'Choose your next step',
            footer: 'Every step brings you closer to God',
            kicker: 'Your Journey Path',
            recommended: 'Start Here',
            tapHint: 'Tap to begin',
            done: 'Completed',
            lockedHint: 'Complete step 1 first',
            options: {
                gospel: {
                    title: 'Discover How Much God Loves You',
                    subtitle: 'The most important step in your journey'
                },
                quietTime: {
                    title: 'Talk to God Daily',
                    subtitle: 'Learn to talk to God every day'
                },
                quietTimeContinue: {
                    title: 'Talk to God Daily',
                    subtitle: 'Continue your conversation with God'
                },
                joinGroup: {
                    title: 'Join a Mission Group',
                    subtitle: 'Grow together with other believers'
                },
                training: {
                    title: 'Enroll in Wednesday Equipping',
                    subtitle: 'Level 1: 18 sessions of discipleship'
                },
                todayLesson: {
                    title: 'Read Today\'s Lesson',
                    subtitle: 'Continue your training'
                },
                leadGroup: {
                    title: 'Lead a Mission Group',
                    subtitle: 'Start your own group'
                },
                level2: {
                    title: 'Level 2 Training',
                    subtitle: 'Builder training for leaders'
                },
                developLeaders: {
                    title: 'Develop Leaders',
                    subtitle: 'Teach others to lead'
                },
                level3: {
                    title: 'Level 3 Training',
                    subtitle: 'Multiplication and movement building'
                },
                movement: {
                    title: 'Expand the Movement',
                    subtitle: 'Multiple generations of disciples'
                }
            }
        },
        tl: {
            title: 'Ano ang susunod mong hakbang?',
            subtitle: 'Piliin ang iyong susunod na hakbang',
            footer: 'Bawat hakbang ay nagdadala sa iyo palapit sa Diyos',
            kicker: 'Landas ng Iyong Paglalakbay',
            recommended: 'Dito Magsimula',
            tapHint: 'I-tap para magsimula',
            done: 'Tapos na',
            lockedHint: 'Tapusin muna ang unang hakbang',
            options: {
                gospel: {
                    title: 'Tuklasin Ngayon Kung Gaano ka Kamahal ng Diyos',
                    subtitle: 'Ang pinakamahalagang hakbang sa iyong paglalakbay'
                },
                quietTime: {
                    title: 'Makipag-usap sa Diyos Araw-araw',
                    subtitle: 'Matutong makipag-usap sa Diyos araw-araw'
                },
                quietTimeContinue: {
                    title: 'Makipag-usap sa Diyos Araw-araw',
                    subtitle: 'Ipagpatuloy ang iyong conversation with God'
                },
                joinGroup: {
                    title: 'Sumali sa Mission Group',
                    subtitle: 'Lumago kasama ang ibang mananampalataya'
                },
                training: {
                    title: 'Mag-enroll sa Wednesday Equipping',
                    subtitle: 'Level 1: 18 sessions ng paghubog'
                },
                todayLesson: {
                    title: 'Basahin ang Lesson Ngayon',
                    subtitle: 'Ipagpatuloy ang iyong training'
                },
                leadGroup: {
                    title: 'Mamuno ng Mission Group',
                    subtitle: 'Simulan ang iyong sariling grupo'
                },
                level2: {
                    title: 'Level 2 Training',
                    subtitle: 'Builder training para sa mga lider'
                },
                developLeaders: {
                    title: 'Mag-develop ng mga Lider',
                    subtitle: 'Turuan ang iba na mamuno'
                },
                level3: {
                    title: 'Level 3 Training',
                    subtitle: 'Multiplication at movement building'
                },
                movement: {
                    title: 'Palawakin ang Movement',
                    subtitle: 'Multiple generations ng mga alagad'
                }
            }
        }
    },
    
    // Get current language
    getLang() {
        // Check multiple sources for language
        if (window.i18n && window.i18n.currentLang) {
            return window.i18n.currentLang;
        }
        // Fallback to localStorage
        const stored = localStorage.getItem('goMission_language');
        if (stored) return stored;
        // Default to Tagalog
        return 'tl';
    },
    
    // Get translated text
    t(key) {
        const lang = this.getLang();
        const keys = key.split('.');
        let value = this.content[lang];
        for (const k of keys) {
            value = value?.[k];
        }
        return value || key;
    },

    // Stage definitions with requirements
    stages: {
        'seeker': {
            id: 'seeker',
            name: 'NASA PAGLALAKBAY',
            nameAlt: 'On The Journey',
            nextStage: 'disciple',
            requirements: ['gospelCompleted', 'hasUplineGroup'],
            options: [
                {
                    id: 'gospel',
                    icon: '❤️',
                    contentKey: 'gospel',
                    action: 'openGospel',
                    requirementKey: 'gospelCompleted',
                    requiredFirst: true,
                    priority: 1
                },
                {
                    id: 'quietTime',
                    icon: '📖',
                    contentKey: 'quietTime',
                    action: 'openQuietTimeGuide',
                    requirementKey: null,
                    requiresGospel: true,
                    priority: 2
                },
                {
                    id: 'joinGroup',
                    icon: '👥',
                    contentKey: 'joinGroup',
                    action: 'openJoinGroup',
                    requirementKey: 'hasUplineGroup',
                    requiresGospel: true,
                    priority: 3
                }
            ]
        },
        'disciple': {
            id: 'disciple',
            name: 'ALAGAD',
            nameAlt: 'Disciple',
            displayName: 'AKO AY ISANG ALAGAD',
            nextStage: 'disciple-maker',
            requirements: ['level1Completed'],
            options: [
                {
                    id: 'quietTime',
                    icon: '📖',
                    contentKey: 'quietTimeContinue',
                    action: 'openBibleReader',
                    requirementKey: null,
                    priority: 1
                },
                {
                    id: 'training',
                    icon: '🎯',
                    contentKey: 'training',
                    action: 'openTrainingEnroll',
                    requirementKey: 'level1Completed',
                    priority: 2
                },
                {
                    id: 'todayLesson',
                    icon: '📝',
                    contentKey: 'todayLesson',
                    action: 'openTodayLesson',
                    requirementKey: null,
                    showIf: 'inTraining',
                    priority: 1
                }
            ]
        },
        'disciple-maker': {
            id: 'disciple-maker',
            name: 'TAGAPAG-HUBOG',
            nameAlt: 'Disciple-Maker',
            displayName: 'AKO AY TAGAPAG-HUBOG',
            nextStage: 'builder',
            requirements: ['leadsGroup', 'level2Completed'],
            options: [
                {
                    id: 'leadGroup',
                    icon: '👥',
                    contentKey: 'leadGroup',
                    action: 'openCreateGroup',
                    requirementKey: 'leadsGroup',
                    priority: 1
                },
                {
                    id: 'level2',
                    icon: '🎯',
                    contentKey: 'level2',
                    action: 'openLevel2Training',
                    requirementKey: 'level2Completed',
                    priority: 2
                }
            ]
        },
        'builder': {
            id: 'builder',
            name: 'TAGAPAG-TAYO',
            nameAlt: 'Builder',
            displayName: 'AKO AY TAGAPAG-TAYO',
            nextStage: 'multiplier',
            requirements: ['producingLeaders', 'level3Completed'],
            options: [
                {
                    id: 'developLeaders',
                    icon: '🌱',
                    contentKey: 'developLeaders',
                    action: 'openLeaderDevelopment',
                    requirementKey: 'producingLeaders',
                    priority: 1
                },
                {
                    id: 'level3',
                    icon: '🎯',
                    contentKey: 'level3',
                    action: 'openLevel3Training',
                    requirementKey: 'level3Completed',
                    priority: 2
                }
            ]
        },
        'multiplier': {
            id: 'multiplier',
            name: 'TAGAPAG-PARAMI',
            nameAlt: 'Multiplier',
            displayName: 'AKO AY TAGAPAG-PARAMI',
            nextStage: null,
            requirements: [],
            options: [
                {
                    id: 'movement',
                    icon: '🌍',
                    contentKey: 'movement',
                    action: 'openMovementDashboard',
                    requirementKey: null,
                    priority: 1
                }
            ]
        }
    },

    init() {
        this.createModal();
    },

    createModal() {
        if (document.getElementById('nextStepsModal')) return;
        
        const modal = document.createElement('div');
        modal.id = 'nextStepsModal';
        modal.className = 'next-steps-modal hidden';
        modal.setAttribute('aria-hidden', 'true');
        modal.innerHTML = `
            <div class="next-steps-overlay"></div>
            <div class="next-steps-sheet" role="dialog" aria-modal="true" aria-labelledby="nextStepsTitle">
                <div class="next-steps-header">
                    <div class="next-steps-title-wrap">
                        <p class="next-steps-kicker" id="nextStepsKicker"></p>
                        <h2 id="nextStepsTitle"></h2>
                        <p id="nextStepsSubtitle"></p>
                    </div>
                    <button onclick="NextStepsModal.close()" class="next-steps-close" aria-label="Close next steps">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                <div class="next-steps-options" id="nextStepsOptions"></div>
                <div class="next-steps-footer">
                    <p id="nextStepsFooter">
                        <span class="next-steps-footer-icon">★</span>
                        <span id="nextStepsFooterText"></span>
                    </p>
                </div>
            </div>
        `;
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal || e.target.classList.contains('next-steps-overlay')) this.close();
        });
        
        document.body.appendChild(modal);
        
        if (!document.getElementById('nextStepsModalStyles')) {
            const style = document.createElement('style');
            style.id = 'nextStepsModalStyles';
            style.textContent = `
                #nextStepsModal.next-steps-modal {
                    position: fixed;
                    inset: 0;
                    z-index: 80;
                    display: flex;
                    align-items: flex-end;
                    justify-content: center;
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 0.28s ease;
                }
                #nextStepsModal.next-steps-modal.hidden {
                    display: none;
                }
                #nextStepsModal.next-steps-modal.is-open,
                #nextStepsModal.next-steps-modal.is-closing {
                    pointer-events: auto;
                }
                #nextStepsModal .next-steps-overlay {
                    position: absolute;
                    inset: 0;
                    background: radial-gradient(circle at 50% 12%, rgba(251, 191, 36, 0.16), rgba(0, 0, 0, 0.78) 42%, rgba(0, 0, 0, 0.86) 100%);
                    backdrop-filter: blur(3px);
                }
                #nextStepsModal .next-steps-sheet {
                    position: relative;
                    width: min(100%, 34rem);
                    max-height: 86vh;
                    background: linear-gradient(160deg, rgba(251, 191, 36, 0.08), rgba(0, 0, 0, 0.05) 35%), var(--card-bg-solid);
                    border: 1px solid var(--card-border);
                    border-bottom: none;
                    border-radius: 30px 30px 0 0;
                    box-shadow: 0 -14px 42px rgba(0, 0, 0, 0.42);
                    transform: translateY(108%) scale(0.98);
                    opacity: 0;
                    transition: transform 0.42s cubic-bezier(0.19, 1, 0.22, 1), opacity 0.28s ease;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }
                #nextStepsModal.is-open {
                    opacity: 1;
                }
                #nextStepsModal.is-open .next-steps-sheet {
                    transform: translateY(0) scale(1);
                    opacity: 1;
                }
                #nextStepsModal.is-closing {
                    opacity: 0;
                }
                #nextStepsModal.is-closing .next-steps-sheet {
                    transform: translateY(24%) scale(0.99);
                    opacity: 0;
                }
                #nextStepsModal .next-steps-header {
                    position: relative;
                    padding: 1.15rem 1.2rem 1rem;
                    border-bottom: 1px solid var(--card-border);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 0.75rem;
                }
                #nextStepsModal .next-steps-title-wrap::after {
                    content: '';
                    display: block;
                    width: 112px;
                    height: 2px;
                    margin-top: 0.55rem;
                    background: linear-gradient(90deg, var(--mission-gold), rgba(251, 191, 36, 0));
                }
                #nextStepsModal .next-steps-kicker {
                    margin: 0;
                    font-size: 0.61rem;
                    letter-spacing: 0.22em;
                    text-transform: uppercase;
                    color: var(--mission-gold);
                    opacity: 0.9;
                    font-family: var(--font-display);
                }
                #nextStepsModal #nextStepsTitle {
                    margin: 0.18rem 0 0;
                    font-size: 1.18rem;
                    letter-spacing: 0.08em;
                    color: var(--text-color);
                    text-transform: uppercase;
                    line-height: 1.1;
                    font-family: var(--font-display);
                }
                #nextStepsModal #nextStepsSubtitle {
                    margin: 0.28rem 0 0;
                    font-size: 0.88rem;
                    color: var(--text-muted);
                    font-family: var(--font-body);
                    line-height: 1.25;
                }
                #nextStepsModal .next-steps-close {
                    width: 2.2rem;
                    height: 2.2rem;
                    border-radius: 999px;
                    border: 1px solid var(--card-border);
                    background: rgba(255, 255, 255, 0.04);
                    color: var(--text-muted);
                    display: grid;
                    place-items: center;
                    flex-shrink: 0;
                    transition: transform 0.2s ease, color 0.2s ease, background 0.2s ease;
                }
                #nextStepsModal .next-steps-close:hover {
                    color: var(--text-color);
                    transform: rotate(90deg) scale(1.04);
                    background: rgba(255, 255, 255, 0.08);
                }
                #nextStepsModal .next-steps-options {
                    flex: 1;
                    overflow-y: auto;
                    padding: 0.95rem;
                    display: grid;
                    gap: 0.68rem;
                }
                #nextStepsModal .next-step-option {
                    width: 100%;
                    position: relative;
                    display: flex;
                    align-items: center;
                    gap: 0.78rem;
                    border-radius: 1rem;
                    border: 1px solid var(--card-border);
                    background: linear-gradient(140deg, rgba(255, 255, 255, 0.03), rgba(0, 0, 0, 0.12));
                    padding: 0.82rem 0.92rem;
                    text-align: left;
                    color: inherit;
                    overflow: hidden;
                    transition: transform 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease, background 0.22s ease;
                    animation: nextStepOptionIn 0.46s cubic-bezier(0.22, 1, 0.36, 1) both;
                    animation-delay: calc(var(--option-index, 0) * 75ms + 85ms);
                }
                #nextStepsModal .next-step-option::before {
                    content: '';
                    position: absolute;
                    top: -130%;
                    left: -34%;
                    width: 46%;
                    height: 340%;
                    background: linear-gradient(90deg, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0));
                    transform: translateX(-180%) rotate(14deg);
                    transition: transform 0.72s ease;
                    pointer-events: none;
                }
                #nextStepsModal .next-step-option:hover::before {
                    transform: translateX(410%) rotate(14deg);
                }
                #nextStepsModal button.next-step-option {
                    cursor: pointer;
                }
                #nextStepsModal button.next-step-option:hover {
                    transform: translateY(-2px);
                    border-color: rgba(251, 191, 36, 0.55);
                    box-shadow: 0 10px 26px rgba(0, 0, 0, 0.26);
                }
                #nextStepsModal button.next-step-option:active {
                    transform: scale(0.985);
                }
                #nextStepsModal .next-step-option--primary {
                    border-color: rgba(251, 191, 36, 0.72);
                    background: linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(0, 0, 0, 0.08));
                    box-shadow: 0 8px 26px rgba(251, 191, 36, 0.22);
                }
                #nextStepsModal .next-step-option--primary .next-step-icon {
                    animation: nextStepIconPulse 2.2s ease-in-out infinite;
                }
                #nextStepsModal .next-step-option--completed {
                    border-color: rgba(16, 185, 129, 0.44);
                    background: linear-gradient(140deg, rgba(16, 185, 129, 0.16), rgba(16, 185, 129, 0.05));
                }
                #nextStepsModal .next-step-option--locked {
                    opacity: 0.58;
                    cursor: not-allowed;
                }
                #nextStepsModal .next-step-icon {
                    width: 2.5rem;
                    height: 2.5rem;
                    flex-shrink: 0;
                    border-radius: 0.8rem;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    display: grid;
                    place-items: center;
                    font-size: 1.45rem;
                    background: rgba(255, 255, 255, 0.04);
                }
                #nextStepsModal .next-step-option--locked .next-step-icon {
                    filter: grayscale(0.45);
                }
                #nextStepsModal .next-step-copy {
                    flex: 1;
                    min-width: 0;
                    display: flex;
                    flex-direction: column;
                    gap: 0.2rem;
                }
                #nextStepsModal .next-step-title-row {
                    display: flex;
                    align-items: center;
                    gap: 0.48rem;
                    flex-wrap: wrap;
                }
                #nextStepsModal .next-step-title {
                    margin: 0;
                    font-size: 1rem;
                    letter-spacing: 0.07em;
                    font-family: var(--font-display);
                    color: var(--text-color);
                    line-height: 1.05;
                    text-transform: uppercase;
                }
                #nextStepsModal .next-step-subtitle {
                    margin: 0;
                    font-size: 0.82rem;
                    line-height: 1.22;
                    color: var(--text-muted);
                    font-family: var(--font-body);
                }
                #nextStepsModal .next-step-hint {
                    margin: 0;
                    font-size: 0.68rem;
                    letter-spacing: 0.14em;
                    text-transform: uppercase;
                    color: var(--mission-gold);
                    opacity: 0.95;
                    font-family: var(--font-display);
                }
                #nextStepsModal .next-step-badge {
                    display: inline-flex;
                    align-items: center;
                    border: 1px solid rgba(251, 191, 36, 0.5);
                    border-radius: 999px;
                    padding: 0.16rem 0.44rem;
                    font-size: 0.56rem;
                    letter-spacing: 0.16em;
                    text-transform: uppercase;
                    color: var(--mission-gold);
                    background: rgba(251, 191, 36, 0.11);
                    font-family: var(--font-display);
                }
                #nextStepsModal .next-step-chevron,
                #nextStepsModal .next-step-status,
                #nextStepsModal .next-step-lock {
                    width: 1.74rem;
                    height: 1.74rem;
                    border-radius: 999px;
                    display: grid;
                    place-items: center;
                    flex-shrink: 0;
                    transition: transform 0.22s ease, background 0.22s ease;
                }
                #nextStepsModal .next-step-chevron {
                    color: var(--mission-gold);
                    background: rgba(251, 191, 36, 0.1);
                }
                #nextStepsModal button.next-step-option:hover .next-step-chevron {
                    transform: translateX(2px) scale(1.04);
                    background: rgba(251, 191, 36, 0.18);
                }
                #nextStepsModal .next-step-status {
                    color: #10b981;
                    background: rgba(16, 185, 129, 0.15);
                    font-weight: 700;
                }
                #nextStepsModal .next-step-lock {
                    color: var(--text-dim);
                    background: rgba(255, 255, 255, 0.04);
                }
                #nextStepsModal .next-steps-footer {
                    padding: 0.78rem 1rem 0.9rem;
                    border-top: 1px solid var(--card-border);
                    background: linear-gradient(180deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0));
                }
                #nextStepsModal #nextStepsFooter {
                    margin: 0;
                    text-align: center;
                    font-size: 0.8rem;
                    color: var(--text-muted);
                    letter-spacing: 0.06em;
                    font-family: var(--font-body);
                }
                #nextStepsModal .next-steps-footer-icon {
                    color: var(--mission-gold);
                    display: inline-block;
                    margin-right: 0.28rem;
                }
                body.light-mode #nextStepsModal .next-steps-overlay {
                    background: radial-gradient(circle at 50% 12%, rgba(217, 74, 0, 0.16), rgba(0, 0, 0, 0.45) 42%, rgba(0, 0, 0, 0.6) 100%);
                }
                body.light-mode #nextStepsModal .next-steps-sheet {
                    background: linear-gradient(155deg, rgba(217, 74, 0, 0.08), rgba(255, 255, 255, 0.2) 40%), var(--card-bg-solid);
                }
                body.light-mode #nextStepsModal .next-step-option {
                    background: linear-gradient(140deg, rgba(255, 255, 255, 0.8), rgba(245, 242, 238, 0.95));
                }
                body.light-mode #nextStepsModal .next-step-option--primary {
                    background: linear-gradient(135deg, rgba(217, 74, 0, 0.14), rgba(255, 255, 255, 0.96));
                    border-color: rgba(217, 74, 0, 0.42);
                    box-shadow: 0 8px 24px rgba(217, 74, 0, 0.2);
                }
                @keyframes nextStepOptionIn {
                    from {
                        opacity: 0;
                        transform: translateY(12px) scale(0.98);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }
                @keyframes nextStepIconPulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                }
                @media (hover: none) {
                    #nextStepsModal button.next-step-option:hover {
                        transform: none;
                        box-shadow: none;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        if (!this._escHandler) {
            this._escHandler = (e) => {
                if (e.key === 'Escape') this.close();
            };
            document.addEventListener('keydown', this._escHandler);
        }
    },

    open() {
        this.init();
        
        const modal = document.getElementById('nextStepsModal');
        const optionsContainer = document.getElementById('nextStepsOptions');
        const titleEl = document.getElementById('nextStepsTitle');
        const subtitleEl = document.getElementById('nextStepsSubtitle');
        const footerEl = document.getElementById('nextStepsFooterText');
        const kickerEl = document.getElementById('nextStepsKicker');
        
        // Update text based on current language
        titleEl.textContent = this.t('title');
        subtitleEl.textContent = this.t('subtitle');
        footerEl.textContent = this.t('footer');
        kickerEl.textContent = this.t('kicker');
        
        const userStage = window.currentUserStage || 'seeker';
        const userProgress = this.getUserProgress();
        
        const stageConfig = this.stages[userStage];
        if (!stageConfig) {
            console.error('Unknown stage:', userStage);
            return;
        }
        
        const options = this.getAvailableOptions(stageConfig, userProgress);
        let recommendedIndex = options.findIndex((opt) => {
            const isLocked = opt.requiresGospel && !userProgress.gospelCompleted;
            const isCompleted = opt.requirementKey && userProgress[opt.requirementKey];
            return !isLocked && !isCompleted;
        });
        if (recommendedIndex === -1) {
            recommendedIndex = options.findIndex((opt) => !(opt.requiresGospel && !userProgress.gospelCompleted));
        }

        optionsContainer.innerHTML = options
            .map((opt, index) => this.renderOption(opt, userProgress, index, index === recommendedIndex))
            .join('');
        
        modal.classList.remove('hidden');
        modal.classList.remove('is-closing');
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'false');
        requestAnimationFrame(() => {
            modal.classList.add('is-open');
        });
        document.body.style.overflow = 'hidden';
    },

    close(instant = false) {
        const modal = document.getElementById('nextStepsModal');
        if (!modal || modal.classList.contains('hidden')) return;

        if (this._closeTimer) {
            clearTimeout(this._closeTimer);
            this._closeTimer = null;
        }

        const finishClose = () => {
            modal.classList.add('hidden');
            modal.classList.remove('is-open');
            modal.classList.remove('is-closing');
            modal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        };

        if (instant) {
            finishClose();
            return;
        }

        modal.classList.remove('is-open');
        modal.classList.add('is-closing');
        this._closeTimer = setTimeout(() => {
            finishClose();
            this._closeTimer = null;
        }, 230);
    },

    getUserProgress() {
        return {
            gospelCompleted: localStorage.getItem('gospelCompleted') === 'true',
            hasUplineGroup: window.userHasUplineGroup || false,
            level1Completed: false,
            level1Progress: 0,
            inTraining: false,
            leadsGroup: window.userLeadsGroup || false,
            level2Completed: false,
            level3Completed: false,
            producingLeaders: false
        };
    },

    getAvailableOptions(stageConfig, userProgress) {
        return stageConfig.options
            .filter(opt => {
                if (opt.showIf) return userProgress[opt.showIf];
                return true;
            })
            .sort((a, b) => a.priority - b.priority);
    },

    renderOption(option, userProgress, index, isRecommended) {
        const isCompleted = option.requirementKey && userProgress[option.requirementKey];
        const isLocked = option.requiresGospel && !userProgress.gospelCompleted;
        const content = this.t(`options.${option.contentKey}`);
        
        if (isLocked) {
            return `
                <div class="next-step-option next-step-option--locked" style="--option-index:${index}">
                    <span class="next-step-icon">${option.icon}</span>
                    <span class="next-step-copy">
                        <span class="next-step-title">${content.title}</span>
                        <span class="next-step-subtitle">${content.subtitle}</span>
                        <span class="next-step-hint">${this.t('lockedHint')}</span>
                    </span>
                    <span class="next-step-lock" aria-hidden="true">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                        </svg>
                    </span>
                </div>
            `;
        }
        
        if (isCompleted) {
            return `
                <button 
                    onclick="NextStepsModal.handleAction('${option.action}')" 
                    class="next-step-option next-step-option--completed"
                    style="--option-index:${index}"
                >
                    <span class="next-step-icon">${option.icon}</span>
                    <span class="next-step-copy">
                        <span class="next-step-title">${content.title}</span>
                        <span class="next-step-subtitle">${content.subtitle}</span>
                        <span class="next-step-hint">${this.t('done')}</span>
                    </span>
                    <span class="next-step-status">✓</span>
                </button>
            `;
        }
        
        return `
            <button 
                onclick="NextStepsModal.handleAction('${option.action}')" 
                class="next-step-option ${isRecommended ? 'next-step-option--primary' : ''}"
                style="--option-index:${index}"
            >
                <span class="next-step-icon">${option.icon}</span>
                <span class="next-step-copy">
                    <span class="next-step-title-row">
                        <span class="next-step-title">${content.title}</span>
                        ${isRecommended ? `<span class="next-step-badge">${this.t('recommended')}</span>` : ''}
                    </span>
                    <span class="next-step-subtitle">${content.subtitle}</span>
                    <span class="next-step-hint">${this.t('tapHint')}</span>
                </span>
                <span class="next-step-chevron" aria-hidden="true">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                </span>
            </button>
        `;
    },

    handleAction(action) {
        this.close(true);
        
        switch (action) {
            case 'openGospel':
                if (typeof GospelPresentation !== 'undefined') {
                    GospelPresentation.open();
                }
                break;
            case 'openQuietTimeGuide':
                if (typeof ConversationGuide !== 'undefined') {
                    ConversationGuide.open();
                } else if (typeof BibleReader !== 'undefined') {
                    BibleReader.enterFullscreen();
                } else {
                    alert('Coming soon!');
                }
                break;
            case 'openJoinGroup':
                if (typeof MyGroups !== 'undefined') {
                    MyGroups.showJoinModal();
                } else {
                    alert('Coming soon!');
                }
                break;
            case 'openBibleReader':
                if (typeof BibleReader !== 'undefined') {
                    BibleReader.enterFullscreen();
                }
                break;
            case 'openTrainingEnroll':
                if (typeof Training !== 'undefined') {
                    Training.openFullScreen();
                } else {
                    alert('Coming soon!');
                }
                break;
            case 'openTodayLesson':
                if (typeof Training !== 'undefined') {
                    Training.openTodayLesson();
                } else {
                    alert('Coming soon!');
                }
                break;
            case 'openCreateGroup':
                if (typeof MyGroups !== 'undefined') {
                    MyGroups.showCreateModal();
                } else {
                    alert('Coming soon!');
                }
                break;
            default:
                alert('This feature is coming soon!');
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    NextStepsModal.init();
});

window.NextStepsModal = NextStepsModal;
