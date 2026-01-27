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
        // Stop audio when closing
        if (window.GospelAudio) {
            window.GospelAudio.stop();
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
                    { text: 'Kamatayan', correct: true },
                    { text: 'Kaparusahan sa lupa', correct: false }
                ],
                correctFeedback: '🎉 Tama! Ang kabayaran ng kasalanan ay KAMATAYAN.',
                wrongFeedback: 'Ang tamang sagot ay: <strong>Kamatayan.</strong>'
            },
            {
                type: 'transition',
                emoji: '🤔',
                title: 'Pero sandali...',
                text: 'Kung kamatayan ang kabayaran ng kasalanan, bakit buhay pa ako?',
                highlight: 'May dalawang uri ng kamatayan.'
            },
            {
                type: 'custom',
                render: () => `
                    <div class="text-center flex flex-col justify-center h-full">
                        <p class="gospel-fade-in text-sm text-[var(--text-muted)] mb-4">Hindi pisikal na kamatayan ang tinutukoy ng Bibliya...</p>
                        <div class="gospel-fade-up delay-2 flex justify-center gap-4 mb-4">
                            <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-3 text-center w-32">
                                <p class="text-2xl mb-1">💀</p>
                                <p class="text-xs text-white font-bold">Pisikal</p>
                                <p class="text-xs text-[var(--text-muted)]">Katawan</p>
                            </div>
                            <div class="bg-[var(--card-bg)] border border-[var(--mission-gold)]/50 rounded-xl p-3 text-center w-32">
                                <p class="text-2xl mb-1">👻</p>
                                <p class="text-xs text-[var(--mission-gold)] font-bold">Espirituwal</p>
                                <p class="text-xs text-[var(--text-muted)]">Kaluluwa</p>
                            </div>
                        </div>
                        <p class="gospel-fade-up delay-4 text-sm text-white">Ang tinutukoy ay <strong class="text-[var(--mission-gold)]">espirituwal na kamatayan</strong>.</p>
                        <p class="gospel-fade-up delay-5 text-xs text-[var(--text-muted)] mt-2">Basahin natin ang susunod na talata...</p>
                    </div>
                `
            },
            {
                type: 'verse',
                verse: {
                    text: '"Subalit para naman sa mga duwag, mga taksil, mga gumagawa ng mga kasuklam-suklam na bagay, mga mamamatay-tao, mga nakikiapid, mga mangkukulam, mga sumasamba sa diyus-diyosan, at sa lahat ng mga sinungaling—ang magiging bahagi nila\'y sa lawa ng nagliliyab na apoy at asupre. Ito ang pangalawang kamatayan."',
                    ref: 'Revelation 21:8'
                }
            },
            {
                type: 'question',
                question: 'Saan ang pangalawang kamatayan?',
                options: [
                    { text: 'Sa libingan', correct: false },
                    { text: 'Sa kalungkutan', correct: false },
                    { text: 'Sa lawa ng nagliliyab na apoy at asupre', correct: true }
                ],
                correctFeedback: '🎉 Tama! Ang pangalawang kamatayan ay sa lawa ng apoy - ito ang impyerno.',
                wrongFeedback: 'Ang tamang sagot ay: <strong>Sa lawa ng nagliliyab na apoy at asupre.</strong> Ito ang impyerno.'
            },

            // ========== TRUTH 3: HUMAN EFFORTS FAIL ==========
            {
                type: 'custom',
                render: () => `
                    <div class="text-center flex flex-col justify-center h-full">
                        <p class="gospel-fade-in text-xs uppercase tracking-wider text-[var(--mission-gold)] mb-2">Pangatlong Katotohanan</p>
                        <p class="gospel-fade-up delay-1 text-sm text-[var(--text-muted)] mb-3">Dahil patay tayo sa espiritu, iniisip ng mga tao na maaari nilang bilhin o pagsikapan ang daan patungong langit...</p>
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
                type: 'custom',
                render: () => `
                    <div class="flex flex-col justify-center h-full">
                        <p class="gospel-fade-in text-center text-sm text-[var(--text-muted)] mb-4">Sinusubukan ng mga tao ang mga ito:</p>
                        <div class="grid grid-cols-2 gap-2 max-w-xs mx-auto mb-4">
                            <div class="gospel-fade-up delay-1 bg-red-900/30 border border-red-500/30 rounded-xl p-2 text-center">
                                <p class="text-xs text-white">📜 Sampung Utos</p>
                            </div>
                            <div class="gospel-fade-up delay-2 bg-red-900/30 border border-red-500/30 rounded-xl p-2 text-center">
                                <p class="text-xs text-white">⛪ Relihiyon</p>
                            </div>
                            <div class="gospel-fade-up delay-3 bg-red-900/30 border border-red-500/30 rounded-xl p-2 text-center">
                                <p class="text-xs text-white">🤝 Mabuting Gawa</p>
                            </div>
                            <div class="gospel-fade-up delay-4 bg-red-900/30 border border-red-500/30 rounded-xl p-2 text-center">
                                <p class="text-xs text-white">🕯️ Ritwal</p>
                            </div>
                        </div>
                        <p class="gospel-fade-up delay-5 text-center text-sm text-red-400">❌ Wala sa mga ito ang makakabayad sa kasalanan.</p>
                        <p class="gospel-fade-up delay-6 text-center text-xs text-[var(--text-muted)] mt-2">Ang kabayaran ng kasalanan ay kamatayan - hindi mabuting gawa.</p>
                    </div>
                `
            },
            {
                type: 'transition',
                emoji: '❓',
                title: 'Kaya paano?',
                text: 'Kung lahat tayo ay makasalanan, at hindi tayo maaaring maging perpekto...',
                highlight: 'Paano tayo maliligtas?'
            },

            // ========== TRUTH 4: JESUS IS THE WAY ==========
            {
                type: 'truth-header',
                render: () => `
                    <div class="text-center flex flex-col justify-center h-full">
                        <p class="gospel-fade-in text-xs uppercase tracking-wider text-[var(--mission-gold)] mb-2">Pangatlong Katotohanan</p>
                        <p class="gospel-fade-up delay-1 text-sm text-[var(--text-muted)] mb-3">Ang sagot sa ating tanong ay...</p>
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
                type: 'transition',
                emoji: '❓',
                title: 'Pero bakit?',
                text: 'Bakit si Hesus LANG ang daan patungong langit?',
                highlight: 'Ano ang ginawa Niya para sa atin?'
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
            {
                type: 'transition',
                emoji: '🤔',
                title: 'Kung ganoon...',
                text: 'Kung binayaran na ni Hesus ang lahat ng aking kasalanan, ligtas na ba ako?',
                highlight: 'Hindi pa. Kailangan mong ilagay ang iyong pananampalataya kay Hesus.'
            },

            // ========== TRUTH 4: BELIEVE TO BE SAVED ==========
            {
                type: 'truth-header',
                render: () => `
                    <div class="text-center flex flex-col justify-center h-full">
                        <p class="gospel-fade-in text-xs uppercase tracking-wider text-[var(--mission-gold)] mb-2">Pang-apat na Katotohanan</p>
                        <h2 class="gospel-scale-in delay-2 text-3xl font-bold text-white mb-3">SUMAMPALATAYA PARA MALIGTAS</h2>
                        <p class="gospel-fade-up delay-4 text-sm text-[var(--text-muted)]">Ang kaligtasan ay regalo - tanggapin mo lang</p>
                    </div>
                `
            },
            {
                type: 'verse',
                verse: {
                    text: '"Sapagkat dahil sa kagandahang-loob ng Diyos kayo ay naligtas sa pamamagitan ng pananampalataya; at ito\'y kaloob ng Diyos at hindi mula sa inyong sarili; hindi ito bunga ng inyong mga gawa kaya\'t walang maipagmamalaki ang sinuman."',
                    ref: 'Ephesians 2:8-9'
                }
            },
            {
                type: 'formula-question',
                question: 'Kung ilalagay sa formula ang kaligtasan ayon sa Ephesians 2:8-9, ano dito sa mga sumusunod ang tama?',
                options: [
                    { text: 'Pananampalataya + Mabuting Gawa = Kaligtasan', correct: false },
                    { text: 'Pananampalataya + Sampung Utos = Kaligtasan', correct: false },
                    { text: 'Pananampalataya + Wala = Kaligtasan', correct: true }
                ],
                correctFeedback: '🎉 Tama! Pananampalataya + Wala = Kaligtasan. Ang kaligtasan ay regalo ng Diyos - tanggapin mo lang sa pamamagitan ng pananampalataya!',
                wrongFeedback: 'formula-explanation'
            },

            // ========== DECISION & PRAYER ==========
            {
                type: 'decision-choice',
                render: () => `
                    <div class="text-center flex flex-col justify-center h-full">
                        <h3 class="gospel-fade-in text-lg font-bold text-white mb-3">Nais mo bang ilagay ang pananampalataya mo sa Panginoong Hesus ngayon?</h3>
                        <p class="gospel-fade-up delay-1 text-xs text-[var(--text-muted)] mb-3">Ayon sa Bibliya:</p>
                        <div class="gospel-fade-up delay-2 text-left bg-[var(--card-bg)] rounded-xl p-3 text-xs mb-4">
                            <p class="text-[var(--text-color)] mb-1">✅ Mahal ka ng Diyos</p>
                            <p class="text-[var(--text-color)] mb-1">✅ Lahat tayo ay nagkasala</p>
                            <p class="text-[var(--text-color)] mb-1">✅ Hindi sapat ang sariling sikap</p>
                            <p class="text-[var(--text-color)] mb-1">✅ Si Hesus ang tanging daan</p>
                            <p class="text-[var(--text-color)]">✅ Kailangan mong ilagay ang pananampalataya sa Panginoong Hesus</p>
                        </div>
                        <div class="gospel-fade-up delay-3 space-y-2">
                            <button onclick="GospelPresentation.handleDecision('not-ready')" class="w-full px-4 py-3 bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-muted)] rounded-xl text-sm">
                                Hindi pa ako handa
                            </button>
                            <button onclick="GospelPresentation.handleDecision('yes')" class="w-full px-4 py-3 bg-[var(--mission-gold)] text-[var(--mission-red-deep)] font-bold rounded-xl text-sm gospel-btn-pulse">
                                Oo, ibibigay ko na ang aking buhay sa Kanya
                            </button>
                        </div>
                    </div>
                `
            },
            {
                type: 'not-ready',
                render: () => `
                    <div class="text-center flex flex-col justify-center h-full">
                        <div class="gospel-fade-in text-4xl mb-3">🙏</div>
                        <h3 class="gospel-fade-up delay-1 text-lg font-bold text-white mb-3">Naiintindihan ko na hindi ka pa handa.</h3>
                        <div class="gospel-fade-up delay-2 text-left bg-[var(--card-bg)] rounded-xl p-4 text-sm">
                            <p class="text-[var(--text-color)] mb-3">Ipagpatuloy mo ang paghahanap mo sa Diyos.</p>
                            <p class="text-[var(--text-color)] mb-3">📖 Basahin mo ang Bibliya araw-araw mula dito sa ating app.</p>
                            <p class="text-[var(--text-color)]">At kung nais mo nang isuko ang buhay mo sa Kanya, bumalik ka ulit dito sa ating <strong class="text-[var(--mission-gold)]">"Pagkilala sa Pagmamahal ng Diyos"</strong>.</p>
                        </div>
                        <button onclick="GospelPresentation.completeNotReady()" class="gospel-fade-up delay-3 mt-4 px-6 py-3 bg-[var(--mission-gold)] text-[var(--mission-red-deep)] font-bold rounded-xl text-sm">
                            Magpatuloy →
                        </button>
                    </div>
                `
            },
            {
                type: 'prayer-intro',
                render: () => `
                    <div class="text-center flex flex-col justify-center h-full">
                        <div class="gospel-bounce text-5xl mb-3">🙏</div>
                        <h3 class="gospel-fade-up delay-1 text-lg font-bold text-white mb-3">Ipahayag mo ang iyong pananampalataya sa Panginoong Hesus</h3>
                        <p class="gospel-fade-up delay-2 text-sm text-[var(--text-muted)]">Sabihin mo ito sa Kanya ng may buong pananampalataya...</p>
                    </div>
                `
            },
            {
                type: 'prayer',
                render: () => `
                    <div class="text-center flex flex-col justify-center h-full">
                        <h3 class="gospel-fade-in text-base font-bold text-white mb-2">Panalangin ng Pagtanggap</h3>
                        <p class="gospel-fade-up delay-1 text-xs text-[var(--text-muted)] mb-2">Basahin at ipanalangin nang buong puso:</p>
                        <div class="gospel-fade-up delay-2 bg-[var(--card-bg)] border border-[var(--mission-gold)]/30 rounded-xl p-3 text-left mb-3">
                            <p class="text-[var(--text-color)] leading-relaxed text-sm italic">
                                "Panginoong Hesus, Inaamin ko po na ako ay makasalanan. Patawarin Niyo po ako. Nananampalataya po ako na Ikaw ang nagbayad ng aking kasalanan sa krus. Ngayon nga ay binubuksan ko na ang aking puso. Pumasok Ka at manahan sa akin. Tinatanggap Kita bilang aking Panginoon at Tagapagligtas. Salamat sapagkat balang araw ay makakasama Kita sa langit. Simula ngayon ay tatalikdan ko ang aking kasalanan. Sinusuko ko na ang aking buhay sa Iyo. Amen."
                            </p>
                        </div>
                        <p class="gospel-fade-up delay-3 text-sm text-white mb-3">Tinanggap mo ba ang Panginoong Hesus?</p>
                        <div class="gospel-fade-up delay-4 flex gap-3 justify-center">
                            <button onclick="GospelPresentation.handlePrayerResponse('no')" class="px-6 py-2 bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-muted)] rounded-xl text-sm">
                                Hindi
                            </button>
                            <button onclick="GospelPresentation.handlePrayerResponse('yes')" class="px-6 py-2 bg-[var(--mission-gold)] text-[var(--mission-red-deep)] font-bold rounded-xl text-sm">
                                Oo, tinanggap ko!
                            </button>
                        </div>
                    </div>
                `
            },

            // ========== SLIDE 35: CELEBRATION ==========
            {
                type: 'celebration',
                render: () => `
                    <div class="text-center flex flex-col justify-center h-full">
                        <div class="gospel-bounce text-6xl mb-3">🎉</div>
                        <h2 class="gospel-scale-in delay-2 text-2xl font-bold text-[var(--mission-gold)] mb-2">CONGRATULATIONS!</h2>
                        <p class="gospel-fade-up delay-3 text-lg text-white mb-4">Welcome sa Pamilya ng Diyos!</p>
                        <div class="gospel-fade-up delay-4 bg-[var(--card-bg)] rounded-xl p-4 text-sm">
                            <p class="text-[var(--text-color)] leading-relaxed">Ang pagtanggap mo kay Hesus ang pinakamahalagang desisyon sa iyong buhay.</p>
                            <p class="text-[var(--text-muted)] mt-3 text-xs">Narito ang mga pangako mismo ng Diyos mula sa Kanyang Salita para sa iyo:</p>
                        </div>
                    </div>
                `
            },

            // ========== SLIDE 36: PROMISE 1 - ANAK NG DIYOS ==========
            {
                type: 'promise',
                render: () => `
                    <div class="text-center flex flex-col justify-center h-full">
                        <p class="gospel-fade-in text-xs uppercase tracking-wider text-[var(--mission-gold)] mb-2">Pangako #1</p>
                        <h2 class="gospel-scale-in delay-1 text-xl font-bold text-white mb-4">IKAW AY ANAK NA NG DIYOS</h2>
                        <div class="gospel-fade-up delay-2 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4">
                            <p class="text-base italic text-[var(--text-color)] leading-relaxed">"Subalit ang lahat ng tumanggap at sumampalataya sa kanya ay binigyan niya ng karapatang maging mga anak ng Diyos."</p>
                            <p class="text-right text-[var(--mission-gold)] text-sm font-bold mt-3">— Juan 1:12</p>
                        </div>
                    </div>
                `
            },

            // ========== SLIDE 37: PROMISE 2 - BUHAY NA WALANG HANGGAN ==========
            {
                type: 'promise',
                render: () => `
                    <div class="text-center flex flex-col justify-center h-full">
                        <p class="gospel-fade-in text-xs uppercase tracking-wider text-[var(--mission-gold)] mb-2">Pangako #2</p>
                        <h2 class="gospel-scale-in delay-1 text-xl font-bold text-white mb-4">MAYROON KA NA NG BUHAY NA WALANG HANGGAN</h2>
                        <div class="gospel-fade-up delay-2 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4 text-left">
                            <p class="text-sm italic text-[var(--text-color)] leading-relaxed">"At ito ang patotoo: ipinagkaloob sa atin ng Diyos ang buhay na walang hanggan at ito'y makakamtan natin sa pamamagitan ng kanyang Anak. Kung ang Anak ng Diyos ay nasa isang tao, mayroon siyang buhay na walang hanggan; ngunit kung wala sa kanya ang Anak ng Diyos ay wala siyang buhay na walang hanggan. Isinusulat ko ito sa inyo upang malaman ninyo na kayong sumasampalataya sa Anak ng Diyos ay may buhay na walang hanggan."</p>
                            <p class="text-right text-[var(--mission-gold)] text-sm font-bold mt-3">— 1 Juan 5:11-13</p>
                        </div>
                    </div>
                `
            },

            // ========== SLIDE 38: PROMISE 3 - BAGONG NILALANG ==========
            {
                type: 'promise',
                render: () => `
                    <div class="text-center flex flex-col justify-center h-full">
                        <p class="gospel-fade-in text-xs uppercase tracking-wider text-[var(--mission-gold)] mb-2">Pangako #3</p>
                        <h2 class="gospel-scale-in delay-1 text-xl font-bold text-white mb-4">IKAW AY ISA NANG BAGONG NILALANG</h2>
                        <div class="gospel-fade-up delay-2 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4">
                            <p class="text-base italic text-[var(--text-color)] leading-relaxed">"Kaya't kung nakipag-isa na kay Cristo ang sinuman, isa na siyang bagong nilalang. Wala na ang dati niyang pagkatao; binago na siya."</p>
                            <p class="text-right text-[var(--mission-gold)] text-sm font-bold mt-3">— 2 Corinto 5:17</p>
                        </div>
                        <p class="gospel-fade-up delay-4 text-sm text-[var(--text-muted)] mt-4">Ang luma ay lumipas na. Magsimula ka nang lumakad sa iyong bagong buhay kasama si Lord!</p>
                    </div>
                `
            },

            // ========== SLIDE 39: FINAL ==========
            {
                type: 'final',
                render: () => `
                    <div class="flex flex-col h-full overflow-y-auto">
                        <div class="flex-1 flex flex-col justify-center">
                            <div class="gospel-bounce text-4xl mb-2 text-center">🌟</div>
                            <h2 class="gospel-scale-in delay-1 text-lg font-bold text-[var(--mission-gold)] mb-2 text-center">Ang Buhay na Mayroon Ka Ngayon ay Umpisa Pa Lang!</h2>
                            <div class="gospel-fade-up delay-2 bg-[var(--card-bg)] rounded-xl p-3 text-xs mb-3">
                                <p class="text-[var(--text-color)] leading-relaxed mb-2">Bilang bagong anak ng Diyos, nais Niya na ikaw ay lumago at makilala pa Siya nang lubusan. Hindi lang ito isang one-time event; ito ay simula ng isang relasyon.</p>
                                <p class="text-[var(--text-color)] leading-relaxed">At gaya ng anumang relasyon, kailangan dito ang <strong class="text-[var(--mission-gold)]">komunikasyon</strong>.</p>
                            </div>
                            <div class="gospel-fade-up delay-3 bg-[var(--card-bg)] border border-[var(--mission-gold)]/30 rounded-xl p-3 text-xs mb-3">
                                <p class="text-[var(--mission-gold)] font-bold mb-1">Narito ang iyong next step:</p>
                                <p class="text-[var(--text-color)] mb-1">1. Bumalik sa Home screen ng app na ito.</p>
                                <p class="text-[var(--text-color)] mb-1">2. Pindutin ang button na "Humakbang Ngayon".</p>
                                <p class="text-[var(--text-color)]">3. Piliin ang "Makipag-usap sa Diyos araw-araw".</p>
                            </div>
                            <p class="gospel-fade-up delay-4 text-xs text-[var(--text-muted)] text-center mb-3">Dito, tuturuan ka namin kung paano magkaroon ng Conversation Time with God.</p>
                        </div>
                        <button onclick="GospelPresentation.complete()" class="gospel-fade-up delay-5 gospel-btn-pulse w-full px-6 py-4 bg-[var(--mission-gold)] text-[var(--mission-red-deep)] font-bold rounded-xl text-base flex-shrink-0">
                            Bumalik sa Home Screen →
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
        
        // Get audio button HTML if audio controller is available
        const audioBtn = window.GospelAudio ? window.GospelAudio.getButtonHTML() : '';
        
        modal.innerHTML = `
            <div class="flex items-center justify-between p-3 border-b border-[var(--card-border)]">
                <div class="flex items-center gap-2">
                    <span class="text-lg">❤️</span>
                    <span class="font-bold text-sm text-[var(--text-color)]">Ang Pag-ibig ng Diyos</span>
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
        
        // Trigger audio for this slide if audio controller is available
        if (window.GospelAudio) {
            window.GospelAudio.playForSlide(index);
        }
        
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
            case 'formula-question':
                html = this.renderQuestion(slide);
                nextBtn.style.display = 'none';
                break;
            case 'transition':
                html = this.renderTransition(slide);
                nextBtn.style.display = 'flex';
                nextBtn.textContent = 'Next →';
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
                nextBtn.textContent = 'Next →';
                break;
            case 'celebration':
            case 'promise':
            case 'truth-header':
            case 'human-efforts':
            case 'intro':
            case 'final':
            case 'custom':
                html = slide.render();
                nextBtn.style.display = slide.type === 'final' ? 'none' : 'flex';
                nextBtn.textContent = 'Next →';
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
            // Check if this is the formula question with special explanation
            if (slide.wrongFeedback === 'formula-explanation') {
                feedback.className = 'gospel-fade-up mt-3 p-3 rounded-xl text-xs bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-color)] max-h-48 overflow-y-auto';
                feedback.innerHTML = `
                    <p class="italic text-[var(--text-muted)] mb-2">"Sapagkat dahil sa kagandahang-loob ng Diyos kayo ay naligtas sa pamamagitan ng pananampalataya; at ito'y kaloob ng Diyos at hindi mula sa inyong sarili; hindi ito bunga ng inyong mga gawa kaya't walang maipagmamalaki ang sinuman."</p>
                    <p class="text-[var(--mission-gold)] text-right text-xs mb-3">— Ephesians 2:8-9</p>
                    <p class="mb-2">Ayon sa talata, ang kaligtasan ay <strong>hindi bunga ng mabubuting gawa</strong> kaya ang Letter A at B ay hindi tama.</p>
                    <p class="mb-2">Pangalawa, ayon sa talata <strong>hindi ito mula sa sarili kundi ito ay kaloob ng Diyos</strong>. Ang kaligtasan ay regalo ng Diyos at hindi binabayaran ng pagsunod sa sampung utos, pagsali sa relihiyon o paggawa ng mabuting gawa.</p>
                    <p class="mb-2">Ang kaligtasan ay tinatanggap lamang natin mula sa <strong>kagandahang-loob ng Diyos (grace)</strong>.</p>
                    <p class="text-[var(--mission-gold)] font-bold">Kaya ang tamang sagot ay Letter C - Pananampalataya + Wala = Kaligtasan.</p>
                    <p class="text-[var(--text-muted)] mt-2 text-xs">Ang paggawa ng mabuti at pagsunod sa utos ng Diyos ay mabuti pero hindi natin ito babasehan ng Diyos para sa ating kaligtasan kundi ang ginawa lamang ng Panginoong Hesus para sa atin.</p>
                `;
            } else {
                feedback.className = 'gospel-fade-up mt-3 p-3 rounded-xl text-sm bg-orange-500/10 border border-orange-500/30 text-orange-300';
                feedback.innerHTML = slide.wrongFeedback;
            }
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

    /**
     * Handle decision choice (ready or not ready)
     */
    async handleDecision(choice) {
        if (choice === 'not-ready') {
            // Record that user is not ready yet
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
            
            // Find and go to not-ready slide
            const notReadyIndex = this.slides.findIndex(s => s.type === 'not-ready');
            if (notReadyIndex !== -1) {
                this.showSlide(notReadyIndex);
            }
        } else if (choice === 'yes') {
            // User is ready - go to prayer intro
            const prayerIntroIndex = this.slides.findIndex(s => s.type === 'prayer-intro');
            if (prayerIntroIndex !== -1) {
                this.showSlide(prayerIntroIndex);
            }
        }
    },

    /**
     * Complete for not ready users
     */
    completeNotReady() {
        localStorage.setItem('gospelViewed', 'true');
        this.close();
        
        // Could open Bible reader or just close
        if (typeof NextStepsModal !== 'undefined') {
            setTimeout(() => NextStepsModal.open(), 500);
        }
    },

    /**
     * Handle prayer response (yes/no)
     */
    async handlePrayerResponse(response) {
        if (response === 'no') {
            // Record for follow-up
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
            
            // Close and show Next Steps
            this.close();
            if (typeof NextStepsModal !== 'undefined') {
                setTimeout(() => NextStepsModal.open(), 500);
            }
        } else if (response === 'yes') {
            // User accepted Christ!
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
                    
                    // Also add to saved count collection for tracking
                    await window.db.collection('stats').doc('gospel').set({
                        savedCount: firebase.firestore.FieldValue.increment(1),
                        lastSavedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                }
            } catch (e) { console.error(e); }
            
            // Go to celebration slide
            const celebrationIndex = this.slides.findIndex(s => s.type === 'celebration');
            if (celebrationIndex !== -1) {
                this.showSlide(celebrationIndex);
            }
        }
    },

    async recordPrayer() {
        // Legacy function - kept for compatibility
        this.handlePrayerResponse('yes');
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
