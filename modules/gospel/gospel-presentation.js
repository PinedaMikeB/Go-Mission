/**
 * Gospel Presentation Module - Interactive Version
 * "Ang Daan Papuntang Langit" - Interactive Discovery Journey
 * 
 * Flow: Verse → Question → Feedback → Next Truth
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
     * Build all slides with interactive questions
     */
    buildSlides() {
        this.slides = [
            // ========== INTRO ==========
            {
                type: 'intro',
                content: `
                    <div class="text-center py-8">
                        <h1 class="text-3xl font-display font-bold text-[var(--mission-gold)] mb-4">Ang Daan Papuntang Langit</h1>
                        <p class="text-lg text-[var(--text-color)] mb-6">Tuklasin mo ngayon kung gaano ka kamahal ng Diyos</p>
                        <div class="text-6xl mb-6">❤️</div>
                        <p class="text-sm text-[var(--text-muted)]">Isang maikling paglalakbay na magbabago ng iyong buhay</p>
                    </div>
                `
            },

            // ========== TRUTH 1: GOD LOVES YOU ==========
            {
                type: 'truth-header',
                content: `
                    <div class="text-center py-8">
                        <p class="text-sm uppercase tracking-wider text-[var(--mission-gold)] mb-2">Unang Katotohanan</p>
                        <h2 class="text-2xl font-bold text-white mb-4">MAHAL KA NG DIYOS</h2>
                        <p class="text-[var(--text-muted)]">At may magandang plano Siya para sa iyo</p>
                    </div>
                `
            },
            {
                type: 'verse',
                content: `
                    <div class="flex flex-col items-center justify-center py-6">
                        <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-6 max-w-md">
                            <p class="text-lg italic text-[var(--text-color)] leading-relaxed">
                                "Sapagkat gayon na lamang ang pag-ibig ng Diyos sa sangkatauhan, kaya't ibinigay niya ang kanyang kaisa-isang Anak, upang ang sinumang sumampalataya sa kanya ay hindi mapahamak, kundi magkaroon ng buhay na walang hanggan."
                            </p>
                            <p class="text-right text-[var(--mission-gold)] font-bold mt-4">John 3:16</p>
                        </div>
                    </div>
                `
            },
            {
                type: 'question',
                question: 'Paano pinatunayan ng Diyos na mahal ka Niya?',
                options: [
                    { text: 'Binigyan Niya ako ng magandang buhay', correct: false },
                    { text: 'Pinayagan Niya akong mabuhay', correct: false },
                    { text: 'Ibinigay Niya ang Kanyang Anak para sa akin', correct: true }
                ],
                correctFeedback: 'Tama! Ibinigay ng Diyos ang Kanyang pinakamamahal na Anak para sa iyo. Iyan ang pinakamatinding pagpapakita ng pag-ibig!',
                wrongFeedback: 'Ang tamang sagot ay: <strong>Ibinigay Niya ang Kanyang Anak para sa akin.</strong> Ito ang pinakamatinding pagpapakita ng pag-ibig ng Diyos - ibinigay Niya ang Kanyang sariling Anak!'
            },
            {
                type: 'verse',
                content: `
                    <div class="flex flex-col items-center justify-center py-6">
                        <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-6 max-w-md">
                            <p class="text-lg italic text-[var(--text-color)] leading-relaxed">
                                "Ako'y naparito upang sila'y magkaroon ng buhay, at magkaroon ng kasaganaan nito."
                            </p>
                            <p class="text-right text-[var(--mission-gold)] font-bold mt-4">John 10:10</p>
                        </div>
                    </div>
                `
            },
            {
                type: 'question',
                question: 'Ano ang gusto ng Diyos para sa iyo?',
                options: [
                    { text: 'Relihiyon at ritwal', correct: false },
                    { text: 'Mabuting gawa lamang', correct: false },
                    { text: 'Buhay na walang hanggan at kasaganaan', correct: true }
                ],
                correctFeedback: 'Tama! Gusto ng Diyos na magkaroon ka ng buhay na walang hanggan - hindi lang buhay pagkatapos ng kamatayan, kundi masagana at makabuluhang buhay ngayon!',
                wrongFeedback: 'Ang tamang sagot ay: <strong>Buhay na walang hanggan at kasaganaan.</strong> Hindi relihiyon o mabuting gawa lang ang gusto ng Diyos - kundi tunay na buhay na puno ng kahulugan!'
            },
            {
                type: 'transition',
                content: `
                    <div class="text-center py-8">
                        <div class="text-4xl mb-4">🤔</div>
                        <h3 class="text-xl font-bold text-white mb-4">Pero bakit...</h3>
                        <p class="text-lg text-[var(--text-muted)] leading-relaxed">
                            Kung mahal tayo ng Diyos at gusto Niya tayong magkaroon ng buhay na walang hanggan...
                        </p>
                        <p class="text-xl text-[var(--mission-gold)] font-bold mt-4">
                            Bakit karamihan sa atin ay hindi ito nararanasan?
                        </p>
                    </div>
                `
            },

            // ========== TRUTH 2: SIN SEPARATES ==========
            {
                type: 'truth-header',
                content: `
                    <div class="text-center py-8">
                        <p class="text-sm uppercase tracking-wider text-[var(--mission-gold)] mb-2">Pangalawang Katotohanan</p>
                        <h2 class="text-2xl font-bold text-white mb-4">TAYONG LAHAT AY MAKASALANAN</h2>
                        <p class="text-[var(--text-muted)]">At nahiwalay tayo sa Diyos</p>
                    </div>
                `
            },
            {
                type: 'verse-with-image',
                image: '/assets/images/gospel/gospel_tract1.jpg',
                content: `
                    <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-6 max-w-md">
                        <p class="text-lg italic text-[var(--text-color)] leading-relaxed">
                            "Sapagkat ang lahat ay nagkasala, at hindi nakakaabot sa kaluwalhatian ng Diyos."
                        </p>
                        <p class="text-right text-[var(--mission-gold)] font-bold mt-4">Romans 3:23</p>
                    </div>
                `
            },
            {
                type: 'question',
                question: 'Sino ang nagkasala?',
                options: [
                    { text: 'Ang masasamang tao lamang', correct: false },
                    { text: 'Ang lahat ng tao', correct: true },
                    { text: 'Ang mga hindi relihiyoso', correct: false }
                ],
                correctFeedback: 'Tama! LAHAT tayo ay nagkasala - walang kahit isa na perpekto. Ito ang katotohanan na kailangan nating tanggapin.',
                wrongFeedback: 'Ang tamang sagot ay: <strong>Ang lahat ng tao.</strong> Ayon sa Bibliya, walang sinuman ang hindi nagkasala - lahat tayo ay nagkulang.'
            },
            {
                type: 'verse-with-image',
                image: '/assets/images/gospel/gospel_tract2.jpg',
                content: `
                    <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-6 max-w-md">
                        <p class="text-lg italic text-[var(--text-color)] leading-relaxed">
                            "Sapagkat ang kabayaran ng kasalanan ay kamatayan..."
                        </p>
                        <p class="text-right text-[var(--mission-gold)] font-bold mt-4">Romans 6:23a</p>
                    </div>
                `
            },
            {
                type: 'question',
                question: 'Ano ang kabayaran ng kasalanan?',
                options: [
                    { text: 'Kahirapan sa buhay', correct: false },
                    { text: 'Kamatayan at pagkahiwalay sa Diyos', correct: true },
                    { text: 'Kaparusahan sa lupa', correct: false }
                ],
                correctFeedback: 'Tama! Ang kabayaran ng kasalanan ay kamatayan - hindi lang pisikal na kamatayan, kundi walang hanggang pagkahiwalay sa Diyos.',
                wrongFeedback: 'Ang tamang sagot ay: <strong>Kamatayan at pagkahiwalay sa Diyos.</strong> Ito ang seryosong konsekwensya ng kasalanan - walang hanggang pagkahiwalay sa Diyos.'
            },
            {
                type: 'transition',
                content: `
                    <div class="text-center py-8">
                        <div class="text-4xl mb-4">😔</div>
                        <h3 class="text-xl font-bold text-white mb-4">Ang Problema</h3>
                        <p class="text-lg text-[var(--text-muted)] leading-relaxed mb-4">
                            Dahil sa kasalanan, may malaking agwat sa pagitan natin at ng Diyos.
                        </p>
                        <p class="text-lg text-[var(--text-muted)] leading-relaxed">
                            Maraming tao ang sumusubok na tulay itong agwat sa sarili nilang paraan...
                        </p>
                    </div>
                `
            },

            // ========== TRUTH 3: HUMAN EFFORTS FAIL ==========
            {
                type: 'truth-header',
                content: `
                    <div class="text-center py-8">
                        <p class="text-sm uppercase tracking-wider text-[var(--mission-gold)] mb-2">Pangatlong Katotohanan</p>
                        <h2 class="text-2xl font-bold text-white mb-4">HINDI SAPAT ANG SARILING SIKAP</h2>
                        <p class="text-[var(--text-muted)]">Walang paraan ng tao ang makakaabot sa Diyos</p>
                    </div>
                `
            },
            {
                type: 'human-efforts',
                content: `
                    <div class="py-4">
                        <p class="text-center text-[var(--text-muted)] mb-6">Sinusubukan ng mga tao ang mga ito:</p>
                        <div class="grid grid-cols-2 gap-3 max-w-sm mx-auto">
                            <div class="bg-red-900/30 border border-red-500/30 rounded-xl p-4 text-center">
                                <div class="text-2xl mb-2">📜</div>
                                <p class="text-sm text-white">Sampung Utos</p>
                                <p class="text-xs text-red-400 mt-1">Hindi sapat</p>
                            </div>
                            <div class="bg-red-900/30 border border-red-500/30 rounded-xl p-4 text-center">
                                <div class="text-2xl mb-2">⛪</div>
                                <p class="text-sm text-white">Relihiyon</p>
                                <p class="text-xs text-red-400 mt-1">Hindi sapat</p>
                            </div>
                            <div class="bg-red-900/30 border border-red-500/30 rounded-xl p-4 text-center">
                                <div class="text-2xl mb-2">🤝</div>
                                <p class="text-sm text-white">Mabuting Gawa</p>
                                <p class="text-xs text-red-400 mt-1">Hindi sapat</p>
                            </div>
                            <div class="bg-red-900/30 border border-red-500/30 rounded-xl p-4 text-center">
                                <div class="text-2xl mb-2">🕯️</div>
                                <p class="text-sm text-white">Ritwal</p>
                                <p class="text-xs text-red-400 mt-1">Hindi sapat</p>
                            </div>
                        </div>
                    </div>
                `
            },
            {
                type: 'verse-with-image',
                image: '/assets/images/gospel/gospel_tract3.jpg',
                content: `
                    <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-6 max-w-md">
                        <p class="text-lg italic text-[var(--text-color)] leading-relaxed">
                            "Mayroong daang tila matuwid sa paningin ng tao, ngunit ang dulo nito ay kamatayan."
                        </p>
                        <p class="text-right text-[var(--mission-gold)] font-bold mt-4">Kawikaan 14:12</p>
                    </div>
                `
            },
            {
                type: 'question',
                question: 'Ano ang makapagliligtas sa iyo?',
                options: [
                    { text: 'Pagsunod sa Sampung Utos', correct: false },
                    { text: 'Relihiyon at mabuting gawa', correct: false },
                    { text: 'Wala sa mga ito - kailangan ng ibang paraan', correct: true }
                ],
                correctFeedback: 'Tama! Kahit gaano kaganda ang ating ginagawa, hindi ito sapat para maabot ang Diyos. Kailangan natin ng ibang paraan...',
                wrongFeedback: 'Ang tamang sagot ay: <strong>Wala sa mga ito.</strong> Kahit ang Sampung Utos, relihiyon, at mabuting gawa - hindi sapat para tulay ang agwat sa pagitan natin at ng Diyos.'
            },
            {
                type: 'transition',
                content: `
                    <div class="text-center py-8">
                        <div class="text-4xl mb-4">💡</div>
                        <h3 class="text-xl font-bold text-white mb-4">May Magandang Balita!</h3>
                        <p class="text-lg text-[var(--text-muted)] leading-relaxed">
                            Kung walang paraan ng tao ang makakaabot sa Diyos...
                        </p>
                        <p class="text-xl text-[var(--mission-gold)] font-bold mt-4">
                            Ang Diyos mismo ang gumawa ng paraan!
                        </p>
                    </div>
                `
            },

            // ========== TRUTH 4: JESUS IS THE WAY ==========
            {
                type: 'truth-header',
                content: `
                    <div class="text-center py-8">
                        <p class="text-sm uppercase tracking-wider text-[var(--mission-gold)] mb-2">Pang-apat na Katotohanan</p>
                        <h2 class="text-2xl font-bold text-white mb-4">SI HESUS ANG TANGING DAAN</h2>
                        <p class="text-[var(--text-muted)]">Siya lang ang tulay sa pagitan mo at ng Diyos</p>
                    </div>
                `
            },
            {
                type: 'verse-with-image',
                image: '/assets/images/gospel/gospel_tract4.jpg',
                content: `
                    <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-6 max-w-md">
                        <p class="text-lg italic text-[var(--text-color)] leading-relaxed">
                            "Ako ang daan, ang katotohanan, at ang buhay. Walang makakapunta sa Ama kundi sa pamamagitan ko."
                        </p>
                        <p class="text-right text-[var(--mission-gold)] font-bold mt-4">John 14:6</p>
                    </div>
                `
            },
            {
                type: 'question',
                question: 'Sino ang TANGING daan patungo sa Diyos?',
                options: [
                    { text: 'Ang mga santo at mga banal', correct: false },
                    { text: 'Ang mga pari at pastor', correct: false },
                    { text: 'Si Hesus lamang', correct: true }
                ],
                correctFeedback: 'Tama! Si Hesus lang ang daan. Hindi ang mga santo, hindi ang mga pari - si Hesus lamang ang makapagdadala sa iyo sa Ama.',
                wrongFeedback: 'Ang tamang sagot ay: <strong>Si Hesus lamang.</strong> Sabi ni Hesus mismo - "Walang makakapunta sa Ama kundi sa pamamagitan ko."'
            },
            {
                type: 'verse',
                content: `
                    <div class="flex flex-col items-center justify-center py-6">
                        <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-6 max-w-md">
                            <p class="text-lg italic text-[var(--text-color)] leading-relaxed">
                                "Sapagkat si Kristo ay namatay para sa mga kasalanan, minsan at magpakailanman, ang matuwid para sa mga hindi matuwid, upang madala niya kayo sa Diyos."
                            </p>
                            <p class="text-right text-[var(--mission-gold)] font-bold mt-4">1 Peter 3:18</p>
                        </div>
                    </div>
                `
            },
            {
                type: 'question',
                question: 'Bakit namatay si Hesus sa krus?',
                options: [
                    { text: 'Dahil siya ay makasalanan din', correct: false },
                    { text: 'Para bayaran ang ating mga kasalanan', correct: true },
                    { text: 'Dahil natalo siya ng mga kaaway', correct: false }
                ],
                correctFeedback: 'Tama! Si Hesus, na walang kasalanan, ay namatay para bayaran ang ating mga kasalanan. Ginawa Niya ito dahil mahal ka Niya!',
                wrongFeedback: 'Ang tamang sagot ay: <strong>Para bayaran ang ating mga kasalanan.</strong> Si Hesus ay walang kasalanan, pero kusang-loob Niyang ibinigay ang Kanyang buhay para sa atin.'
            },
            {
                type: 'transition',
                content: `
                    <div class="text-center py-8">
                        <div class="text-4xl mb-4">✝️</div>
                        <h3 class="text-xl font-bold text-white mb-4">Ang Krus - Ang Tulay</h3>
                        <p class="text-lg text-[var(--text-muted)] leading-relaxed mb-4">
                            Sa krus, binayaran ni Hesus ang lahat ng kasalanan mo.
                        </p>
                        <p class="text-lg text-[var(--text-muted)] leading-relaxed">
                            Pero may isang tanong pa: <strong class="text-white">Paano mo matatanggap ang kaligtasang ito?</strong>
                        </p>
                    </div>
                `
            },

            // ========== TRUTH 5: BELIEVE TO BE SAVED ==========
            {
                type: 'truth-header',
                content: `
                    <div class="text-center py-8">
                        <p class="text-sm uppercase tracking-wider text-[var(--mission-gold)] mb-2">Panlimang Katotohanan</p>
                        <h2 class="text-2xl font-bold text-white mb-4">SUMAMPALATAYA KA PARA MALIGTAS</h2>
                        <p class="text-[var(--text-muted)]">Ang kaligtasan ay regalo - tanggapin mo lang</p>
                    </div>
                `
            },
            {
                type: 'verse',
                content: `
                    <div class="flex flex-col items-center justify-center py-6">
                        <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-6 max-w-md">
                            <p class="text-lg italic text-[var(--text-color)] leading-relaxed">
                                "Sapagkat sa biyaya kayo ay naligtas, sa pamamagitan ng pananampalataya; at ito'y hindi sa inyong sarili, ito'y kaloob ng Diyos; hindi sa pamamagitan ng mga gawa, upang walang sinumang magmapuri."
                            </p>
                            <p class="text-right text-[var(--mission-gold)] font-bold mt-4">Ephesians 2:8-9</p>
                        </div>
                    </div>
                `
            },
            {
                type: 'formula-question',
                question: 'Ano ang formula ng kaligtasan?',
                options: [
                    { text: 'Pananampalataya + Mabuting Gawa = Kaligtasan', correct: false },
                    { text: 'Relihiyon + Ritwal = Kaligtasan', correct: false },
                    { text: 'Pananampalataya + Wala = Kaligtasan', correct: true }
                ],
                correctFeedback: 'Tama! Pananampalataya LANG. Walang idadagdag. Ang kaligtasan ay libreng regalo - tanggapin mo lang sa pamamagitan ng pananampalataya!',
                wrongFeedback: 'Ang tamang sagot ay: <strong>Pananampalataya + Wala = Kaligtasan.</strong> Hindi kailangan ng mabuting gawa o ritwal - pananampalataya lang kay Hesus!'
            },
            {
                type: 'decision',
                content: `
                    <div class="text-center py-6">
                        <div class="text-5xl mb-4">🙏</div>
                        <h3 class="text-xl font-bold text-white mb-4">Ang Pinakamahalagang Tanong</h3>
                        <p class="text-lg text-[var(--text-muted)] leading-relaxed mb-6">
                            Narinig mo na ang mga katotohanan:
                        </p>
                        <div class="text-left bg-[var(--card-bg)] rounded-xl p-4 mb-6 max-w-sm mx-auto">
                            <p class="text-sm text-[var(--text-color)] mb-2">✓ Mahal ka ng Diyos</p>
                            <p class="text-sm text-[var(--text-color)] mb-2">✓ Lahat tayo ay nagkasala</p>
                            <p class="text-sm text-[var(--text-color)] mb-2">✓ Hindi sapat ang sariling sikap</p>
                            <p class="text-sm text-[var(--text-color)] mb-2">✓ Si Hesus ang tanging daan</p>
                            <p class="text-sm text-[var(--text-color)]">✓ Pananampalataya lang ang kailangan</p>
                        </div>
                        <p class="text-xl text-[var(--mission-gold)] font-bold">
                            Gusto mo bang tanggapin si Hesus ngayon?
                        </p>
                    </div>
                `
            },
            {
                type: 'prayer',
                content: `
                    <div class="text-center py-4">
                        <h3 class="text-xl font-bold text-white mb-4">Panalangin ng Pagtanggap</h3>
                        <p class="text-sm text-[var(--text-muted)] mb-6">Kung handa ka nang tanggapin si Hesus, basahin at ipanalangin ito nang buong puso:</p>
                        <div class="bg-[var(--card-bg)] border border-[var(--mission-gold)]/30 rounded-2xl p-5 max-w-md mx-auto text-left">
                            <p class="text-[var(--text-color)] leading-relaxed text-sm">
                                "Panginoong Hesus, kinikilala ko na ako ay makasalanan. 
                                Naniniwala ako na Ikaw ay namatay sa krus para sa aking mga kasalanan 
                                at muling nabuhay. Ngayon, tinatanggap Kita bilang aking Panginoon at Tagapagligtas. 
                                Pumasok Ka sa aking buhay at baguhin Mo ako. 
                                Salamat sa kaloob Mong buhay na walang hanggan. Amen."
                            </p>
                        </div>
                        <button onclick="GospelPresentation.recordPrayer()" id="prayerBtn" class="mt-6 px-8 py-4 bg-[var(--mission-gold)] text-[var(--mission-red-deep)] font-bold rounded-xl text-lg hover:bg-yellow-400 transition-all">
                            🙏 Ipinanalangin Ko Ito
                        </button>
                        <p class="text-xs text-[var(--text-muted)] mt-3">Pindutin kung taos-puso mong nanalangin</p>
                    </div>
                `
            },

            // ========== ASSURANCE ==========
            {
                type: 'assurance-header',
                content: `
                    <div class="text-center py-8">
                        <div class="text-5xl mb-4">🎉</div>
                        <h2 class="text-2xl font-bold text-[var(--mission-gold)] mb-4">Maligayang Bati!</h2>
                        <p class="text-lg text-white">Ikaw ay bagong nilalang kay Kristo!</p>
                        <p class="text-[var(--text-muted)] mt-2">Narito ang mga katiyakan mula sa Diyos:</p>
                    </div>
                `
            },
            {
                type: 'verse',
                content: `
                    <div class="flex flex-col items-center justify-center py-6">
                        <p class="text-sm text-[var(--mission-gold)] mb-3">Katiyakan #1: Ikaw ay Anak na ng Diyos</p>
                        <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-6 max-w-md">
                            <p class="text-lg italic text-[var(--text-color)] leading-relaxed">
                                "Ngunit sa lahat ng tumanggap at nanalig sa kanya, binigyan niya sila ng karapatang maging mga anak ng Diyos."
                            </p>
                            <p class="text-right text-[var(--mission-gold)] font-bold mt-4">John 1:12</p>
                        </div>
                    </div>
                `
            },
            {
                type: 'verse',
                content: `
                    <div class="flex flex-col items-center justify-center py-6">
                        <p class="text-sm text-[var(--mission-gold)] mb-3">Katiyakan #2: Ikaw ay may Buhay na Walang Hanggan</p>
                        <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-6 max-w-md">
                            <p class="text-lg italic text-[var(--text-color)] leading-relaxed">
                                "At ito ang patotoo: binigyan tayo ng Diyos ng buhay na walang hanggan, at ang buhay na ito ay nasa kanyang Anak. Ang sinumang nasa kanya ang Anak ay may buhay."
                            </p>
                            <p class="text-right text-[var(--mission-gold)] font-bold mt-4">1 John 5:11-12</p>
                        </div>
                    </div>
                `
            },
            {
                type: 'verse',
                content: `
                    <div class="flex flex-col items-center justify-center py-6">
                        <p class="text-sm text-[var(--mission-gold)] mb-3">Katiyakan #3: Ikaw ay Bagong Nilalang</p>
                        <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-6 max-w-md">
                            <p class="text-lg italic text-[var(--text-color)] leading-relaxed">
                                "Kaya't kung ang sinuman ay na kay Kristo, siya'y bagong nilalang; ang mga lumang bagay ay lumipas na, tingnan ninyo, ang lahat ay naging bago."
                            </p>
                            <p class="text-right text-[var(--mission-gold)] font-bold mt-4">2 Corinthians 5:17</p>
                        </div>
                    </div>
                `
            },

            // ========== NEXT STEPS ==========
            {
                type: 'next-steps',
                content: `
                    <div class="text-center py-6">
                        <h3 class="text-xl font-bold text-white mb-4">Ano ang Susunod?</h3>
                        <p class="text-[var(--text-muted)] mb-6">Ang pagtanggap kay Hesus ay simula pa lang. Narito ang mga susunod na hakbang:</p>
                        <div class="space-y-3 max-w-sm mx-auto">
                            <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4 flex items-center gap-3">
                                <span class="text-2xl">📖</span>
                                <div class="text-left">
                                    <p class="font-bold text-white">Maglaan ng Oras sa Diyos</p>
                                    <p class="text-xs text-[var(--text-muted)]">Basahin ang Bibliya araw-araw</p>
                                </div>
                            </div>
                            <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4 flex items-center gap-3">
                                <span class="text-2xl">🙏</span>
                                <div class="text-left">
                                    <p class="font-bold text-white">Manalangin Araw-araw</p>
                                    <p class="text-xs text-[var(--text-muted)]">Makipag-usap sa Diyos</p>
                                </div>
                            </div>
                            <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4 flex items-center gap-3">
                                <span class="text-2xl">👥</span>
                                <div class="text-left">
                                    <p class="font-bold text-white">Sumali sa Mission Group</p>
                                    <p class="text-xs text-[var(--text-muted)]">Lumago kasama ang iba</p>
                                </div>
                            </div>
                        </div>
                    </div>
                `
            },
            {
                type: 'final',
                content: `
                    <div class="text-center py-8">
                        <div class="text-6xl mb-4">🌟</div>
                        <h2 class="text-2xl font-bold text-[var(--mission-gold)] mb-4">Simula Pa Lang Ito!</h2>
                        <p class="text-lg text-white mb-2">Maligayang pagdating sa pamilya ng Diyos!</p>
                        <p class="text-[var(--text-muted)] mb-6">Handa ka nang magsimula sa iyong paglalakbay bilang alagad ni Kristo.</p>
                        <button onclick="GospelPresentation.complete()" class="px-8 py-4 bg-[var(--mission-gold)] text-[var(--mission-red-deep)] font-bold rounded-xl text-lg hover:bg-yellow-400 transition-all">
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
        // Remove existing modal if any
        const existing = document.getElementById('gospelModal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'gospelModal';
        modal.className = 'fixed inset-0 z-[100] bg-[var(--bg-color)] hidden flex flex-col';
        modal.innerHTML = `
            <!-- Header -->
            <div class="flex items-center justify-between p-4 border-b border-[var(--card-border)]">
                <div class="flex items-center gap-2">
                    <span class="text-xl">❤️</span>
                    <span class="font-bold text-[var(--text-color)]">Know How Much God Loves You</span>
                </div>
                <button onclick="GospelPresentation.close()" class="p-2 text-[var(--text-muted)] hover:text-white">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
            
            <!-- Progress Bar -->
            <div class="h-1 bg-[var(--card-border)]">
                <div id="gospelProgress" class="h-full bg-[var(--mission-gold)] transition-all duration-300" style="width: 0%"></div>
            </div>
            
            <!-- Content Area -->
            <div id="gospelContent" class="flex-1 overflow-y-auto p-4">
                <!-- Slide content will be inserted here -->
            </div>
            
            <!-- Navigation -->
            <div class="p-4 border-t border-[var(--card-border)] flex items-center justify-between">
                <button onclick="GospelPresentation.prev()" id="gospelPrevBtn" class="px-4 py-2 bg-[var(--card-bg)] text-[var(--text-color)] rounded-lg flex items-center gap-2">
                    ← Back
                </button>
                <button onclick="GospelPresentation.toggleAudio()" class="p-2 text-[var(--text-muted)]">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path>
                    </svg>
                </button>
                <button onclick="GospelPresentation.next()" id="gospelNextBtn" class="px-6 py-2 bg-[var(--mission-gold)] text-[var(--mission-red-deep)] font-bold rounded-lg flex items-center gap-2">
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
        
        // Update progress bar
        const progressPercent = ((index + 1) / this.totalSlides) * 100;
        progress.style.width = progressPercent + '%';
        
        // Show/hide prev button
        prevBtn.style.visibility = index === 0 ? 'hidden' : 'visible';
        
        // Render slide based on type
        let html = '';
        
        switch (slide.type) {
            case 'question':
            case 'formula-question':
                html = this.renderQuestion(slide);
                nextBtn.style.display = 'none'; // Hide next until answered
                break;
            case 'verse-with-image':
                html = this.renderVerseWithImage(slide);
                nextBtn.style.display = 'flex';
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
                nextBtn.innerHTML = 'Next →';
                nextBtn.style.display = 'flex';
        }
        
        content.innerHTML = `<div class="max-w-lg mx-auto">${html}</div>`;
        
        // Scroll to top
        content.scrollTop = 0;
    },

    /**
     * Render a question slide
     */
    renderQuestion(slide) {
        const optionsHtml = slide.options.map((opt, i) => `
            <button 
                onclick="GospelPresentation.answerQuestion(${i}, ${opt.correct})"
                class="question-option w-full text-left p-4 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl hover:border-[var(--mission-gold)]/50 transition-all mb-3"
                data-index="${i}"
            >
                <span class="inline-block w-6 h-6 rounded-full bg-[var(--card-border)] text-center text-sm mr-3">${String.fromCharCode(65 + i)}</span>
                ${opt.text}
            </button>
        `).join('');
        
        return `
            <div class="py-6">
                <p class="text-sm text-[var(--mission-gold)] mb-2">Tanong:</p>
                <h3 class="text-xl font-bold text-white mb-6">${slide.question}</h3>
                <div id="questionOptions">
                    ${optionsHtml}
                </div>
                <div id="questionFeedback" class="hidden mt-4 p-4 rounded-xl"></div>
            </div>
        `;
    },

    /**
     * Render verse with image
     */
    renderVerseWithImage(slide) {
        return `
            <div class="flex flex-col items-center justify-center py-4">
                <img src="${slide.image}" alt="Gospel illustration" class="max-w-full h-auto rounded-xl mb-4 max-h-48 object-contain" onerror="this.style.display='none'">
                ${slide.content}
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
        
        // Disable all options
        options.forEach((opt, i) => {
            opt.disabled = true;
            opt.classList.remove('hover:border-[var(--mission-gold)]/50');
            
            if (i === selectedIndex) {
                if (isCorrect) {
                    opt.classList.add('border-green-500', 'bg-green-500/10');
                } else {
                    opt.classList.add('border-red-500', 'bg-red-500/10');
                }
            }
            
            // Highlight correct answer
            if (slide.options[i].correct) {
                opt.classList.add('border-green-500');
            }
        });
        
        // Show feedback
        feedback.classList.remove('hidden');
        if (isCorrect) {
            feedback.className = 'mt-4 p-4 rounded-xl bg-green-500/10 border border-green-500/30';
            feedback.innerHTML = `
                <p class="text-green-400 font-bold mb-1">✓ Tama!</p>
                <p class="text-[var(--text-color)] text-sm">${slide.correctFeedback}</p>
            `;
        } else {
            feedback.className = 'mt-4 p-4 rounded-xl bg-orange-500/10 border border-orange-500/30';
            feedback.innerHTML = `
                <p class="text-orange-400 font-bold mb-1">Hindi eksakto...</p>
                <p class="text-[var(--text-color)] text-sm">${slide.wrongFeedback}</p>
            `;
        }
        
        // Show next button
        nextBtn.style.display = 'flex';
        nextBtn.innerHTML = 'Continue →';
    },

    /**
     * Go to next slide
     */
    next() {
        if (this.currentSlide < this.totalSlides - 1) {
            this.showSlide(this.currentSlide + 1);
        }
    },

    /**
     * Go to previous slide
     */
    prev() {
        if (this.currentSlide > 0) {
            this.showSlide(this.currentSlide - 1);
        }
    },

    /**
     * Toggle audio (placeholder)
     */
    toggleAudio() {
        // TODO: Implement audio playback
        console.log('Audio toggle - to be implemented');
    },

    /**
     * Record prayer decision
     */
    async recordPrayer() {
        const btn = document.getElementById('prayerBtn');
        btn.disabled = true;
        btn.innerHTML = '✓ Naitala na!';
        btn.classList.remove('bg-[var(--mission-gold)]');
        btn.classList.add('bg-green-600');
        
        // Save to localStorage
        localStorage.setItem('gospelCompleted', 'true');
        localStorage.setItem('prayerPrayed', 'true');
        localStorage.setItem('prayerDate', new Date().toISOString());
        
        // Save to Firebase if logged in
        try {
            const user = window.auth?.currentUser;
            if (user && window.db) {
                await window.db.collection('users').doc(user.uid).update({
                    'gospelDecision.prayed': true,
                    'gospelDecision.prayedAt': firebase.firestore.FieldValue.serverTimestamp()
                });
                console.log('Prayer decision saved to Firebase');
            }
        } catch (error) {
            console.error('Error saving prayer decision:', error);
        }
        
        // Auto-advance after 2 seconds
        setTimeout(() => this.next(), 2000);
    },

    /**
     * Complete the gospel presentation
     */
    async complete() {
        // Mark gospel as completed
        localStorage.setItem('gospelCompleted', 'true');
        
        // Save to Firebase
        try {
            const user = window.auth?.currentUser;
            if (user && window.db) {
                await window.db.collection('users').doc(user.uid).update({
                    'gospelDecision.completed': true,
                    'gospelDecision.completedAt': firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        } catch (error) {
            console.error('Error saving completion:', error);
        }
        
        // Close modal
        this.close();
        
        // Show celebration or redirect
        if (typeof NextStepsModal !== 'undefined') {
            // Refresh the Next Steps modal to show unlocked options
            setTimeout(() => {
                NextStepsModal.open();
            }, 500);
        }
    }
};

// Make globally available
window.GospelPresentation = GospelPresentation;
