/**
 * Go Mission - Internationalization (i18n) Module
 * Handles language switching between English and Taglish modes
 * 
 * Taglish Mode:
 * - UI Labels: English (mostly)
 * - Bible Text: Tagalog (Ang Dating Biblia 1905)
 * - Commentary: Tagalog (translated)
 * - Journey Labels: Tagalog
 * 
 * English Mode:
 * - UI Labels: English
 * - Bible Text: English (BSB)
 * - Commentary: English (Matthew Henry)
 * - Journey Labels: English
 */

const i18n = {
  // Current language mode: 'en' or 'tl'
  currentLang: 'tl',
  
  // Storage key
  STORAGE_KEY: 'goMission_language',
  
  // UI Translations
  translations: {
    en: {
      // Journey Card
      myJourney: 'My Journey',
      whereGodHasYou: 'WHERE GOD HAS YOU TODAY',
      next: 'Next:',
      viewNextSteps: 'View Next Steps',
      
      // Journey Stages
      stages: {
        seeker: { label: 'On The<br>Journey', name: 'ON THE JOURNEY' },
        disciple: { label: 'Disciple', name: 'DISCIPLE' },
        'disciple-maker': { label: 'Disciple-<br>Maker', name: 'DISCIPLE-MAKER' },
        builder: { label: 'Builder', name: 'BUILDER' },
        multiplier: { label: 'Multiplier', name: 'MULTIPLIER' }
      },
      
      // Devotion Card
      myDayWithTheLord: 'My Day with the Lord',
      tapToHighlight: 'Tap verses to highlight',
      helpMeUnderstand: 'Help me understand',
      reflect: 'Reflect',
      writeReflection: 'Write your reflection here...',
      shareWithGroup: 'Share with my group',
      shareExplanation: 'Your Conversation Time reflections help your leader walk with you. This is not a score — it\'s a way to care for one another.',
      saveThisDay: '💾 Save This Day',
      saved: '✓ Saved - Update',
      saving: 'Saving...',
      thisWeek: 'This week:',
      days: 'days',
      
      // Mission Group
      missionGroup: 'Mission Group',
      weeklyMeeting: 'Weekly Meeting',
      bibleStudy: 'Bible Study',
      shareAndPray: 'Share & Pray',
      accountability: 'Accountability',
      chatWithGroup: '💬 Chat with Group',
      
      // Mission Training
      missionTraining: 'Mission Training',
      phaseRequirement: 'PHASE REQUIREMENT:',
      
      // Leader Dashboard
      leaderDashboard: 'Leader Dashboard',
      adminMode: 'Admin Mode',
      missionGroups: 'Mission Groups',
      activeDisciples: 'Active Disciples',
      newRecruits: 'New Recruits',
      buildersDeveloped: 'Builders Developed',
      
      // Navigation
      journey: 'Journey',
      group: 'Group',
      training: 'Training',
      dash: 'Dash',
      
      // General
      signOut: 'Sign out',
      loading: 'Loading...'
    },
    tl: {
      // Journey Card
      myJourney: 'Aking Paglalakbay',
      whereGodHasYou: 'KUNG SAAN KA NILALAGAY NG DIYOS NGAYON',
      next: 'Susunod:',
      viewNextSteps: 'Tingnan ang Mga Susunod na Hakbang',
      
      // Journey Stages
      stages: {
        seeker: { label: 'Nasa<br>Paglalakbay', name: 'NASA PAGLALAKBAY' },
        disciple: { label: 'Alagad', name: 'ALAGAD' },
        'disciple-maker': { label: 'Tagapag-<br>hubog', name: 'TAGAPAGHUBOG NG ALAGAD' },
        builder: { label: 'Tagapag-<br>tayo', name: 'TAGAPAGTAYO' },
        multiplier: { label: 'Tagapag-<br>parami', name: 'TAGAPAGPARAMI' }
      },
      
      // Devotion Card
      myDayWithTheLord: 'Araw Ko sa Panginoon',
      tapToHighlight: 'I-tap ang mga talata para i-highlight',
      helpMeUnderstand: 'Tulungan akong maintindihan',
      reflect: 'Pagnilayan',
      writeReflection: 'Isulat ang iyong pagninilay dito...',
      shareWithGroup: 'Ibahagi sa aking grupo',
      shareExplanation: 'Ang mga pagninilay mo ay tumutulong sa iyong leader na makasamang lumakad. Hindi ito score — ito ay paraan para maalagaan ang isa\'t isa.',
      saveThisDay: '💾 I-save ang Araw na Ito',
      saved: '✓ Na-save - I-update',
      saving: 'Sine-save...',
      thisWeek: 'Linggong ito:',
      days: 'araw',
      
      // Mission Group
      missionGroup: 'Mission Group',
      weeklyMeeting: 'Lingguhang Pagtitipon',
      bibleStudy: 'Pag-aaral ng Bibliya',
      shareAndPray: 'Pagbabahagi at Panalangin',
      accountability: 'Pananagutan',
      chatWithGroup: '💬 Makipag-chat sa Grupo',
      
      // Mission Training
      missionTraining: 'Mission Training',
      phaseRequirement: 'KAILANGAN SA PHASE:',
      
      // Leader Dashboard
      leaderDashboard: 'Leader Dashboard',
      adminMode: 'Admin Mode',
      missionGroups: 'Mission Groups',
      activeDisciples: 'Aktibong Alagad',
      newRecruits: 'Bagong Recruits',
      buildersDeveloped: 'Mga Naging Builder',
      
      // Navigation
      journey: 'Lakbay',
      group: 'Grupo',
      training: 'Training',
      dash: 'Dash',
      
      // General
      signOut: 'Mag-sign out',
      loading: 'Naglo-load...'
    }
  },
  
  // Encouragement messages for each stage
  encouragements: {
    en: {
      seeker: {
        text: 'God drew you to Himself.<br>He sees your seeking heart and delights in it.',
        next: 'Walk as a Disciple'
      },
      disciple: {
        text: 'You are learning to follow Jesus.<br>He is shaping you to be more like Him.',
        next: 'Become a Disciple-Maker'
      },
      'disciple-maker': {
        text: 'You are now investing in others.<br>God is multiplying His kingdom through you.',
        next: 'Become a Builder'
      },
      builder: {
        text: 'You are building a community of disciples.<br>God is using you to lead His mission.',
        next: 'Become a Multiplier'
      },
      multiplier: {
        text: 'You are raising leaders who raise leaders.<br>Generations will be transformed because of your faithfulness.',
        next: 'Keep multiplying!'
      }
    },
    tl: {
      seeker: {
        text: 'Inakay ka ng Diyos palapit sa Kanya.<br>Nakikita Niya ang puso mong naghahanap, at kinalulugdan Niya ito.',
        next: 'Mamuhay Bilang Alagad'
      },
      disciple: {
        text: 'Natututo kang sumunod kay Jesus.<br>Hinuhubog ka Niya upang maging katulad Niya.',
        next: 'Maging Tagapaghubog ng Alagad'
      },
      'disciple-maker': {
        text: 'Namumuhunan ka na sa iba.<br>Pinarami ng Diyos ang Kanyang kaharian sa pamamagitan mo.',
        next: 'Maging Tagapagtayo'
      },
      builder: {
        text: 'Nagtatayo ka ng komunidad ng mga alagad.<br>Ginagamit ka ng Diyos upang pangunahan ang Kanyang misyon.',
        next: 'Maging Tagapagparami'
      },
      multiplier: {
        text: 'Naghuhubog ka ng mga lider na naghuhubog ng mga lider.<br>Mababago ang mga henerasyon dahil sa iyong katapatan.',
        next: 'Patuloy na magparami!'
      }
    }
  },

  /**
   * Initialize language system
   */
  init() {
    // Force Tagalog for all users (January 2025 update)
    // Remove any saved English preference
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved === 'en') {
      localStorage.removeItem(this.STORAGE_KEY);
    }
    
    // Always default to Tagalog now
    this.currentLang = 'tl';
    
    // Update UI toggle state
    this.updateToggleUI();
    
    // Apply translations to page
    this.applyTranslations();
    
    // Dispatch initial event
    this.dispatchChange();
    
    console.log('[i18n] Initialized with lang:', this.currentLang);
  },
  
  /**
   * Set language
   * @param {string} lang - 'en' or 'tl'
   */
  async setLang(lang) {
    if (lang !== 'en' && lang !== 'tl') {
      console.error('[i18n] Invalid lang:', lang);
      return;
    }
    
    this.currentLang = lang;
    localStorage.setItem(this.STORAGE_KEY, lang);
    
    // Save to Firestore if user is logged in
    await this.saveToFirestore(lang);
    
    // Update UI
    this.updateToggleUI();
    this.applyTranslations();
    
    // Dispatch change event for other modules to react
    this.dispatchChange();
    
    console.log('[i18n] Lang changed to:', lang);
  },
  
  /**
   * Toggle between languages
   */
  toggle() {
    const newLang = this.currentLang === 'en' ? 'tl' : 'en';
    this.setLang(newLang);
  },
  
  /**
   * Get current language
   * @returns {string} 'en' or 'tl'
   */
  getLang() {
    return this.currentLang;
  },
  
  /**
   * Check if current language is Tagalog
   * @returns {boolean}
   */
  isTagalog() {
    return this.currentLang === 'tl';
  },
  
  /**
   * Get translation for a key
   * @param {string} key - Translation key (dot notation supported)
   * @returns {string}
   */
  t(key) {
    const keys = key.split('.');
    let value = this.translations[this.currentLang];
    
    for (const k of keys) {
      if (value && value[k] !== undefined) {
        value = value[k];
      } else {
        // Fallback to English
        value = this.translations.en;
        for (const k2 of keys) {
          if (value && value[k2] !== undefined) {
            value = value[k2];
          } else {
            return key; // Return key if not found
          }
        }
        break;
      }
    }
    
    return value;
  },
  
  /**
   * Get encouragement for a stage
   * @param {string} stage - Journey stage
   * @returns {object} {text, next}
   */
  getEncouragement(stage) {
    return this.encouragements[this.currentLang][stage] || this.encouragements.en.seeker;
  },
  
  /**
   * Get stage info
   * @param {string} stage - Journey stage
   * @returns {object} {label, name}
   */
  getStage(stage) {
    return this.translations[this.currentLang].stages[stage] || 
           this.translations.en.stages[stage] ||
           { label: stage, name: stage.toUpperCase() };
  },

  /**
   * Save preference to Firestore
   */
  async saveToFirestore(lang) {
    try {
      if (typeof firebase !== 'undefined' && firebase.auth) {
        const user = firebase.auth().currentUser;
        if (user) {
          await firebase.firestore()
            .collection('goMission_members')
            .doc(user.uid)
            .update({
              'preferences.language': lang,
              'preferences.updatedAt': firebase.firestore.FieldValue.serverTimestamp()
            });
          console.log('[i18n] Saved to Firestore');
        }
      }
    } catch (error) {
      // Ignore errors if Firestore not available
      console.log('[i18n] Could not save to Firestore:', error.message);
    }
  },
  
  /**
   * Load preference from Firestore (call after auth)
   */
  async loadFromFirestore() {
    try {
      if (typeof firebase !== 'undefined' && firebase.auth) {
        const user = firebase.auth().currentUser;
        if (user) {
          const doc = await firebase.firestore()
            .collection('goMission_members')
            .doc(user.uid)
            .get();
          
          if (doc.exists) {
            const data = doc.data();
            if (data.preferences?.language) {
              this.currentLang = data.preferences.language;
              localStorage.setItem(this.STORAGE_KEY, this.currentLang);
              this.updateToggleUI();
              this.applyTranslations();
              this.dispatchChange();
              console.log('[i18n] Loaded from Firestore:', this.currentLang);
            }
          }
        }
      }
    } catch (error) {
      console.log('[i18n] Could not load from Firestore:', error.message);
    }
  },
  
  /**
   * Update toggle button UI
   */
  updateToggleUI() {
    // Update all language toggle buttons (including global header toggle)
    document.querySelectorAll('.lang-btn, .lang-toggle-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === this.currentLang);
    });
    
    // Update specific global toggle buttons by ID
    const tlBtn = document.getElementById('globalLangTL');
    const enBtn = document.getElementById('globalLangEN');
    if (tlBtn) tlBtn.classList.toggle('active', this.currentLang === 'tl');
    if (enBtn) enBtn.classList.toggle('active', this.currentLang === 'en');
    
    // Update checkbox-style toggle
    const toggle = document.getElementById('language-toggle');
    if (toggle) {
      toggle.checked = this.currentLang === 'tl';
    }
    
    // Update label
    const label = document.getElementById('language-label');
    if (label) {
      label.textContent = this.currentLang === 'tl' ? 'Tagalog' : 'English';
    }
  },
  
  /**
   * Apply translations to elements with data-i18n attribute
   */
  applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const translated = this.t(key);
      
      // Handle different element types
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        if (el.placeholder !== undefined && el.hasAttribute('data-i18n-placeholder')) {
          el.placeholder = translated;
        } else {
          el.value = translated;
        }
      } else {
        // Check if we should use innerHTML (for <br> tags in labels)
        if (translated.includes('<br>')) {
          el.innerHTML = translated;
        } else {
          el.textContent = translated;
        }
      }
    });
  },
  
  /**
   * Dispatch language change event
   */
  dispatchChange() {
    const event = new CustomEvent('languageChanged', {
      detail: {
        lang: this.currentLang,
        isTagalog: this.isTagalog()
      }
    });
    document.dispatchEvent(event);
  },
  
  /**
   * Create and return the language toggle HTML
   */
  createToggleHTML() {
    return `
      <div class="lang-toggle">
        <span class="lang-btn ${this.currentLang === 'tl' ? 'active' : ''}" data-lang="tl" onclick="i18n.setLang('tl')">🇵🇭 TL</span>
        <span class="lang-btn ${this.currentLang === 'en' ? 'active' : ''}" data-lang="en" onclick="i18n.setLang('en')">🇺🇸 EN</span>
      </div>
    `;
  }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => i18n.init());
} else {
  i18n.init();
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = i18n;
}
