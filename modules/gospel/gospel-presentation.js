/**
 * Gospel Presentation Module
 * "Ang Daan Papuntang Langit" / "The Way to Heaven"
 *
 * Rebuilt as an editorial-style full-screen presentation that follows
 * the actual tract flow while preserving app decision hooks.
 */

const GOSPEL_PRESENTATION_CONTENT = {
    tl: {
        title: 'Ang Daan Papuntang Langit',
        subtitle: 'May apat na katotohanan na dapat nating malaman upang makapunta tayo sa langit.',
        badge: 'Gospel Presentation',
        languageBadge: 'Tagalog',
        heroQuestion: 'Kung tatayo ka sa harap ng Diyos ngayong araw, sigurado ka ba kung saan mo gugugulin ang iyong susunod na buhay?',
        heroLead: 'Hindi ito tungkol sa relihiyon, sariling pagsisikap, o mabubuting gawa. Ito ay tungkol sa malinaw na sinasabi ng Bibliya kung paano tayo maliligtas.',
        jumpLabel: 'Apat na Katotohanan',
        jumps: [
            { id: 'truth1', label: '1. Mahal ka ng Diyos' },
            { id: 'truth2', label: '2. Makasalanan ang tao' },
            { id: 'truth3', label: '3. Si Hesus ang daan' },
            { id: 'truth4', label: '4. Sumampalataya' }
        ],
        truth1: {
            kicker: 'Unang Katotohanan',
            title: 'Mahal ka ng Diyos at nais Niyang magkaroon ka ng buhay na walang hanggan.',
            body: 'Nais din Niyang magkaroon ka ng buhay na makabuluhan, hindi lamang habang nabubuhay ka rito kundi hanggang sa walang hanggan.',
            verses: [
                {
                    text: '"Sapagkat gayon na lamang ang pag-ibig ng Diyos sa sangkatauhan, kaya\'t ibinigay niya ang kanyang kaisa-isang Anak, upang ang sinumang sumampalataya sa kanya ay hindi mapahamak, kundi magkaroon ng buhay na walang hanggan."',
                    ref: 'John 3:16'
                },
                {
                    text: '"Dumarating ang magnanakaw para lamang magnakaw, pumatay, at manira. Naparito ako upang ang mga tupa ay magkaroon ng buhay, buhay na masaganang lubos."',
                    ref: 'John 10:10'
                }
            ],
            transition: 'Kaya lang maraming tao ang hindi nakakaranas ng buhay na walang hanggan at buhay na makabuluhan sapagkat...'
        },
        truth2: {
            kicker: 'Pangalawang Katotohanan',
            title: 'Likas na makasalanan ang tao kaya napahiwalay siya sa Diyos.',
            body: 'Hindi lamang nagkasala ang lahat ng tao. May bayad ang kasalanan, at ang bayad ay kamatayan.',
            verses: [
                {
                    text: '"Sapagkat ang lahat ay nagkasala, at walang sinumang nakaabot sa kaluwalhatian ng Diyos."',
                    ref: 'Romans 3:23'
                },
                {
                    text: '"Sapagkat kamatayan ang kabayaran ng kasalanan..."',
                    ref: 'Romans 6:23'
                },
                {
                    text: '"Subalit para naman sa mga duwag, mga taksil, ... at sa lahat ng mga sinungaling-ang magiging bahagi nila\'y sa lawa ng nagliliyab na apoy at asupre. Ito ang pangalawang kamatayan."',
                    ref: 'Revelation 21:8'
                }
            ],
            deathTitle: 'May dalawang klase ng kamatayan sa Biblia',
            deaths: [
                {
                    title: 'Pisikal na Kamatayan',
                    body: 'Pagkamatay ng katawan.'
                },
                {
                    title: 'Espiritwal na Kamatayan',
                    body: 'Ganap na pagkahiwalay sa Diyos.'
                }
            ],
            bridgeLead: 'Kapag nakita ng tao ang kanyang pagkahiwalay sa Diyos, madalas niyang iniisip na kaya niya itong solusyunan sa pamamagitan ng sariling pagsisikap.'
        },
        truth3: {
            kicker: 'Pangatlong Katotohanan',
            title: 'Ang Panginoong Hesus ang tanging daan patungong langit.',
            body: 'Hindi sapat ang relihiyon, seremonya, kabaitan, o personal na disiplina para matubos ang kasalanan. Si Hesus lamang ang nagbayad ng lahat ng ating kasalanan sa krus.',
            effortsTitle: 'Hindi sapat ang mga ito',
            efforts: ['Sampung Utos', 'Relihiyon', 'Mabuting Gawa', 'Ritwal'],
            verses: [
                {
                    text: '"Sumagot si Jesus, Ako ang daan, ang katotohanan, at ang buhay. Walang makakapunta sa Ama kundi sa pamamagitan ko."',
                    ref: 'John 14:6'
                },
                {
                    text: '"Sapagkat si Cristo na walang kasalanan ay namatay nang minsan para sa inyo na mga makasalanan, upang iharap kayo sa Diyos. Siya\'y pinatay sa laman, at muling binuhay sa espiritu."',
                    ref: '1 Peter 3:18'
                }
            ],
            bridgeSummary: 'Ang malaman lamang na namatay ang Panginoong Hesus para sa iyong kasalanan ay hindi pa sapat. Kailangan mo Siyang personal na sampalatayanan.'
        },
        truth4: {
            kicker: 'Pang-apat na Katotohanan',
            title: 'Kailangan nating manampalataya sa Panginoong Hesus upang tayo\'y maligtas.',
            body: 'Ang kaligtasan ay hindi formula ng pananampalataya plus gawa. Ito ay regalo ng Diyos na tinatanggap sa pamamagitan ng tunay na pananampalataya kay Hesus.',
            verse: {
                text: '"Sapagkat dahil sa kagandahang-loob ng Diyos kayo ay naligtas sa pamamagitan ng pananampalataya; at ito\'y kaloob ng Diyos at hindi mula sa inyong sarili; hindi ito bunga ng inyong mga gawa kaya\'t walang maipagmamalaki ang sinuman."',
                ref: 'Ephesians 2:8-9'
            },
            formulaTitle: 'Kung ilalagay sa formula ang kaligtasan',
            formulas: [
                'Pananampalataya + Mabuting Gawa = Kaligtasan',
                'Pananampalataya + Relihiyon = Kaligtasan',
                'Pananampalataya + Wala = Kaligtasan'
            ],
            formulaAnswer: 'Ang mabuting gawa ay hindi basehan ng kaligtasan. Ito ay bunga ng buhay ng taong totoong nanampalataya sa Panginoong Hesus.'
        },
        prayer: {
            kicker: 'Panalangin',
            title: 'Ipahayag mo ang iyong pananampalataya sa Panginoong Hesus sa pamamagitan ng panalangin.',
            lead: 'Kung handa ka nang sumampalataya, maaari mong sabihin ito sa Kanya nang buong puso:',
            text: 'Panginoong Hesus, Inaamin ko po na ako ay makasalanan. Patawarin mo po ako. Nananampalataya po ako na ikaw ang tanging daan patungo sa langit dahil ikaw ang nagbayad ng aking kasalanan. Ngayon nga ay binubuksan ko na ang aking puso. Pumasok ka at manahan sa akin. Tinatanggap kita bilang aking Panginoon at Tagapagligtas. Simula ngayon ay tatalikdan ko na ang aking kasalanan. Salamat at isang araw ay makakasama kita sa langit. Amen.',
            readyLabel: 'Handa ka na ba?',
            readyCopy: 'Kapag handa ka na, puwede mo nang ipahayag ang desisyong ito dito mismo sa app.'
        },
        promises: {
            kicker: 'Kapag sumampalataya ka kay Hesus',
            title: 'Ito ang mga pangakong maaari mong panghawakan.',
            items: [
                {
                    title: 'Ikaw ay naging anak na ng Diyos.',
                    text: '"Subalit ang lahat ng tumanggap at sumampalataya sa kanya ay binigyan niya ng karapatang maging mga anak ng Diyos."',
                    ref: 'John 1:12'
                },
                {
                    title: 'May buhay na walang hanggan.',
                    text: '"Kung ang Anak ng Diyos ay nasa isang tao, mayroon siyang buhay na walang hanggan; ngunit kung wala sa kanya ang Anak ng Diyos ay wala siyang buhay na walang hanggan. Isinusulat ko ito sa inyo upang malaman ninyo na kayong sumasampalataya sa Anak ng Diyos ay may buhay na walang hanggan."',
                    ref: '1 John 5:12-13'
                },
                {
                    title: 'Ikaw ay isa nang bagong nilalang.',
                    text: '"Kaya\'t kung nakipag-isa na kay Cristo ang isang tao, isa na siyang bagong nilalang. Wala na ang dati niyang pagkatao, sa halip, ito\'y napalitan na ng bago."',
                    ref: '2 Corinthians 5:17'
                },
                {
                    title: 'Ang lahat ng kasalanan mo ay bayad na.',
                    text: '"Iniligtas niya tayo sa kapangyarihan ng kadiliman at inilipat tayo sa kaharian ng kanyang minamahal na Anak, na sa kanya ay mayroon tayong katubusan, na siyang kapatawaran ng mga kasalanan."',
                    ref: 'Colosas 1:13-14'
                }
            ]
        },
        nextSteps: {
            kicker: 'Upang lumago sa relasyon mo sa Kanya',
            title: 'Mga susunod mong hakbang',
            items: [
                'Makipag-usap sa Diyos araw-araw: Manalangin ka at makinig sa sasabihin Niya sa iyo sa pamamagitan ng pagbabasa ng Biblia.',
                'Maging bahagi ng isang discipleship group: Dito mo makakasama ang mga kapatiran na makakatulong sa iyong paglago.',
                'Dumalo sa isang Christian church na naniniwala sa Biblia: Upang makapagpuri at magpasalamat sa Diyos.'
            ]
        },
        decisions: {
            storyPrimary: 'Handa na akong manampalataya',
            storySecondary: 'Hindi pa ako handa',
            prayerTitle: 'Panalangin ng Pagtanggap',
            prayerPrompt: 'Tinanggap mo ba ang Panginoong Hesus bilang iyong Panginoon at Tagapagligtas?',
            prayerPrimary: 'Oo, tinanggap ko Siya',
            prayerSecondary: 'Hindi pa',
            backToStory: 'Bumalik sa presentation',
            notReadyTitle: 'Salamat sa pagiging tapat.',
            notReadyBody: 'Naiintindihan ko na hindi ka pa handa. Patuloy mong hanapin ang Diyos. Buksan mo ang Biblia araw-araw at bumalik ka rito kapag handa ka nang isuko ang buhay mo sa Kanya.',
            notReadyContinue: 'Magpatuloy',
            celebrationTitle: 'Purihin ang Diyos.',
            celebrationBody: 'Ang pagtanggap mo kay Hesus ang pinakamahalagang desisyon sa buhay mo. Hawakan mo ang Kanyang mga pangako at magpatuloy ka sa susunod mong hakbang kasama Siya.',
            celebrationButton: 'Bumalik sa Home'
        },
        ui: {
            close: 'Isara',
            footerNote: 'Batay sa presentasyon sa mission.wotgonline.com/daan'
        }
    },
    en: {
        title: 'Ang Daan Papuntang Langit',
        subtitle: 'There are four truths we need to understand if we want to know the way to heaven.',
        badge: 'Gospel Presentation',
        languageBadge: 'English',
        heroQuestion: 'If you stood before God today, would you be certain where you would spend eternity?',
        heroLead: 'This is not about religion, self-effort, or good works. It is about what the Bible clearly says about salvation.',
        jumpLabel: 'Four Truths',
        jumps: [
            { id: 'truth1', label: '1. God loves you' },
            { id: 'truth2', label: '2. Humanity is sinful' },
            { id: 'truth3', label: '3. Jesus is the way' },
            { id: 'truth4', label: '4. Believe in Him' }
        ],
        truth1: {
            kicker: 'First Truth',
            title: 'God loves you and wants you to have eternal life.',
            body: 'He also wants you to experience a meaningful life, not only here on earth but forever.',
            verses: [
                {
                    text: '"For God so loved the world, that he gave his only Son, that whoever believes in him should not perish but have eternal life."',
                    ref: 'John 3:16'
                },
                {
                    text: '"The thief comes only to steal and kill and destroy. I came that they may have life and have it abundantly."',
                    ref: 'John 10:10'
                }
            ],
            transition: 'Yet many people do not experience eternal life or a meaningful life because...'
        },
        truth2: {
            kicker: 'Second Truth',
            title: 'Humanity is sinful, so we are separated from God.',
            body: 'It is not only that all people have sinned. Sin also carries a penalty, and that penalty is death.',
            verses: [
                {
                    text: '"For all have sinned and fall short of the glory of God."',
                    ref: 'Romans 3:23'
                },
                {
                    text: '"For the wages of sin is death..."',
                    ref: 'Romans 6:23'
                },
                {
                    text: '"Their portion will be in the lake that burns with fire and sulfur, which is the second death."',
                    ref: 'Revelation 21:8'
                }
            ],
            deathTitle: 'There are two kinds of death in the Bible',
            deaths: [
                {
                    title: 'Physical Death',
                    body: 'The death of the body.'
                },
                {
                    title: 'Spiritual Death',
                    body: 'Complete separation from God.'
                }
            ],
            bridgeLead: 'When people recognize their separation from God, they often think they can solve it through their own effort.'
        },
        truth3: {
            kicker: 'Third Truth',
            title: 'The Lord Jesus is the only way to heaven.',
            body: 'Religion, ceremony, kindness, and discipline cannot pay for sin. Jesus alone paid for all our sins on the cross.',
            effortsTitle: 'These are not enough',
            efforts: ['Ten Commandments', 'Religion', 'Good Works', 'Rituals'],
            verses: [
                {
                    text: '"I am the way, and the truth, and the life. No one comes to the Father except through me."',
                    ref: 'John 14:6'
                },
                {
                    text: '"For Christ also suffered once for sins, the righteous for the unrighteous, that he might bring us to God."',
                    ref: '1 Peter 3:18'
                }
            ],
            bridgeSummary: 'Knowing that Jesus died for your sins is still not enough by itself. You must personally place your faith in Him.'
        },
        truth4: {
            kicker: 'Fourth Truth',
            title: 'We must place our faith in the Lord Jesus to be saved.',
            body: 'Salvation is not faith plus works. It is God\'s gift, received through true faith in Jesus.',
            verse: {
                text: '"For by grace you have been saved through faith. And this is not your own doing; it is the gift of God, not a result of works, so that no one may boast."',
                ref: 'Ephesians 2:8-9'
            },
            formulaTitle: 'If you put salvation into a formula',
            formulas: [
                'Faith + Good Works = Salvation',
                'Faith + Religion = Salvation',
                'Faith + Nothing = Salvation'
            ],
            formulaAnswer: 'Good works are not the basis of salvation. They are the fruit of the life of someone who truly believes in the Lord Jesus.'
        },
        prayer: {
            kicker: 'Prayer',
            title: 'Express your faith in the Lord Jesus through prayer.',
            lead: 'If you are ready to believe, you may say this to Him from your heart:',
            text: 'Lord Jesus, I admit that I am a sinner. Please forgive me. I believe that You are the only way to heaven because You paid for my sin. Right now I open my heart. Come in and dwell in me. I receive You as my Lord and Savior. From this day on I will turn away from my sin. Thank You that one day I will be with You in heaven. Amen.',
            readyLabel: 'Are you ready?',
            readyCopy: 'When you are ready, you can respond to this decision right here in the app.'
        },
        promises: {
            kicker: 'If you place your faith in Jesus',
            title: 'These are the promises you can hold onto.',
            items: [
                {
                    title: 'You have become a child of God.',
                    text: '"But to all who did receive him, who believed in his name, he gave the right to become children of God."',
                    ref: 'John 1:12'
                },
                {
                    title: 'You have eternal life.',
                    text: '"Whoever has the Son has life... I write these things to you who believe in the name of the Son of God, that you may know that you have eternal life."',
                    ref: '1 John 5:12-13'
                },
                {
                    title: 'You are a new creation.',
                    text: '"If anyone is in Christ, he is a new creation. The old has passed away; behold, the new has come."',
                    ref: '2 Corinthians 5:17'
                },
                {
                    title: 'Your sins have been paid for.',
                    text: '"He has delivered us from the domain of darkness... in whom we have redemption, the forgiveness of sins."',
                    ref: 'Colossians 1:13-14'
                }
            ]
        },
        nextSteps: {
            kicker: 'To grow in your relationship with Him',
            title: 'Your next steps',
            items: [
                'Talk to God daily: pray and listen to Him through reading the Bible.',
                'Become part of a discipleship group: this is where believers can help you grow.',
                'Attend a Bible-believing Christian church: worship and give thanks to God together.'
            ]
        },
        decisions: {
            storyPrimary: 'I am ready to believe',
            storySecondary: 'I am not ready yet',
            prayerTitle: 'Prayer of Acceptance',
            prayerPrompt: 'Did you receive the Lord Jesus as your Lord and Savior?',
            prayerPrimary: 'Yes, I received Him',
            prayerSecondary: 'Not yet',
            backToStory: 'Back to presentation',
            notReadyTitle: 'Thank you for being honest.',
            notReadyBody: 'I understand that you are not ready yet. Keep seeking God. Open the Bible daily and come back here when you are ready to surrender your life to Him.',
            notReadyContinue: 'Continue',
            celebrationTitle: 'Praise God.',
            celebrationBody: 'Receiving Jesus is the most important decision of your life. Hold on to His promises and keep moving into your next steps with Him.',
            celebrationButton: 'Back to Home'
        },
        ui: {
            close: 'Close',
            footerNote: 'Based on the presentation at mission.wotgonline.com/daan'
        }
    }
};

