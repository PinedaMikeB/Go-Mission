/**
 * Gospel Presentation Content - Bilingual (English & Tagalog)
 * Used by gospel-presentation.js
 */

const GospelContent = {
    tl: {
        // INTRO
        intro: {
            title: 'Ang Daan Papuntang Langit',
            subtitle: 'Tuklasin mo ngayon kung gaano ka kamahal ng Diyos',
            description: 'Isang maikling paglalakbay na magbabago ng iyong buhay'
        },
        
        // TRUTH 1: GOD LOVES YOU
        truth1: {
            label: 'Unang Katotohanan',
            title: 'MAHAL KA NG DIYOS',
            subtitle: 'At may magandang plano Siya para sa iyo',
            verse: {
                text: '"Sapagkat gayon na lamang ang pag-ibig ng Diyos sa sangkatauhan, kaya\'t ibinigay niya ang kanyang kaisa-isang Anak, upang ang sinumang sumampalataya sa kanya ay hindi mapahamak, kundi magkaroon ng buhay na walang hanggan."',
                ref: 'Juan 3:16'
            },
            q1: {
                question: 'Paano pinatunayan ng Diyos na mahal ka Niya?',
                options: [
                    'Binigyan Niya ako ng magandang buhay',
                    'Pinayagan Niya akong mabuhay',
                    'Ibinigay Niya ang Kanyang Anak para sa akin'
                ],
                correctIndex: 2,
                correctFeedback: '🎉 Tama! Ibinigay ng Diyos ang Kanyang pinakamamahal na Anak para sa iyo!',
                wrongFeedback: 'Ang tamang sagot ay: <strong>Ibinigay Niya ang Kanyang Anak para sa akin.</strong>'
            },
            q2: {
                question: 'Ano ang gusto ng Diyos para sa iyo?',
                options: [
                    'Magandang trabaho at kayamanan',
                    'Buhay na walang hanggan',
                    'Relihiyon at ritwal'
                ],
                correctIndex: 1,
                correctFeedback: '🎉 Tama! Gusto ng Diyos na magkaroon ka ng BUHAY NA WALANG HANGGAN!',
                wrongFeedback: 'Ang tamang sagot ay: <strong>Buhay na walang hanggan.</strong> Ito ang regalo ng Diyos sa iyo!'
            },
            transition: {
                emoji: '🤔',
                title: 'Pero bakit...',
                text: 'Kung mahal tayo ng Diyos at gusto Niya tayong magkaroon ng buhay na walang hanggan...',
                highlight: 'Bakit hindi natin ito nararanasan?'
            }
        },
        
        // TRUTH 2: ALL HAVE SINNED
        truth2: {
            label: 'Pangalawang Katotohanan',
            intro: 'Kaya hindi natin nararanasan ang buhay na walang hanggan ay dahil...',
            title: 'LAHAT TAYO AY MAKASALANAN',
            subtitle: 'Nahiwalay tayo sa Diyos',
            verse1: {
                text: '"Sapagkat ang lahat ay nagkasala, at hindi nakakaabot sa kaluwalhatian ng Diyos."',
                ref: 'Roma 3:23'
            },
            q1: {
                question: 'Sino ang nagkasala?',
                options: [
                    'Ang masasamang tao lamang',
                    'Ang lahat ng tao',
                    'Ang mga hindi relihiyoso'
                ],
                correctIndex: 1,
                correctFeedback: '🎉 Tama! LAHAT tayo ay nagkasala - walang sinumang perpekto.',
                wrongFeedback: 'Ang tamang sagot ay: <strong>Ang lahat ng tao.</strong>'
            },
            transition1: {
                emoji: '⚠️',
                title: 'May Kabayaran',
                text: 'Hindi lang tayo nahiwalay sa Diyos dahil makasalanan tayo...',
                highlight: 'Ang ating kasalanan ay may kabayaran.'
            },
            verse2: {
                text: '"Sapagkat ang kabayaran ng kasalanan ay kamatayan..."',
                ref: 'Roma 6:23a'
            },
            q2: {
                question: 'Ano ang kabayaran ng kasalanan?',
                options: [
                    'Kahirapan sa buhay',
                    'Kamatayan',
                    'Kaparusahan sa lupa'
                ],
                correctIndex: 1,
                correctFeedback: '🎉 Tama! Ang kabayaran ng kasalanan ay KAMATAYAN.',
                wrongFeedback: 'Ang tamang sagot ay: <strong>Kamatayan.</strong>'
            },
            transition2: {
                emoji: '🤔',
                title: 'Pero sandali...',
                text: 'Kung kamatayan ang kabayaran ng kasalanan, bakit buhay pa ako?',
                highlight: 'May dalawang uri ng kamatayan.'
            },
            twoDeaths: {
                intro: 'Hindi pisikal na kamatayan ang tinutukoy ng Bibliya...',
                physical: 'Pisikal',
                physicalSub: 'Katawan',
                spiritual: 'Espirituwal',
                spiritualSub: 'Kaluluwa',
                explanation: 'Ang tinutukoy ay <strong class="text-[var(--mission-gold)]">espirituwal na kamatayan</strong>.',
                next: 'Basahin natin ang susunod na talata...'
            },
            verse3: {
                text: '"Subalit para naman sa mga duwag, mga taksil, mga gumagawa ng mga kasuklam-suklam na bagay, mga mamamatay-tao, mga nakikiapid, mga mangkukulam, mga sumasamba sa diyus-diyosan, at sa lahat ng mga sinungaling—ang magiging bahagi nila\'y sa lawa ng nagliliyab na apoy at asupre. Ito ang pangalawang kamatayan."',
                ref: 'Pahayag 21:8'
            },
            q3: {
                question: 'Saan ang pangalawang kamatayan?',
                options: [
                    'Sa libingan',
                    'Sa kalungkutan',
                    'Sa lawa ng nagliliyab na apoy at asupre'
                ],
                correctIndex: 2,
                correctFeedback: '🎉 Tama! Ang pangalawang kamatayan ay sa lawa ng apoy - ito ang impyerno.',
                wrongFeedback: 'Ang tamang sagot ay: <strong>Sa lawa ng nagliliyab na apoy at asupre.</strong> Ito ang impyerno.'
            }
        },
        
        // TRUTH 3: HUMAN EFFORTS FAIL / JESUS IS THE WAY
        truth3: {
            label: 'Maling Isipin Patungkol sa Kaligtasan',
            intro: 'Dahil patay tayo sa espiritu, iniisip ng mga tao na maaari nilang bilhin o pagsikapan ang daan patungong langit...',
            verseHumanEffort: {
                text: '"Mayroong daang tila matuwid sa paningin ng tao, ngunit ang dulo nito ay kamatayan."',
                ref: 'Kawikaan 14:12'
            },
            humanEfforts: {
                intro: 'Sinusubukan ng mga tao ang mga ito:',
                items: ['📜 Sampung Utos', '⛪ Relihiyon', '🤝 Mabuting Gawa', '🕯️ Ritwal'],
                fail: '❌ Wala sa mga ito ang makakabayad sa kasalanan.',
                explanation: 'Ang kabayaran ng kasalanan ay kamatayan - hindi mabuting gawa.'
            },
            transition: {
                emoji: '❓',
                title: 'Kaya paano?',
                text: 'Kung lahat tayo ay makasalanan, at hindi tayo maaaring maging perpekto...',
                highlight: 'Paano tayo maliligtas?'
            },
            title: 'SI HESUS ANG TANGING DAAN',
            subtitle: 'Siya lang ang tulay patungo sa Diyos',
            verse1: {
                text: '"Ako ang daan, ang katotohanan, at ang buhay. Walang makakapunta sa Ama kundi sa pamamagitan ko."',
                ref: 'Juan 14:6'
            },
            q1: {
                question: 'Sino ang TANGING daan patungo sa Diyos?',
                options: [
                    'Ang mga santo at banal',
                    'Ang mga pari at pastor',
                    'Si Hesus lamang'
                ],
                correctIndex: 2,
                correctFeedback: '🎉 Tama! Si Hesus LANG ang daan patungo sa Ama.',
                wrongFeedback: 'Ang tamang sagot ay: <strong>Si Hesus lamang.</strong>'
            },
            transition2: {
                emoji: '❓',
                title: 'Pero bakit?',
                text: 'Bakit si Hesus LANG ang daan patungong langit?',
                highlight: 'Ano ang ginawa Niya para sa atin?'
            },
            verse2: {
                text: '"Sapagkat si Kristo ay namatay para sa mga kasalanan, minsan at magpakailanman, ang matuwid para sa mga hindi matuwid, upang madala niya kayo sa Diyos."',
                ref: '1 Pedro 3:18'
            },
            q2: {
                question: 'Bakit namatay si Hesus sa krus?',
                options: [
                    'Dahil siya ay makasalanan din',
                    'Para bayaran ang ating kasalanan',
                    'Dahil natalo siya ng kaaway'
                ],
                correctIndex: 1,
                correctFeedback: '🎉 Tama! Si Hesus ay namatay para bayaran ang ating mga kasalanan!',
                wrongFeedback: 'Ang tamang sagot ay: <strong>Para bayaran ang ating kasalanan.</strong>'
            },
            transition3: {
                emoji: '🤔',
                title: 'Kung ganoon...',
                text: 'Kung binayaran na ni Hesus ang lahat ng aking kasalanan, ligtas na ba ako?',
                highlight: 'Hindi pa. Kailangan mong ilagay ang iyong pananampalataya kay Hesus.'
            }
        },
        
        // TRUTH 4: BELIEVE TO BE SAVED
        truth4: {
            label: 'Pang-apat na Katotohanan',
            title: 'SUMAMPALATAYA PARA MALIGTAS',
            subtitle: 'Ang kaligtasan ay regalo - tanggapin mo lang',
            verse: {
                text: '"Sapagkat dahil sa kagandahang-loob ng Diyos kayo ay naligtas sa pamamagitan ng pananampalataya; at ito\'y kaloob ng Diyos at hindi mula sa inyong sarili; hindi ito bunga ng inyong mga gawa kaya\'t walang maipagmamalaki ang sinuman."',
                ref: 'Efeso 2:8-9'
            },
            formulaQ: {
                question: 'Kung ilalagay sa formula ang kaligtasan ayon sa Efeso 2:8-9, ano dito sa mga sumusunod ang tama?',
                options: [
                    'Pananampalataya + Mabuting Gawa = Kaligtasan',
                    'Pananampalataya + Sampung Utos = Kaligtasan',
                    'Pananampalataya + Wala = Kaligtasan'
                ],
                correctIndex: 2,
                correctFeedback: '🎉 Tama! Pananampalataya + Wala = Kaligtasan. Ang kaligtasan ay regalo ng Diyos - tanggapin mo lang sa pamamagitan ng pananampalataya!',
                wrongExplanation: `
                    <p class="italic text-[var(--text-muted)] mb-2">"Sapagkat dahil sa kagandahang-loob ng Diyos kayo ay naligtas sa pamamagitan ng pananampalataya; at ito'y kaloob ng Diyos at hindi mula sa inyong sarili; hindi ito bunga ng inyong mga gawa kaya't walang maipagmamalaki ang sinuman."</p>
                    <p class="text-[var(--mission-gold)] text-right text-xs mb-3">— Efeso 2:8-9</p>
                    <p class="mb-2">Ayon sa talata, ang kaligtasan ay <strong>hindi bunga ng mabubuting gawa</strong> kaya ang Letter A at B ay hindi tama.</p>
                    <p class="mb-2">Pangalawa, ayon sa talata <strong>hindi ito mula sa sarili kundi ito ay kaloob ng Diyos</strong>. Ang kaligtasan ay regalo ng Diyos at hindi binabayaran ng pagsunod sa sampung utos, pagsali sa relihiyon o paggawa ng mabuting gawa.</p>
                    <p class="mb-2">Ang kaligtasan ay tinatanggap lamang natin mula sa <strong>kagandahang-loob ng Diyos (grace)</strong>.</p>
                    <p class="text-[var(--mission-gold)] font-bold">Kaya ang tamang sagot ay Letter C - Pananampalataya + Wala = Kaligtasan.</p>
                    <p class="text-[var(--text-muted)] mt-2 text-xs">Ang paggawa ng mabuti at pagsunod sa utos ng Diyos ay mabuti pero hindi natin ito babasehan ng Diyos para sa ating kaligtasan kundi ang ginawa lamang ng Panginoong Hesus para sa atin.</p>
                `
            }
        },
        
        // DECISION
        decision: {
            question: 'Nais mo bang ilagay ang pananampalataya mo sa Panginoong Hesus ngayon?',
            summary: 'Ayon sa Bibliya:',
            points: [
                'Mahal ka ng Diyos',
                'Lahat tayo ay nagkasala',
                'Hindi sapat ang sariling sikap',
                'Si Hesus ang tanging daan',
                'Kailangan mong ilagay ang pananampalataya sa Panginoong Hesus'
            ],
            notReadyBtn: 'Hindi pa ako handa',
            yesBtn: 'Oo, ibibigay ko na ang aking buhay sa Kanya'
        },
        
        // NOT READY
        notReady: {
            title: 'Naiintindihan ko na hindi ka pa handa.',
            message1: 'Ipagpatuloy mo ang paghahanap mo sa Diyos.',
            message2: '📖 Basahin mo ang Bibliya araw-araw mula dito sa ating app.',
            message3: 'At kung nais mo nang isuko ang buhay mo sa Kanya, bumalik ka ulit dito sa ating <strong class="text-[var(--mission-gold)]">"Pagkilala sa Pagmamahal ng Diyos"</strong>.',
            continueBtn: 'Magpatuloy →'
        },
        
        // PRAYER
        prayer: {
            intro: 'Ipahayag mo ang iyong pananampalataya sa Panginoong Hesus',
            introSub: 'Sabihin mo ito sa Kanya ng may buong pananampalataya...',
            title: 'Panalangin ng Pagtanggap',
            instruction: 'Basahin at ipanalangin nang buong puso:',
            text: '"Panginoong Hesus, Inaamin ko po na ako ay makasalanan. Patawarin Niyo po ako. Nananampalataya po ako na Ikaw ang nagbayad ng aking kasalanan sa krus. Ngayon nga ay binubuksan ko na ang aking puso. Pumasok Ka at manahan sa akin. Tinatanggap Kita bilang aking Panginoon at Tagapagligtas. Salamat sapagkat balang araw ay makakasama Kita sa langit. Simula ngayon ay tatalikdan ko ang aking kasalanan. Sinusuko ko na ang aking buhay sa Iyo. Amen."',
            confirmQ: 'Tinanggap mo ba ang Panginoong Hesus?',
            noBtn: 'Hindi',
            yesBtn: 'Oo, tinanggap ko!'
        },
        
        // CELEBRATION
        celebration: {
            title: 'CONGRATULATIONS!',
            subtitle: 'Welcome sa Pamilya ng Diyos!',
            message: 'Ang pagtanggap mo kay Hesus ang pinakamahalagang desisyon sa iyong buhay.',
            promisesIntro: 'Narito ang mga pangako mismo ng Diyos mula sa Kanyang Salita para sa iyo:'
        },
        
        // PROMISES
        promise1: {
            label: 'Pangako #1',
            title: 'IKAW AY ANAK NA NG DIYOS',
            verse: '"Subalit ang lahat ng tumanggap at sumampalataya sa kanya ay binigyan niya ng karapatang maging mga anak ng Diyos."',
            ref: '— Juan 1:12'
        },
        promise2: {
            label: 'Pangako #2',
            title: 'MAYROON KA NA NG BUHAY NA WALANG HANGGAN',
            verse: '"At ito ang patotoo: ipinagkaloob sa atin ng Diyos ang buhay na walang hanggan at ito\'y makakamtan natin sa pamamagitan ng kanyang Anak. Kung ang Anak ng Diyos ay nasa isang tao, mayroon siyang buhay na walang hanggan; ngunit kung wala sa kanya ang Anak ng Diyos ay wala siyang buhay na walang hanggan. Isinusulat ko ito sa inyo upang malaman ninyo na kayong sumasampalataya sa Anak ng Diyos ay may buhay na walang hanggan."',
            ref: '— 1 Juan 5:11-13'
        },
        promise3: {
            label: 'Pangako #3',
            title: 'IKAW AY ISA NANG BAGONG NILALANG',
            verse: '"Kaya\'t kung nakipag-isa na kay Cristo ang sinuman, isa na siyang bagong nilalang. Wala na ang dati niyang pagkatao; binago na siya."',
            ref: '— 2 Corinto 5:17',
            footer: 'Ang luma ay lumipas na. Magsimula ka nang lumakad sa iyong bagong buhay kasama si Lord!'
        },
        
        // FINAL
        final: {
            title: 'Ang Buhay na Mayroon Ka Ngayon ay Umpisa Pa Lang!',
            message1: 'Bilang bagong anak ng Diyos, nais Niya na ikaw ay lumago at makilala pa Siya nang lubusan. Hindi lang ito isang one-time event; ito ay simula ng isang relasyon. At gaya ng anumang relasyon, kailangan dito ang',
            keyword: 'komunikasyon',
            question: 'Pero paano nga ba ito gawin?',
            stepsTitle: 'Narito ang iyong next step:',
            step1: '1. Bumalik sa Home screen ng app na ito.',
            step2: '2. Pindutin ang button na "Humakbang Ngayon".',
            step3: '3. Piliin ang "Makipag-usap sa Diyos araw-araw".',
            footer: 'Dito, tuturuan ka namin kung paano magkaroon ng Conversation Time with God. Malalaman mo kung paano magbasa ng Bible at manalangin sa paraang simple at personal.',
            excited: 'Excited na ang Diyos na makipag-usap sa\'yo araw-araw!',
            button: 'BUMALIK SA HOME →'
        },
        
        // UI
        ui: {
            back: '← Back',
            next: 'Next →',
            continue: 'Continue →'
        }
    },
    
    en: {
        // INTRO
        intro: {
            title: 'The Way to Heaven',
            subtitle: 'Discover now how much God loves you',
            description: 'A short journey that will change your life'
        },
        
        // TRUTH 1: GOD LOVES YOU
        truth1: {
            label: 'First Truth',
            title: 'GOD LOVES YOU',
            subtitle: 'And He has a wonderful plan for your life',
            verse: {
                text: '"For God so loved the world, that he gave his only Son, that whoever believes in him should not perish but have eternal life."',
                ref: 'John 3:16'
            },
            q1: {
                question: 'How did God prove His love for you?',
                options: [
                    'He gave me a good life',
                    'He allowed me to live',
                    'He gave His Son for me'
                ],
                correctIndex: 2,
                correctFeedback: '🎉 Correct! God gave His beloved Son for you!',
                wrongFeedback: 'The correct answer is: <strong>He gave His Son for me.</strong>'
            },
            q2: {
                question: 'What does God want for you?',
                options: [
                    'A good job and wealth',
                    'Eternal life',
                    'Religion and rituals'
                ],
                correctIndex: 1,
                correctFeedback: '🎉 Correct! God wants you to have ETERNAL LIFE!',
                wrongFeedback: 'The correct answer is: <strong>Eternal life.</strong> This is God\'s gift to you!'
            },
            transition: {
                emoji: '🤔',
                title: 'But why...',
                text: 'If God loves us and wants us to have eternal life...',
                highlight: 'Why don\'t we experience it?'
            }
        },
        
        // TRUTH 2: ALL HAVE SINNED
        truth2: {
            label: 'Second Truth',
            intro: 'The reason we don\'t experience eternal life is because...',
            title: 'ALL HAVE SINNED',
            subtitle: 'We are separated from God',
            verse1: {
                text: '"For all have sinned and fall short of the glory of God."',
                ref: 'Romans 3:23'
            },
            q1: {
                question: 'Who has sinned?',
                options: [
                    'Only bad people',
                    'All people',
                    'Only non-religious people'
                ],
                correctIndex: 1,
                correctFeedback: '🎉 Correct! ALL of us have sinned - no one is perfect.',
                wrongFeedback: 'The correct answer is: <strong>All people.</strong>'
            },
            transition1: {
                emoji: '⚠️',
                title: 'There\'s a Price',
                text: 'We\'re not just separated from God because we\'re sinners...',
                highlight: 'Our sin has a price to pay.'
            },
            verse2: {
                text: '"For the wages of sin is death..."',
                ref: 'Romans 6:23a'
            },
            q2: {
                question: 'What is the payment for sin?',
                options: [
                    'Hardship in life',
                    'Death',
                    'Punishment on earth'
                ],
                correctIndex: 1,
                correctFeedback: '🎉 Correct! The payment for sin is DEATH.',
                wrongFeedback: 'The correct answer is: <strong>Death.</strong>'
            },
            transition2: {
                emoji: '🤔',
                title: 'But wait...',
                text: 'If death is the payment for sin, why am I still alive?',
                highlight: 'There are two kinds of death.'
            },
            twoDeaths: {
                intro: 'The Bible isn\'t talking about physical death...',
                physical: 'Physical',
                physicalSub: 'Body',
                spiritual: 'Spiritual',
                spiritualSub: 'Soul',
                explanation: 'It\'s referring to <strong class="text-[var(--mission-gold)]">spiritual death</strong>.',
                next: 'Let\'s read the next verse...'
            },
            verse3: {
                text: '"But as for the cowardly, the faithless, the detestable, as for murderers, the sexually immoral, sorcerers, idolaters, and all liars, their portion will be in the lake that burns with fire and sulfur, which is the second death."',
                ref: 'Revelation 21:8'
            },
            q3: {
                question: 'Where is the second death?',
                options: [
                    'In the grave',
                    'In sadness',
                    'In the lake of fire and sulfur'
                ],
                correctIndex: 2,
                correctFeedback: '🎉 Correct! The second death is in the lake of fire - this is hell.',
                wrongFeedback: 'The correct answer is: <strong>In the lake of fire and sulfur.</strong> This is hell.'
            }
        },
        
        // TRUTH 3: HUMAN EFFORTS FAIL / JESUS IS THE WAY
        truth3: {
            label: 'Wrong Thinking About Salvation',
            intro: 'Because we are spiritually dead, people think they can buy or work their way to heaven...',
            verseHumanEffort: {
                text: '"There is a way that seems right to a man, but its end is the way to death."',
                ref: 'Proverbs 14:12'
            },
            humanEfforts: {
                intro: 'People try these things:',
                items: ['📜 Ten Commandments', '⛪ Religion', '🤝 Good Works', '🕯️ Rituals'],
                fail: '❌ None of these can pay for sin.',
                explanation: 'The payment for sin is death - not good works.'
            },
            transition: {
                emoji: '❓',
                title: 'So how?',
                text: 'If we\'re all sinners and can\'t be perfect...',
                highlight: 'How can we be saved?'
            },
            title: 'JESUS IS THE ONLY WAY',
            subtitle: 'He alone is the bridge to God',
            verse1: {
                text: '"I am the way, and the truth, and the life. No one comes to the Father except through me."',
                ref: 'John 14:6'
            },
            q1: {
                question: 'Who is the ONLY way to God?',
                options: [
                    'Saints and holy people',
                    'Priests and pastors',
                    'Jesus alone'
                ],
                correctIndex: 2,
                correctFeedback: '🎉 Correct! Jesus ALONE is the way to the Father.',
                wrongFeedback: 'The correct answer is: <strong>Jesus alone.</strong>'
            },
            transition2: {
                emoji: '❓',
                title: 'But why?',
                text: 'Why is Jesus the ONLY way to heaven?',
                highlight: 'What did He do for us?'
            },
            verse2: {
                text: '"For Christ also suffered once for sins, the righteous for the unrighteous, that he might bring us to God."',
                ref: '1 Peter 3:18'
            },
            q2: {
                question: 'Why did Jesus die on the cross?',
                options: [
                    'Because he was also a sinner',
                    'To pay for our sins',
                    'Because he was defeated by the enemy'
                ],
                correctIndex: 1,
                correctFeedback: '🎉 Correct! Jesus died to pay for our sins!',
                wrongFeedback: 'The correct answer is: <strong>To pay for our sins.</strong>'
            },
            transition3: {
                emoji: '🤔',
                title: 'So then...',
                text: 'If Jesus already paid for all my sins, am I already saved?',
                highlight: 'Not yet. You need to put your faith in Jesus.'
            }
        },
        
        // TRUTH 4: BELIEVE TO BE SAVED
        truth4: {
            label: 'Fourth Truth',
            title: 'BELIEVE TO BE SAVED',
            subtitle: 'Salvation is a gift - just receive it',
            verse: {
                text: '"For by grace you have been saved through faith. And this is not your own doing; it is the gift of God, not a result of works, so that no one may boast."',
                ref: 'Ephesians 2:8-9'
            },
            formulaQ: {
                question: 'According to Ephesians 2:8-9, which formula for salvation is correct?',
                options: [
                    'Faith + Good Works = Salvation',
                    'Faith + Ten Commandments = Salvation',
                    'Faith + Nothing = Salvation'
                ],
                correctIndex: 2,
                correctFeedback: '🎉 Correct! Faith + Nothing = Salvation. Salvation is God\'s gift - just receive it through faith!',
                wrongExplanation: `
                    <p class="italic text-[var(--text-muted)] mb-2">"For by grace you have been saved through faith. And this is not your own doing; it is the gift of God, not a result of works, so that no one may boast."</p>
                    <p class="text-[var(--mission-gold)] text-right text-xs mb-3">— Ephesians 2:8-9</p>
                    <p class="mb-2">According to this verse, salvation is <strong>not a result of works</strong>, so options A and B are incorrect.</p>
                    <p class="mb-2">Second, the verse says <strong>it is not your own doing; it is the gift of God</strong>. Salvation is God's gift and cannot be earned by following the Ten Commandments, joining a religion, or doing good works.</p>
                    <p class="mb-2">Salvation is received only through <strong>God's grace</strong>.</p>
                    <p class="text-[var(--mission-gold)] font-bold">Therefore, the correct answer is C - Faith + Nothing = Salvation.</p>
                    <p class="text-[var(--text-muted)] mt-2 text-xs">Doing good and following God's commands are good things, but they are not the basis for our salvation - only what Jesus did for us matters.</p>
                `
            }
        },
        
        // DECISION
        decision: {
            question: 'Do you want to put your faith in the Lord Jesus now?',
            summary: 'According to the Bible:',
            points: [
                'God loves you',
                'All have sinned',
                'Our own efforts are not enough',
                'Jesus is the only way',
                'You need to put your faith in the Lord Jesus'
            ],
            notReadyBtn: 'I\'m not ready yet',
            yesBtn: 'Yes, I will give my life to Him'
        },
        
        // NOT READY
        notReady: {
            title: 'I understand that you\'re not ready yet.',
            message1: 'Continue seeking God.',
            message2: '📖 Read the Bible daily using this app.',
            message3: 'And when you\'re ready to surrender your life to Him, come back to <strong class="text-[var(--mission-gold)]">"Discover God\'s Love"</strong>.',
            continueBtn: 'Continue →'
        },
        
        // PRAYER
        prayer: {
            intro: 'Declare your faith in the Lord Jesus',
            introSub: 'Say this to Him with all your heart...',
            title: 'Prayer of Acceptance',
            instruction: 'Read and pray with all your heart:',
            text: '"Lord Jesus, I admit that I am a sinner. Please forgive me. I believe that You paid for my sins on the cross. Right now, I open my heart. Come in and dwell in me. I receive You as my Lord and Savior. Thank You that one day I will be with You in heaven. From now on, I will turn away from my sin. I surrender my life to You. Amen."',
            confirmQ: 'Did you receive the Lord Jesus?',
            noBtn: 'No',
            yesBtn: 'Yes, I received Him!'
        },
        
        // CELEBRATION
        celebration: {
            title: 'CONGRATULATIONS!',
            subtitle: 'Welcome to God\'s Family!',
            message: 'Receiving Jesus is the most important decision of your life.',
            promisesIntro: 'Here are God\'s promises from His Word for you:'
        },
        
        // PROMISES
        promise1: {
            label: 'Promise #1',
            title: 'YOU ARE NOW A CHILD OF GOD',
            verse: '"But to all who did receive him, who believed in his name, he gave the right to become children of God."',
            ref: '— John 1:12'
        },
        promise2: {
            label: 'Promise #2',
            title: 'YOU NOW HAVE ETERNAL LIFE',
            verse: '"And this is the testimony, that God gave us eternal life, and this life is in his Son. Whoever has the Son has life; whoever does not have the Son of God does not have life. I write these things to you who believe in the name of the Son of God, that you may know that you have eternal life."',
            ref: '— 1 John 5:11-13'
        },
        promise3: {
            label: 'Promise #3',
            title: 'YOU ARE A NEW CREATION',
            verse: '"Therefore, if anyone is in Christ, he is a new creation. The old has passed away; behold, the new has come."',
            ref: '— 2 Corinthians 5:17',
            footer: 'The old is gone. Start walking in your new life with the Lord!'
        },
        
        // FINAL
        final: {
            title: 'This is Just the Beginning!',
            message1: 'As a new child of God, He wants you to grow and know Him more deeply. This is not a one-time event; it\'s the start of a relationship. And like any relationship, it requires',
            keyword: 'communication',
            question: 'But how do you do this?',
            stepsTitle: 'Here are your next steps:',
            step1: '1. Go back to the Home screen of this app.',
            step2: '2. Tap the "Take the Next Step" button.',
            step3: '3. Choose "Talk to God Daily".',
            footer: 'There, we\'ll teach you how to have Conversation Time with God. You\'ll learn how to read the Bible and pray in a simple and personal way.',
            excited: 'God is excited to talk to you every day!',
            button: 'BACK TO HOME →'
        },
        
        // UI
        ui: {
            back: '← Back',
            next: 'Next →',
            continue: 'Continue →'
        }
    },
    
    /**
     * Get content for current language
     */
    get(key) {
        const lang = this.getLang();
        console.log('[GospelContent] get() lang:', lang, 'key:', key);
        const keys = key.split('.');
        let value = this[lang];
        for (const k of keys) {
            value = value?.[k];
        }
        return value || this.tl[key] || key;
    },
    
    /**
     * Get current language
     */
    getLang() {
        // Check multiple sources for language
        if (window.i18n && window.i18n.currentLang) {
            console.log('[GospelContent] getLang from i18n:', window.i18n.currentLang);
            return window.i18n.currentLang;
        }
        // Fallback to localStorage
        const stored = localStorage.getItem('goMission_language');
        if (stored) {
            console.log('[GospelContent] getLang from localStorage:', stored);
            return stored;
        }
        // Default to Tagalog
        console.log('[GospelContent] getLang default: tl');
        return 'tl';
    },
    
    /**
     * Check if current language is English
     */
    isEnglish() {
        return this.getLang() === 'en';
    }
};

window.GospelContent = GospelContent;
