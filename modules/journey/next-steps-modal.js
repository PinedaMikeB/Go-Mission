/**
 * Next Steps Modal Module
 * Dynamic modal that shows stage-appropriate next steps for the user's journey
 * 
 * Stage Progression:
 * 1. NASA PAGLALAKBAY (Seeker) → Accept Christ + Join Group → ALAGAD
 * 2. ALAGAD (Disciple) → Complete Level 1 Training → TAGAPAG-HUBOG
 * 3. TAGAPAG-HUBOG (Disciple-Maker) → Lead Group + Level 2 → TAGAPAG-TAYO
 * 4. TAGAPAG-TAYO (Builder) → Produce Leaders + Level 3 → TAGAPAG-PARAMI
 * 5. TAGAPAG-PARAMI (Multiplier) → Movement multiplication
 */

const NextStepsModal = {
    
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
                    title: 'Tuklasin Ngayon Kung Gaano ka Kamahal ng Diyos',
                    subtitle: 'Ang pinakamahalagang hakbang sa iyong paglalakbay',
                    action: 'openGospel',
                    requirementKey: 'gospelCompleted',
                    requiredFirst: true,  // This must be done first
                    priority: 1
                },
                {
                    id: 'quietTime',
                    icon: '📖',
                    title: 'Maglaan ng Oras sa Diyos',
                    subtitle: 'Matutong makipag-usap sa Diyos araw-araw',
                    action: 'openQuietTimeGuide',
                    requirementKey: null,
                    requiresGospel: true,  // Locked until gospel completed
                    priority: 2
                },
                {
                    id: 'joinGroup',
                    icon: '👥',
                    title: 'Sumali sa Mission Group',
                    subtitle: 'Lumago kasama ang ibang mananampalataya',
                    action: 'openJoinGroup',
                    requirementKey: 'hasUplineGroup',
                    requiresGospel: true,  // Locked until gospel completed
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
                    title: 'Maglaan ng Oras sa Diyos',
                    subtitle: 'Ipagpatuloy ang iyong conversation with God',
                    action: 'openBibleReader',
                    requirementKey: null,
                    priority: 1
                },
                {
                    id: 'training',
                    icon: '🎯',
                    title: 'Mag-enroll sa Wednesday Equipping',
                    subtitle: 'Level 1: 18 sessions ng paghubog',
                    action: 'openTrainingEnroll',
                    requirementKey: 'level1Completed',
                    priority: 2
                },
                {
                    id: 'todayLesson',
                    icon: '📝',
                    title: 'Basahin ang Lesson Ngayon',
                    subtitle: 'Ipagpatuloy ang iyong training',
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
                    title: 'Mamuno ng Mission Group',
                    subtitle: 'Simulan ang iyong sariling grupo',
                    action: 'openCreateGroup',
                    requirementKey: 'leadsGroup',
                    priority: 1
                },
                {
                    id: 'level2',
                    icon: '🎯',
                    title: 'Level 2 Training',
                    subtitle: 'Builder training para sa mga lider',
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
                    title: 'Mag-develop ng mga Lider',
                    subtitle: 'Turuan ang iba na mamuno',
                    action: 'openLeaderDevelopment',
                    requirementKey: 'producingLeaders',
                    priority: 1
                },
                {
                    id: 'level3',
                    icon: '🎯',
                    title: 'Level 3 Training',
                    subtitle: 'Multiplication at movement building',
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
                    title: 'Palawakin ang Movement',
                    subtitle: 'Multiple generations ng mga alagad',
                    action: 'openMovementDashboard',
                    requirementKey: null,
                    priority: 1
                }
            ]
        }
    },

    /**
     * Initialize the modal
     */
    init() {
        this.createModal();
    },

    /**
     * Create the modal HTML structure
     */
    createModal() {
        // Check if modal already exists
        if (document.getElementById('nextStepsModal')) return;
        
        const modal = document.createElement('div');
        modal.id = 'nextStepsModal';
        modal.className = 'fixed inset-0 z-[80] bg-black/80 hidden flex items-end justify-center';
        modal.innerHTML = `
            <div class="bg-[var(--card-bg-solid)] w-full max-w-lg rounded-t-3xl max-h-[85vh] flex flex-col animate-slide-up">
                <!-- Header -->
                <div class="p-5 border-b border-[var(--card-border)] flex items-center justify-between">
                    <div>
                        <h2 class="text-lg font-bold text-[var(--text-color)]" id="nextStepsTitle">Ano ang susunod mong hakbang?</h2>
                        <p class="text-xs text-[var(--text-muted)] mt-1" id="nextStepsSubtitle">Piliin ang iyong susunod na hakbang</p>
                    </div>
                    <button onclick="NextStepsModal.close()" class="p-2 text-[var(--text-muted)] hover:text-[var(--text-color)]">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                
                <!-- Options List -->
                <div class="flex-1 overflow-y-auto p-4 space-y-3" id="nextStepsOptions">
                    <!-- Dynamic options will be inserted here -->
                </div>
                
                <!-- Footer -->
                <div class="p-4 border-t border-[var(--card-border)]">
                    <p class="text-xs text-center text-[var(--text-muted)]">
                        <span class="text-[var(--mission-gold)]">★</span> 
                        Bawat hakbang ay nagdadala sa iyo palapit sa Diyos
                    </p>
                </div>
            </div>
        `;
        
        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.close();
        });
        
        document.body.appendChild(modal);
        
        // Add slide-up animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideUp {
                from { transform: translateY(100%); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            .animate-slide-up {
                animation: slideUp 0.3s ease-out forwards;
            }
        `;
        document.head.appendChild(style);
    },

    /**
     * Open the modal with stage-appropriate options
     */
    open() {
        this.init();
        
        const modal = document.getElementById('nextStepsModal');
        const optionsContainer = document.getElementById('nextStepsOptions');
        
        // Get current user stage and progress
        const userStage = window.currentUserStage || 'seeker';
        const userProgress = this.getUserProgress();
        
        // Get stage config
        const stageConfig = this.stages[userStage];
        if (!stageConfig) {
            console.error('Unknown stage:', userStage);
            return;
        }
        
        // Build options HTML
        const options = this.getAvailableOptions(stageConfig, userProgress);
        optionsContainer.innerHTML = options.map(opt => this.renderOption(opt, userProgress)).join('');
        
        // Show modal
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    },

    /**
     * Close the modal
     */
    close() {
        const modal = document.getElementById('nextStepsModal');
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    },

    /**
     * Get user's progress from Firebase or local state
     */
    getUserProgress() {
        // This will be populated from Firebase
        // For now, return defaults or cached values
        return {
            gospelCompleted: localStorage.getItem('gospelCompleted') === 'true',
            hasUplineGroup: window.userHasUplineGroup || false,
            level1Completed: false,
            level1Progress: 0, // 0-18 sessions
            inTraining: false,
            leadsGroup: window.userLeadsGroup || false,
            level2Completed: false,
            level3Completed: false,
            producingLeaders: false
        };
    },

    /**
     * Get available options for current stage
     */
    getAvailableOptions(stageConfig, userProgress) {
        return stageConfig.options
            .filter(opt => {
                // Filter by showIf condition if present
                if (opt.showIf) {
                    return userProgress[opt.showIf];
                }
                return true;
            })
            .sort((a, b) => a.priority - b.priority);
    },

    /**
     * Render a single option button
     */
    renderOption(option, userProgress) {
        const isCompleted = option.requirementKey && userProgress[option.requirementKey];
        const isLocked = option.requiresGospel && !userProgress.gospelCompleted;
        
        // Locked state - disabled until gospel completed
        if (isLocked) {
            return `
                <div class="w-full flex items-center gap-4 p-4 rounded-2xl border bg-[var(--card-bg)] border-[var(--card-border)] opacity-40 cursor-not-allowed">
                    <span class="text-3xl grayscale">${option.icon}</span>
                    <div class="flex-1 text-left">
                        <h3 class="font-bold text-[var(--text-muted)]">${option.title}</h3>
                        <p class="text-xs text-[var(--text-dim)] mt-1">${option.subtitle}</p>
                    </div>
                    <svg class="w-5 h-5 text-[var(--text-dim)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                    </svg>
                </div>
            `;
        }
        
        // Completed state
        if (isCompleted) {
            return `
                <button 
                    onclick="NextStepsModal.handleAction('${option.action}')" 
                    class="w-full flex items-center gap-4 p-4 rounded-2xl border bg-green-500/10 border-green-500/30 transition-all active:scale-[0.98]"
                >
                    <span class="text-3xl">${option.icon}</span>
                    <div class="flex-1 text-left">
                        <h3 class="font-bold text-[var(--text-color)] line-through opacity-60">${option.title}</h3>
                        <p class="text-xs text-[var(--text-muted)] mt-1">${option.subtitle}</p>
                    </div>
                    <span class="text-green-500 text-xl">✓</span>
                </button>
            `;
        }
        
        // Active state - clickable
        return `
            <button 
                onclick="NextStepsModal.handleAction('${option.action}')" 
                class="w-full flex items-center gap-4 p-4 rounded-2xl border bg-[var(--card-bg)] border-[var(--card-border)] hover:border-[var(--mission-gold)]/50 transition-all active:scale-[0.98]"
            >
                <span class="text-3xl">${option.icon}</span>
                <div class="flex-1 text-left">
                    <h3 class="font-bold text-[var(--text-color)]">${option.title}</h3>
                    <p class="text-xs text-[var(--text-muted)] mt-1">${option.subtitle}</p>
                </div>
                <svg class="w-5 h-5 text-[var(--mission-gold)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                </svg>
            </button>
        `;
    },

    /**
     * Handle action button clicks
     */
    handleAction(action) {
        this.close();
        
        switch (action) {
            case 'openGospel':
                if (typeof GospelPresentation !== 'undefined') {
                    GospelPresentation.open();
                } else {
                    console.error('GospelPresentation module not loaded');
                }
                break;
                
            case 'openQuietTimeGuide':
                // Will open Conversation with God guide
                if (typeof ConversationGuide !== 'undefined') {
                    ConversationGuide.open();
                } else {
                    // Fallback to Bible reader
                    if (typeof BibleReader !== 'undefined') {
                        BibleReader.enterFullscreen();
                    } else {
                        alert('Quiet Time guide coming soon!');
                    }
                }
                break;
                
            case 'openJoinGroup':
                if (typeof MyGroups !== 'undefined') {
                    MyGroups.showJoinModal();
                } else {
                    alert('Join Group feature loading...');
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
                    alert('Training enrollment coming soon!');
                }
                break;
                
            case 'openTodayLesson':
                if (typeof Training !== 'undefined') {
                    Training.openTodayLesson();
                } else {
                    alert('Today\'s lesson coming soon!');
                }
                break;
                
            case 'openCreateGroup':
                if (typeof MyGroups !== 'undefined') {
                    MyGroups.showCreateModal();
                } else {
                    alert('Create Group feature coming soon!');
                }
                break;
                
            case 'openLevel2Training':
            case 'openLevel3Training':
            case 'openLeaderDevelopment':
            case 'openMovementDashboard':
                alert('This feature is coming soon!');
                break;
                
            default:
                console.warn('Unknown action:', action);
        }
    },

    /**
     * Update user's stage after completing requirements
     * Called when user completes a key milestone
     */
    async checkAndUpdateStage() {
        const userStage = window.currentUserStage || 'seeker';
        const progress = this.getUserProgress();
        const stageConfig = this.stages[userStage];
        
        if (!stageConfig || !stageConfig.nextStage) return;
        
        // Check if all requirements are met
        const allRequirementsMet = stageConfig.requirements.every(req => progress[req]);
        
        if (allRequirementsMet) {
            await this.promoteToNextStage(stageConfig.nextStage);
        }
    },

    /**
     * Promote user to next stage
     */
    async promoteToNextStage(newStage) {
        try {
            const user = window.auth?.currentUser;
            if (!user) return;
            
            await window.db.collection('users').doc(user.uid).update({
                stage: newStage,
                stageUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                [`stageHistory.${newStage}`]: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Update local state
            window.currentUserStage = newStage;
            
            // Update UI
            if (typeof updateJourneyDisplay === 'function') {
                updateJourneyDisplay(newStage);
            }
            
            // Show celebration
            this.showStageUpCelebration(newStage);
            
            console.log('User promoted to stage:', newStage);
        } catch (error) {
            console.error('Error promoting user:', error);
        }
    },

    /**
     * Show celebration when user advances to next stage
     */
    showStageUpCelebration(newStage) {
        const stageConfig = this.stages[newStage];
        if (!stageConfig) return;
        
        // Create celebration modal
        const celebration = document.createElement('div');
        celebration.className = 'fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4';
        celebration.innerHTML = `
            <div class="text-center animate-fade-up">
                <div class="text-6xl mb-6">🎉</div>
                <h2 class="text-2xl font-bold text-[var(--mission-gold)] mb-2">Congratulations!</h2>
                <p class="text-lg text-white mb-2">Ikaw na ngayon ay</p>
                <h3 class="text-3xl font-display font-bold text-white mb-6">${stageConfig.displayName || stageConfig.name}</h3>
                <button onclick="this.parentElement.parentElement.remove()" class="px-8 py-3 bg-[var(--mission-gold)] text-[var(--mission-red-deep)] font-bold rounded-xl">
                    Magpatuloy
                </button>
            </div>
        `;
        document.body.appendChild(celebration);
        
        // Auto-remove after 10 seconds
        setTimeout(() => celebration.remove(), 10000);
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    NextStepsModal.init();
});

// Make globally available
window.NextStepsModal = NextStepsModal;
