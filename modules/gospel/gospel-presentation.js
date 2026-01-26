/**
 * Gospel Presentation Module - Animated Interactive Version
 * "Ang Daan Papuntang Langit" - Engaging Discovery Journey
 * 
 * Features:
 * - Smooth slide transitions
 * - Elements animate in sequence (verse → question → options)
 * - Engaging visual feedback
 * - Mobile-optimized
 */

const GospelPresentation = {
    currentSlide: 0,
    totalSlides: 0,
    slides: [],
    
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
    },

    /**
     * Inject animation styles
     */
    injectStyles() {
        if (document.getElementById('gospelStyles')) return;
        
        const style = document.createElement('style');
        style.id = 'gospelStyles';
        style.textContent = `
            /* Slide transitions */
            .gospel-slide-enter {
                animation: slideIn 0.4s ease-out forwards;
            }
            .gospel-slide-exit {
                animation: slideOut 0.3s ease-in forwards;
            }
            @keyframes slideIn {
                from { opacity: 0; transform: translateX(30px); }
                to { opacity: 1; transform: translateX(0); }
            }
            @keyframes slideOut {
                from { opacity: 1; transform: translateX(0); }
                to { opacity: 0; transform: translateX(-30px); }
            }
            
            /* Element animations */
            .gospel-fade-in {
                animation: fadeIn 0.5s ease-out forwards;
            }
            .gospel-fade-up {
                animation: fadeUp 0.5s ease-out forwards;
            }
            .gospel-scale-in {
                animation: scaleIn 0.4s ease-out forwards;
            }
            .gospel-bounce {
                animation: bounce 0.6s ease-out forwards;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes fadeUp {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            @keyframes scaleIn {
                from { opacity: 0; transform: scale(0.8); }
                to { opacity: 1; transform: scale(1); }
            }
            @keyframes bounce {
                0% { opacity: 0; transform: scale(0.3); }
                50% { transform: scale(1.05); }
                70% { transform: scale(0.9); }
                100% { opacity: 1; transform: scale(1); }
            }
            
            /* Staggered delays */
            .delay-1 { animation-delay: 0.1s; opacity: 0; }
            .delay-2 { animation-delay: 0.2s; opacity: 0; }
            .delay-3 { animation-delay: 0.3s; opacity: 0; }
            .delay-4 { animation-delay: 0.4s; opacity: 0; }
            .delay-5 { animation-delay: 0.5s; opacity: 0; }
            .delay-6 { animation-delay: 0.6s; opacity: 0; }
            .delay-7 { animation-delay: 0.7s; opacity: 0; }
            .delay-8 { animation-delay: 0.8s; opacity: 0; }
            
            /* Option hover effect */
            .gospel-option {
                transition: all 0.2s ease;
            }
            .gospel-option:hover {
                transform: translateX(5px);
                border-color: var(--mission-gold) !important;
            }
            .gospel-option:active {
                transform: scale(0.98);
            }
            
            /* Correct/Wrong animations */
            .gospel-correct {
                animation: correctPulse 0.5s ease-out forwards;
            }
            .gospel-wrong {
                animation: wrongShake 0.5s ease-out forwards;
            }
            @keyframes correctPulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.02); background: rgba(34, 197, 94, 0.2); }
                100% { transform: scale(1); background: rgba(34, 197, 94, 0.1); }
            }
            @keyframes wrongShake {
                0%, 100% { transform: translateX(0); }
                20%, 60% { transform: translateX(-5px); }
                40%, 80% { transform: translateX(5px); }
            }
            
            /* Progress bar glow */
            #gospelProgress {
                box-shadow: 0 0 10px var(--mission-gold);
            }
            
            /* Button pulse */
            .gospel-btn-pulse {
                animation: btnPulse 2s infinite;
            }
            @keyframes btnPulse {
                0%, 100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.4); }
                50% { box-shadow: 0 0 0 10px rgba(251, 191, 36, 0); }
            }
        `;
        document.head.appendChild(style);
    },

    buildSlides() {
        this.slides = [
            // ========== INTRO ==========
            {
                type: 'intro',
                render: () => `
                    <div class="text-center flex flex-col justify-center h-full">
                        <div class="gospel-bounce text-6xl mb-4">❤️</div>
                        <h1 class="gospel-fade-up delay-2 text-2xl font-display font-bold text-[var(--mission-gold)] mb-3">Ang Daan Papuntang Langit</h1>
                        <p class="gospel-fade-up delay-3 text-base text-[var(--text-color)] mb-4">Tuklasin mo ngayon kung gaano ka kamahal ng Diyos</p>
                        <p class="gospel-fade-up delay-4 text-xs text-[var(--text-muted)]">Isang maikling paglalakbay na magbabago ng iyong buhay</p>
                    </div>
                `
            },

            // ========== TRUTH 1: GOD LOVES YOU ==========
            {
                type: 'truth-header',
                render: () => `
                    <div class="text-center flex flex-col justify-center h-full">
                        <p class="gospel-fade-in text-xs uppercase tracking-wider text-[var(--mission-gold)] mb-2">Unang Katotohanan</p>
                        <h2 class="gospel-scale-in delay-2 text-3xl font-bold text-white mb-3">MAHAL KA NG DIYOS</h2>
                        <p class="gospel-fade-up delay-4 text-sm text-[var(--text-muted)]">At may magandang plano Siya para sa iyo</p>
                    </div>
                `
            },
            {
                type: 'verse',
                verse: {
                    text: '"Sapagkat gayon na lamang ang pag-ibig ng Diyos sa sangkatauhan, kaya\'t ibinigay niya ang kanyang kaisa-isang Anak, upang ang sinumang sumampalataya sa kanya ay hindi mapahamak, kundi magkaroon ng buhay na walang hanggan."',
                    ref: 'John 3:16'
                }
            },
            {
                type: 'question',
                question: 'Paano pinatunayan ng Diyos na mahal ka Niya?',
                options: [
                    { text: 'Binigyan Niya ako ng magandang buhay', correct: false },
                    { text: 'Pinayagan Niya akong mabuhay', correct: false },
                    { text: 'Ibinigay Niya ang Kanyang Anak para sa akin', correct: true }
                ],
                correctFeedback: '🎉 Tama! Ibinigay ng Diyos ang Kanyang pinakamamahal na Anak para sa iyo!',
                wrongFeedback: 'Ang tamang sagot ay: <strong>Ibinigay Niya ang Kanyang Anak para sa akin.</strong>'
            },
            {
                type: 'question',
                question: 'Ano ang gusto ng Diyos para sa iyo?',
                options: [
                    { text: 'Magandang trabaho at kayamanan', correct: false },
                    { text: 'Buhay na walang hanggan', correct: true },
                    { text: 'Relihiyon at ritwal', correct: false }
                ],
                correctFeedback: '🎉 Tama! Gusto ng Diyos na magkaroon ka ng BUHAY NA WALANG HANGGAN!',
                wrongFeedback: 'Ang tamang sagot ay: <strong>Buhay na walang hanggan.</strong> Ito ang regalo ng Diyos sa iyo!'
            },
            {
                type: 'transition',
                emoji: '🤔',
                title: 'Pero bakit...',
                text: 'Kung mahal tayo ng Diyos at gusto Niya tayong magkaroon ng buhay na walang hanggan...',
                highlight: 'Bakit hindi natin ito nararanasan?'
            },

            // ========== TRUTH 2: SIN SEPARATES ==========
            {
                type: 'truth-header',
                render: () => `
                    <div class="text-center flex flex-col justify-center h-full">
                        <p class="gospel-fade-in text-xs uppercase tracking-wider text-[var(--mission-gold)] mb-2">Pangalawang Katotohanan</p>
                        <p class="gospel-fade-up delay-1 text-sm text-[var(--text-muted)] mb-3">Kaya hindi natin nararanasan ang buhay na walang hanggan ay dahil...</p>
                        <h2 class="gospel-scale-in delay-2 text-3xl font-bold text-white mb-3">LAHAT TAYO AY MAKASALANAN</h2>
                        <p class="gospel-fade-up delay-4 text-sm text-[var(--text-muted)]">Nahiwalay tayo sa Diyos</p>
                    </div>
                `
            },
            {
                type: 'verse',
                image: '/assets/images/gospel/gospel_tract1.jpg',
                verse: {
                    text: '"Sapagkat ang lahat ay nagkasala, at hindi nakakaabot sa kaluwalhatian ng Diyos."',
                    ref: 'Romans 3:23'
                }
            },
            {
                type: 'question',
                question: 'Sino ang nagkasala?',
                options: [
                    { text: 'Ang masasamang tao lamang', correct: false },
                    { text: 'Ang lahat ng tao', correct: true },
                    { text: 'Ang mga hindi relihiyoso', correct: false }
                ],
                correctFeedback: '🎉 Tama! LAHAT tayo ay nagkasala - walang sinumang perpekto.',
                wrongFeedback: 'Ang tamang sagot ay: <strong>Ang lahat ng tao.</strong>'
            },
            {
                type: 'transition',
                emoji: '⚠️',
                title: 'May Kabayaran',
                text: 'Hindi lang tayo nahiwalay sa Diyos dahil makasalanan tayo...',
                highlight: 'Ang ating kasalanan ay may kabayaran.'
            },
            {
                type: 'verse',
                image: '/assets/images/gospel/gospel_tract2.jpg',
                verse: {
                    text: '"Sapagkat ang kabayaran ng kasalanan ay kamatayan..."',
                    ref: 'Romans 6:23a'
                }
            },
            {
                type: 'question',
                question: 'Ano ang kabayaran ng kasalanan?',
                options: [
                    { text: 'Kahirapan sa buhay', correct: false },
                    { text: 'Kamatayan at pagkahiwalay sa Diyos', correct: true },
                    { text: 'Kaparusahan sa lupa', correct: false }
                ],
                correctFeedback: '🎉 Tama! Ang kasalanan ay nagdudulot ng kamatayan at pagkahiwalay sa Diyos.',
                wrongFeedback: 'Ang tamang sagot ay: <strong>Kamatayan at pagkahiwalay sa Diyos.</strong>'
            },

            // ========== TRUTH 3: HUMAN EFFORTS FAIL ==========
            {
                type: 'truth-header',
                render: () => `
                    <div class="text-center flex flex-col justify-center h-full">
                        <p class="gospel-fade-in text-xs uppercase tracking-wider text-[var(--mission-gold)] mb-2">Pangatlong Katotohanan</p>
                        <h2 class="gospel-scale-in delay-2 text-3xl font-bold text-white mb-3">HINDI SAPAT ANG SARILING SIKAP</h2>
                        <p class="gospel-fade-up delay-4 text-sm text-[var(--text-muted)]">Walang paraan ng tao ang makakaabot sa Diyos</p>
                    </div>
                `
            },
            {
                type: 'human-efforts',
                render: () => `
                    <div class="flex flex-col justify-center h-full">
                        <p class="gospel-fade-in text-center text-sm text-[var(--text-muted)] mb-4">Sinusubukan ng mga tao ang mga ito:</p>
                        <div class="grid grid-cols-2 gap-3 max-w-xs mx-auto">
                            <div class="gospel-fade-up delay-1 bg-red-900/30 border border-red-500/30 rounded-xl p-3 text-center">
                                <div class="text-2xl mb-1">📜</div>
                                <p class="text-xs text-white">Sampung Utos</p>
                                <p class="text-xs text-red-400">❌ Hindi sapat</p>
                            </div>
                            <div class="gospel-fade-up delay-2 bg-red-900/30 border border-red-500/30 rounded-xl p-3 text-center">
                                <div class="text-2xl mb-1">⛪</div>
                                <p class="text-xs text-white">Relihiyon</p>
                                <p class="text-xs text-red-400">❌ Hindi sapat</p>
                            </div>
                            <div class="gospel-fade-up delay-3 bg-red-900/30 border border-red-500/30 rounded-xl p-3 text-center">
                                <div class="text-2xl mb-1">🤝</div>
                                <p class="text-xs text-white">Mabuting Gawa</p>
                                <p class="text-xs text-red-400">❌ Hindi sapat</p>
                            </div>
                            <div class="gospel-fade-up delay-4 bg-red-900/30 border border-red-500/30 rounded-xl p-3 text-center">
                                <div class="text-2xl mb-1">🕯️</div>
                                <p class="text-xs text-white">Ritwal</p>
                                <p class="text-xs text-red-400">❌ Hindi sapat</p>
                            </div>
                        </div>
                    </div>
                `
            },
            {
                type: 'verse',
                image: '/assets/images/gospel/gospel_tract3.jpg',
                verse: {
                    text: '"Mayroong daang tila matuwid sa paningin ng tao, ngunit ang dulo nito ay kamatayan."',
                    ref: 'Kawikaan 14:12'
                }
            },
            {
                type: 'question',
                question: 'Ano ang makapagliligtas sa iyo?',
                options: [
                    { text: 'Sampung Utos at mabuting gawa', correct: false },
                    { text: 'Relihiyon at ritwal', correct: false },
                    { text: 'Wala sa mga ito', correct: true }
                ],
                correctFeedback: '🎉 Tama! Walang paraan ng tao ang sapat. Kailangan ng ibang paraan...',
                wrongFeedback: 'Ang tamang sagot ay: <strong>Wala sa mga ito.</strong> Hindi sapat ang sariling sikap.'
            },
            {
                type: 'transition',
                emoji: '💡',
                title: 'May Magandang Balita!',
                text: 'Kung walang paraan ng tao ang makakaabot sa Diyos...',
                highlight: 'Ang Diyos mismo ang gumawa ng paraan!'
            },

            // ========== TRUTH 4: JESUS IS THE WAY ==========
            {
                type: 'truth-header',
                render: () => `
                    <div class="text-center flex flex-col justify-center h-full">
                        <p class="gospel-fade-in text-xs uppercase tracking-wider text-[var(--mission-gold)] mb-2">Pang-apat na Katotohanan</p>
                        <h2 class="gospel-scale-in delay-2 text-3xl font-bold text-white mb-3">SI HESUS ANG TANGING DAAN</h2>
                        <p class="gospel-fade-up delay-4 text-sm text-[var(--text-muted)]">Siya lang ang tulay patungo sa Diyos</p>
                    </div>
                `
            },
            {
                type: 'verse',
                image: '/assets/images/gospel/gospel_tract4.jpg',
                verse: {
                    text: '"Ako ang daan, ang katotohanan, at ang buhay. Walang makakapunta sa Ama kundi sa pamamagitan ko."',
                    ref: 'John 14:6'
                }
            },
            {
                type: 'question',
                question: 'Sino ang TANGING daan patungo sa Diyos?',
                options: [
                    { text: 'Ang mga santo at banal', correct: false },
                    { text: 'Ang mga pari at pastor', correct: false },
                    { text: 'Si Hesus lamang', correct: true }
                ],
                correctFeedback: '🎉 Tama! Si Hesus LANG ang daan patungo sa Ama.',
                wrongFeedback: 'Ang tamang sagot ay: <strong>Si Hesus lamang.</strong>'
            },
            {
                type: 'verse',
                verse: {
                    text: '"Sapagkat si Kristo ay namatay para sa mga kasalanan, minsan at magpakailanman, ang matuwid para sa mga hindi matuwid, upang madala niya kayo sa Diyos."',
                    ref: '1 Peter 3:18'
                }
            },
            {
                type: 'question',
                question: 'Bakit namatay si Hesus sa krus?',
                options: [
                    { text: 'Dahil siya ay makasalanan din', correct: false },
                    { text: 'Para bayaran ang ating kasalanan', correct: true },
                    { text: 'Dahil natalo siya ng kaaway', correct: false }
                ],
                correctFeedback: '🎉 Tama! Si Hesus ay namatay para bayaran ang ating mga kasalanan!',
                wrongFeedback: 'Ang tamang sagot ay: <strong>Para bayaran ang ating kasalanan.</strong>'
            },

            // ========== TRUTH 5: BELIEVE TO BE SAVED ==========
            {
                type: 'truth-header',
                render: () => `
                    <div class="text-center flex flex-col justify-center h-full">
                        <p class="gospel-fade-in text-xs uppercase tracking-wider text-[var(--mission-gold)] mb-2">Panlimang Katotohanan</p>
                        <h2 class="gospel-scale-in delay-2 text-3xl font-bold text-white mb-3">SUMAMPALATAYA PARA MALIGTAS</h2>
                        <p class="gospel-fade-up delay-4 text-sm text-[var(--text-muted)]">Ang kaligtasan ay regalo - tanggapin mo lang</p>
                    </div>
                `
            },
            {
                type: 'verse',
                verse: {
                    text: '"Sapagkat sa biyaya kayo ay naligtas, sa pamamagitan ng pananampalataya; at ito\'y hindi sa inyong sarili, ito\'y kaloob ng Diyos; hindi sa pamamagitan ng mga gawa."',
                    ref: 'Ephesians 2:8-9'
                }
            },
            {
                type: 'question',
                question: 'Ano ang formula ng kaligtasan?',
                options: [
                    { text: 'Pananampalataya + Mabuting Gawa', correct: false },
                    { text: 'Relihiyon + Ritwal', correct: false },
                    { text: 'Pananampalataya LANG', correct: true }
                ],
                correctFeedback: '🎉 Tama! Pananampalataya LANG - walang idadagdag!',
                wrongFeedback: 'Ang tamang sagot ay: <strong>Pananampalataya LANG.</strong>'
            },

            // ========== DECISION & PRAYER ==========
            {
                type: 'decision',
                render: () => `
                    <div class="text-center flex flex-col justify-center h-full">
                        <div class="gospel-bounce text-5xl mb-3">🙏</div>
                        <h3 class="gospel-fade-up delay-2 text-xl font-bold text-white mb-4">Gusto mo bang tanggapin si Hesus?</h3>
                        <div class="gospel-fade-up delay-3 text-left bg-[var(--card-bg)] rounded-xl p-4 text-sm">
                            <p class="text-[var(--text-color)] mb-2">✅ Mahal ka ng Diyos</p>
                            <p class="text-[var(--text-color)] mb-2">✅ Lahat tayo ay nagkasala</p>
                            <p class="text-[var(--text-color)] mb-2">✅ Hindi sapat ang sariling sikap</p>
                            <p class="text-[var(--text-color)] mb-2">✅ Si Hesus ang tanging daan</p>
                            <p class="text-[var(--text-color)]">✅ Pananampalataya lang ang kailangan</p>
                        </div>
                    </div>
                `
            },
            {
                type: 'prayer',
                render: () => `
                    <div class="text-center flex flex-col justify-center h-full">
                        <h3 class="gospel-fade-in text-lg font-bold text-white mb-2">Panalangin ng Pagtanggap</h3>
                        <p class="gospel-fade-up delay-1 text-xs text-[var(--text-muted)] mb-3">Basahin at ipanalangin nang buong puso:</p>
                        <div class="gospel-fade-up delay-2 bg-[var(--card-bg)] border border-[var(--mission-gold)]/30 rounded-xl p-4 text-left mb-4">
                            <p class="text-[var(--text-color)] leading-relaxed text-sm italic">
                                "Panginoong Hesus, kinikilala ko na ako ay makasalanan. 
                                Naniniwala ako na Ikaw ay namatay sa krus para sa aking mga kasalanan 
                                at muling nabuhay. Tinatanggap Kita bilang aking Panginoon at Tagapagligtas. 
                                Pumasok Ka sa aking buhay. Salamat sa buhay na walang hanggan. Amen."
                            </p>
                        </div>
                        <button onclick="GospelPresentation.recordPrayer()" id="prayerBtn" class="gospel-fade-up delay-4 gospel-btn-pulse px-6 py-3 bg-[var(--mission-gold)] text-[var(--mission-red-deep)] font-bold rounded-xl text-base">
                            🙏 Ipinanalangin Ko Ito
                        </button>
                    </div>
                `
            },

            // ========== CELEBRATION ==========
            {
                type: 'celebration',
                render: () => `
                    <div class="text-center flex flex-col justify-center h-full">
                        <div class="gospel-bounce text-6xl mb-3">🎉</div>
                        <h2 class="gospel-scale-in delay-2 text-2xl font-bold text-[var(--mission-gold)] mb-2">MALIGAYANG BATI!</h2>
                        <p class="gospel-fade-up delay-3 text-lg text-white mb-4">Ikaw ay bagong nilalang kay Kristo!</p>
                        <div class="gospel-fade-up delay-4 bg-[var(--card-bg)] rounded-xl p-4 text-left text-sm">
                            <p class="text-[var(--mission-gold)] font-bold mb-2">Mga Katiyakan mula sa Diyos:</p>
                            <p class="text-[var(--text-color)] mb-1">✨ Ikaw ay ANAK na ng Diyos <span class="text-xs text-[var(--text-muted)]">(John 1:12)</span></p>
                            <p class="text-[var(--text-color)] mb-1">✨ May BUHAY NA WALANG HANGGAN ka <span class="text-xs text-[var(--text-muted)]">(1 John 5:11)</span></p>
                            <p class="text-[var(--text-color)]">✨ Ikaw ay BAGONG NILALANG <span class="text-xs text-[var(--text-muted)]">(2 Cor 5:17)</span></p>
                        </div>
                    </div>
                `
            },

            // ========== FINAL ==========
            {
                type: 'final',
                render: () => `
                    <div class="text-center flex flex-col justify-center h-full">
                        <div class="gospel-bounce text-5xl mb-3">🌟</div>
                        <h2 class="gospel-scale-in delay-2 text-2xl font-bold text-[var(--mission-gold)] mb-2">Simula Pa Lang Ito!</h2>
                        <p class="gospel-fade-up delay-3 text-base text-white mb-1">Maligayang pagdating sa pamilya ng Diyos!</p>
                        <p class="gospel-fade-up delay-4 text-sm text-[var(--text-muted)] mb-6">Handa ka nang magsimula sa iyong paglalakbay bilang alagad.</p>
                        <button onclick="GospelPresentation.complete()" class="gospel-fade-up delay-5 gospel-btn-pulse px-8 py-4 bg-[var(--mission-gold)] text-[var(--mission-red-deep)] font-bold rounded-xl text-base">
                            Simulan ang Paglalakbay →
                        </button>
                    </div>
                `
            }
        ];
    },

    createModal() {
        const existing = document.getElementById('gospelModal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'gospelModal';
        modal.className = 'fixed inset-0 z-[100] bg-[var(--bg-color)] hidden flex flex-col';
        modal.innerHTML = `
            <div class="flex items-center justify-between p-3 border-b border-[var(--card-border)]">
                <div class="flex items-center gap-2">
                    <span class="text-lg">❤️</span>
                    <span class="font-bold text-sm text-[var(--text-color)]">Ang Pag-ibig ng Diyos</span>
                </div>
                <button onclick="GospelPresentation.close()" class="p-2 text-[var(--text-muted)] hover:text-white transition-colors">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
            <div class="h-1 bg-[var(--card-border)]">
                <div id="gospelProgress" class="h-full bg-[var(--mission-gold)] transition-all duration-500" style="width: 0%"></div>
            </div>
            <div id="gospelContent" class="flex-1 overflow-hidden p-4 flex items-center justify-center"></div>
            <div class="p-3 border-t border-[var(--card-border)] flex items-center justify-between">
                <button onclick="GospelPresentation.prev()" id="gospelPrevBtn" class="px-4 py-2 bg-[var(--card-bg)] text-[var(--text-color)] rounded-lg text-sm transition-all hover:bg-[var(--card-border)]">
                    ← Back
                </button>
                <span id="gospelSlideNum" class="text-xs text-[var(--text-muted)]"></span>
                <button onclick="GospelPresentation.next()" id="gospelNextBtn" class="px-5 py-2 bg-[var(--mission-gold)] text-[var(--mission-red-deep)] font-bold rounded-lg text-sm transition-all hover:bg-yellow-400">
                    Next →
                </button>
            </div>
        `;
        document.body.appendChild(modal);
    },

    showSlide(index) {
        if (index < 0 || index >= this.totalSlides) return;
        
        const content = document.getElementById('gospelContent');
        const oldSlide = content.firstChild;
        
        // Exit animation for old slide
        if (oldSlide) {
            oldSlide.classList.add('gospel-slide-exit');
            setTimeout(() => {
                this.renderNewSlide(index);
            }, 200);
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
        
        let html = '';
        
        switch (slide.type) {
            case 'verse':
                html = this.renderVerse(slide);
                nextBtn.style.display = 'flex';
                nextBtn.textContent = 'Next →';
                break;
            case 'question':
                html = this.renderQuestion(slide);
                nextBtn.style.display = 'none';
                break;
            case 'transition':
                html = this.renderTransition(slide);
                nextBtn.style.display = 'flex';
                nextBtn.textContent = 'Next →';
                break;
            case 'prayer':
            case 'decision':
            case 'celebration':
            case 'truth-header':
            case 'human-efforts':
            case 'intro':
            case 'final':
                html = slide.render();
                nextBtn.style.display = slide.type === 'final' ? 'none' : 'flex';
                nextBtn.textContent = slide.type === 'prayer' ? 'Skip →' : 'Next →';
                break;
            default:
                html = slide.render ? slide.render() : '';
                nextBtn.style.display = 'flex';
        }
        
        content.innerHTML = `<div class="w-full max-w-md gospel-slide-enter">${html}</div>`;
    },

    renderVerse(slide) {
        const imageHtml = slide.image ? 
            `<img src="${slide.image}" class="gospel-scale-in h-24 w-auto mx-auto mb-3 rounded-xl object-contain" onerror="this.style.display='none'">` : '';
        
        return `
            <div class="text-center flex flex-col justify-center h-full">
                ${imageHtml}
                <div class="gospel-fade-up ${slide.image ? 'delay-2' : ''} bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4">
                    <p class="text-base italic text-[var(--text-color)] leading-relaxed">${slide.verse.text}</p>
                    <p class="gospel-fade-in delay-3 text-right text-[var(--mission-gold)] text-sm font-bold mt-3">${slide.verse.ref}</p>
                </div>
            </div>
        `;
    },

    renderQuestion(slide) {
        const optionsHtml = slide.options.map((opt, i) => `
            <button 
                onclick="GospelPresentation.answerQuestion(${i}, ${opt.correct})"
                class="gospel-option gospel-fade-up delay-${i + 3} w-full text-left p-3 bg-[var(--card-bg)] border-2 border-[var(--card-border)] rounded-xl text-sm mb-2 flex items-center gap-3"
                data-index="${i}"
            >
                <span class="w-7 h-7 rounded-full bg-[var(--card-border)] flex items-center justify-center text-sm font-bold flex-shrink-0">${String.fromCharCode(65 + i)}</span>
                <span>${opt.text}</span>
            </button>
        `).join('');
        
        return `
            <div class="flex flex-col justify-center h-full">
                <p class="gospel-fade-in text-xs text-[var(--mission-gold)] mb-1 text-center">Tanong:</p>
                <h3 class="gospel-fade-up delay-1 text-lg font-bold text-white mb-4 text-center">${slide.question}</h3>
                <div id="questionOptions">${optionsHtml}</div>
                <div id="questionFeedback" class="hidden mt-3 p-3 rounded-xl text-sm"></div>
            </div>
        `;
    },

    renderTransition(slide) {
        return `
            <div class="text-center flex flex-col justify-center h-full">
                <div class="gospel-bounce text-4xl mb-3">${slide.emoji}</div>
                <h3 class="gospel-fade-up delay-2 text-xl font-bold text-white mb-3">${slide.title}</h3>
                <p class="gospel-fade-up delay-3 text-sm text-[var(--text-muted)] mb-3">${slide.text}</p>
                <p class="gospel-fade-up delay-4 text-lg text-[var(--mission-gold)] font-bold">${slide.highlight}</p>
            </div>
        `;
    },

    answerQuestion(selectedIndex, isCorrect) {
        const slide = this.slides[this.currentSlide];
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
            if (slide.options[i].correct && !isCorrect) {
                setTimeout(() => {
                    opt.classList.add('border-green-500');
                }, 500);
            }
        });
        
        feedback.classList.remove('hidden');
        feedback.classList.add('gospel-fade-up');
        
        if (isCorrect) {
            feedback.className = 'gospel-fade-up mt-3 p-3 rounded-xl text-sm bg-green-500/10 border border-green-500/30 text-green-300';
            feedback.innerHTML = slide.correctFeedback;
        } else {
            feedback.className = 'gospel-fade-up mt-3 p-3 rounded-xl text-sm bg-orange-500/10 border border-orange-500/30 text-orange-300';
            feedback.innerHTML = slide.wrongFeedback;
        }
        
        setTimeout(() => {
            nextBtn.style.display = 'flex';
            nextBtn.textContent = 'Continue →';
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

    async recordPrayer() {
        const btn = document.getElementById('prayerBtn');
        btn.disabled = true;
        btn.classList.remove('gospel-btn-pulse');
        btn.innerHTML = '✓ Naitala na!';
        btn.classList.remove('bg-[var(--mission-gold)]', 'text-[var(--mission-red-deep)]');
        btn.classList.add('bg-green-600', 'text-white');
        
        localStorage.setItem('gospelCompleted', 'true');
        localStorage.setItem('prayerPrayed', 'true');
        
        try {
            const user = window.auth?.currentUser;
            if (user && window.db) {
                await window.db.collection('users').doc(user.uid).update({
                    'gospelDecision.prayed': true,
                    'gospelDecision.prayedAt': firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        } catch (e) { console.error(e); }
        
        setTimeout(() => this.next(), 1500);
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
