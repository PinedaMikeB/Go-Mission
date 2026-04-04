/**
 * Go Mission - Theme Module
 * Handles dark/light mode switching with persistence
 * 
 * Light Mode (default):
 * - Warm cream backgrounds
 * - Maroon accents
 * - Dark text
 * 
 * Dark Mode:
 * - Deep maroon/burgundy backgrounds
 * - Gold accents
 * - Off-white text
 */

const Theme = {
  // Current theme: 'dark' or 'light'
  currentTheme: 'light',
  
  // Storage key
  STORAGE_KEY: 'goMission_theme',
  
  /**
   * Initialize theme system
   */
  init() {
    // Force light mode for all users (January 2025 update)
    // Remove any saved dark mode preference
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved === 'dark') {
      localStorage.removeItem(this.STORAGE_KEY);
    }
    
    // Always default to light mode now
    this.currentTheme = 'light';
    
    // Apply theme
    this.applyTheme();
    
    // Update toggle UI
    this.updateToggleUI();
    
    console.log('[Theme] Initialized with:', this.currentTheme);
  },
  
  /**
   * Set theme
   * @param {string} theme - 'dark' or 'light'
   */
  async setTheme(theme) {
    if (theme !== 'dark' && theme !== 'light') {
      console.error('[Theme] Invalid theme:', theme);
      return;
    }
    
    this.currentTheme = theme;
    localStorage.setItem(this.STORAGE_KEY, theme);
    
    // Apply theme
    this.applyTheme();
    
    // Update toggle UI
    this.updateToggleUI();
    
    // Save to Firestore if user logged in
    await this.saveToFirestore(theme);
    
    // Dispatch change event
    this.dispatchChange();
    
    console.log('[Theme] Changed to:', theme);
  },
  
  /**
   * Toggle between themes
   */
  toggle() {
    const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
  },
  
  /**
   * Get current theme
   * @returns {string} 'dark' or 'light'
   */
  getTheme() {
    return this.currentTheme;
  },
  
  /**
   * Check if current theme is dark
   * @returns {boolean}
   */
  isDark() {
    return this.currentTheme === 'dark';
  },
  
  /**
   * Apply theme to document
   */
  applyTheme() {
    if (this.currentTheme === 'light') {
      document.body.classList.add('light-mode');
    } else {
      document.body.classList.remove('light-mode');
    }
  },
  
  /**
   * Update toggle button UI
   */
  updateToggleUI() {
    const toggleBtn = document.getElementById('themeToggleBtn');
    if (toggleBtn) {
      // Update icon
      const sunIcon = toggleBtn.querySelector('.sun-icon');
      const moonIcon = toggleBtn.querySelector('.moon-icon');
      
      if (sunIcon && moonIcon) {
        if (this.currentTheme === 'light') {
          sunIcon.classList.add('hidden');
          moonIcon.classList.remove('hidden');
        } else {
          sunIcon.classList.remove('hidden');
          moonIcon.classList.add('hidden');
        }
      }
    }
  },
  
  /**
   * Save preference to Firestore
   */
  async saveToFirestore(theme) {
    try {
      if (typeof firebase !== 'undefined' && firebase.auth) {
        const user = firebase.auth().currentUser;
        if (user) {
          await firebase.firestore()
            .collection('goMission_members')
            .doc(user.uid)
            .update({
              'preferences.theme': theme,
              'preferences.updatedAt': firebase.firestore.FieldValue.serverTimestamp()
            });
          console.log('[Theme] Saved to Firestore');
        }
      }
    } catch (error) {
      console.log('[Theme] Could not save to Firestore:', error.message);
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
            if (data.preferences?.theme) {
              this.currentTheme = data.preferences.theme;
              localStorage.setItem(this.STORAGE_KEY, this.currentTheme);
              this.applyTheme();
              this.updateToggleUI();
              this.dispatchChange();
              console.log('[Theme] Loaded from Firestore:', this.currentTheme);
            }
          }
        }
      }
    } catch (error) {
      console.log('[Theme] Could not load from Firestore:', error.message);
    }
  },
  
  /**
   * Dispatch theme change event
   */
  dispatchChange() {
    const event = new CustomEvent('themeChanged', {
      detail: {
        theme: this.currentTheme,
        isDark: this.isDark()
      }
    });
    document.dispatchEvent(event);
  }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Theme.init());
} else {
  Theme.init();
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Theme;
}
