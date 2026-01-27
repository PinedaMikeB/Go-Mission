/**
 * Gospel Presentation Module - Bilingual Animated Interactive Version
 * "Ang Daan Papuntang Langit" / "The Way to Heaven"
 * 
 * Features:
 * - Bilingual support (English & Tagalog)
 * - Smooth slide transitions
 * - Elements animate in sequence
 * - Mobile-optimized
 */

const GospelPresentation = {
    currentSlide: 0,
    totalSlides: 0,
    slides: [],
    
    // Get content based on current language
    c(key) {
        return GospelContent.get(key);
    },
    
    // Get current language
    lang() {
        return GospelContent.getLang();
    },

    open() {
        this.currentSlide = 0;
        this.buildSlides();
        this.totalSlides = this.slides.length;
        this.createModal();
        this.injectStyles();
        this.showSlide(0);
        document.getElementById('gospelModal').classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    },

    close() {
        const modal = document.getElementById('gospelModal');
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }
        if (window.GospelAudio) {
            window.GospelAudio.stop();
        }
    },

    injectStyles() {
        if (document.getElementById('gospelStyles')) return;
        
        const style = document.createElement('style');
        style.id = 'gospelStyles';
        style.textContent = `
            .gospel-slide-enter { animation: slideIn 0.4s ease-out forwards; }
            .gospel-slide-exit { animation: slideOut 0.3s ease-in forwards; }
            @keyframes slideIn { from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: translateX(0); } }
            @keyframes slideOut { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(-30px); } }
            .gospel-fade-in { animation: fadeIn 0.5s ease-out forwards; }
            .gospel-fade-up { animation: fadeUp 0.5s ease-out forwards; }
            .gospel-scale-in { animation: scaleIn 0.4s ease-out forwards; }
            .gospel-bounce { animation: bounce 0.6s ease-out forwards; }
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes scaleIn { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
            @keyframes bounce { 0% { opacity: 0; transform: scale(0.3); } 50% { transform: scale(1.05); } 70% { transform: scale(0.9); } 100% { opacity: 1; transform: scale(1); } }
            .delay-1 { animation-delay: 0.1s; opacity: 0; }
            .delay-2 { animation-delay: 0.2s; opacity: 0; }
            .delay-3 { animation-delay: 0.3s; opacity: 0; }
            .delay-4 { animation-delay: 0.4s; opacity: 0; }
            .delay-5 { animation-delay: 0.5s; opacity: 0; }
            .gospel-option { transition: all 0.2s ease; }
            .gospel-option:hover { transform: translateX(5px); border-color: var(--mission-gold) !important; }
            .gospel-option:active { transform: scale(0.98); }
            .gospel-correct { animation: correctPulse 0.5s ease-out forwards; }
            .gospel-wrong { animation: wrongShake 0.5s ease-out forwards; }
            @keyframes correctPulse { 0% { transform: scale(1); } 50% { transform: scale(1.02); background: rgba(34, 197, 94, 0.2); } 100% { transform: scale(1); background: rgba(34, 197, 94, 0.1); } }
            @keyframes wrongShake { 0%, 100% { transform: translateX(0); } 20%, 60% { transform: translateX(-5px); } 40%, 80% { transform: translateX(5px); } }
            #gospelProgress { box-shadow: 0 0 10px var(--mission-gold); }
            .gospel-btn-pulse { animation: btnPulse 2s infinite; }
            @keyframes btnPulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.4); } 50% { box-shadow: 0 0 0 10px rgba(251, 191, 36, 0); } }
        `;
        document.head.appendChild(style);
    },

    buildSlides() {
        // Note: c() must be called inside render functions to get current language
        const self = this;
        
        this.slides = [
            // ========== SLIDE 1: INTRO ==========
            {
                type: 'intro',
                render: () => `
                    <div class="text-center flex flex-col justify-center h-full">
                        <div class="gospel-bounce text-6xl mb-4">❤️</div>
                        <h1 class="gospel-fade-up delay-2 text-2xl font-display font-bold text-[var(--mission-gold)] mb-3">${self.c('intro.title')}</h1>
                        <p class="gospel-fade-up delay-3 text-base text-[var(--text-color)] mb-4">${self.c('intro.subtitle')}</p>
                        <p class="gospel-fade-up delay-4 text-xs text-[var(--text-muted)]">${self.c('intro.description')}</p>
                    </div>
                `
            },

            // ========== SLIDE 2: TRUTH 1 HEADER ==========
            {
                type: 'truth-header',
                render: () => `
                    <div class="text-center flex flex-col justify-center h-full">
                        <p class="gospel-fade-in text-xs uppercase tracking-wider text-[var(--mission-gold)] mb-2">${self.c('truth1.label')}</p>
                        <h2 class="gospel-scale-in delay-2 text-3xl font-bold text-white mb-3">${self.c('truth1.title')}</h2>
                        <p class="gospel-fade-up delay-4 text-sm text-[var(--text-muted)]">${self.c('truth1.subtitle')}</p>
                    </div>
                `
            },

            // ========== SLIDE 3: JOHN 3:16 ==========
            {
                type: 'verse',
                getData: () => c('truth1.verse')
            },

            // ========== SLIDE 4: QUESTION 1 ==========
            {
                type: 'question',
                getData: () => c('truth1.q1')
            },

            // ========== SLIDE 5: QUESTION 2 ==========
            {
                type: 'question',
                getData: () => c('truth1.q2')
            },

            // ========== SLIDE 6: TRANSITION ==========
            {
                type: 'transition',
                getData: () => c('truth1.transition')
            },

            // ========== SLIDE 7: TRUTH 2 HEADER ==========
            {
                type: 'truth-header',
                render: () => `
                    <div class="text-center flex flex-col justify-center h-full">
                        <p class="gospel-fade-in text-xs uppercase tracking-wider text-[var(--mission-gold)] mb-2">${self.c('truth2.label')}</p>
                        <p class="gospel-fade-up delay-1 text-sm text-[var(--text-muted)] mb-3">${self.c('truth2.intro')}</p>
                        <h2 class="gospel-scale-in delay-2 text-3xl font-bold text-white mb-3">${self.c('truth2.title')}</h2>
                        <p class="gospel-fade-up delay-4 text-sm text-[var(--text-muted)]">${self.c('truth2.subtitle')}</p>
                    </div>
                `
            },

            // ========== SLIDE 8: ROMANS 3:23 ==========
            {
                type: 'verse',
                image: '/assets/images/gospel/gospel_tract1.jpg',
                getData: () => c('truth2.verse1')
            },

            // ========== SLIDE 9: QUESTION - WHO SINNED ==========
            {
                type: 'question',
                getData: () => c('truth2.q1')
            },

            // ========== SLIDE 10: TRANSITION - PRICE ==========
            {
                type: 'transition',
                getData: () => c('truth2.transition1')
            },

            // ========== SLIDE 11: ROMANS 6:23 ==========
            {
                type: 'verse',
                image: '/assets/images/gospel/gospel_tract2.jpg',
                getData: () => c('truth2.verse2')
            },

            // ========== SLIDE 12: QUESTION - PAYMENT ==========
            {
                type: 'question',
                getData: () => c('truth2.q2')
            },

            // ========== SLIDE 13: TRANSITION - TWO DEATHS ==========
            {
                type: 'transition',
                getData: () => c('truth2.transition2')
            },

            // ========== SLIDE 14: TWO KINDS OF DEATH ==========
            {
                type: 'custom',
                render: () => {
                    const d = c('truth2.twoDeaths');
                    return `
                    <div class="text-center flex flex-col justify-center h-full">
                        <p class="gospel-fade-in text-sm text-[var(--text-muted)] mb-4">${d.intro}</p>
                        <div class="gospel-fade-up delay-2 flex justify-center gap-4 mb-4">
                            <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-3 text-center w-32">
                                <p class="text-2xl mb-1">💀</p>
                                <p class="text-xs text-white font-bold">${d.physical}</p>
                                <p class="text-xs text-[var(--text-muted)]">${d.physicalSub}</p>
                            </div>
                            <div class="bg-[var(--card-bg)] border border-[var(--mission-gold)]/50 rounded-xl p-3 text-center w-32">
                                <p class="text-2xl mb-1">👻</p>
                                <p class="text-xs text-[var(--mission-gold)] font-bold">${d.spiritual}</p>
                                <p class="text-xs text-[var(--text-muted)]">${d.spiritualSub}</p>
                            </div>
                        </div>
                        <p class="gospel-fade-up delay-4 text-sm text-white">${d.explanation}</p>
                        <p class="gospel-fade-up delay-5 text-xs text-[var(--text-muted)] mt-2">${d.next}</p>
                    </div>
                `}
            },

            // ========== SLIDE 15: REVELATION 21:8 ==========
            {
                type: 'verse',
                getData: () => c('truth2.verse3')
            },

            // ========== SLIDE 16: QUESTION - SECOND DEATH ==========
            {
                type: 'question',
                getData: () => c('truth2.q3')
            },

            // ========== SLIDE 17: TRUTH 3 INTRO ==========
            {
                type: 'custom',
                render: () => `
                    <div class="text-center flex flex-col justify-center h-full">
                        <p class="gospel-fade-in text-xs uppercase tracking-wider text-[var(--mission-gold)] mb-2">${self.c('truth3.label')}</p>
                        <p class="gospel-fade-up delay-1 text-sm text-[var(--text-muted)] mb-3">${self.c('truth3.intro')}</p>
                    </div>
                `
            },

            // ========== SLIDE 18: PROVERBS 14:12 ==========
            {
                type: 'verse',
                image: '/assets/images/gospel/gospel_tract3.jpg',
                getData: () => c('truth3.verseHumanEffort')
            },

            // ========== SLIDE 19: HUMAN EFFORTS FAIL ==========
            {
                type: 'custom',
                render: () => {
                    const h = c('truth3.humanEfforts');
                    return `
                    <div class="flex flex-col justify-center h-full">
                        <p class="gospel-fade-in text-center text-sm text-[var(--text-muted)] mb-4">${h.intro}</p>
                        <div class="grid grid-cols-2 gap-2 max-w-xs mx-auto mb-4">
                            ${h.items.map((item, i) => `
                                <div class="gospel-fade-up delay-${i+1} bg-red-900/30 border border-red-500/30 rounded-xl p-2 text-center">
                                    <p class="text-xs text-white">${item}</p>
                                </div>
                            `).join('')}
                        </div>
                        <p class="gospel-fade-up delay-5 text-center text-sm text-red-400">${h.fail}</p>
                        <p class="gospel-fade-up delay-6 text-center text-xs text-[var(--text-muted)] mt-2">${h.explanation}</p>
                    </div>
                `}
            },

            // ========== SLIDE 20: TRANSITION - HOW ==========
            {
                type: 'transition',
                getData: () => c('truth3.transition')
            },

            // ========== SLIDE 21: JESUS IS THE WAY HEADER ==========
            {
                type: 'truth-header',
                render: () => `
                    <div class="text-center flex flex-col justify-center h-full">
                        <p class="gospel-fade-in text-xs uppercase tracking-wider text-[var(--mission-gold)] mb-2">${self.c('truth3.label')}</p>
                        <p class="gospel-fade-up delay-1 text-sm text-[var(--text-muted)] mb-3">${this.lang() === 'tl' ? 'Ang sagot sa ating tanong ay...' : 'The answer to our question is...'}</p>
                        <h2 class="gospel-scale-in delay-2 text-3xl font-bold text-white mb-3">${self.c('truth3.title')}</h2>
                        <p class="gospel-fade-up delay-4 text-sm text-[var(--text-muted)]">${self.c('truth3.subtitle')}</p>
                    </div>
                `
            },

            // ========== SLIDE 22: JOHN 14:6 ==========
            {
                type: 'verse',
                image: '/assets/images/gospel/gospel_tract4.jpg',
                getData: () => c('truth3.verse1')
            },

            // ========== SLIDE 23: QUESTION - ONLY WAY ==========
            {
                type: 'question',
                getData: () => c('truth3.q1')
            },

            // ========== SLIDE 24: TRANSITION - WHY JESUS ==========
            {
                type: 'transition',
                getData: () => c('truth3.transition2')
            },

            // ========== SLIDE 25: 1 PETER 3:18 ==========
            {
                type: 'verse',
                getData: () => c('truth3.verse2')
            },

            // ========== SLIDE 26: QUESTION - WHY DIED ==========
            {
                type: 'question',
                getData: () => c('truth3.q2')
            },

            // ========== SLIDE 27: TRANSITION - SAVED YET? ==========
            {
                type: 'transition',
                getData: () => c('truth3.transition3')
            },

            // ========== SLIDE 28: TRUTH 4 HEADER ==========
            {
                type: 'truth-header',
                render: () => `
                    <div class="text-center flex flex-col justify-center h-full">
                        <p class="gospel-fade-in text-xs uppercase tracking-wider text-[var(--mission-gold)] mb-2">${self.c('truth4.label')}</p>
                        <h2 class="gospel-scale-in delay-2 text-3xl font-bold text-white mb-3">${self.c('truth4.title')}</h2>
                        <p class="gospel-fade-up delay-4 text-sm text-[var(--text-muted)]">${self.c('truth4.subtitle')}</p>
                    </div>
                `
            },

            // ========== SLIDE 29: EPHESIANS 2:8-9 ==========
            {
                type: 'verse',
                getData: () => c('truth4.verse')
            },

            // ========== SLIDE 30: FORMULA QUESTION ==========
            {
                type: 'formula-question',
                getData: () => c('truth4.formulaQ')
            },

            // ========== SLIDE 31: DECISION CHOICE ==========
            {
                type: 'decision-choice',
                render: () => {
                    const d = c('decision');
                    return `
                    <div class="text-center flex flex-col justify-center h-full">
                        <h3 class="gospel-fade-in text-lg font-bold text-white mb-3">${d.question}</h3>
                        <p class="gospel-fade-up delay-1 text-xs text-[var(--text-muted)] mb-3">${d.summary}</p>
                        <div class="gospel-fade-up delay-2 text-left bg-[var(--card-bg)] rounded-xl p-3 text-xs mb-4">
                            ${d.points.map(p => `<p class="text-[var(--text-color)] mb-1">✅ ${p}</p>`).join('')}
                        </div>
                        <div class="gospel-fade-up delay-3 space-y-2">
                            <button onclick="GospelPresentation.handleDecision('not-ready')" class="w-full px-4 py-3 bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-muted)] rounded-xl text-sm">
                                ${d.notReadyBtn}
                            </button>
                            <button onclick="GospelPresentation.handleDecision('yes')" class="w-full px-4 py-3 bg-[var(--mission-gold)] text-[var(--mission-red-deep)] font-bold rounded-xl text-sm gospel-btn-pulse">
                                ${d.yesBtn}
                            </button>
                        </div>
                    </div>
                `}
            },

            // ========== SLIDE 32: NOT READY ==========
            {
                type: 'not-ready',
                render: () => {
                    const n = c('notReady');
                    return `
                    <div class="text-center flex flex-col justify-center h-full">
                        <div class="gospel-fade-in text-4xl mb-3">🙏</div>
                        <h3 class="gospel-fade-up delay-1 text-lg font-bold text-white mb-3">${n.title}</h3>
                        <div class="gospel-fade-up delay-2 text-left bg-[var(--card-bg)] rounded-xl p-4 text-sm">
                            <p class="text-[var(--text-color)] mb-3">${n.message1}</p>
                            <p class="text-[var(--text-color)] mb-3">${n.message2}</p>
                            <p class="text-[var(--text-color)]">${n.message3}</p>
                        </div>
                        <button onclick="GospelPresentation.completeNotReady()" class="gospel-fade-up delay-3 mt-4 px-6 py-3 bg-[var(--mission-gold)] text-[var(--mission-red-deep)] font-bold rounded-xl text-sm">
                            ${n.continueBtn}
                        </button>
                    </div>
                `}
            },

            // ========== SLIDE 33: PRAYER INTRO ==========
            {
                type: 'prayer-intro',
                render: () => {
                    const p = c('prayer');
                    return `
                    <div class="text-center flex flex-col justify-center h-full">
                        <div class="gospel-bounce text-5xl mb-3">🙏</div>
                        <h3 class="gospel-fade-up delay-1 text-lg font-bold text-white mb-3">${p.intro}</h3>
                        <p class="gospel-fade-up delay-2 text-sm text-[var(--text-muted)]">${p.introSub}</p>
                    </div>
                `}
            },

            // ========== SLIDE 34: PRAYER ==========
            {
                type: 'prayer',
                render: () => {
                    const p = c('prayer');
                    return `
                    <div class="text-center flex flex-col justify-center h-full">
                        <h3 class="gospel-fade-in text-base font-bold text-white mb-2">${p.title}</h3>
                        <p class="gospel-fade-up delay-1 text-xs text-[var(--text-muted)] mb-2">${p.instruction}</p>
                        <div class="gospel-fade-up delay-2 bg-[var(--card-bg)] border border-[var(--mission-gold)]/30 rounded-xl p-3 text-left mb-3">
                            <p class="text-[var(--text-color)] leading-relaxed text-sm italic">${p.text}</p>
                        </div>
                        <p class="gospel-fade-up delay-3 text-sm text-white mb-3">${p.confirmQ}</p>
                        <div class="gospel-fade-up delay-4 flex gap-3 justify-center">
                            <button onclick="GospelPresentation.handlePrayerResponse('no')" class="px-6 py-2 bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-muted)] rounded-xl text-sm">
                                ${p.noBtn}
                            </button>
                            <button onclick="GospelPresentation.handlePrayerResponse('yes')" class="px-6 py-2 bg-[var(--mission-gold)] text-[var(--mission-red-deep)] font-bold rounded-xl text-sm">
                                ${p.yesBtn}
                            </button>
                        </div>
                    </div>
                `}
            },

            // ========== SLIDE 35: CELEBRATION ==========
            {
                type: 'celebration',
                render: () => {
                    const cel = c('celebration');
                    return `
                    <div class="text-center flex flex-col justify-center h-full">
                        <div class="gospel-bounce text-6xl mb-3">🎉</div>
                        <h2 class="gospel-scale-in delay-2 text-2xl font-bold text-[var(--mission-gold)] mb-2">${cel.title}</h2>
                        <p class="gospel-fade-up delay-3 text-lg text-white mb-4">${cel.subtitle}</p>
                        <div class="gospel-fade-up delay-4 bg-[var(--card-bg)] rounded-xl p-4 text-sm">
                            <p class="text-[var(--text-color)] leading-relaxed">${cel.message}</p>
                            <p class="text-[var(--text-muted)] mt-3 text-xs">${cel.promisesIntro}</p>
                        </div>
                    </div>
                `}
            },

            // ========== SLIDE 36: PROMISE 1 ==========
            {
                type: 'promise',
                render: () => {
                    const p = c('promise1');
                    return `
                    <div class="text-center flex flex-col justify-center h-full">
                        <p class="gospel-fade-in text-xs uppercase tracking-wider text-[var(--mission-gold)] mb-2">${p.label}</p>
                        <h2 class="gospel-scale-in delay-1 text-xl font-bold text-white mb-4">${p.title}</h2>
                        <div class="gospel-fade-up delay-2 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4">
                            <p class="text-base italic text-[var(--text-color)] leading-relaxed">${p.verse}</p>
                            <p class="text-right text-[var(--mission-gold)] text-sm font-bold mt-3">${p.ref}</p>
                        </div>
                    </div>
                `}
            },

            // ========== SLIDE 37: PROMISE 2 ==========
            {
                type: 'promise',
                render: () => {
                    const p = c('promise2');
                    return `
                    <div class="text-center flex flex-col justify-center h-full">
                        <p class="gospel-fade-in text-xs uppercase tracking-wider text-[var(--mission-gold)] mb-2">${p.label}</p>
                        <h2 class="gospel-scale-in delay-1 text-xl font-bold text-white mb-4">${p.title}</h2>
                        <div class="gospel-fade-up delay-2 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4 text-left">
                            <p class="text-sm italic text-[var(--text-color)] leading-relaxed">${p.verse}</p>
                            <p class="text-right text-[var(--mission-gold)] text-sm font-bold mt-3">${p.ref}</p>
                        </div>
                    </div>
                `}
            },

            // ========== SLIDE 38: PROMISE 3 ==========
            {
                type: 'promise',
                render: () => {
                    const p = c('promise3');
                    return `
                    <div class="text-center flex flex-col justify-center h-full">
                        <p class="gospel-fade-in text-xs uppercase tracking-wider text-[var(--mission-gold)] mb-2">${p.label}</p>
                        <h2 class="gospel-scale-in delay-1 text-xl font-bold text-white mb-4">${p.title}</h2>
                        <div class="gospel-fade-up delay-2 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4">
                            <p class="text-base italic text-[var(--text-color)] leading-relaxed">${p.verse}</p>
                            <p class="text-right text-[var(--mission-gold)] text-sm font-bold mt-3">${p.ref}</p>
                        </div>
                        <p class="gospel-fade-up delay-4 text-sm text-[var(--text-muted)] mt-4">${p.footer}</p>
                    </div>
                `}
            },

            // ========== SLIDE 39: FINAL ==========
            {
                type: 'final',
                render: () => {
                    const f = c('final');
                    return `
                    <div class="text-center">
                        <div class="gospel-bounce text-3xl mb-2">🌟</div>
                        <h2 class="gospel-scale-in delay-1 text-lg font-bold text-[var(--mission-gold)] mb-2">${f.title}</h2>
                        <p class="gospel-fade-up delay-2 text-xs text-[var(--text-color)] mb-2">${f.message1} <strong class="text-[var(--mission-gold)]">${f.keyword}</strong>.</p>
                        <p class="gospel-fade-up delay-2 text-xs text-[var(--text-muted)] mb-2">${f.question}</p>
                        <div class="gospel-fade-up delay-3 bg-[var(--card-bg)] border border-[var(--mission-gold)]/30 rounded-xl p-3 text-xs text-left mb-2">
                            <p class="text-[var(--mission-gold)] font-bold mb-1">${f.stepsTitle}</p>
                            <p class="text-[var(--text-color)]">${f.step1}</p>
                            <p class="text-[var(--text-color)]">${f.step2}</p>
                            <p class="text-[var(--text-color)]">${f.step3}</p>
                        </div>
                        <p class="gospel-fade-up delay-3 text-xs text-[var(--text-muted)] mb-2">${f.footer}</p>
                        <p class="gospel-fade-up delay-4 text-sm text-[var(--mission-gold)] font-bold mb-3">${f.excited}</p>
                        <button onclick="GospelPresentation.complete()" class="gospel-fade-up delay-4 w-full py-4 bg-yellow-500 text-black font-bold rounded-xl text-lg shadow-lg">
                            ${f.button}
                        </button>
                    </div>
                `}
            }
        ];
    },

    createModal() {
        const existing = document.getElementById('gospelModal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'gospelModal';
        modal.className = 'fixed inset-0 z-[100] bg-[var(--bg-color)] hidden flex flex-col';
        
        const audioBtn = window.GospelAudio ? window.GospelAudio.getButtonHTML() : '';
        const headerTitle = this.lang() === 'tl' ? 'Ang Pag-ibig ng Diyos' : 'God\'s Love';
        
        modal.innerHTML = `
            <div class="flex items-center justify-between p-3 border-b border-[var(--card-border)]">
                <div class="flex items-center gap-2">
                    <span class="text-lg">❤️</span>
                    <span class="font-bold text-sm text-[var(--text-color)]">${headerTitle}</span>
                </div>
                <div class="flex items-center gap-1">
                    ${audioBtn}
                    <button onclick="GospelPresentation.close()" class="p-2 text-[var(--text-muted)] hover:text-white transition-colors">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="h-1 bg-[var(--card-border)]">
                <div id="gospelProgress" class="h-full bg-[var(--mission-gold)] transition-all duration-500" style="width: 0%"></div>
            </div>
            <div id="gospelContent" class="flex-1 overflow-hidden p-4 flex items-center justify-center"></div>
            <div class="p-3 border-t border-[var(--card-border)] flex items-center justify-between">
                <button onclick="GospelPresentation.prev()" id="gospelPrevBtn" class="px-4 py-2 bg-[var(--card-bg)] text-[var(--text-color)] rounded-lg text-sm transition-all hover:bg-[var(--card-border)]">
                    ${this.c('ui.back')}
                </button>
                <span id="gospelSlideNum" class="text-xs text-[var(--text-muted)]"></span>
                <button onclick="GospelPresentation.next()" id="gospelNextBtn" class="px-5 py-2 bg-[var(--mission-gold)] text-[var(--mission-red-deep)] font-bold rounded-lg text-sm transition-all hover:bg-yellow-400">
                    ${this.c('ui.next')}
                </button>
            </div>
        `;
        document.body.appendChild(modal);
    },

    showSlide(index) {
        if (index < 0 || index >= this.totalSlides) return;
        
        const content = document.getElementById('gospelContent');
        const oldSlide = content.firstChild;
        
        if (oldSlide) {
            oldSlide.classList.add('gospel-slide-exit');
            setTimeout(() => this.renderNewSlide(index), 200);
        } else {
            this.renderNewSlide(index);
        }
    },

    renderNewSlide(index) {
        this.currentSlide = index;
        const slide = this.slides[index];
        const content = document.getElementById('gospelContent');
        const progress = document.getElementById('gospelProgress');
        const prevBtn = document.getElementById('gospelPrevBtn');
        const nextBtn = document.getElementById('gospelNextBtn');
        const slideNum = document.getElementById('gospelSlideNum');
        
        progress.style.width = ((index + 1) / this.totalSlides * 100) + '%';
        slideNum.textContent = `${index + 1}/${this.totalSlides}`;
        prevBtn.style.visibility = index === 0 ? 'hidden' : 'visible';
        
        if (window.GospelAudio) {
            window.GospelAudio.playForSlide(index);
        }
        
        let html = '';
        
        switch (slide.type) {
            case 'verse':
                html = this.renderVerse(slide);
                nextBtn.style.display = 'flex';
                nextBtn.textContent = this.c('ui.next');
                break;
            case 'question':
            case 'formula-question':
                html = this.renderQuestion(slide);
                nextBtn.style.display = 'none';
                break;
            case 'transition':
                html = this.renderTransition(slide);
                nextBtn.style.display = 'flex';
                nextBtn.textContent = this.c('ui.next');
                break;
            case 'decision-choice':
            case 'not-ready':
            case 'prayer':
                html = slide.render();
                nextBtn.style.display = 'none';
                break;
            case 'prayer-intro':
                html = slide.render();
                nextBtn.style.display = 'flex';
                nextBtn.textContent = this.c('ui.next');
                break;
            case 'celebration':
            case 'promise':
            case 'truth-header':
            case 'intro':
            case 'final':
            case 'custom':
                html = slide.render();
                nextBtn.style.display = slide.type === 'final' ? 'none' : 'flex';
                nextBtn.textContent = this.c('ui.next');
                break;
            default:
                html = slide.render ? slide.render() : '';
                nextBtn.style.display = 'flex';
        }
        
        content.innerHTML = `<div class="w-full max-w-md gospel-slide-enter">${html}</div>`;
    },

    renderVerse(slide) {
        const data = slide.getData ? slide.getData() : slide.verse;
        const imageHtml = slide.image ? 
            `<img src="${slide.image}" class="gospel-scale-in h-24 w-auto mx-auto mb-3 rounded-xl object-contain" onerror="this.style.display='none'">` : '';
        
        return `
            <div class="text-center flex flex-col justify-center h-full">
                ${imageHtml}
                <div class="gospel-fade-up ${slide.image ? 'delay-2' : ''} bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4">
                    <p class="text-base italic text-[var(--text-color)] leading-relaxed">${data.text}</p>
                    <p class="gospel-fade-in delay-3 text-right text-[var(--mission-gold)] text-sm font-bold mt-3">${data.ref}</p>
                </div>
            </div>
        `;
    },

    renderQuestion(slide) {
        const data = slide.getData ? slide.getData() : slide;
        const options = data.options.map((opt, i) => {
            const text = typeof opt === 'string' ? opt : opt.text;
            return `
            <button 
                onclick="GospelPresentation.answerQuestion(${i}, ${i === data.correctIndex})"
                class="gospel-option gospel-fade-up delay-${i + 3} w-full text-left p-3 bg-[var(--card-bg)] border-2 border-[var(--card-border)] rounded-xl text-sm mb-2 flex items-center gap-3"
                data-index="${i}"
            >
                <span class="w-7 h-7 rounded-full bg-[var(--card-border)] flex items-center justify-center text-sm font-bold flex-shrink-0">${String.fromCharCode(65 + i)}</span>
                <span>${text}</span>
            </button>
        `}).join('');
        
        const questionLabel = this.lang() === 'tl' ? 'Tanong:' : 'Question:';
        
        return `
            <div class="flex flex-col justify-center h-full">
                <p class="gospel-fade-in text-xs text-[var(--mission-gold)] mb-1 text-center">${questionLabel}</p>
                <h3 class="gospel-fade-up delay-1 text-lg font-bold text-white mb-4 text-center">${data.question}</h3>
                <div id="questionOptions">${options}</div>
                <div id="questionFeedback" class="hidden mt-3 p-3 rounded-xl text-sm"></div>
            </div>
        `;
    },

    renderTransition(slide) {
        const data = slide.getData ? slide.getData() : slide;
        return `
            <div class="text-center flex flex-col justify-center h-full">
                <div class="gospel-bounce text-4xl mb-3">${data.emoji}</div>
                <h3 class="gospel-fade-up delay-2 text-xl font-bold text-white mb-3">${data.title}</h3>
                <p class="gospel-fade-up delay-3 text-sm text-[var(--text-muted)] mb-3">${data.text}</p>
                <p class="gospel-fade-up delay-4 text-lg text-[var(--mission-gold)] font-bold">${data.highlight}</p>
            </div>
        `;
    },

    answerQuestion(selectedIndex, isCorrect) {
        const slide = this.slides[this.currentSlide];
        const data = slide.getData ? slide.getData() : slide;
        const options = document.querySelectorAll('.gospel-option');
        const feedback = document.getElementById('questionFeedback');
        const nextBtn = document.getElementById('gospelNextBtn');
        
        options.forEach((opt, i) => {
            opt.disabled = true;
            opt.classList.remove('gospel-option');
            
            if (i === selectedIndex) {
                if (isCorrect) {
                    opt.classList.add('gospel-correct', 'border-green-500', 'bg-green-500/10');
                } else {
                    opt.classList.add('gospel-wrong', 'border-red-500', 'bg-red-500/10');
                }
            }
            if (i === data.correctIndex && !isCorrect) {
                setTimeout(() => opt.classList.add('border-green-500'), 500);
            }
        });
        
        feedback.classList.remove('hidden');
        feedback.classList.add('gospel-fade-up');
        
        if (isCorrect) {
            feedback.className = 'gospel-fade-up mt-3 p-3 rounded-xl text-sm bg-green-500/10 border border-green-500/30 text-green-300';
            feedback.innerHTML = data.correctFeedback;
        } else {
            if (data.wrongExplanation) {
                feedback.className = 'gospel-fade-up mt-3 p-3 rounded-xl text-xs bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-color)] max-h-48 overflow-y-auto';
                feedback.innerHTML = data.wrongExplanation;
            } else {
                feedback.className = 'gospel-fade-up mt-3 p-3 rounded-xl text-sm bg-orange-500/10 border border-orange-500/30 text-orange-300';
                feedback.innerHTML = data.wrongFeedback;
            }
        }
        
        setTimeout(() => {
            nextBtn.style.display = 'flex';
            nextBtn.textContent = this.c('ui.continue');
            nextBtn.classList.add('gospel-btn-pulse');
        }, 800);
    },

    next() {
        const nextBtn = document.getElementById('gospelNextBtn');
        nextBtn.classList.remove('gospel-btn-pulse');
        
        if (this.currentSlide < this.totalSlides - 1) {
            this.showSlide(this.currentSlide + 1);
        }
    },

    prev() {
        if (this.currentSlide > 0) {
            this.showSlide(this.currentSlide - 1);
        }
    },

    async handleDecision(choice) {
        if (choice === 'not-ready') {
            try {
                const user = window.auth?.currentUser;
                if (user && window.db) {
                    await window.db.collection('users').doc(user.uid).update({
                        'gospelDecision.notReadyAt': firebase.firestore.FieldValue.serverTimestamp(),
                        'gospelDecision.status': 'not-ready'
                    });
                }
            } catch (e) { console.error(e); }
            
            localStorage.setItem('gospelStatus', 'not-ready');
            const notReadyIndex = this.slides.findIndex(s => s.type === 'not-ready');
            if (notReadyIndex !== -1) this.showSlide(notReadyIndex);
        } else if (choice === 'yes') {
            const prayerIntroIndex = this.slides.findIndex(s => s.type === 'prayer-intro');
            if (prayerIntroIndex !== -1) this.showSlide(prayerIntroIndex);
        }
    },

    completeNotReady() {
        localStorage.setItem('gospelViewed', 'true');
        this.close();
        if (typeof NextStepsModal !== 'undefined') {
            setTimeout(() => NextStepsModal.open(), 500);
        }
    },

    async handlePrayerResponse(response) {
        if (response === 'no') {
            try {
                const user = window.auth?.currentUser;
                if (user && window.db) {
                    await window.db.collection('users').doc(user.uid).update({
                        'gospelDecision.prayerResponse': 'no',
                        'gospelDecision.needsFollowUp': true,
                        'gospelDecision.respondedAt': firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
            } catch (e) { console.error(e); }
            
            localStorage.setItem('gospelStatus', 'needs-followup');
            this.close();
            if (typeof NextStepsModal !== 'undefined') {
                setTimeout(() => NextStepsModal.open(), 500);
            }
        } else if (response === 'yes') {
            localStorage.setItem('gospelCompleted', 'true');
            localStorage.setItem('prayerPrayed', 'true');
            localStorage.setItem('savedDate', new Date().toISOString());
            
            try {
                const user = window.auth?.currentUser;
                if (user && window.db) {
                    await window.db.collection('users').doc(user.uid).update({
                        'gospelDecision.accepted': true,
                        'gospelDecision.acceptedAt': firebase.firestore.FieldValue.serverTimestamp(),
                        'gospelDecision.status': 'saved',
                        'stage': 'disciple'
                    });
                    
                    await window.db.collection('stats').doc('gospel').set({
                        savedCount: firebase.firestore.FieldValue.increment(1),
                        lastSavedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                }
            } catch (e) { console.error(e); }
            
            const celebrationIndex = this.slides.findIndex(s => s.type === 'celebration');
            if (celebrationIndex !== -1) this.showSlide(celebrationIndex);
        }
    },

    async complete() {
        localStorage.setItem('gospelCompleted', 'true');
        
        try {
            const user = window.auth?.currentUser;
            if (user && window.db) {
                await window.db.collection('users').doc(user.uid).update({
                    'gospelDecision.completed': true,
                    'gospelDecision.completedAt': firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        } catch (e) { console.error(e); }
        
        this.close();
        
        if (typeof NextStepsModal !== 'undefined') {
            setTimeout(() => NextStepsModal.open(), 500);
        }
    }
};

window.GospelPresentation = GospelPresentation;