const GospelPresentation = {
    view: 'story',
    forcedLang: null,
    followUpDeclined: false,

    lang() {
        if (this.forcedLang) return this.forcedLang;
        if (window.i18n?.getLang) return window.i18n.getLang();
        const stored = localStorage.getItem('goMission_language');
        return stored === 'en' ? 'en' : 'tl';
    },

    copy() {
        return GOSPEL_PRESENTATION_CONTENT[this.lang()] || GOSPEL_PRESENTATION_CONTENT.tl;
    },

    open(options = {}) {
        this.forcedLang = options.lang === 'en' ? 'en' : options.lang === 'tl' ? 'tl' : null;
        this.view = 'story';
        this.followUpDeclined = false;
        this.injectStyles();
        this.createModal();
        this.renderView();
        const modal = document.getElementById('gospelModal');
        if (modal) modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    },

    close() {
        const modal = document.getElementById('gospelModal');
        if (modal) modal.remove();
        document.body.style.overflow = '';
        if (window.GospelAudio?.stop) {
            window.GospelAudio.stop();
        }
        this.view = 'story';
        this.forcedLang = null;
    },

    injectStyles() {
        if (document.getElementById('gospelPresentationStyles')) return;

        const style = document.createElement('style');
        style.id = 'gospelPresentationStyles';
        style.textContent = `
            #gospelModal {
                position: fixed;
                inset: 0;
                z-index: 100;
                background:
                    radial-gradient(circle at top left, rgba(255, 215, 0, 0.14), transparent 28%),
                    radial-gradient(circle at bottom right, rgba(122, 0, 0, 0.24), transparent 34%),
                    linear-gradient(145deg, rgba(16, 6, 6, 0.97), rgba(34, 10, 10, 0.96));
                backdrop-filter: blur(16px);
            }

            #gospelModal.hidden {
                display: none;
            }

            #gospelModal .gospel-overlay {
                position: absolute;
                inset: 0;
                pointer-events: none;
                background-image:
                    linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
                background-size: 32px 32px;
                mask-image: linear-gradient(to bottom, transparent, rgba(0,0,0,0.7), transparent);
            }

            #gospelModal .gospel-shell {
                position: relative;
                z-index: 1;
                height: 100%;
                width: 100%;
                display: flex;
                align-items: stretch;
                justify-content: center;
                padding: clamp(0.75rem, 2vw, 1.5rem);
            }

            #gospelModal .gospel-frame {
                width: min(1180px, 100%);
                height: 100%;
                border-radius: 28px;
                overflow: hidden;
                border: 1px solid rgba(255, 215, 0, 0.16);
                background:
                    linear-gradient(180deg, rgba(31, 10, 10, 0.9), rgba(22, 8, 8, 0.96)),
                    rgba(23, 8, 8, 0.95);
                box-shadow: 0 28px 80px rgba(0, 0, 0, 0.45);
                display: grid;
                grid-template-rows: auto 1fr;
            }

            body.light-mode #gospelModal .gospel-frame {
                background:
                    linear-gradient(180deg, rgba(255, 249, 240, 0.97), rgba(247, 240, 230, 0.98)),
                    #f7f0e6;
                border-color: rgba(123, 0, 0, 0.1);
                box-shadow: 0 24px 70px rgba(123, 0, 0, 0.16);
            }

            #gospelModal .gospel-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 1rem;
                padding: 1rem 1.1rem;
                border-bottom: 1px solid rgba(255, 215, 0, 0.12);
                background: rgba(17, 5, 5, 0.78);
                backdrop-filter: blur(14px);
            }

            body.light-mode #gospelModal .gospel-header {
                background: rgba(255, 255, 255, 0.82);
                border-bottom-color: rgba(123, 0, 0, 0.08);
            }

            #gospelModal .gospel-heading-wrap {
                display: flex;
                align-items: center;
                gap: 0.9rem;
                min-width: 0;
            }

            #gospelModal .gospel-heading-mark {
                width: 2.9rem;
                height: 2.9rem;
                border-radius: 1rem;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                background: linear-gradient(135deg, rgba(255, 215, 0, 0.18), rgba(255, 255, 255, 0.06));
                color: var(--mission-gold);
                font-size: 1.25rem;
                flex-shrink: 0;
            }

            #gospelModal .gospel-heading-kicker {
                display: block;
                font-family: 'Bebas Neue', sans-serif;
                font-size: 0.78rem;
                letter-spacing: 0.22em;
                color: var(--mission-gold);
                text-transform: uppercase;
            }

            #gospelModal .gospel-heading-title {
                display: block;
                font-family: 'Cormorant Garamond', serif;
                font-size: clamp(1.35rem, 2vw, 1.8rem);
                font-weight: 600;
                line-height: 1;
                color: var(--text-color);
            }

            body.light-mode #gospelModal .gospel-heading-title {
                color: #671818;
            }

            #gospelModal .gospel-heading-subtitle {
                display: block;
                margin-top: 0.1rem;
                font-size: 0.78rem;
                color: var(--text-muted);
                max-width: 40rem;
            }

            #gospelModal .gospel-header-tools {
                display: flex;
                align-items: center;
                gap: 0.55rem;
                flex-shrink: 0;
            }

            #gospelModal .gospel-pill {
                border-radius: 999px;
                border: 1px solid rgba(255, 215, 0, 0.18);
                background: rgba(255, 215, 0, 0.08);
                color: var(--mission-gold);
                padding: 0.45rem 0.85rem;
                font-size: 0.72rem;
                letter-spacing: 0.12em;
                text-transform: uppercase;
            }

            body.light-mode #gospelModal .gospel-pill {
                border-color: rgba(123, 0, 0, 0.12);
                background: rgba(123, 0, 0, 0.04);
                color: #7b0000;
            }

            #gospelModal .gospel-close {
                width: 2.6rem;
                height: 2.6rem;
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 999px;
                background: rgba(255, 255, 255, 0.04);
                color: var(--text-color);
                cursor: pointer;
                transition: transform 0.2s ease, border-color 0.2s ease, background-color 0.2s ease;
            }

            #gospelModal .gospel-close:hover,
            #gospelModal .gospel-close:focus-visible {
                transform: translateY(-1px);
                border-color: rgba(255, 215, 0, 0.32);
                background: rgba(255, 255, 255, 0.08);
                outline: none;
            }

            #gospelModal .gospel-body {
                overflow-y: auto;
                padding: 0 1.1rem 1.1rem;
            }

            #gospelModal .gospel-story {
                display: flex;
                flex-direction: column;
                gap: 1rem;
                padding-top: 1rem;
            }

            #gospelModal .gospel-intro-card {
                background: #fffdf8;
                border: 1px solid #efe0cf;
                border-radius: 24px;
                padding: 1.15rem 1.1rem 1rem;
                box-shadow: 0 14px 36px rgba(70, 24, 12, 0.08);
            }

            #gospelModal .gospel-intro-title {
                margin: 0.35rem 0 0;
                font-family: 'Cormorant Garamond', serif;
                font-size: clamp(2rem, 6vw, 3rem);
                line-height: 0.95;
                color: #6d2620;
            }

            #gospelModal .gospel-intro-copy {
                margin: 0.55rem 0 0;
                max-width: 36rem;
                font-size: 1rem;
                line-height: 1.55;
                color: #5e5048;
            }

            #gospelModal .gospel-hero {
                position: relative;
                overflow: hidden;
                border-radius: 30px;
                padding: clamp(1.35rem, 4vw, 3.1rem);
                background:
                    radial-gradient(circle at top right, rgba(255, 215, 0, 0.18), transparent 26%),
                    linear-gradient(135deg, rgba(72, 18, 18, 0.9), rgba(25, 8, 8, 0.98));
                border: 1px solid rgba(255, 215, 0, 0.16);
            }

            body.light-mode #gospelModal .gospel-hero {
                background:
                    radial-gradient(circle at top right, rgba(212, 160, 23, 0.18), transparent 28%),
                    linear-gradient(135deg, rgba(255, 247, 235, 0.98), rgba(246, 237, 228, 0.98));
                border-color: rgba(123, 0, 0, 0.1);
            }

            #gospelModal .gospel-hero::after {
                content: '';
                position: absolute;
                inset: auto -3rem -3rem auto;
                width: 18rem;
                height: 18rem;
                border-radius: 50%;
                background: radial-gradient(circle, rgba(255, 215, 0, 0.12), transparent 70%);
            }

            #gospelModal .gospel-hero-copy {
                position: relative;
                z-index: 1;
                max-width: 46rem;
            }

            #gospelModal .gospel-hero-badge {
                display: inline-flex;
                align-items: center;
                gap: 0.45rem;
                border-radius: 999px;
                background: rgba(255, 255, 255, 0.08);
                color: var(--mission-gold);
                padding: 0.5rem 0.8rem;
                font-size: 0.75rem;
                text-transform: uppercase;
                letter-spacing: 0.16em;
            }

            body.light-mode #gospelModal .gospel-hero-badge {
                background: rgba(123, 0, 0, 0.05);
                color: #8b0000;
            }

            #gospelModal .gospel-hero-title {
                margin: 0.8rem 0 0;
                font-family: 'Cormorant Garamond', serif;
                font-size: clamp(2.3rem, 7vw, 4.9rem);
                line-height: 0.95;
                letter-spacing: -0.03em;
                color: #fff6e8;
            }

            body.light-mode #gospelModal .gospel-hero-title {
                color: #5d1111;
            }

            #gospelModal .gospel-hero-question {
                margin: 0.85rem 0 0;
                font-size: clamp(1rem, 2vw, 1.25rem);
                line-height: 1.6;
                color: rgba(255, 246, 232, 0.92);
            }

            body.light-mode #gospelModal .gospel-hero-question {
                color: #582323;
            }

            #gospelModal .gospel-hero-lead {
                margin: 0.75rem 0 0;
                max-width: 39rem;
                font-size: 0.95rem;
                line-height: 1.75;
                color: var(--text-muted);
            }

            #gospelModal .gospel-jump {
                margin-top: 1.2rem;
                display: flex;
                flex-direction: column;
                gap: 0.7rem;
            }

            #gospelModal .gospel-jump-label {
                font-family: 'Bebas Neue', sans-serif;
                font-size: 0.82rem;
                letter-spacing: 0.22em;
                color: var(--mission-gold);
                text-transform: uppercase;
            }

            #gospelModal .gospel-jump-grid {
                display: flex;
                flex-wrap: wrap;
                gap: 0.55rem;
            }

            #gospelModal .gospel-jump-btn,
            #gospelModal .gospel-action-btn,
            #gospelModal .gospel-panel-btn {
                border: 1px solid transparent;
                border-radius: 999px;
                cursor: pointer;
                transition: transform 0.2s ease, border-color 0.2s ease, background-color 0.2s ease, color 0.2s ease;
            }

            #gospelModal .gospel-jump-btn {
                padding: 0.68rem 1rem;
                background: rgba(255, 255, 255, 0.06);
                color: var(--text-color);
                font-size: 0.8rem;
            }

            body.light-mode #gospelModal .gospel-jump-btn {
                background: rgba(123, 0, 0, 0.04);
                color: #622222;
            }

            #gospelModal .gospel-jump-btn:hover,
            #gospelModal .gospel-jump-btn:focus-visible,
            #gospelModal .gospel-action-btn:hover,
            #gospelModal .gospel-action-btn:focus-visible,
            #gospelModal .gospel-panel-btn:hover,
            #gospelModal .gospel-panel-btn:focus-visible {
                transform: translateY(-1px);
                border-color: rgba(255, 215, 0, 0.28);
                outline: none;
            }

            #gospelModal .gospel-grid {
                display: grid;
                grid-template-columns: minmax(0, 1.1fr) minmax(280px, 0.9fr);
                gap: 1rem;
            }

            #gospelModal .gospel-card,
            #gospelModal .gospel-media-card,
            #gospelModal .gospel-promise-card,
            #gospelModal .gospel-formula-card,
            #gospelModal .gospel-panel {
                border-radius: 26px;
                border: 1px solid rgba(255, 255, 255, 0.08);
                background: rgba(255, 255, 255, 0.035);
                box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.02);
            }

            body.light-mode #gospelModal .gospel-card,
            body.light-mode #gospelModal .gospel-media-card,
            body.light-mode #gospelModal .gospel-promise-card,
            body.light-mode #gospelModal .gospel-formula-card,
            body.light-mode #gospelModal .gospel-panel {
                border-color: rgba(123, 0, 0, 0.08);
                background: rgba(255, 255, 255, 0.82);
                box-shadow: 0 12px 28px rgba(123, 0, 0, 0.06);
            }

            #gospelModal .gospel-card {
                padding: clamp(1rem, 2vw, 1.6rem);
            }

            #gospelModal .gospel-kicker {
                display: inline-block;
                font-family: 'Bebas Neue', sans-serif;
                font-size: 0.8rem;
                letter-spacing: 0.22em;
                text-transform: uppercase;
                color: var(--mission-gold);
            }

            body.light-mode #gospelModal .gospel-kicker {
                color: #8b0000;
            }

            #gospelModal .gospel-section-title {
                margin: 0.55rem 0 0;
                font-family: 'Cormorant Garamond', serif;
                font-size: clamp(1.8rem, 3vw, 2.7rem);
                line-height: 1.05;
                color: var(--text-color);
            }

            body.light-mode #gospelModal .gospel-section-title {
                color: #631818;
            }

            #gospelModal .gospel-body-copy {
                margin: 0.8rem 0 0;
                font-size: 0.96rem;
                line-height: 1.8;
                color: var(--text-muted);
            }

            #gospelModal .gospel-transition-copy {
                margin-top: 1rem;
                padding-left: 1rem;
                border-left: 2px solid rgba(255, 215, 0, 0.3);
                font-size: 0.92rem;
                line-height: 1.75;
                color: var(--text-color);
            }

            #gospelModal .gospel-verse-list,
            #gospelModal .gospel-list,
            #gospelModal .gospel-checklist {
                margin: 1rem 0 0;
                display: flex;
                flex-direction: column;
                gap: 0.75rem;
            }

            #gospelModal .gospel-verse {
                padding: 1rem;
                border-radius: 20px;
                background: rgba(0, 0, 0, 0.2);
                border: 1px solid rgba(255, 255, 255, 0.06);
            }

            body.light-mode #gospelModal .gospel-verse {
                background: rgba(123, 0, 0, 0.03);
                border-color: rgba(123, 0, 0, 0.06);
            }

            #gospelModal .gospel-verse-text {
                margin: 0;
                font-family: 'Instrument Serif', serif;
                font-size: 1.02rem;
                line-height: 1.7;
                color: var(--text-color);
            }

            #gospelModal .gospel-verse-ref {
                margin-top: 0.7rem;
                font-size: 0.76rem;
                letter-spacing: 0.16em;
                text-transform: uppercase;
                color: var(--mission-gold);
            }

            body.light-mode #gospelModal .gospel-verse-ref {
                color: #8b0000;
            }

            #gospelModal .gospel-media-card {
                padding: 0.7rem;
                display: flex;
                flex-direction: column;
                gap: 0.7rem;
            }

            #gospelModal .gospel-media-card img {
                width: 100%;
                height: clamp(220px, 34vw, 430px);
                object-fit: cover;
                border-radius: 22px;
                display: block;
            }

            #gospelModal .gospel-media-caption {
                padding: 0.25rem 0.45rem 0.45rem;
                font-size: 0.82rem;
                line-height: 1.6;
                color: var(--text-muted);
            }

            #gospelModal .gospel-two-up {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 0.75rem;
                margin-top: 1rem;
            }

            #gospelModal .gospel-mini-card {
                padding: 0.95rem;
                border-radius: 20px;
                background: rgba(0, 0, 0, 0.18);
                border: 1px solid rgba(255, 255, 255, 0.06);
            }

            body.light-mode #gospelModal .gospel-mini-card {
                background: rgba(123, 0, 0, 0.03);
                border-color: rgba(123, 0, 0, 0.05);
            }

            #gospelModal .gospel-mini-title {
                font-size: 0.88rem;
                font-weight: 700;
                color: var(--text-color);
            }

            #gospelModal .gospel-mini-copy {
                margin-top: 0.35rem;
                font-size: 0.82rem;
                line-height: 1.6;
                color: var(--text-muted);
            }

            #gospelModal .gospel-effort-grid {
                margin-top: 1rem;
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 0.7rem;
            }

            #gospelModal .gospel-effort {
                position: relative;
                padding: 0.95rem 1rem;
                border-radius: 18px;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.06);
                color: var(--text-color);
                font-size: 0.92rem;
                overflow: hidden;
            }

            #gospelModal .gospel-effort::after {
                content: '';
                position: absolute;
                inset: 50% -10% auto -10%;
                height: 2px;
                background: linear-gradient(90deg, transparent, rgba(248, 113, 113, 0.85), transparent);
                transform: rotate(-12deg);
            }

            body.light-mode #gospelModal .gospel-effort {
                background: rgba(123, 0, 0, 0.04);
                border-color: rgba(123, 0, 0, 0.06);
                color: #5d1b1b;
            }

            #gospelModal .gospel-formula-grid {
                margin-top: 1rem;
                display: grid;
                gap: 0.7rem;
            }

            #gospelModal .gospel-formula-card {
                padding: 1rem 1.1rem;
            }

            #gospelModal .gospel-formula-card.correct {
                border-color: rgba(255, 215, 0, 0.24);
                background: linear-gradient(135deg, rgba(255, 215, 0, 0.12), rgba(255, 255, 255, 0.04));
            }

            body.light-mode #gospelModal .gospel-formula-card.correct {
                background: linear-gradient(135deg, rgba(212, 160, 23, 0.12), rgba(255, 255, 255, 0.88));
            }

            #gospelModal .gospel-formula-copy {
                margin: 0;
                font-size: 0.95rem;
                line-height: 1.6;
                color: var(--text-color);
            }

            #gospelModal .gospel-flow {
                display: flex;
                flex-direction: column;
                gap: 0.85rem;
                max-width: 820px;
            }

            #gospelModal .gospel-flow-section {
                display: flex;
                flex-direction: column;
                gap: 0.85rem;
            }

            #gospelModal .gospel-flow .gospel-kicker {
                color: #b56a2e;
            }

            #gospelModal .gospel-section-banner {
                background: #070707;
                color: #fff;
                border-radius: 0;
                padding: 1.45rem 1.35rem;
                font-size: clamp(1.8rem, 5vw, 3rem);
                font-weight: 700;
                line-height: 1.28;
            }

            #gospelModal .gospel-flow .gospel-verse {
                background: #fff;
                border: 1px solid #eedfd0;
                border-radius: 0;
                box-shadow: none;
            }

            #gospelModal .gospel-flow .gospel-verse-text {
                color: #191919;
                font-size: 1.06rem;
                line-height: 1.7;
            }

            #gospelModal .gospel-flow .gospel-verse-ref {
                color: #dc3d1f;
            }

            #gospelModal .gospel-highlight-block {
                background: #f6d6a4;
                border: 1px solid #efc688;
                border-radius: 0;
                padding: 1.25rem 1.15rem;
                color: #1f140d;
            }

            #gospelModal .gospel-highlight-block.soft {
                background: #f9ecdd;
                border-color: #f0dcc8;
            }

            #gospelModal .gospel-highlight-copy {
                margin: 0;
                font-size: clamp(1.1rem, 3.4vw, 1.65rem);
                line-height: 1.22;
                font-weight: 700;
                color: #141414;
            }

            #gospelModal .gospel-highlight-copy.small {
                font-size: 1rem;
                line-height: 1.7;
                font-weight: 600;
            }

            #gospelModal .gospel-highlight-note {
                margin: 0.45rem 0 0;
                font-size: 0.96rem;
                line-height: 1.65;
                color: #4e3526;
            }

            #gospelModal .gospel-inline-image {
                background: #fff;
                border: 1px solid #eedfd0;
                padding: 0.65rem;
            }

            #gospelModal .gospel-inline-image img {
                width: 100%;
                height: auto;
                display: block;
            }

            #gospelModal .gospel-simple-grid {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 0.75rem;
            }

            #gospelModal .gospel-simple-card {
                background: #fff;
                border: 1px solid #eedfd0;
                padding: 1rem;
            }

            #gospelModal .gospel-simple-title {
                font-size: 0.92rem;
                font-weight: 700;
                line-height: 1.5;
                color: #121212;
            }

            #gospelModal .gospel-simple-copy {
                margin-top: 0.35rem;
                font-size: 0.9rem;
                line-height: 1.65;
                color: #50453e;
            }

            #gospelModal .gospel-effort-panel {
                background: #fff7ea;
                border: 1px solid #efddc7;
                padding: 1rem;
            }

            #gospelModal .gospel-effort-label {
                margin: 0 0 0.8rem;
                font-size: 0.95rem;
                font-weight: 700;
                color: #1c1c1c;
            }

            #gospelModal .gospel-effort-panel .gospel-effort-grid {
                margin-top: 0;
            }

            #gospelModal .gospel-effort-panel .gospel-effort {
                background: #fff;
                border-color: #efddc7;
                color: #1e1e1e;
            }

            #gospelModal .gospel-stack {
                display: flex;
                flex-direction: column;
                gap: 0.85rem;
            }

            #gospelModal .gospel-prayer-card {
                position: relative;
                margin-top: 1rem;
                padding: clamp(1rem, 2vw, 1.5rem);
                border-radius: 24px;
                background:
                    linear-gradient(145deg, rgba(255, 215, 0, 0.14), rgba(255, 255, 255, 0.03)),
                    rgba(255, 255, 255, 0.04);
                border: 1px solid rgba(255, 215, 0, 0.18);
            }

            body.light-mode #gospelModal .gospel-prayer-card {
                background: linear-gradient(145deg, rgba(212, 160, 23, 0.12), rgba(255, 255, 255, 0.92));
                border-color: rgba(123, 0, 0, 0.08);
            }

            #gospelModal .gospel-prayer-text {
                margin: 0;
                font-family: 'Instrument Serif', serif;
                font-size: 1.08rem;
                line-height: 1.85;
                color: var(--text-color);
            }

            #gospelModal .gospel-action-bar {
                position: sticky;
                bottom: 0;
                margin-top: 1.1rem;
                padding: 1rem;
                border-radius: 24px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 1rem;
                background: rgba(17, 5, 5, 0.92);
                border: 1px solid rgba(255, 215, 0, 0.1);
                backdrop-filter: blur(14px);
            }

            body.light-mode #gospelModal .gospel-action-bar {
                background: rgba(255, 255, 255, 0.94);
                border-color: rgba(123, 0, 0, 0.08);
            }

            #gospelModal .gospel-action-copy {
                max-width: 36rem;
            }

            #gospelModal .gospel-action-title {
                margin: 0;
                font-size: 0.9rem;
                font-weight: 700;
                color: var(--text-color);
            }

            #gospelModal .gospel-action-note {
                margin: 0.25rem 0 0;
                font-size: 0.78rem;
                line-height: 1.55;
                color: var(--text-muted);
            }

            #gospelModal .gospel-action-row,
            #gospelModal .gospel-panel-actions {
                display: flex;
                flex-wrap: wrap;
                gap: 0.65rem;
            }

            #gospelModal .gospel-action-btn,
            #gospelModal .gospel-panel-btn {
                padding: 0.82rem 1.15rem;
                font-size: 0.84rem;
                font-weight: 700;
            }

            #gospelModal .gospel-action-btn.primary,
            #gospelModal .gospel-panel-btn.primary {
                background: linear-gradient(135deg, rgba(255, 215, 0, 1), rgba(237, 176, 21, 0.96));
                color: #350909;
            }

            #gospelModal .gospel-action-btn.secondary,
            #gospelModal .gospel-panel-btn.secondary {
                background: rgba(255, 255, 255, 0.06);
                color: var(--text-color);
                border-color: rgba(255, 255, 255, 0.08);
            }

            body.light-mode #gospelModal .gospel-action-btn.secondary,
            body.light-mode #gospelModal .gospel-panel-btn.secondary {
                background: rgba(123, 0, 0, 0.05);
                color: #632020;
                border-color: rgba(123, 0, 0, 0.08);
            }

            #gospelModal .gospel-panel-wrap {
                display: grid;
                place-items: center;
                min-height: 100%;
                padding: 1rem 0;
            }

            #gospelModal .gospel-panel {
                width: min(760px, 100%);
                padding: clamp(1.2rem, 3vw, 2rem);
            }

            #gospelModal .gospel-panel-title {
                margin: 0.65rem 0 0;
                font-family: 'Cormorant Garamond', serif;
                font-size: clamp(2rem, 4vw, 3rem);
                line-height: 0.98;
                color: var(--text-color);
            }

            body.light-mode #gospelModal .gospel-panel-title {
                color: #641919;
            }

            #gospelModal .gospel-panel-copy {
                margin: 0.85rem 0 0;
                font-size: 0.96rem;
                line-height: 1.8;
                color: var(--text-muted);
            }

            #gospelModal .gospel-promise-grid {
                margin-top: 1rem;
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 0.75rem;
            }

            #gospelModal .gospel-promise-card {
                padding: 1rem;
            }

            #gospelModal .gospel-promise-title {
                font-size: 0.92rem;
                font-weight: 700;
                color: var(--text-color);
            }

            #gospelModal .gospel-promise-text {
                margin-top: 0.45rem;
                font-family: 'Instrument Serif', serif;
                font-size: 0.96rem;
                line-height: 1.7;
                color: var(--text-color);
            }

            #gospelModal .gospel-promise-ref {
                margin-top: 0.65rem;
                font-size: 0.73rem;
                letter-spacing: 0.14em;
                text-transform: uppercase;
                color: var(--mission-gold);
            }

            body.light-mode #gospelModal .gospel-promise-ref {
                color: #8b0000;
            }

            #gospelModal .gospel-panel-footnote {
                margin-top: 1rem;
                font-size: 0.76rem;
                line-height: 1.6;
                color: var(--text-muted);
            }

            #gospelModal .gospel-footer-note {
                margin-top: 0.9rem;
                font-size: 0.72rem;
                color: var(--text-muted);
                text-align: right;
            }

            @media (max-width: 900px) {
                #gospelModal .gospel-grid,
                #gospelModal .gospel-promise-grid {
                    grid-template-columns: 1fr;
                }
            }

            @media (max-width: 720px) {
                #gospelModal .gospel-shell {
                    padding: 0;
                }

                #gospelModal .gospel-frame {
                    border-radius: 0;
                }

                #gospelModal .gospel-header {
                    align-items: flex-start;
                }

                #gospelModal .gospel-heading-wrap {
                    gap: 0.7rem;
                }

                #gospelModal .gospel-heading-mark {
                    width: 2.55rem;
                    height: 2.55rem;
                }

                #gospelModal .gospel-two-up,
                #gospelModal .gospel-effort-grid,
                #gospelModal .gospel-simple-grid {
                    grid-template-columns: 1fr;
                }

                #gospelModal .gospel-action-bar {
                    flex-direction: column;
                    align-items: stretch;
                }

                #gospelModal .gospel-action-row,
                #gospelModal .gospel-panel-actions {
                    flex-direction: column;
                }

                #gospelModal .gospel-action-btn,
                #gospelModal .gospel-panel-btn {
                    width: 100%;
                    justify-content: center;
                }
            }
        `;
        document.head.appendChild(style);
    },

    createModal() {
        const existing = document.getElementById('gospelModal');
        if (existing) existing.remove();

        const copy = this.copy();
        const modal = document.createElement('div');
        modal.id = 'gospelModal';
        modal.className = 'hidden';
        modal.innerHTML = `
            <div class="gospel-overlay"></div>
            <div class="gospel-shell">
                <div class="gospel-frame">
                    <div class="gospel-header">
                        <div class="gospel-heading-wrap">
                            <div class="gospel-heading-mark">✝</div>
                            <div>
                                <span class="gospel-heading-kicker">${copy.badge}</span>
                                <span class="gospel-heading-title">${copy.title}</span>
                                <span class="gospel-heading-subtitle">${copy.subtitle}</span>
                            </div>
                        </div>
                        <div class="gospel-header-tools">
                            <span class="gospel-pill">${copy.languageBadge}</span>
                            <button type="button" class="gospel-close" aria-label="${copy.ui.close}" onclick="GospelPresentation.close()">
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 6l12 12M18 6L6 18"></path>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div id="gospelPresentationBody" class="gospel-body custom-scrollbar"></div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    renderView() {
        const body = document.getElementById('gospelPresentationBody');
        if (!body) return;

        switch (this.view) {
            case 'prayer':
                body.innerHTML = this.renderPrayerView();
                break;
            case 'not-ready':
                body.innerHTML = this.renderNotReadyView();
                break;
            case 'celebration':
                body.innerHTML = this.renderCelebrationView();
                break;
            case 'story':
            default:
                body.innerHTML = this.renderStoryView();
                break;
        }

        body.scrollTop = 0;
    },

    renderStoryView() {
        const copy = this.copy();
        const t1 = copy.truth1;
        const t2 = copy.truth2;
        const t3 = copy.truth3;
        const t4 = copy.truth4;

        return `
            <div class="gospel-story">
                <section class="gospel-intro-card">
                    <div class="gospel-hero-badge">
                        <span>${copy.badge}</span>
                        <span>•</span>
                        <span>${copy.languageBadge}</span>
                    </div>
                    <h1 class="gospel-intro-title">${copy.title}</h1>
                    <p class="gospel-intro-copy">${copy.subtitle}</p>
                    <div class="gospel-jump">
                        <div class="gospel-jump-label">${copy.jumpLabel}</div>
                        <div class="gospel-jump-grid">
                            ${copy.jumps.map((jump) => `
                                <button type="button" class="gospel-jump-btn" onclick="GospelPresentation.jumpToSection('${jump.id}')">${jump.label}</button>
                            `).join('')}
                        </div>
                    </div>
                </section>

                <section class="gospel-flow" data-section="truth1">
                    <article class="gospel-flow-section">
                        <span class="gospel-kicker">${t1.kicker}</span>
                        <div class="gospel-section-banner">${t1.title}</div>
                        ${this.renderVerse(t1.verses[0])}
                        ${this.renderHighlightBlock(t1.body)}
                        ${this.renderVerse(t1.verses[1])}
                        ${this.renderHighlightBlock(t1.transition, { soft: true, compact: true })}
                    </article>
                </section>

                <section class="gospel-flow" data-section="truth2">
                    <article class="gospel-flow-section">
                        <span class="gospel-kicker">${t2.kicker}</span>
                        <div class="gospel-section-banner">${t2.title}</div>
                        ${this.renderInlineImage('assets/images/gospel/gospel_tract1.jpg', t2.title)}
                        ${this.renderVerse(t2.verses[0])}
                        ${this.renderHighlightBlock(t2.body)}
                        ${this.renderVerse(t2.verses[1])}
                        ${this.renderHighlightBlock(t2.deathTitle, {
                            note: t2.deaths.map((death) => `<strong>${death.title}:</strong> ${death.body}`).join('<br>'),
                            soft: true
                        })}
                        ${this.renderVerse(t2.verses[2])}
                        ${this.renderInlineImage('assets/images/gospel/gospel_tract2.jpg', t2.deathTitle)}
                        ${this.renderHighlightBlock(t2.bridgeLead, { compact: true })}
                    </article>
                    <article class="gospel-effort-panel">
                        <p class="gospel-effort-label">${t3.effortsTitle}</p>
                        <div class="gospel-effort-grid">
                            ${t3.efforts.map((effort) => `<div class="gospel-effort">${effort}</div>`).join('')}
                        </div>
                        ${this.renderHighlightBlock(t3.body, { soft: true, compact: true })}
                    </article>
                </section>

                <section class="gospel-flow" data-section="truth3">
                    <article class="gospel-flow-section">
                        <span class="gospel-kicker">${t3.kicker}</span>
                        <div class="gospel-section-banner">${t3.title}</div>
                        ${this.renderVerse(t3.verses[0])}
                        ${this.renderHighlightBlock(t3.body)}
                        ${this.renderVerse(t3.verses[1])}
                        ${this.renderInlineImage('assets/images/gospel/gospel_tract4.jpg', t3.title)}
                        ${this.renderHighlightBlock(t3.bridgeSummary, { soft: true, compact: true })}
                    </article>
                </section>

                <section class="gospel-flow" data-section="truth4">
                    <article class="gospel-flow-section">
                        <span class="gospel-kicker">${t4.kicker}</span>
                        <div class="gospel-section-banner">${t4.title}</div>
                        ${this.renderVerse(t4.verse)}
                        ${this.renderHighlightBlock(t4.formulaTitle, { compact: true })}
                        <div class="gospel-stack">
                            ${t4.formulas.map((formula, index) => `
                                <div class="gospel-formula-card ${index === 2 ? 'correct' : ''}">
                                    <p class="gospel-formula-copy">${formula}</p>
                                </div>
                            `).join('')}
                        </div>
                        ${this.renderHighlightBlock(t4.formulaAnswer, { soft: true, compact: true })}
                    </article>
                </section>

                <section class="gospel-card" data-section="prayer">
                    <span class="gospel-kicker">${copy.prayer.kicker}</span>
                    <h2 class="gospel-section-title">${copy.prayer.title}</h2>
                    <p class="gospel-body-copy">${copy.prayer.lead}</p>
                    <div class="gospel-prayer-card">
                        <p class="gospel-prayer-text">${copy.prayer.text}</p>
                    </div>
                    <div class="gospel-action-bar">
                        <div class="gospel-action-copy">
                            <p class="gospel-action-title">${copy.prayer.readyLabel}</p>
                            <p class="gospel-action-note">${copy.prayer.readyCopy}</p>
                        </div>
                        <div class="gospel-action-row">
                            <button type="button" class="gospel-action-btn secondary" onclick="GospelPresentation.openNotReady()">${copy.decisions.storySecondary}</button>
                            <button type="button" class="gospel-action-btn primary" onclick="GospelPresentation.openPrayer()">${copy.decisions.storyPrimary}</button>
                        </div>
                    </div>
                </section>

                <section class="gospel-simple-grid">
                    <article class="gospel-simple-card">
                        <span class="gospel-kicker">${copy.promises.kicker}</span>
                        <h2 class="gospel-section-title">${copy.promises.title}</h2>
                        <div class="gospel-list">
                            ${copy.promises.items.map((item) => `
                                <div class="gospel-verse">
                                    <div class="gospel-mini-title">${item.title}</div>
                                    <p class="gospel-verse-text">${item.text}</p>
                                    <div class="gospel-verse-ref">${item.ref}</div>
                                </div>
                            `).join('')}
                        </div>
                    </article>
                    <article class="gospel-simple-card">
                        <span class="gospel-kicker">${copy.nextSteps.kicker}</span>
                        <h2 class="gospel-section-title">${copy.nextSteps.title}</h2>
                        <div class="gospel-checklist">
                            ${copy.nextSteps.items.map((item) => `
                                <div class="gospel-mini-card">
                                    <div class="gospel-mini-title">•</div>
                                    <div class="gospel-mini-copy">${item}</div>
                                </div>
                            `).join('')}
                        </div>
                        <div class="gospel-footer-note">${copy.ui.footerNote}</div>
                    </article>
                </section>
            </div>
        `;
    },

    renderHighlightBlock(text, options = {}) {
        const { note = '', soft = false, compact = false } = options;
        return `
            <div class="gospel-highlight-block ${soft ? 'soft' : ''}">
                <p class="gospel-highlight-copy ${compact ? 'small' : ''}">${text}</p>
                ${note ? `<p class="gospel-highlight-note">${note}</p>` : ''}
            </div>
        `;
    },

    renderInlineImage(src, alt) {
        return `
            <div class="gospel-inline-image">
                <img src="${src}" alt="${alt}" onerror="this.parentElement.style.display='none'">
            </div>
        `;
    },

    renderPrayerView() {
        const copy = this.copy();
        return `
            <div class="gospel-panel-wrap">
                <div class="gospel-panel">
                    <span class="gospel-kicker">${copy.prayer.kicker}</span>
                    <h2 class="gospel-panel-title">${copy.decisions.prayerTitle}</h2>
                    <p class="gospel-panel-copy">${copy.prayer.lead}</p>
                    <div class="gospel-prayer-card">
                        <p class="gospel-prayer-text">${copy.prayer.text}</p>
                    </div>
                    <p class="gospel-panel-copy">${copy.decisions.prayerPrompt}</p>
                    <div class="gospel-panel-actions">
                        <button type="button" class="gospel-panel-btn secondary" onclick="GospelPresentation.handlePrayerResponse('no')">${copy.decisions.prayerSecondary}</button>
                        <button type="button" class="gospel-panel-btn primary" onclick="GospelPresentation.handlePrayerResponse('yes')">${copy.decisions.prayerPrimary}</button>
                        <button type="button" class="gospel-panel-btn secondary" onclick="GospelPresentation.backToStory()">${copy.decisions.backToStory}</button>
                    </div>
                </div>
            </div>
        `;
    },

    renderNotReadyView() {
        const copy = this.copy();
        return `
            <div class="gospel-panel-wrap">
                <div class="gospel-panel">
                    <span class="gospel-kicker">${copy.decisions.storySecondary}</span>
                    <h2 class="gospel-panel-title">${copy.decisions.notReadyTitle}</h2>
                    <p class="gospel-panel-copy">${copy.decisions.notReadyBody}</p>
                    <div class="gospel-panel-actions">
                        <button type="button" class="gospel-panel-btn secondary" onclick="GospelPresentation.backToStory()">${copy.decisions.backToStory}</button>
                        <button type="button" class="gospel-panel-btn primary" onclick="GospelPresentation.completeNotReady()">${copy.decisions.notReadyContinue}</button>
                    </div>
                </div>
            </div>
        `;
    },

    renderCelebrationView() {
        const copy = this.copy();
        return `
            <div class="gospel-panel-wrap">
                <div class="gospel-panel">
                    <span class="gospel-kicker">${copy.promises.kicker}</span>
                    <h2 class="gospel-panel-title">${copy.decisions.celebrationTitle}</h2>
                    <p class="gospel-panel-copy">${copy.decisions.celebrationBody}</p>
                    <div class="gospel-promise-grid">
                        ${copy.promises.items.map((item) => `
                            <div class="gospel-promise-card">
                                <div class="gospel-promise-title">${item.title}</div>
                                <div class="gospel-promise-text">${item.text}</div>
                                <div class="gospel-promise-ref">${item.ref}</div>
                            </div>
                        `).join('')}
                    </div>
                    <p class="gospel-panel-footnote">${copy.nextSteps.items.join(' ')}</p>
                    <div class="gospel-panel-actions">
                        <button type="button" class="gospel-panel-btn primary" onclick="GospelPresentation.complete()">${copy.decisions.celebrationButton}</button>
                    </div>
                </div>
            </div>
        `;
    },

    renderVerse(verse) {
        return `
            <div class="gospel-verse">
                <p class="gospel-verse-text">${verse.text}</p>
                <div class="gospel-verse-ref">${verse.ref}</div>
            </div>
        `;
    },

    jumpToSection(sectionId) {
        if (this.view !== 'story') {
            this.view = 'story';
            this.renderView();
        }

        const body = document.getElementById('gospelPresentationBody');
        const section = body?.querySelector(`[data-section="${sectionId}"]`);
        if (section) {
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    },

    openPrayer() {
        this.followUpDeclined = false;
        this.view = 'prayer';
        this.renderView();
    },

    openNotReady() {
        this.followUpDeclined = false;
        this.view = 'not-ready';
        this.renderView();
    },

    backToStory() {
        this.followUpDeclined = false;
        this.view = 'story';
        this.renderView();
    },

    async handleDecision(choice) {
        if (choice === 'not-ready') {
            this.openNotReady();
        } else {
            this.openPrayer();
        }
    },

    async completeNotReady() {
        localStorage.setItem('gospelViewed', 'true');

        if (this.followUpDeclined) {
            localStorage.setItem('gospelStatus', 'needs-followup');
        } else {
            localStorage.setItem('gospelStatus', 'not-ready');
            try {
                const user = window.auth?.currentUser;
                if (user && window.db) {
                    await window.db.collection('users').doc(user.uid).update({
                        'gospelDecision.notReadyAt': firebase.firestore.FieldValue.serverTimestamp(),
                        'gospelDecision.status': 'not-ready'
                    });
                }
            } catch (error) {
                console.error(error);
            }
        }

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
            } catch (error) {
                console.error(error);
            }

            localStorage.setItem('gospelStatus', 'needs-followup');
            this.followUpDeclined = true;
            this.view = 'not-ready';
            this.renderView();
            return;
        }

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
                    stage: 'disciple'
                });

                await window.db.collection('stats').doc('gospel').set({
                    savedCount: firebase.firestore.FieldValue.increment(1),
                    lastSavedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            }
        } catch (error) {
            console.error(error);
        }

        this.view = 'celebration';
        this.renderView();
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
        } catch (error) {
            console.error(error);
        }

        this.close();
        if (typeof NextStepsModal !== 'undefined') {
            setTimeout(() => NextStepsModal.open(), 500);
        }
    }
};

window.GospelPresentation = GospelPresentation;
