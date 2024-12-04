// Settings management
class GameSettings {
    constructor() {
        this.defaultSettings = {
            sound: true,
            animations: true,
            toastLevel: 'all',
            autoSave: 0
        };
        
        // Initialize settings before anything else
        this.settings = { ...this.defaultSettings };
        
        // Export for use in other files
        window.gameSettings = this;
        
        this.loadSettings();
        this.initializeUI();
        this.bindEvents();
        
        // Initialize auto-save system
        this.lastAutoSave = Date.now();
        this.initializeAutoSave();
    }

    loadSettings() {
        const storedSettings = localStorage.getItem('gameSettings');
        if (storedSettings) {
            this.settings = { ...this.defaultSettings, ...JSON.parse(storedSettings) };
        } else {
            this.settings = { ...this.defaultSettings };
        }
        this.applySettings();
    }

    saveSettings() {
        localStorage.setItem('gameSettings', JSON.stringify(this.settings));
        this.applySettings();
    }

    applySettings() {
        // Apply sound settings
        if (window.soundSystem) {
            window.soundSystem.setMute(!this.settings.sound);
        }

        // Apply animation settings
        const wasDisabled = document.body.classList.contains('animations-disabled');
        const shouldBeDisabled = !this.settings.animations;
        
        if (shouldBeDisabled !== wasDisabled) {
            if (shouldBeDisabled) {
                document.body.classList.add('animations-disabled');
            } else {
                document.body.classList.remove('animations-disabled');
            }
        }
    }

    initializeUI() {
        // Set sound toggle
        const soundToggle = document.getElementById('mute-toggle');
        if (soundToggle) {
            soundToggle.checked = this.settings.sound;
        }

        // Set animation toggle
        const animationsToggle = document.getElementById('animations-toggle');
        if (animationsToggle) {
            animationsToggle.checked = this.settings.animations;
        }

        // Set notification level
        const toastLevelSelect = document.getElementById('toast-level');
        if (toastLevelSelect) {
            toastLevelSelect.value = this.settings.toastLevel;
        }

        // Set auto-save interval
        const autoSaveSelect = document.getElementById('auto-save');
        if (autoSaveSelect) {
            autoSaveSelect.value = this.settings.autoSave;
        }
    }

    bindEvents() {
        // Settings modal open/close
        const settingsButton = document.getElementById('settings-button');
        const closeButton = document.querySelector('.close-settings-modal');
        const saveButton = document.getElementById('save-settings');
        const cancelButton = document.getElementById('cancel-settings');

        if (settingsButton) {
            settingsButton.addEventListener('click', () => this.openModal());
        }

        if (closeButton) {
            closeButton.addEventListener('click', () => this.closeModal());
        }

        if (saveButton) {
            saveButton.addEventListener('click', () => this.saveChanges());
        }

        if (cancelButton) {
            cancelButton.addEventListener('click', () => this.closeModal());
        }
    }

    openModal() {
        const modal = document.getElementById('settings-modal');
        if (modal) {
            modal.style.display = 'block';
            this.initializeUI();
        }
    }

    closeModal() {
        const modal = document.getElementById('settings-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    initializeAutoSave() {
        // Clear any existing interval
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }

        // Set up new interval if auto-save is enabled
        if (this.settings.autoSave > 0) {
            this.autoSaveInterval = setInterval(() => {
                if (window.saveGame) {
                    window.saveGame();
                    // Don't show toast here - saveGame() handles its own toast
                }
            }, this.settings.autoSave * 1000);
        }
    }

    saveChanges() {
        const oldSettings = { ...this.settings };
        
        // Get new values from UI
        const soundToggle = document.getElementById('mute-toggle');
        const animationsToggle = document.getElementById('animations-toggle');
        const toastLevelSelect = document.getElementById('toast-level');
        const autoSaveSelect = document.getElementById('auto-save');

        // Check if all required elements exist
        if (!soundToggle || !animationsToggle || !toastLevelSelect || !autoSaveSelect) {
            return;
        }

        // Store old auto-save value for comparison
        const oldAutoSave = this.settings.autoSave;

        this.settings.sound = soundToggle.checked;
        this.settings.animations = animationsToggle.checked;
        this.settings.toastLevel = toastLevelSelect.value;
        this.settings.autoSave = parseInt(autoSaveSelect.value);
        
        // Save to storage
        this.saveSettings();
        
        // Reinitialize auto-save if the interval changed
        if (oldAutoSave !== this.settings.autoSave) {
            this.initializeAutoSave();
        }
        
        // Close modal
        this.closeModal();
        
        // Show success message with appropriate details
        let message = 'Your preferences have been saved';
        if (this.settings.autoSave > 0) {
            const minutes = this.settings.autoSave / 60;
            message += ` - Auto-save every ${minutes} minute${minutes > 1 ? 's' : ''}`;
        }
        window.showToast('Settings Updated', message, 'success');
    }
}

// Initialize settings when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new GameSettings();
});
 