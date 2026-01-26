/**
 * Gospel Presentation Module
 * "Know How Much God Loves You" - Interactive Gospel Presentation
 * 
 * Based on "Ang Daan Papuntang Langit" (The Way to Heaven)
 * 4 Truths: God Loves You → Sin Separates → Jesus is the Way → Believe to be Saved
 */

const GospelPresentation = {
    currentSlide: 0,
    totalSlides: 0,
    userResponses: {},
    audioElement: null,
    isPlaying: false,
    
    // Slide content data
    slides: [
        // INTRO SLIDE
        {
            id: 'intro',
            type: 'intro',
            title: 'Ang Daan Papuntang Langit',
            subtitle: 'May apat na katotohanan na dapat nating malaman upang makapunta tayo sa langit.',
            image: null,
            audio: { start: 0, end: 10 }
        },
        
        // TRUTH 1: God Loves You
        {
            id: 'truth1-title',
            type: 'truth-title',
            truthNumber: 1,
            title: 'Mahal ka ng Diyos at nais Niya na magkaroon ka ng buhay na walang hanggan.',
            image: null,
            audio: { start: 10, end: 20 }
        },
        {
            id: 'truth1-verse1',
            type: 'verse',
            verse: '"Sapagkat gayon na lamang ang pag-ibig ng Diyos sa sangkatauhan, kaya\'t ibinigay niya ang kanyang kaisa-isang Anak, upang ang sinumang sumampalataya sa kanya ay hindi mapahamak, kundi magkaroon ng buhay na walang hanggan."',
            reference: 'John 3:16',
            image: null,
            audio: { start: 20, end: 35 }
        },
        {
            id: 'truth1-point',
            type: 'point',
            title: 'Nais din Niyang magkaron ka ng buhay na makabuluhan.',
            verse: '"Dumarating ang magnanakaw para lamang magnakaw, pumatay, at manira. Naparito ako upang ang mga tupa ay magkaroon ng buhay, buhay na masaganang lubos."',
            reference: 'John 10:10',
            audio: { start: 35, end: 50 }
        },
        {
            id: 'truth1-question',
            type: 'question',
            question: 'Kaya lang maraming tao ang hindi nakakaranas ng buhay na walang hanggan at buhay na makabuluhan sapagkat...',
            nextHint: 'Pindutin ang SUSUNOD upang malaman',
            audio: { start: 50, end: 58 }
        },
        
        // TRUTH 2: Sin Separates
        {
            id: 'truth2-title',
            type: 'truth-title',
            truthNumber: 2,
            title: 'Likas na makasalanan ang tao kaya napahiwalay siya sa Diyos.',
            image: '/assets/images/gospel/gospel_tract1.jpg',
            audio: { start: 58, end: 68 }
        },
        {
            id: 'truth2-verse1',
            type: 'verse',
            verse: '"Sapagkat ang lahat ay nagkasala, at walang sinumang nakaabot sa kaluwalhatian ng Diyos."',
            reference: 'Romans 3:23',
            image: '/assets/images/gospel/gospel_tract1.jpg',
            audio: { start: 68, end: 78 }
        },
        {
            id: 'truth2-point1',
            type: 'point',
            title: 'Hindi lang sa nagkasala ang lahat ng tao kundi may bayad ang kasalanan at ang bayad ay kamatayan.',
            verse: '"Sapagkat kamatayan ang kabayaran ng kasalanan..."',
            reference: 'Romans 6:23',
            image: '/assets/images/gospel/gospel_tract2.jpg',
            audio: { start: 78, end: 90 }
        },
        {
            id: 'truth2-point2',
            type: 'point',
            title: 'May dalawang klase ng kamatayan ang nasa Biblia ang una ay pisikal at ang pangalawa ay espiritwal.',
            verse: '"Subalit para naman sa mga duwag, mga taksil, mga gumagawa ng mga kasuklam-suklam na bagay, mga mamamatay-tao, mga nakikiapid, mga mangkukulam, mga sumasamba sa diyus-diyosan, at sa lahat ng mga sinungaling—ang magiging bahagi nila\'y sa lawa ng nagliliyab na apoy at asupre. Ito ang pangalawang kamatayan."',
            reference: 'Revelation 21:8',
            image: '/assets/images/gospel/gospel_tract2.jpg',
            audio: { start: 90, end: 115 }
        },
        {
            id: 'truth2-efforts',
            type: 'efforts',
            title: '...inisip ng tao na ang kanyang pagkahiwalay sa Diyos ay masosolusyunan ng...',
            efforts: ['Sampung Utos', 'Relihiyon', 'Mabuting Gawa', 'Ritwal'],
            image: '/assets/images/gospel/gospel_tract3.jpg',
            audio: { start: 115, end: 130 }
        },
        {
            id: 'truth2-fail',
            type: 'point',
            title: 'Subalit ang lahat ng ito ay kapos at hindi aabot sa kaluwalhatian ng Diyos dahil ang lahat ay nagkasala.',
            subtitle: '"Subalit ang malaman lang na namatay ang Panginoong Hesus para sa iyung kasalanan ay hindi sapat..."',
            image: '/assets/images/gospel/gospel_tract3.jpg',
            audio: { start: 130, end: 145 }
        },
        
        // TRUTH 3: Jesus is the Way
        {
            id: 'truth3-title',
            type: 'truth-title',
            truthNumber: 3,
            title: 'Ang Panginoong Hesus ang tanging daan patungong langit.',
            image: '/assets/images/gospel/gospel_tract4.jpg',
            audio: { start: 145, end: 155 }
        },
        {
            id: 'truth3-verse1',
            type: 'verse',
            verse: '"Sumagot si Jesus, "Ako ang daan, ang katotohanan, at ang buhay. Walang makakapunta sa Ama kundi sa pamamagitan ko."',
            reference: 'John 14:6',
            image: '/assets/images/gospel/gospel_tract4.jpg',
            audio: { start: 155, end: 168 }
        },
        {
            id: 'truth3-why',
            type: 'point',
            title: 'Bakit ang Panginoong Hesus lang ang daan? Dahil. Siya lang nagbayad ng lahat ng iyung kasalanan sa krus.',
            verse: '"Sapagkat si Cristo na walang kasalanan ay namatay nang minsan para sa inyo na mga makasalanan, upang iharap kayo sa Diyos. Siya\'y pinatay sa laman, at muling binuhay sa espiritu."',
            reference: '1 Peter 3:18',
            image: '/assets/images/gospel/gospel_tract4.jpg',
            audio: { start: 168, end: 188 }
        },
        
        // TRUTH 4: Believe to be Saved
        {
            id: 'truth4-title',
            type: 'truth-title',
            truthNumber: 4,
            title: 'Kailangan nating manampalataya sa Panginoong Hesus upang tayo\'y maligtas.',
            image: null,
            audio: { start: 188, end: 198 }
        },
        {
            id: 'truth4-verse1',
            type: 'verse',
            verse: '"Sapagkat dahil sa kagandahang-loob ng Diyos kayo ay naligtas sa pamamagitan ng pananampalataya; at ito\'y kaloob ng Diyos at hindi mula sa inyong sarili; hindi ito bunga ng inyong mga gawa kaya\'t walang maipagmamalaki ang sinuman."',
            reference: 'Ephesians 2:8-9',
            image: null,
            audio: { start: 198, end: 218 }
        },
        {
            id: 'truth4-formula',
            type: 'formula-question',
            question: 'Base sa Ephesians 2:8-9, kung ilalagay sa formula ang kaligtasan, alin sa mga sumusunod ang sa tingin mo ay tama?',
            options: [
                { id: 1, text: 'Pananampalataya sa Panginoong Hesus + Mabuting Gawa = Kaligtasan', correct: false },
                { id: 2, text: 'Pananampalataya sa Panginoong Hesus + Sampung Utos = Kaligtasan', correct: false },
                { id: 3, text: 'Pananampalataya sa Panginoong Hesus + Wala = Kaligtasan', correct: true }
            ],
            explanation: '...ang mabuting gawa ay hindi basehan ng kaligtasan kundi ito ay by-product o magiging bunga sa buhay ng taong totoong nanampalataya sa Panginoong Hesus.',
            audio: { start: 218, end: 245 }
        },
        
        // PRAYER
        {
            id: 'prayer-intro',
            type: 'prayer-intro',
            title: 'Ipahayag mo ang iyong pananampalataya sa Panginoong Hesus sa pamamagitan ng panalangin...',
            audio: { start: 245, end: 252 }
        },
        {
            id: 'prayer',
            type: 'prayer',
            prayer: 'Panginoong Hesus, Inaamin ko po na ako ay makasalanan. Patawarin mo po ako. Nananampalataya po ako na ikaw ang tanging daan patungo sa langit dahil ikaw ang nagbayad ng aking kasalanan. Ngayon nga ay binubuksan ko na ang aking puso. Pumasok ka at manahan sa akin. Tinatanggap kita bilang aking Panginoon at Tagapagligtas. Simula ngayon ay tatalikdan ko na ang aking kasalanan. Salamat at isang araw ay makakasama kita sa langit. Amen.',
            audio: { start: 252, end: 290 }
        },
        
        // ASSURANCE
        {
            id: 'assurance-intro',
            type: 'assurance-intro',
            title: 'Kung nanampalataya ka sa Panginoong Hesus bilang iyong Panginoon at Tagapagligtas:',
            audio: { start: 290, end: 298 }
        },
        {
            id: 'assurance1',
            type: 'assurance',
            point: 'Ikaw ay naging anak na ng Diyos.',
            verse: '"Subalit ang lahat ng tumanggap at sumampalataya sa kanya ay binigyan niya ng karapatang maging mga anak ng Diyos."',
            reference: 'John 1:12',
            audio: { start: 298, end: 310 }
        },
        {
            id: 'assurance2',
            type: 'assurance',
            point: 'May buhay na walang hanggan.',
            verse: '"Kung ang Anak ng Diyos ay nasa isang tao, mayroon siyang buhay na walang hanggan; ngunit kung wala sa kanya ang Anak ng Diyos ay wala siyang buhay na walang hanggan. Isinusulat ko ito sa inyo upang malaman ninyo na kayong sumasampalataya sa Anak ng Diyos ay may buhay na walang hanggan."',
            reference: '1 John 5:12-13',
            audio: { start: 310, end: 330 }
        },
        {
            id: 'assurance3',
            type: 'assurance',
            point: 'Ikaw ay isa nang bagong nilalang.',
            verse: '"Kaya\'t kung nakipag-isa na kay Cristo ang isang tao, isa na siyang bagong nilalang. Wala na ang dati niyang pagkatao, sa halip, ito\'y napalitan na ng bago."',
            reference: '2 Corinthians 5:17',
            audio: { start: 330, end: 345 }
        },
        {
            id: 'assurance4',
            type: 'assurance',
            point: 'Ang lahat ng kasalanan mo ay bayad na.',
            verse: '"Iniligtas niya tayo sa kapangyarihan ng kadiliman at inilipat tayo sa kaharian ng kanyang minamahal na Anak, na sa kanya ay mayroon tayong katubusan, na siyang kapatawaran ng mga kasalanan."',
            reference: 'Colossians 1:13-14',
            audio: { start: 345, end: 360 }
        },
        
        // NEXT STEPS
        {
            id: 'next-steps',
            type: 'next-steps',
            title: 'Upang lumago sa relasyon mo sa Kanya:',
            steps: [
                { icon: '🙏', text: 'Makipag-usap sa Diyos araw-araw', subtext: 'Manalangin ka at makinig sa sasabihin Niya sa iyo sa pamamagitan ng pagbabasa ng Biblia.' },
                { icon: '👥', text: 'Maging bahagi ng isang discipleship group', subtext: 'Dito mo makakasama ang mga kapatiran na makakatulong sa iyong paglago.' },
                { icon: '⛪', text: 'Dumalo sa isang Christian church na naniniwala sa Biblia', subtext: 'Upang makapagpuri at magpasalamat sa Diyos.' }
            ],
            audio: { start: 360, end: 385 }
        },
        
        // FINAL - Invitation to grow
        {
            id: 'grow-invitation',
            type: 'grow-invitation',
            title: 'Gusto mo bang palaguin ang pagmamahal mo sa Diyos?',
            subtitle: 'Ang relasyon ay nangangailangan ng komunikasyon. Gusto ng Diyos na makausap ka araw-araw.',
            buttonText: 'Oo, gusto kong lumago',
            audio: { start: 385, end: 400 }
        }
    ],

    /**
     * Initialize the Gospel Presentation
     */
    init() {
        this.totalSlides = this.slides.length;
        this.createModal();
    },

    /**
     * Create the modal HTML
     */
    createModal() {
        const modal = document.createElement('div');
        modal.id = 'gospelPresentationModal';
        modal.className = 'fixed inset-0 z-[100] bg-[var(--bg-color)] hidden flex flex-col';
        modal.innerHTML = `
            <!-- Header -->
            <div class="flex items-center justify-between p-4 border-b border-[var(--card-border)]">
                <div class="flex items-center gap-2">
                    <span class="text-xl">❤️</span>
                    <h2 class="text-sm font-bold text-[var(--text-color)]">Know How Much God Loves You</h2>
                </div>
                <button onclick="GospelPresentation.close()" class="p-2 text-[var(--text-muted)] hover:text-[var(--text-color)]">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
            
            <!-- Progress Bar -->
            <div class="h-1 bg-[var(--card-border)]">
                <div id="gospelProgressBar" class="h-full bg-[var(--mission-gold)] transition-all duration-500" style="width: 0%"></div>
            </div>
            
            <!-- Slide Content -->
            <div id="gospelSlideContent" class="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center">
                <!-- Dynamic slide content -->
            </div>
            
            <!-- Navigation -->
            <div class="p-4 border-t border-[var(--card-border)] flex items-center justify-between gap-4">
                <button id="gospelPrevBtn" onclick="GospelPresentation.prev()" class="px-6 py-3 rounded-xl border border-[var(--card-border)] text-[var(--text-muted)] font-medium disabled:opacity-30" disabled>
                    ← Back
                </button>
                
                <!-- Audio Controls -->
                <button id="gospelAudioBtn" onclick="GospelPresentation.toggleAudio()" class="p-3 rounded-full bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-muted)]">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path>
                    </svg>
                </button>
                
                <button id="gospelNextBtn" onclick="GospelPresentation.next()" class="px-6 py-3 rounded-xl bg-[var(--mission-gold)] text-[var(--mission-red-deep)] font-bold">
                    Next →
                </button>
            </div>
        `;
        document.body.appendChild(modal);
    },

    /**
     * Open the Gospel Presentation
     */
    open() {
        this.currentSlide = 0;
        this.userResponses = {};
        
        const modal = document.getElementById('gospelPresentationModal');
        if (!modal) {
            this.init();
        }
        
        document.getElementById('gospelPresentationModal').classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        
        this.renderSlide();
        this.updateNavigation();
    },

    /**
     * Close the Gospel Presentation
     */
    close() {
        document.getElementById('gospelPresentationModal').classList.add('hidden');
        document.body.style.overflow = '';
        
        if (this.audioElement) {
            this.audioElement.pause();
        }
    },

    /**
     * Go to next slide
     */
    next() {
        if (this.currentSlide < this.totalSlides - 1) {
            this.currentSlide++;
            this.renderSlide();
            this.updateNavigation();
        }
    },

    /**
     * Go to previous slide
     */
    prev() {
        if (this.currentSlide > 0) {
            this.currentSlide--;
            this.renderSlide();
            this.updateNavigation();
        }
    },

    /**
     * Update navigation buttons
     */
    updateNavigation() {
        const prevBtn = document.getElementById('gospelPrevBtn');
        const nextBtn = document.getElementById('gospelNextBtn');
        const progressBar = document.getElementById('gospelProgressBar');
        
        prevBtn.disabled = this.currentSlide === 0;
        
        const slide = this.slides[this.currentSlide];
        
        // Change button text on last slide
        if (slide.type === 'grow-invitation') {
            nextBtn.innerHTML = '🙏 Start Growing';
            nextBtn.onclick = () => this.finishPresentation();
        } else {
            nextBtn.innerHTML = 'Next →';
            nextBtn.onclick = () => this.next();
        }
        
        // Update progress bar
        const progress = ((this.currentSlide + 1) / this.totalSlides) * 100;
        progressBar.style.width = `${progress}%`;
    },

    /**
     * Render current slide
     */
    renderSlide() {
        const container = document.getElementById('gospelSlideContent');
        const slide = this.slides[this.currentSlide];
        
        // Apply random transition
        container.style.opacity = '0';
        container.style.transform = 'translateX(20px)';
        
        setTimeout(() => {
            container.innerHTML = this.getSlideHTML(slide);
            container.style.opacity = '1';
            container.style.transform = 'translateX(0)';
        }, 150);
    },

    /**
     * Get HTML for a slide based on its type
     */
    getSlideHTML(slide) {
        switch (slide.type) {
            case 'intro':
                return this.renderIntro(slide);
            case 'truth-title':
                return this.renderTruthTitle(slide);
            case 'verse':
                return this.renderVerse(slide);
            case 'point':
                return this.renderPoint(slide);
            case 'question':
                return this.renderQuestion(slide);
            case 'efforts':
                return this.renderEfforts(slide);
            case 'formula-question':
                return this.renderFormulaQuestion(slide);
            case 'prayer-intro':
                return this.renderPrayerIntro(slide);
            case 'prayer':
                return this.renderPrayer(slide);
            case 'assurance-intro':
                return this.renderAssuranceIntro(slide);
            case 'assurance':
                return this.renderAssurance(slide);
            case 'next-steps':
                return this.renderNextSteps(slide);
            case 'grow-invitation':
                return this.renderGrowInvitation(slide);
            default:
                return `<p>Unknown slide type: ${slide.type}</p>`;
        }
    },

    // ===== SLIDE RENDERERS =====
    
    renderIntro(slide) {
        return `
            <div class="text-center max-w-md animate-fade-up">
                <h1 class="text-3xl font-display font-bold text-[var(--mission-gold)] mb-6">${slide.title}</h1>
                <p class="text-lg text-[var(--text-color)] leading-relaxed">${slide.subtitle}</p>
            </div>
        `;
    },

    renderTruthTitle(slide) {
        return `
            <div class="text-center max-w-md animate-fade-up">
                <div class="w-16 h-16 mx-auto mb-6 rounded-full bg-[var(--mission-gold)] flex items-center justify-center">
                    <span class="text-2xl font-bold text-[var(--mission-red-deep)]">${slide.truthNumber}</span>
                </div>
                <h2 class="text-2xl font-bold text-[var(--text-color)] leading-relaxed">${slide.title}</h2>
                ${slide.image ? `<img src="${slide.image}" alt="" class="mt-6 rounded-xl max-h-48 mx-auto object-contain">` : ''}
            </div>
        `;
    },

    renderVerse(slide) {
        return `
            <div class="max-w-md animate-fade-up">
                ${slide.image ? `<img src="${slide.image}" alt="" class="mb-6 rounded-xl max-h-40 mx-auto object-contain">` : ''}
                <div class="bg-[var(--card-bg)] rounded-2xl p-6 border border-[var(--card-border)]">
                    <p class="text-lg italic text-[var(--text-color)] leading-relaxed mb-4">${slide.verse}</p>
                    <p class="text-[var(--mission-gold)] font-bold text-right">${slide.reference}</p>
                </div>
            </div>
        `;
    },

    renderPoint(slide) {
        return `
            <div class="max-w-md animate-fade-up">
                ${slide.image ? `<img src="${slide.image}" alt="" class="mb-6 rounded-xl max-h-40 mx-auto object-contain">` : ''}
                <div class="bg-black/40 rounded-2xl p-5 mb-4">
                    <p class="text-lg font-medium text-[var(--text-color)] leading-relaxed">${slide.title}</p>
                </div>
                ${slide.verse ? `
                <div class="border-l-2 border-[var(--mission-gold)]/40 pl-4">
                    <p class="text-base italic text-[var(--text-muted)] leading-relaxed mb-2">${slide.verse}</p>
                    <p class="text-[var(--mission-gold)] font-bold text-sm">${slide.reference}</p>
                </div>
                ` : ''}
                ${slide.subtitle ? `<p class="text-sm text-[var(--text-muted)] italic mt-4">${slide.subtitle}</p>` : ''}
            </div>
        `;
    },

    renderQuestion(slide) {
        return `
            <div class="max-w-md animate-fade-up text-center">
                <div class="bg-amber-500/10 rounded-2xl p-6 border border-amber-500/30">
                    <p class="text-xl text-[var(--text-color)] leading-relaxed mb-4">${slide.question}</p>
                    <p class="text-sm text-[var(--mission-gold)]">${slide.nextHint}</p>
                </div>
            </div>
        `;
    },

    renderEfforts(slide) {
        return `
            <div class="max-w-md animate-fade-up">
                ${slide.image ? `<img src="${slide.image}" alt="" class="mb-6 rounded-xl max-h-48 mx-auto object-contain">` : ''}
                <div class="bg-amber-500/10 rounded-2xl p-5 mb-4">
                    <p class="text-base text-[var(--text-color)] leading-relaxed">${slide.title}</p>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    ${slide.efforts.map(e => `
                        <div class="bg-[var(--card-bg)] rounded-xl p-3 text-center border border-[var(--card-border)]">
                            <span class="text-[var(--text-muted)]">${e}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    renderFormulaQuestion(slide) {
        return `
            <div class="max-w-md animate-fade-up">
                <div class="bg-amber-500/10 rounded-2xl p-5 mb-6 border border-amber-500/30">
                    <p class="text-base text-[var(--text-color)] leading-relaxed">${slide.question}</p>
                </div>
                <div class="space-y-3" id="formulaOptions">
                    ${slide.options.map((opt, idx) => `
                        <button onclick="GospelPresentation.selectFormula(${idx}, ${opt.correct})" class="formula-option w-full text-left p-4 rounded-xl border-2 border-[var(--card-border)] bg-[var(--card-bg)] hover:border-[var(--mission-gold)]/50 transition-all" data-index="${idx}">
                            <div class="flex items-start gap-3">
                                <span class="w-8 h-8 rounded-full bg-[var(--card-border)] flex items-center justify-center text-sm font-bold">${idx + 1}</span>
                                <span class="text-[var(--text-color)] flex-1">${opt.text}</span>
                            </div>
                        </button>
                    `).join('')}
                </div>
                <div id="formulaExplanation" class="hidden mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                    <p class="text-green-400">${slide.explanation}</p>
                </div>
            </div>
        `;
    },

    selectFormula(index, correct) {
        const options = document.querySelectorAll('.formula-option');
        options.forEach((opt, i) => {
            opt.classList.remove('border-[var(--mission-gold)]', 'border-green-500', 'border-red-500');
            if (i === index) {
                opt.classList.add(correct ? 'border-green-500' : 'border-red-500');
            }
        });
        
        if (correct) {
            document.getElementById('formulaExplanation').classList.remove('hidden');
            this.userResponses.formulaCorrect = true;
        }
    },

    renderPrayerIntro(slide) {
        return `
            <div class="max-w-md animate-fade-up text-center">
                <span class="text-5xl mb-6 block">🙏</span>
                <p class="text-xl text-[var(--text-color)] leading-relaxed">${slide.title}</p>
            </div>
        `;
    },

    renderPrayer(slide) {
        return `
            <div class="max-w-md animate-fade-up">
                <div class="bg-amber-500/5 rounded-2xl p-6 border border-amber-500/20">
                    <p class="text-lg italic text-[var(--text-color)] leading-loose">${slide.prayer}</p>
                </div>
                <div class="mt-6 text-center">
                    <button onclick="GospelPresentation.prayerDecision(true)" class="px-8 py-4 bg-[var(--mission-gold)] text-[var(--mission-red-deep)] font-bold rounded-xl text-lg">
                        🙏 Amen - I Prayed This
                    </button>
                    <button onclick="GospelPresentation.prayerDecision(false)" class="block mx-auto mt-4 text-[var(--text-muted)] text-sm hover:text-[var(--text-color)]">
                        I'm not ready yet
                    </button>
                </div>
            </div>
        `;
    },

    prayerDecision(prayed) {
        this.userResponses.prayed = prayed;
        this.userResponses.prayedAt = prayed ? new Date().toISOString() : null;
        this.next();
        
        // Save to Firebase if user prayed
        if (prayed && window.auth?.currentUser) {
            this.savePrayerDecision();
        }
    },

    async savePrayerDecision() {
        try {
            const user = window.auth.currentUser;
            if (!user) return;
            
            await window.db.collection('users').doc(user.uid).update({
                gospelDecision: {
                    prayed: true,
                    prayedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    completedAt: firebase.firestore.FieldValue.serverTimestamp()
                }
            });
            console.log('Prayer decision saved!');
        } catch (error) {
            console.error('Error saving prayer decision:', error);
        }
    },

    renderAssuranceIntro(slide) {
        return `
            <div class="max-w-md animate-fade-up text-center">
                <span class="text-5xl mb-6 block">🎉</span>
                <h2 class="text-2xl font-bold text-[var(--mission-gold)] mb-4">${slide.title}</h2>
            </div>
        `;
    },

    renderAssurance(slide) {
        return `
            <div class="max-w-md animate-fade-up">
                <div class="bg-green-500/10 rounded-2xl p-5 mb-4 border border-green-500/30">
                    <p class="text-lg font-medium text-green-400">${slide.point}</p>
                </div>
                <div class="border-l-2 border-[var(--mission-gold)]/40 pl-4">
                    <p class="text-base italic text-[var(--text-muted)] leading-relaxed mb-2">${slide.verse}</p>
                    <p class="text-[var(--mission-gold)] font-bold text-sm">${slide.reference}</p>
                </div>
            </div>
        `;
    },

    renderNextSteps(slide) {
        return `
            <div class="max-w-md animate-fade-up">
                <h2 class="text-xl font-bold text-[var(--text-color)] mb-6 text-center">${slide.title}</h2>
                <div class="space-y-4">
                    ${slide.steps.map(step => `
                        <div class="flex items-start gap-4 p-4 bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)]">
                            <span class="text-2xl">${step.icon}</span>
                            <div>
                                <p class="font-bold text-[var(--text-color)]">${step.text}</p>
                                <p class="text-sm text-[var(--text-muted)] mt-1">${step.subtext}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    renderGrowInvitation(slide) {
        return `
            <div class="max-w-md animate-fade-up text-center">
                <span class="text-6xl mb-6 block">💖</span>
                <h2 class="text-2xl font-bold text-[var(--mission-gold)] mb-4">${slide.title}</h2>
                <p class="text-base text-[var(--text-muted)] leading-relaxed mb-8">${slide.subtitle}</p>
            </div>
        `;
    },

    /**
     * Finish presentation and transition to grow phase
     */
    finishPresentation() {
        this.close();
        
        // Open the "Grow Your Love" / Conversation with God guide
        if (typeof ConversationGuide !== 'undefined') {
            ConversationGuide.open();
        } else {
            // Fallback - open Bible reader
            if (typeof BibleReader !== 'undefined') {
                BibleReader.enterFullscreen();
            }
        }
    },

    /**
     * Toggle audio playback
     */
    toggleAudio() {
        // Audio feature - to be implemented when audio file is provided
        alert('Audio will be available soon! Pastor Mike is recording the narration.');
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    GospelPresentation.init();
});

// Make it globally available
window.GospelPresentation = GospelPresentation;
