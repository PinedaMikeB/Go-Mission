/**
 * Go Mission - Discipleship Quotes & Verses
 * Randomly displayed on My Mission and My Training cards
 */

const DiscipleshipContent = {
    // Mission quotes (for My Mission card)
    missionVerses: [
        { verse: "Matthew 28:19-20", text: "Go therefore and make disciples of all nations..." },
        { verse: "2 Timothy 2:2", text: "And the things you have heard me say in the presence of many witnesses entrust to reliable people who will also be qualified to teach others." },
        { verse: "Matthew 4:19", text: "Follow me, and I will make you fishers of men." },
        { verse: "John 15:8", text: "This is to my Father's glory, that you bear much fruit, showing yourselves to be my disciples." },
        { verse: "Mark 16:15", text: "Go into all the world and preach the gospel to all creation." },
        { verse: "Acts 1:8", text: "You will be my witnesses in Jerusalem, and in all Judea and Samaria, and to the ends of the earth." },
        { verse: "John 13:35", text: "By this everyone will know that you are my disciples, if you love one another." },
        { verse: "Colossians 1:28", text: "We proclaim him, admonishing and teaching everyone with all wisdom, so that we may present everyone fully mature in Christ." },
        { verse: "1 Corinthians 11:1", text: "Follow my example, as I follow the example of Christ." },
        { verse: "Proverbs 27:17", text: "As iron sharpens iron, so one person sharpens another." },
        { verse: "Hebrews 10:24-25", text: "Let us consider how we may spur one another on toward love and good deeds, not giving up meeting together." },
        { verse: "Ephesians 4:11-12", text: "He gave some as apostles, prophets, evangelists, pastors and teachers, to equip his people for works of service." }
    ],
    
    // Training quotes (for My Training card)
    trainingVerses: [
        { verse: "2 Timothy 3:16-17", text: "All Scripture is God-breathed and is useful for teaching, rebuking, correcting and training in righteousness." },
        { verse: "Proverbs 22:6", text: "Train up a child in the way he should go; even when he is old he will not depart from it." },
        { verse: "Joshua 1:8", text: "Keep this Book of the Law always on your lips; meditate on it day and night." },
        { verse: "Psalm 119:105", text: "Your word is a lamp to my feet and a light to my path." },
        { verse: "Romans 12:2", text: "Be transformed by the renewing of your mind, that you may prove what is the good and acceptable and perfect will of God." },
        { verse: "Hebrews 5:14", text: "Solid food is for the mature, who by constant use have trained themselves to distinguish good from evil." },
        { verse: "1 Timothy 4:7-8", text: "Train yourself to be godly. For physical training is of some value, but godliness has value for all things." },
        { verse: "Philippians 4:9", text: "Whatever you have learned or received or heard from me, or seen in me—put it into practice." },
        { verse: "James 1:22", text: "Do not merely listen to the word, and so deceive yourselves. Do what it says." },
        { verse: "Psalm 1:2-3", text: "Blessed is the one whose delight is in the law of the Lord, and who meditates on his law day and night." },
        { verse: "Isaiah 28:10", text: "Precept upon precept, line upon line, here a little, there a little." },
        { verse: "Ezra 7:10", text: "Ezra had devoted himself to the study and observance of the Law of the Lord, and to teaching its decrees." }
    ],
    
    // Get random mission verse for the day (consistent per day)
    getMissionVerse() {
        const today = new Date().toDateString();
        const stored = localStorage.getItem('missionVerseDate');
        const storedIndex = localStorage.getItem('missionVerseIndex');
        
        if (stored === today && storedIndex !== null) {
            return this.missionVerses[parseInt(storedIndex)];
        }
        
        const index = Math.floor(Math.random() * this.missionVerses.length);
        localStorage.setItem('missionVerseDate', today);
        localStorage.setItem('missionVerseIndex', index.toString());
        return this.missionVerses[index];
    },
    
    // Get random training verse for the day (consistent per day)
    getTrainingVerse() {
        const today = new Date().toDateString();
        const stored = localStorage.getItem('trainingVerseDate');
        const storedIndex = localStorage.getItem('trainingVerseIndex');
        
        if (stored === today && storedIndex !== null) {
            return this.trainingVerses[parseInt(storedIndex)];
        }
        
        const index = Math.floor(Math.random() * this.trainingVerses.length);
        localStorage.setItem('trainingVerseDate', today);
        localStorage.setItem('trainingVerseIndex', index.toString());
        return this.trainingVerses[index];
    }
};

// Make available globally
window.DiscipleshipContent = DiscipleshipContent;
