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
        return window.i18n?.currentLang || 'tl';
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
        modal.className = 'fixed inset-0 z-[80] bg-black/80 hidden flex items-end justify-center';
        modal.innerHTML = `
            <div class="bg-[var(--card-bg-solid)] w-full max-w-lg rounded-t-3xl max-h-[85vh] flex flex-col animate-slide-up">
                <div class="p-5 border-b border-[var(--card-border)] flex items-center justify-between">
                    <div>
                        <h2 class="text-lg font-bold text-[var(--text-color)]" id="nextStepsTitle"></h2>
                        <p class="text-xs text-[var(--text-muted)] mt-1" id="nextStepsSubtitle"></p>
                    </div>
                    <button onclick="NextStepsModal.close()" class="p-2 text-[var(--text-muted)] hover:text-[var(--text-color)]">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                <div class="flex-1 overflow-y-auto p-4 space-y-3" id="nextStepsOptions"></div>
                <div class="p-4 border-t border-[var(--card-border)]">
                    <p class="text-xs text-center text-[var(--text-muted)]" id="nextStepsFooter">
                        <span class="text-[var(--mission-gold)]">★</span> 
                        <span id="nextStepsFooterText"></span>
                    </p>
                </div>
            </div>
        `;
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.close();
        });
        
        document.body.appendChild(modal);
        
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideUp {
                from { transform: translateY(100%); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            .animate-slide-up { animation: slideUp 0.3s ease-out forwards; }
        `;
        document.head.appendChild(style);
    },

    open() {
        this.init();
        
        const modal = document.getElementById('nextStepsModal');
        const optionsContainer = document.getElementById('nextStepsOptions');
        const titleEl = document.getElementById('nextStepsTitle');
        const subtitleEl = document.getElementById('nextStepsSubtitle');
        const footerEl = document.getElementById('nextStepsFooterText');
        
        // Update text based on current language
        titleEl.textContent = this.t('title');
        subtitleEl.textContent = this.t('subtitle');
        footerEl.textContent = this.t('footer');
        
        const userStage = window.currentUserStage || 'seeker';
        const userProgress = this.getUserProgress();
        
        const stageConfig = this.stages[userStage];
        if (!stageConfig) {
            console.error('Unknown stage:', userStage);
            return;
        }
        
        const options = this.getAvailableOptions(stageConfig, userProgress);
        optionsContainer.innerHTML = options.map(opt => this.renderOption(opt, userProgress)).join('');
        
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    },

    close() {
        const modal = document.getElementById('nextStepsModal');
        modal.classList.add('hidden');
        document.body.style.overflow = '';
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

    renderOption(option, userProgress) {
        const isCompleted = option.requirementKey && userProgress[option.requirementKey];
        const isLocked = option.requiresGospel && !userProgress.gospelCompleted;
        const content = this.t(`options.${option.contentKey}`);
        
        if (isLocked) {
            return `
                <div class="w-full flex items-center gap-4 p-4 rounded-2xl border bg-[var(--card-bg)] border-[var(--card-border)] opacity-40 cursor-not-allowed">
                    <span class="text-3xl grayscale">${option.icon}</span>
                    <div class="flex-1 text-left">
                        <h3 class="font-bold text-[var(--text-muted)]">${content.title}</h3>
                        <p class="text-xs text-[var(--text-dim)] mt-1">${content.subtitle}</p>
                    </div>
                    <svg class="w-5 h-5 text-[var(--text-dim)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                    </svg>
                </div>
            `;
        }
        
        if (isCompleted) {
            return `
                <button 
                    onclick="NextStepsModal.handleAction('${option.action}')" 
                    class="w-full flex items-center gap-4 p-4 rounded-2xl border bg-green-500/10 border-green-500/30 transition-all active:scale-[0.98]"
                >
                    <span class="text-3xl">${option.icon}</span>
                    <div class="flex-1 text-left">
                        <h3 class="font-bold text-[var(--text-color)]">${content.title}</h3>
                        <p class="text-xs text-[var(--text-muted)] mt-1">${content.subtitle}</p>
                    </div>
                    <span class="text-green-500 text-xl">✓</span>
                </button>
            `;
        }
        
        return `
            <button 
                onclick="NextStepsModal.handleAction('${option.action}')" 
                class="w-full flex items-center gap-4 p-4 rounded-2xl border bg-[var(--card-bg)] border-[var(--card-border)] hover:border-[var(--mission-gold)]/50 transition-all active:scale-[0.98]"
            >
                <span class="text-3xl">${option.icon}</span>
                <div class="flex-1 text-left">
                    <h3 class="font-bold text-[var(--text-color)]">${content.title}</h3>
                    <p class="text-xs text-[var(--text-muted)] mt-1">${content.subtitle}</p>
                </div>
                <svg class="w-5 h-5 text-[var(--mission-gold)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                </svg>
            </button>
        `;
    },

    handleAction(action) {
        this.close();
        
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
