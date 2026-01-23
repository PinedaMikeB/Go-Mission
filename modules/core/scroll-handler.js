/**
 * Go Mission - Scroll Handler Module
 * Hides header/footer nav on scroll down, shows on scroll up
 * Works on all platforms (iOS, Android, Desktop)
 */

const ScrollHandler = {
    // Elements
    header: null,
    bottomNav: null,
    
    // State
    lastScrollY: 0,
    ticking: false,
    isHidden: false,
    scrollThreshold: 10, // Minimum scroll distance to trigger hide/show
    
    /**
     * Initialize scroll handler
     */
    init() {
        this.header = document.getElementById('appHeader');
        this.bottomNav = document.getElementById('appBottomNav');
        
        if (!this.header && !this.bottomNav) {
            console.log('[ScrollHandler] No header or nav found');
            return;
        }
        
        // Use passive listener for better scroll performance
        window.addEventListener('scroll', this.onScroll.bind(this), { passive: true });
        
        // Also listen for touchmove for better mobile support
        window.addEventListener('touchmove', this.onScroll.bind(this), { passive: true });
        
        console.log('[ScrollHandler] Initialized');
    },
    
    /**
     * Handle scroll event with requestAnimationFrame for performance
     */
    onScroll() {
        if (!this.ticking) {
            window.requestAnimationFrame(() => {
                this.updateNavVisibility();
                this.ticking = false;
            });
            this.ticking = true;
        }
    },
    
    /**
     * Update header/nav visibility based on scroll direction
     */
    updateNavVisibility() {
        const currentScrollY = window.scrollY;
        const scrollDiff = currentScrollY - this.lastScrollY;
        
        // At top of page - always show
        if (currentScrollY < 50) {
            this.showNav();
            this.lastScrollY = currentScrollY;
            return;
        }
        
        // Check if scroll distance exceeds threshold
        if (Math.abs(scrollDiff) < this.scrollThreshold) {
            return;
        }
        
        if (scrollDiff > 0) {
            // Scrolling DOWN - hide nav
            this.hideNav();
        } else {
            // Scrolling UP - show nav
            this.showNav();
        }
        
        this.lastScrollY = currentScrollY;
    },
    
    /**
     * Hide header and bottom nav
     */
    hideNav() {
        if (this.isHidden) return;
        
        if (this.header) {
            this.header.classList.add('nav-hidden');
        }
        if (this.bottomNav) {
            this.bottomNav.classList.add('nav-hidden-bottom');
        }
        
        this.isHidden = true;
    },
    
    /**
     * Show header and bottom nav
     */
    showNav() {
        if (!this.isHidden) return;
        
        if (this.header) {
            this.header.classList.remove('nav-hidden');
        }
        if (this.bottomNav) {
            this.bottomNav.classList.remove('nav-hidden-bottom');
        }
        
        this.isHidden = false;
    },
    
    /**
     * Force show nav (useful when opening modals, etc.)
     */
    forceShow() {
        this.showNav();
        this.lastScrollY = window.scrollY;
    },
    
    /**
     * Temporarily disable scroll handling
     */
    disable() {
        this.showNav();
        window.removeEventListener('scroll', this.onScroll.bind(this));
    },
    
    /**
     * Re-enable scroll handling
     */
    enable() {
        window.addEventListener('scroll', this.onScroll.bind(this), { passive: true });
    }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ScrollHandler.init());
} else {
    ScrollHandler.init();
}

// Make available globally
window.ScrollHandler = ScrollHandler;
