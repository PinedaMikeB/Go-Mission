/**
 * Gospel Presentation Module - Interactive Version
 * "Ang Daan Papuntang Langit" - Interactive Discovery Journey
 * 
 * Flow: Verse + Question on same slide (compact for mobile)
 * Users discover truths through guided questions
 */

const GospelPresentation = {
    currentSlide: 0,
    totalSlides: 0,
    slides: [],
    
    /**
     * Initialize and open the presentation
     */
    open() {
        this.currentSlide = 0;
        this.buildSlides();
        this.totalSlides = this.slides.length;
        this.createModal();
        this.showSlide(0);
        document.getElementById('gospelModal').classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    },

    /**
     * Close the presentation
     */
    close() {
        const modal = document.getElementById('gospelModal');
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }
    },

    /**
     * Build all slides - compact version with verse + question combined
     */
    buildSlides() {
        this.slides = [
            // ========== INTRO ==========
            {
                type: 'intro',
                content: `
                    <div class="text-center flex flex-col justify-center h-full">
                        <h1 class="text-2xl font-display font-bold text-[var(--mission-gold)] mb-3">Ang Daan Papuntang Langit</h1>
                        <p class="text-base text-[var(--text-color)] mb-4">Tuklasin mo ngayon kung gaano ka kamahal ng Diyos</p>
                        <div class="text-5xl mb-4">❤️</div>
                        <p class="text-xs text-[var(--text-muted)]">Isang maikling paglalakbay na magbabago ng iyong buhay</p>
                    </div>
                `
            },

            // ========== TRUTH 1: GOD LOVES YOU ==========
            {
                type: 'truth-header',
                content: `
                    <div class="text-center flex flex-col justify-center h-full">
                        <p class="text-xs uppercase tracking-wider text-[var(--mission-gold)] mb-2">Unang Katotohanan</p>
                        <h2 class="text-2xl font-bold text-white mb-3">MAHAL KA NG DIYOS</h2>
                        <p class="text-sm text-[var(--text-muted)]">At may magandang plano Siya para sa iyo</p>
                    </div>
                `
            },
            // Verse + Question Combined
            {
                type: 'verse-question',
                verse: {
                    text: '"Sapagkat gayon na lamang ang pag-ibig ng Diyos sa sangkatauhan, kaya\'t ibinigay niya ang kanyang kaisa-isang Anak, upang ang sinumang sumampalataya sa kanya ay hindi mapahamak, kundi magkaroon ng buhay na walang hanggan."',
                    ref: 'John 3:16'
                },
                question: 'Paano pinatunayan ng Diyos na mahal ka Niya?',
                options: [
                    { text: 'Binigyan Niya ako ng magandang buhay', correct: false },
                    { text: 'Pinayagan Niya akong mabuhay', correct: false },
                    { text: 'Ibinigay Niya ang Kanyang Anak para sa akin', correct: true }
                ],
                correctFeedback: 'Tama! Ibinigay ng Diyos ang Kanyang pinakamamahal na Anak para sa iyo!',
                wrongFeedback: 'Ang tamang sagot: <strong>Ibinigay Niya ang Kanyang Anak para sa akin.</strong>'
            },
            {
                type: 'verse-question',
                verse: {
                    text: '"Ako\'y naparito upang sila\'y magkaroon ng buhay, at magkaroon ng kasaganaan nito."',
                    ref: 'John 10:10'
                },
                question: 'Ano ang gusto ng Diyos para sa iyo?',
                options: [
                    { text: 'Relihiyon at ritwal', correct: false },
                    { text: 'Mabuting gawa lamang', correct: false },
                    { text: 'Buhay na walang hanggan', correct: true }
                ],
                correctFeedback: 'Tama! Gusto ng Diyos na magkaroon ka ng buhay na walang hanggan!',
                wrongFeedback: 'Ang tamang sagot: <strong>Buhay na walang hanggan.</strong>'
            },
            {
                type: 'transition',
                content: `
                    <div class="text-center flex flex-col justify-center h-full">
                        <div class="text-3xl mb-3">🤔</div>
                        <h3 class="text-lg font-bold text-white mb-3">Pero bakit...</h3>
                        <p class="text-sm text-[var(--text-muted)] mb-2">Kung mahal tayo ng Diyos at gusto Niya tayong magkaroon ng buhay na walang hanggan...</p>
                        <p class="text-base text-[var(--mission-gold)] font-bold">Bakit hindi natin ito nararanasan?</p>
                    </div>
                `
            },

            // ========== TRUTH 2: SIN SEPARATES ==========
            {
                type: 'truth-header',
                content: `
                    <div class="text-center flex flex-col justify-center h-full">
                        <p class="text-xs uppercase tracking-wider text-[var(--mission-gold)] mb-2">Pangalawang Katotohanan</p>
                        <h2 class="text-2xl font-bold text-white mb-3">LAHAT TAYO AY MAKASALANAN</h2>
                        <p class="text-sm text-[var(--text-muted)]">Nahiwalay tayo sa Diyos</p>
                    </div>
                `
            },
            {
                type: 'verse-question',
                image: '/assets/images/gospel/gospel_tract1.jpg',
                verse: {
                    text: '"Sapagkat ang lahat ay nagkasala, at hindi nakakaabot sa kaluwalhatian ng Diyos."',
                    ref: 'Romans 3:23'
                },
                question: 'Sino ang nagkasala?',
                options: [
                    { text: 'Ang masasamang tao lamang', correct: false },
                    { text: 'Ang lahat ng tao', correct: true },
                    { text: 'Ang mga hindi relihiyoso', correct: false }
                ],
                correctFeedback: 'Tama! LAHAT tayo ay nagkasala - walang sinumang perpekto.',
                wrongFeedback: 'Ang tamang sagot: <strong>Ang lahat ng tao.</strong>'
            },
            {
                type: 'verse-question',
                image: '/assets/images/gospel/gospel_tract2.jpg',
                verse: {
                    text: '"Sapagkat ang kabayaran ng kasalanan ay kamatayan..."',
                    ref: 'Romans 6:23a'
                },
                question: 'Ano ang kabayaran ng kasalanan?',
                options: [
                    { text: 'Kahirapan sa buhay', correct: false },
                    { text: 'Kamatayan at pagkahiwalay sa Diyos', correct: true },
                    { text: 'Kaparusahan sa lupa', correct: false }
                ],
                correctFeedback: 'Tama! Ang kasalanan ay nagdudulot ng kamatayan at pagkahiwalay sa Diyos.',
                wrongFeedback: 'Ang tamang sagot: <strong>Kamatayan at pagkahiwalay sa Diyos.</strong>'
            },

            // ========== TRUTH 3: HUMAN EFFORTS FAIL ==========
            {
                type: 'truth-header',
                content: `
                    <div class="text-center flex flex-col justify-center h-full">
                        <p class="text-xs uppercase tracking-wider text-[var(--mission-gold)] mb-2">Pangatlong Katotohanan</p>
                        <h2 class="text-2xl font-bold text-white mb-3">HINDI SAPAT ANG SARILING SIKAP</h2>
                        <p class="text-sm text-[var(--text-muted)]">Walang paraan ng tao ang makakaabot sa Diyos</p>
                    </div>
                `
            },
            {
                type: 'verse-question',
                image: '/assets/images/gospel/gospel_tract3.jpg',
                verse: {
                    text: '"Mayroong daang tila matuwid sa paningin ng tao, ngunit ang dulo nito ay kamatayan."',
                    ref: 'Kawikaan 14:12'
                },
                question: 'Ano ang makapagliligtas sa iyo?',
                options: [
                    { text: 'Sampung Utos at mabuting gawa', correct: false },
                    { text: 'Relihiyon at ritwal', correct: false },
                    { text: 'Wala sa mga ito', correct: true }
                ],
                correctFeedback: 'Tama! Walang paraan ng tao ang sapat. Kailangan ng ibang paraan...',
                wrongFeedback: 'Ang tamang sagot: <strong>Wala sa mga ito.</strong> Hindi sapat ang sariling sikap.'
            },
            {
                type: 'transition',
                content: `
                    <div class="text-center flex flex-col justify-center h-full">
                        <div class="text-3xl mb-3">💡</div>
                        <h3 class="text-lg font-bold text-white mb-3">May Magandang Balita!</h3>
                        <p class="text-sm text-[var(--text-muted)] mb-2">Kung walang paraan ng tao ang makakaabot sa Diyos...</p>
                        <p class="text-base text-[var(--mission-gold)] font-bold">Ang Diyos mismo ang gumawa ng paraan!</p>
                    </div>
                `
            },

            // ========== TRUTH 4: JESUS IS THE WAY ==========
            {
                type: 'truth-header',
                content: `
                    <div class="text-center flex flex-col justify-center h-full">
                        <p class="text-xs uppercase tracking-wider text-[var(--mission-gold)] mb-2">Pang-apat na Katotohanan</p>
                        <h2 class="text-2xl font-bold text-white mb-3">SI HESUS ANG TANGING DAAN</h2>
                        <p class="text-sm text-[var(--text-muted)]">Siya lang ang tulay patungo sa Diyos</p>
                    </div>
                `
            },
            {
                type: 'verse-question',
                image: '/assets/images/gospel/gospel_tract4.jpg',
                verse: {
                    text: '"Ako ang daan, ang katotohanan, at ang buhay. Walang makakapunta sa Ama kundi sa pamamagitan ko."',
                    ref: 'John 14:6'
                },
                question: 'Sino ang TANGING daan patungo sa Diyos?',
                options: [
                    { text: 'Ang mga santo at banal', correct: false },
                    { text: 'Ang mga pari at pastor', correct: false },
                    { text: 'Si Hesus lamang', correct: true }
                ],
                correctFeedback: 'Tama! Si Hesus LANG ang daan patungo sa Ama.',
                wrongFeedback: 'Ang tamang sagot: <strong>Si Hesus lamang.</strong>'
            },
            {
                type: 'verse-question',
                verse: {
                    text: '"Sapagkat si Kristo ay namatay para sa mga kasalanan, minsan at magpakailanman, ang matuwid para sa mga hindi matuwid, upang madala niya kayo sa Diyos."',
                    ref: '1 Peter 3:18'
                },
                question: 'Bakit namatay si Hesus sa krus?',
                options: [
                    { text: 'Dahil siya ay makasalanan din', correct: false },
                    { text: 'Para bayaran ang ating kasalanan', correct: true },
                    { text: 'Dahil natalo siya ng kaaway', correct: false }
                ],
                correctFeedback: 'Tama! Si Hesus ay namatay para bayaran ang ating mga kasalanan!',
                wrongFeedback: 'Ang tamang sagot: <strong>Para bayaran ang ating kasalanan.</strong>'
            },

            // ========== TRUTH 5: BELIEVE TO BE SAVED ==========
            {
                type: 'truth-header',
                content: `
                    <div class="text-center flex flex-col justify-center h-full">
                        <p class="text-xs uppercase tracking-wider text-[var(--mission-gold)] mb-2">Panlimang Katotohanan</p>
                        <h2 class="text-2xl font-bold text-white mb-3">SUMAMPALATAYA PARA MALIGTAS</h2>
                        <p class="text-sm text-[var(--text-muted)]">Ang kaligtasan ay regalo - tanggapin mo lang</p>
                    </div>
                `
            },
            {
                type: 'verse-question',
                verse: {
                    text: '"Sapagkat sa biyaya kayo ay naligtas, sa pamamagitan ng pananampalataya; at ito\'y hindi sa inyong sarili, ito\'y kaloob ng Diyos; hindi sa pamamagitan ng mga gawa."',
                    ref: 'Ephesians 2:8-9'
                },
                question: 'Ano ang formula ng kaligtasan?',
                options: [
                    { text: 'Pananampalataya + Mabuting Gawa', correct: false },
                    { text: 'Relihiyon + Ritwal', correct: false },
                    { text: 'Pananampalataya LANG', correct: true }
                ],
                correctFeedback: 'Tama! Pananampalataya LANG - walang idadagdag!',
                wrongFeedback: 'Ang tamang sagot: <strong>Pananampalataya LANG.</strong> Walang karagdagan!'
            },

            // ========== DECISION ==========
            {
                type: 'decision',
                content: `
                    <div class="text-center flex flex-col justify-center h-full">
                        <div class="text-4xl mb-3">🙏</div>
                        <h3 class="text-lg font-bold text-white mb-3">Gusto mo bang tanggapin si Hesus?</h3>
                        <div class="text-left bg-[var(--card-bg)] rounded-xl p-3 mb-4 text-xs">
                            <p class="text-[var(--text-color)] mb-1">✓ Mahal ka ng Diyos</p>
                            <p class="text-[var(--text-color)] mb-1">✓ Lahat tayo ay nagkasala</p>
                            <p class="text-[var(--text-color)] mb-1">✓ Hindi sapat ang sariling sikap</p>
                            <p class="text-[var(--text-color)] mb-1">✓ Si Hesus ang tanging daan</p>
                            <p class="text-[var(--text-color)]">✓ Pananampalataya lang ang kailangan</p>
                        </div>
                    </div>
                `
            },
            {
                type: 'prayer',
                content: `
                    <div class="text-center flex flex-col justify-center h-full">
                        <h3 class="text-lg font-bold text-white mb-2">Panalangin ng Pagtanggap</h3>
                        <p class="text-xs text-[var(--text-muted)] mb-3">Basahin at ipanalangin nang buong puso:</p>
                        <div class="bg-[var(--card-bg)] border border-[var(--mission-gold)]/30 rounded-xl p-3 text-left mb-4">
                            <p class="text-[var(--text-color)] leading-relaxed text-xs">
                                "Panginoong Hesus, kinikilala ko na ako ay makasalanan. 
                                Naniniwala ako na Ikaw ay namatay sa krus para sa aking mga kasalanan 
                                at muling nabuhay. Tinatanggap Kita bilang aking Panginoon at Tagapagligtas. 
                                Pumasok Ka sa aking buhay. Salamat sa buhay na walang hanggan. Amen."
                            </p>
                        </div>
                        <button onclick="GospelPresentation.recordPrayer()" id="prayerBtn" class="px-6 py-3 bg-[var(--mission-gold)] text-[var(--mission-red-deep)] font-bold rounded-xl text-sm">
                            🙏 Ipinanalangin Ko Ito
                        </button>
                    </div>
                `
            },

            // ========== ASSURANCE ==========
            {
                type: 'assurance',
                content: `
                    <div class="text-center flex flex-col justify-center h-full">
                        <div class="text-4xl mb-2">🎉</div>
                        <h2 class="text-xl font-bold text-[var(--mission-gold)] mb-2">Maligayang Bati!</h2>
                        <p class="text-sm text-white mb-3">Ikaw ay bagong nilalang kay Kristo!</p>
                        <div class="bg-[var(--card-bg)] rounded-xl p-3 text-left text-xs">
                            <p class="text-[var(--mission-gold)] font-bold mb-1">Mga Katiyakan:</p>
                            <p class="text-[var(--text-color)] mb-1">• Ikaw ay ANAK na ng Diyos (John 1:12)</p>
                            <p class="text-[var(--text-color)] mb-1">• May BUHAY NA WALANG HANGGAN ka (1 John 5:11-12)</p>
                            <p class="text-[var(--text-color)]">• Ikaw ay BAGONG NILALANG (2 Cor 5:17)</p>
                        </div>
                    </div>
                `
            },

            // ========== FINAL ==========
            {
                type: 'final',
                content: `
                    <div class="text-center flex flex-col justify-center h-full">
                        <div class="text-5xl mb-3">🌟</div>
                        <h2 class="text-xl font-bold text-[var(--mission-gold)] mb-2">Simula Pa Lang Ito!</h2>
                        <p class="text-sm text-white mb-1">Maligayang pagdating sa pamilya ng Diyos!</p>
                        <p class="text-xs text-[var(--text-muted)] mb-4">Handa ka nang magsimula sa iyong paglalakbay.</p>
                        <button onclick="GospelPresentation.complete()" class="px-6 py-3 bg-[var(--mission-gold)] text-[var(--mission-red-deep)] font-bold rounded-xl text-sm">
                            Simulan ang Paglalakbay →
                        </button>
                    </div>
                `
            }
        ];
    },

    /**
     * Create the modal container
     */
    createModal() {
        const existing = document.getElementById('gospelModal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'gospelModal';
        modal.className = 'fixed inset-0 z-[100] bg-[var(--bg-color)] hidden flex flex-col';
        modal.innerHTML = `
            <!-- Header -->
            <div class="flex items-center justify-between p-3 border-b border-[var(--card-border)]">
                <div class="flex items-center gap-2">
                    <span class="text-lg">❤️</span>
                    <span class="font-bold text-sm text-[var(--text-color)]">Ang Pag-ibig ng Diyos</span>
                </div>
                <button onclick="GospelPresentation.close()" class="p-2 text-[var(--text-muted)] hover:text-white">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
            
            <!-- Progress Bar -->
            <div class="h-1 bg-[var(--card-border)]">
                <div id="gospelProgress" class="h-full bg-[var(--mission-gold)] transition-all duration-300" style="width: 0%"></div>
            </div>
            
            <!-- Content Area - Fixed height for mobile -->
            <div id="gospelContent" class="flex-1 overflow-hidden p-4 flex items-center justify-center">
                <!-- Slide content -->
            </div>
            
            <!-- Navigation -->
            <div class="p-3 border-t border-[var(--card-border)] flex items-center justify-between">
                <button onclick="GospelPresentation.prev()" id="gospelPrevBtn" class="px-4 py-2 bg-[var(--card-bg)] text-[var(--text-color)] rounded-lg text-sm">
                    ← Back
                </button>
                <span id="gospelSlideNum" class="text-xs text-[var(--text-muted)]"></span>
                <button onclick="GospelPresentation.next()" id="gospelNextBtn" class="px-5 py-2 bg-[var(--mission-gold)] text-[var(--mission-red-deep)] font-bold rounded-lg text-sm">
                    Next →
                </button>
            </div>
        `;
        
        document.body.appendChild(modal);
    },

    /**
     * Show a specific slide
     */
    showSlide(index) {
        if (index < 0 || index >= this.totalSlides) return;
        
        this.currentSlide = index;
        const slide = this.slides[index];
        const content = document.getElementById('gospelContent');
        const progress = document.getElementById('gospelProgress');
        const prevBtn = document.getElementById('gospelPrevBtn');
        const nextBtn = document.getElementById('gospelNextBtn');
        const slideNum = document.getElementById('gospelSlideNum');
        
        // Update progress
        progress.style.width = ((index + 1) / this.totalSlides * 100) + '%';
        slideNum.textContent = `${index + 1}/${this.totalSlides}`;
        
        // Show/hide prev button
        prevBtn.style.visibility = index === 0 ? 'hidden' : 'visible';
        
        // Render based on type
        let html = '';
        
        switch (slide.type) {
            case 'verse-question':
                html = this.renderVerseQuestion(slide);
                nextBtn.style.display = 'none';
                break;
            case 'prayer':
                html = slide.content;
                nextBtn.textContent = 'Skip →';
                nextBtn.style.display = 'flex';
                break;
            case 'final':
                html = slide.content;
                nextBtn.style.display = 'none';
                break;
            default:
                html = slide.content;
                nextBtn.textContent = 'Next →';
                nextBtn.style.display = 'flex';
        }
        
        content.innerHTML = `<div class="w-full max-w-md">${html}</div>`;
    },

    /**
     * Render verse + question combined (compact)
     */
    renderVerseQuestion(slide) {
        const imageHtml = slide.image ? 
            `<img src="${slide.image}" class="h-16 w-auto mx-auto mb-2 rounded-lg object-contain" onerror="this.style.display='none'">` : '';
        
        const optionsHtml = slide.options.map((opt, i) => `
            <button 
                onclick="GospelPresentation.answerQuestion(${i}, ${opt.correct})"
                class="question-option w-full text-left p-2 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg text-xs mb-2 flex items-center gap-2"
                data-index="${i}"
            >
                <span class="w-5 h-5 rounded-full bg-[var(--card-border)] flex items-center justify-center text-xs flex-shrink-0">${String.fromCharCode(65 + i)}</span>
                <span>${opt.text}</span>
            </button>
        `).join('');
        
        return `
            <div class="text-center">
                ${imageHtml}
                <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-3 mb-3">
                    <p class="text-sm italic text-[var(--text-color)] leading-snug">${slide.verse.text}</p>
                    <p class="text-right text-[var(--mission-gold)] text-xs font-bold mt-2">${slide.verse.ref}</p>
                </div>
                <p class="text-xs text-[var(--mission-gold)] mb-1">Tanong:</p>
                <p class="text-sm font-bold text-white mb-3">${slide.question}</p>
                <div id="questionOptions">${optionsHtml}</div>
                <div id="questionFeedback" class="hidden mt-2 p-2 rounded-lg text-xs"></div>
            </div>
        `;
    },

    /**
     * Handle question answer
     */
    answerQuestion(selectedIndex, isCorrect) {
        const slide = this.slides[this.currentSlide];
        const options = document.querySelectorAll('.question-option');
        const feedback = document.getElementById('questionFeedback');
        const nextBtn = document.getElementById('gospelNextBtn');
        
        options.forEach((opt, i) => {
            opt.disabled = true;
            if (i === selectedIndex) {
                opt.classList.add(isCorrect ? 'border-green-500' : 'border-red-500', isCorrect ? 'bg-green-500/10' : 'bg-red-500/10');
            }
            if (slide.options[i].correct) {
                opt.classList.add('border-green-500');
            }
        });
        
        feedback.classList.remove('hidden');
        feedback.className = `mt-2 p-2 rounded-lg text-xs ${isCorrect ? 'bg-green-500/10 border border-green-500/30 text-green-300' : 'bg-orange-500/10 border border-orange-500/30 text-orange-300'}`;
        feedback.innerHTML = isCorrect ? `✓ ${slide.correctFeedback}` : slide.wrongFeedback;
        
        nextBtn.style.display = 'flex';
        nextBtn.textContent = 'Continue →';
    },

    next() {
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
        btn.innerHTML = '✓ Naitala!';
        btn.classList.remove('bg-[var(--mission-gold)]');
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
