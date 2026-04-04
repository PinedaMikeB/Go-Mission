/**
 * Go Mission - Auto Update System
 * 
 * Features:
 * - Silent service worker updates
 * - Updates ONLY when app is opened (not during active use)
 * - Manual update option in menu with update details
 * - Admin force update via Firestore
 * - Scheduled force updates (e.g., 12am daily)
 */

const AutoUpdate = {
    // Version is auto-generated from build timestamp
    VERSION: BUILD_TIMESTAMP || Date.now().toString(),
    VERSION_KEY: 'goMission_appVersion',
    UPDATE_PENDING_KEY: 'goMission_updatePending',
    FORCE_UPDATE_KEY: 'goMission_lastForceCheck',
    registration: null,
    updatePending: false,
    updateDetails: null,
    LEGACY_SW_ENABLED: !window.GO_MISSION_DISABLE_LEGACY_SW_UPDATER,
    
    // Update details - EDIT THIS when pushing updates
    CURRENT_UPDATE: {
        version: '2.0.0',
        date: '2026-01-27',
        title: 'Major Update - Bilingual & Audio',
        changes: [
            '🌐 Full English & Tagalog Gospel presentation',
            '🔊 Audio narration for all 40 slides',
            '🎨 Light mode now default',
            '🔄 Improved auto-update system',
            '🐛 Fixed group join code bug',
            '📹 Faster Jitsi meetings'
        ]
    },

    /**
     * Initialize auto-update system
     */
    async init() {
        console.log('[AutoUpdate] Initializing v' + this.VERSION);

        if (window.GoMissionRuntime?.isNativeApp) {
            console.log('[AutoUpdate] Native Android shell detected - skipping web updater logic');
            return;
        }
        
        // Check for admin force update from Firestore
        await this.checkAdminForceUpdate();
        // Keep scheduled admin checks regardless of updater mode.
        this.checkScheduledUpdate();

        // PWAUpdater handles SW lifecycle; keep this module for admin/update UI only.
        if (!this.LEGACY_SW_ENABLED) {
            console.log('[AutoUpdate] Legacy SW lifecycle disabled (PWAUpdater active)');
            return;
        }

        // Check for version mismatch
        this.checkVersionMismatch();
        
        // Apply pending update
        this.applyPendingUpdate();
        
        // Setup service worker listeners
        this.setupServiceWorkerListeners();
        
        // Setup background checks
        this.setupBackgroundChecks();
        
        console.log('[AutoUpdate] Ready');
    },
    
    /**
     * Check if admin has triggered a force update via Firestore
     */
    async checkAdminForceUpdate() {
        if (!window.db) return;
        
        try {
            const configRef = window.doc(window.db, 'goMission_config', 'forceUpdate');
            const configDoc = await window.getDoc(configRef);
            
            if (configDoc.exists()) {
                const config = configDoc.data();
                const lastCheck = localStorage.getItem(this.FORCE_UPDATE_KEY);
                
                // Check if there's a new force update we haven't applied
                if (config.enabled && config.timestamp) {
                    const forceTime = new Date(config.timestamp).getTime();
                    const lastCheckTime = lastCheck ? parseInt(lastCheck) : 0;
                    
                    if (forceTime > lastCheckTime) {
                        console.log('[AutoUpdate] Admin force update detected!');
                        
                        // Store update details
                        this.updateDetails = config.details || null;
                        
                        // Check if it's scheduled for later
                        if (config.scheduledFor) {
                            const scheduledTime = new Date(config.scheduledFor).getTime();
                            const now = Date.now();
                            
                            if (scheduledTime > now) {
                                // Schedule for later
                                const delay = scheduledTime - now;
                                console.log('[AutoUpdate] Scheduled force update in', Math.round(delay/60000), 'minutes');
                                setTimeout(() => this.forceUpdate(), delay);
                                return;
                            }
                        }
                        
                        // Force update now
                        localStorage.setItem(this.FORCE_UPDATE_KEY, Date.now().toString());
                        this.forceUpdate();
                    }
                }
            }
        } catch (error) {
            console.log('[AutoUpdate] Could not check admin force update:', error.message);
        }
    },
    
    /**
     * Check for scheduled daily update (e.g., 12am)
     */
    checkScheduledUpdate() {
        // Check if we should schedule a midnight update check
        const now = new Date();
        const midnight = new Date(now);
        midnight.setHours(24, 0, 0, 0); // Next midnight
        
        const msUntilMidnight = midnight.getTime() - now.getTime();
        
        // Schedule check at midnight
        setTimeout(() => {
            console.log('[AutoUpdate] Midnight check - looking for updates...');
            this.checkAdminForceUpdate();
            // Re-schedule for next midnight
            this.checkScheduledUpdate();
        }, msUntilMidnight);
        
        console.log('[AutoUpdate] Midnight check scheduled in', Math.round(msUntilMidnight/3600000), 'hours');
    },
    
    /**
     * Check if app version changed
     */
    checkVersionMismatch() {
        const storedVersion = localStorage.getItem(this.VERSION_KEY);
        
        if (storedVersion && storedVersion !== this.VERSION) {
            console.log('[AutoUpdate] Version mismatch! Stored:', storedVersion, 'Current:', this.VERSION);
            this.forceUpdate();
        } else {
            localStorage.setItem(this.VERSION_KEY, this.VERSION);
            console.log('[AutoUpdate] Version OK:', this.VERSION);
        }
    },
    
    /**
     * Apply pending update from previous session
     */
    applyPendingUpdate() {
        const pending = localStorage.getItem(this.UPDATE_PENDING_KEY);
        if (pending === 'true') {
            console.log('[AutoUpdate] Pending update found - applying...');
            localStorage.removeItem(this.UPDATE_PENDING_KEY);
            
            if (this.registration?.waiting) {
                this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
        }
    },
    
    /**
     * Force clear caches and reload
     */
    async forceUpdate() {
        console.log('[AutoUpdate] Forcing update...');

        if (!this.LEGACY_SW_ENABLED && window.PWAUpdater && typeof window.PWAUpdater.forceRefresh === 'function') {
            try {
                await window.PWAUpdater.forceRefresh();
                return;
            } catch (error) {
                console.warn('[AutoUpdate] PWAUpdater.forceRefresh failed, falling back:', error);
            }
        }
        
        try {
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map(name => caches.delete(name)));
            }
            
            localStorage.setItem(this.VERSION_KEY, this.VERSION);
            localStorage.removeItem(this.UPDATE_PENDING_KEY);
            
            window.location.reload(true);
        } catch (error) {
            console.error('[AutoUpdate] Force update error:', error);
            window.location.reload(true);
        }
    },
    
    /**
     * Manual update - called from menu
     */
    async manualUpdate() {
        const confirmed = confirm(
            `🔄 Check for Updates\n\n` +
            `Current version: ${this.CURRENT_UPDATE.version}\n` +
            `Last updated: ${this.CURRENT_UPDATE.date}\n\n` +
            `Do you want to check for updates and refresh the app?`
        );
        
        if (confirmed) {
            await this.forceUpdate();
        }
    },
    
    /**
     * Show update details modal
     */
    showUpdateDetails() {
        const update = this.CURRENT_UPDATE;
        const changesHtml = update.changes.map(c => `<li class="mb-1">${c}</li>`).join('');
        
        const modal = document.createElement('div');
        modal.id = 'updateDetailsModal';
        modal.className = 'fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="bg-[var(--card-bg-solid)] rounded-2xl max-w-md w-full max-h-[80vh] overflow-auto border border-[var(--card-border)]">
                <div class="p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-xl font-bold text-[var(--text-color)]">📱 App Update</h2>
                        <button onclick="document.getElementById('updateDetailsModal').remove()" 
                                class="text-[var(--text-muted)] hover:text-[var(--text-color)]">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                    
                    <div class="mb-4">
                        <p class="text-amber-500 font-bold text-lg">${update.title}</p>
                        <p class="text-[var(--text-muted)] text-sm">Version ${update.version} • ${update.date}</p>
                    </div>
                    
                    <div class="mb-6">
                        <p class="text-[var(--text-muted)] text-sm mb-2 font-medium">What's New:</p>
                        <ul class="text-[var(--text-color)] text-sm space-y-1">
                            ${changesHtml}
                        </ul>
                    </div>
                    
                    <div class="flex gap-3">
                        <button onclick="document.getElementById('updateDetailsModal').remove()" 
                                class="flex-1 py-3 bg-[var(--card-bg)] text-[var(--text-muted)] rounded-xl font-bold">
                            Later
                        </button>
                        <button onclick="AutoUpdate.forceUpdate()" 
                                class="flex-1 py-3 bg-amber-500 text-[#2a0505] rounded-xl font-bold">
                            Update Now
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    },
    
    /**
     * Setup service worker listeners
     */
    setupServiceWorkerListeners() {
        if (!('serviceWorker' in navigator)) return;
        
        navigator.serviceWorker.ready.then((registration) => {
            this.registration = registration;
            
            if (registration.waiting) {
                console.log('[AutoUpdate] Found waiting SW at startup - activating...');
                registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
            
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                if (newWorker) {
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            console.log('[AutoUpdate] New SW installed - will apply on next app open');
                            this.updatePending = true;
                            localStorage.setItem(this.UPDATE_PENDING_KEY, 'true');
                        }
                    });
                }
            });
        });
        
        let isInitialLoad = true;
        setTimeout(() => { isInitialLoad = false; }, 5000);
        
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (isInitialLoad) {
                window.location.reload();
            } else {
                localStorage.setItem(this.UPDATE_PENDING_KEY, 'true');
            }
        });
    },
    
    /**
     * Setup background update checks
     */
    setupBackgroundChecks() {
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.checkForUpdatesOnly();
                
                if (this.updatePending || localStorage.getItem(this.UPDATE_PENDING_KEY) === 'true') {
                    localStorage.removeItem(this.UPDATE_PENDING_KEY);
                    this.updatePending = false;
                    if (this.registration?.waiting) {
                        this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                    }
                }
            }
        });
        
        // Check every 10 minutes
        setInterval(() => this.checkForUpdatesOnly(), 10 * 60 * 1000);
    },
    
    /**
     * Check for updates (no refresh)
     */
    async checkForUpdatesOnly() {
        if (!this.registration) {
            if ('serviceWorker' in navigator) {
                try {
                    this.registration = await navigator.serviceWorker.ready;
                } catch (e) { return; }
            }
        }
        
        if (this.registration) {
            try {
                await this.registration.update();
            } catch (e) { }
        }
    },
    
    /**
     * Get version info for display
     */
    getVersionInfo() {
        return {
            version: this.CURRENT_UPDATE.version,
            date: this.CURRENT_UPDATE.date,
            title: this.CURRENT_UPDATE.title,
            buildTimestamp: this.VERSION,
            updatePending: this.updatePending
        };
    }
};

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => AutoUpdate.init());
} else {
    AutoUpdate.init();
}

window.AutoUpdate = AutoUpdate;
