/**
 * Core Game System
 * 
 * Primary game engine and state management for Martian Potato:
 * - Manages core game loop and state updates
 * - Handles resource systems (water, nutrients, ice)
 * - Controls potato planting, growth, and harvesting
 * - Manages automation systems and devices
 * - Handles save/load functionality
 * - Controls UI updates and display management
 * - Manages achievement tracking and rewards
 * - Handles debug systems and performance monitoring
 * - Coordinates between subsystems (upgrades, exploration)
 * - Manages game initialization and configuration
 */


// Game Constants
let MAX_FIELD_SIZE = 8;
const UPDATE_INTERVAL = 1000; // Update every second
const FRAME_RATE = 30; // 30 fps
const FRAME_DELAY = 1000 / FRAME_RATE;
const CLICKS_PER_WATER = 5;
const MARTIAN_SOL_LENGTH = 88620 * 1000; // 24h 37m in milliseconds

// Global State
window.unlockedActionCards = [];

// System Variables
let lastUpdateTime = 0;
let lastFrameTime = 0;
let debugMode = false;
let lastSaveTime = 0;
let MAX_TIER = 5;
let hasSeenInitialGlow = false;
let gameStartTime = Date.now();
let lastHarvestUpdateTime = 0; 

// Harvest Chart Update Intervals
const EARLY_GAME_UPDATE_INTERVAL = 500; // Update every half-second for early game
const REGULAR_UPDATE_INTERVAL = 60000;    // Every minute once established
const EARLY_GAME_THRESHOLD = 100; 

// Resource Variables
let potatoCount = 0;
let water = 20;
let nutrients = 20;
let ice = 20;
let waterEfficiency = 1;
let soilEfficiency = 1;
let iceEfficiency = 1;
let areResourcesDepleted = false;
let lastResourceWarningTime = 0;
const RESOURCE_WARNING_COOLDOWN = 60000; // 1 minute cooldown
let resourceWarningActive = false;

// Planting Variables
let plantingDelay = 3000;
let lastPlantTime = 0;
let potatoesPerClick = 1;
let isFirstPlant = true;
const GROWTH_TIME = 8000; // Base growth time in milliseconds
let growthTimeMultiplier = 1; // Starts at 1, decreases with upgrades
let totalPotatoesHarvested = 0;

// Manual Ice Melting Variables
let waterMeltingClicks = 0;
let isManualIceMeltingUnlocked = false;

// Ice Melting Basin Variables
let isIceMeltingBasinUnlocked = false;
let iceMeltingBasinTimer = 0;
let iceMeltingBasinActive = false;

// Nuclear Ice Melter Variables
let isNuclearIceMelterUnlocked = false;
let isNuclearIceMelterActive = false;
let nuclearIceMelterInterval = null;
let iceMelterKnob;
let nuclearIceMelterPercentage = 3; // Default to 3%

// Polar Cap Mining Variables
let isPolarCapMiningUnlocked = false;
let isPolarCapMiningActive = false;
let polarCapMiningInterval = null;

// Cometary Ice Harvester Variables
let isCometaryIceHarvesterUnlocked = false;
let isCometaryIceHarvesterActive = false;
let cometaryIceHarvesterInterval = null;

// Martian Potato Colonizer Variables
let isMartianPotatoColonizerUnlocked = false;
let isMartianPotatoColonizerActive = false;
let colonizerInterval = null;
let colonizerCycle = 0;
const maxColonizerCycles = 20; // 20 cycles
const INITIAL_COLONIZER_CYCLE_DURATION = 60000; // 60 seconds
const MIN_COLONIZER_CYCLE_DURATION = 1000; // 1 second minimum duration

// Subsurface Aquifer Tapper Variables
let isSubsurfaceAquiferTapperUnlocked = false;
let isSubsurfaceAquiferTapperActive = false;

// Bucket Wheel Excavator Variables
let isBucketWheelExcavatorUnlocked = false;

// Subterranean Tuber Tunneler Variables
let isSubterraneanTuberTunnelerUnlocked = false;
let isSubterraneanTuberTunnelerActive = false;

// Quantum Spud Spawner Variables
let isQuantumSpudSpawnerUnlocked = false;
let isQuantumSpudSpawnerActive = false;
let quantumSpudSpawnerInterval = null;

// Large Data Structures
let potatoField = new Array(MAX_FIELD_SIZE).fill(null);

// Achievement Tracking
const defaultAchievements = {
    firstPotato: false,
    potatoCentury: false,
    techSavvy: false,
    martianEngineer: false,
    oneSolWonder: false,
    potatoEmpire: false,
    // Add other achievements here
};
let achievements = { ...defaultAchievements };
let harvestHistory = [];

// Debug Variables
let fpsValues = [];
let lastDebugUpdateTime = 0;
let debugUpdateInterval = null;

// Cached template element for potato display
const potatoTemplate = document.createElement('template');
potatoTemplate.innerHTML = `
    <div class="potato">
        <div class="growth-indicator"></div>
        <div class="growth-text-container">
            <div class="growth-text"></div>
        </div>
    </div>
`;

// Add to the game state variables section at top
let neuralNetworkActive = false;

// ==========================================
//            CORE GAME FUNCTIONS
// ==========================================

// Initialize the game
let gameInitialized = false;
function initializeGame() {
    if (gameInitialized) return;
    
    // Initialize core game systems
    initializePotatoField();
    createTechTree();
    
    // Initialize UI elements after DOM is ready
    if (document.readyState === 'complete') {
        initializeUI();
    } else {
        window.addEventListener('load', initializeUI, { once: true });
    }
    
    // Start game loop
    requestAnimationFrame(gameLoop);
    gameInitialized = true;
    
    // Track game start with the result of loadGame()
    const loadedGame = loadGame();
    trackEvent('game_start', {
        is_new_game: !loadedGame,
        browser: navigator.userAgent,
        screen_resolution: `${window.screen.width}x${window.screen.height}`
    });
}

// New function to handle all UI initialization
function initializeUI() {
    // Initialize action cards first
    initializeActionCards();
    updateActionCards();
    
    // Add glow for new games
    const plantButton = document.getElementById('plant-button');
    if (!hasSeenInitialGlow && plantButton) {
        plantButton.classList.add('glow');
    }
    
    initializeNuclearIceMelter();
    initializeChartModalListeners();
    initializeHeaderScroll();
}

// Function to reset the game state
function resetGame() {
    if (confirm('Are you sure you want to reset the game? This will erase all your progress.')) {
        neuralNetworkActive = false;
        localStorage.removeItem('martianPotatoSave');
        hasSeenInitialGlow = false;
        location.reload();
    }
}

// Helper function to add event listeners if the element exists
function addEventListenerIfExists(id, event, handler) {
    const element = document.getElementById(id);
    if (element) {
        element.addEventListener(event, handler);
    }
}

// Main game loop function
function gameLoop(currentTime) {
    if (currentTime - lastFrameTime >= FRAME_DELAY) {
        // Do all game updates
        updatePlantButton();
        if (updateResources(currentTime)) {
            updateDisplay();
            checkAndRestartAutoplanters();
        }
        updatePotatoGrowth();
        updateTechTree();
        updateExploreButton();
        updateActionCards();
        displayExplorationUpgrades(); // Just include it directly
        
        // Auto-save check
        if (currentTime - lastSaveTime >= 60000) {
            saveGame();
            lastSaveTime = currentTime;
        }
        
        // Update neural network if active
        if (window.neuralNetworkActive) {
            updateTrainingProgress();
        }
        
        lastFrameTime = currentTime;
    }
    
    requestAnimationFrame(gameLoop);
}

// Function to update the field size
function updateFieldSize(newSize) {
    MAX_FIELD_SIZE = newSize;
    potatoField = potatoField.concat(new Array(newSize - potatoField.length).fill(null));
    initializePotatoField();
    updateDisplay();
}

// ==========================================
//            RESOURCE MANAGEMENT
// ==========================================

// Update game resources and ensure they don't go below zero
function updateResources(currentTime) {
    if (currentTime - lastUpdateTime >= UPDATE_INTERVAL) {
        try {
            // Ensure resources don't go below zero
            water = Math.max(0, water);
            nutrients = Math.max(0, nutrients);
            ice = Math.max(0, ice);
            potatoCount = Math.floor(potatoCount);

            if (iceMeltingBasinActive) {
                water++;
                iceMeltingBasinTimer--;
                if (iceMeltingBasinTimer <= 0) {
                    iceMeltingBasinActive = false;
                }
                updateIceMeltingBasinButton();
            }
            checkResourceLevels();
            lastUpdateTime = currentTime;
            return true;
        } catch (error) {
            console.error('Error updating resources:', error);
            showToast('Resource Error', 'There was an error updating resources. Please refresh the game.', 'error');
            return false;
        }
    }
    return false;
}

// Consume resources for potato growth, applying efficiency multipliers
function consumeResources(amount = 1) {
    if (water >= amount && nutrients >= amount) {
        water -= amount / waterEfficiency;
        nutrients -= amount / soilEfficiency;
        return true;
    }
    return false;
}

function updateResourceCounts() {
    updateElementIfChanged('potato-count', `Potatoes: ${Math.floor(potatoCount)}`);
    updateElementIfChanged('water-count', `Water: ${Math.floor(water)}`);
    updateElementIfChanged('nutrients', `Nutrients: ${Math.floor(nutrients)}`);
    updateElementIfChanged('ice-level', `Ice: ${Math.floor(ice)}`);
}

function updateDepletedActionCard(actionCardId, isDepleted, message) {
    const card = document.getElementById(actionCardId);
    if (card) {
        const toggleContainer = card.querySelector('.toggle-switch-container');
        const buttonContainer = card.querySelector('.button-container');
        const ledProgressBar = card.querySelector('.led-progress-bar');
        let depletedMessage = card.querySelector('.depleted-message');
        const actionButton = buttonContainer ? buttonContainer.querySelector('.action-button') : null;

        if (isDepleted) {
            // Hide the toggle switch or button
            if (toggleContainer) {
                toggleContainer.style.display = 'none';
            }
            if (actionButton) {
                actionButton.style.display = 'none';
            }
            if (ledProgressBar) {
                ledProgressBar.style.visibility = 'hidden';
            }
            // Display the depleted message
            if (!depletedMessage) {
                depletedMessage = document.createElement('p');
                depletedMessage.classList.add('depleted-message');
                if (buttonContainer) {
                    buttonContainer.appendChild(depletedMessage);
                } else {
                    card.appendChild(depletedMessage);
                }
            }
            depletedMessage.textContent = message;
            depletedMessage.style.display = 'block';
        } else {
            // Show the toggle switch or button
            if (toggleContainer) {
                toggleContainer.style.display = 'block';
            }
            if (actionButton) {
                actionButton.style.display = 'block';
            }
            if (ledProgressBar) {
                ledProgressBar.style.visibility = 'visible';
            }
            // Hide the depleted message
            if (depletedMessage) {
                depletedMessage.style.display = 'none';
            }
        }
    }
}

// Function to check resource levels and display warnings
function checkResourceLevels() {
    const currentTime = Date.now();
    if (currentTime - lastResourceWarningTime < RESOURCE_WARNING_COOLDOWN) return;

    let warningMessage = '';

    if (water < 10 && nutrients < 20) {
        warningMessage = "Resources critically low! Explore Mars surface to gather more.";
    } else if (water < 10) {
        warningMessage = "Water supply running low. Consider melting some ice!";
    } else if (ice < 10) {
        warningMessage = "Ice reserves depleting. Time to explore Mars for more!";
    } else if (nutrients < 10) {
        warningMessage = "Nutrient levels are low. Explore Mars to replenish supplies.";
    }

    if (warningMessage && !resourceWarningActive) {
        showToast("Resource Warning", warningMessage, 'warning');
        lastResourceWarningTime = currentTime;
        resourceWarningActive = true;
    } else if (water > 50 && ice > 50 && nutrients > 50) {
        resourceWarningActive = false;
    }
}

// ==========================================
//            PLANTING AND HARVESTING
// ==========================================

// Plant a potato in an empty field slot
function plantPotato() {
    const currentTime = Date.now();
    if (currentTime - lastPlantTime < plantingDelay) {
        return;
    }

    const emptySlotIndex = potatoField.findIndex(slot => slot === null);
    if (emptySlotIndex === -1) {
        showToast("No Room", "No more room in the field! Harvest some potatoes first.", 'setback');
        return;
    }

    if (consumeResources()) {
        potatoField[emptySlotIndex] = createPotato();

        if (!hasSeenInitialGlow) {
            hasSeenInitialGlow = true;
            document.getElementById('plant-button').classList.remove('glow');
        }

        lastPlantTime = currentTime;
        updatePotatoFieldDisplay();
        updateDisplay();
    } else {
        showToast("Not Enough Resources", "Not enough resources to plant a potato! Explore Mars to find more resources.", 'setback');
    }
    updatePlantButton();
}

// Update the growth stage of all planted potatoes
function updatePotatoGrowth() {
    const currentTime = Date.now();
    potatoField = potatoField.map(potato => {
        if (potato !== null) {
            // Only update potatoes that are not fully grown
            if (potato.growthStage < 100) {
                const growthTime = currentTime - potato.plantedAt;
                const actualGrowthTime = GROWTH_TIME * growthTimeMultiplier;
                potato.growthStage = Math.min(100, Math.floor((growthTime / actualGrowthTime) * 100));
            }
        }
        return potato;
    });
    updateDisplay();
}

// Harvest a fully grown potato at the specified index
function harvestPotatoAtIndex(index, isAutomated = false) {
    if (potatoField[index] && potatoField[index].growthStage >= 100) {
        const harvestedPotato = potatoField[index];
        potatoCount++;
        totalPotatoesHarvested++;

        const slotElement = document.querySelector(`.potato-slot[data-index="${index}"]`);
        const potatoElement = slotElement.querySelector('.potato');

        if (potatoElement && harvestedPotato.isQuantumSpawned) {

            // Create the poof element
            const poofElement = document.createElement('div');
            poofElement.className = 'poof-animation-red';

            // Append the poof to the slotElement
            slotElement.appendChild(poofElement);

            // Ensure the poof covers the entire slot
            poofElement.style.position = 'absolute';
            poofElement.style.left = '0';
            poofElement.style.top = '0';
            poofElement.style.width = '100%';
            poofElement.style.height = '100%';
            poofElement.style.zIndex = '10';

            // Hide the potatoElement during the animation
            potatoElement.style.visibility = 'hidden';

            // Remove the poof element after the animation
            poofElement.addEventListener('animationend', () => {
                poofElement.remove();

                // Now remove the potato and update the display
                potatoField[index] = null;
                updatePotatoFieldDisplay();
                updateDisplay();

                // Record the harvest event and update the chart
                harvestHistory.push({
                    timestamp: Date.now(),
                    totalPotatoes: totalPotatoesHarvested
                });
                updateHarvestHistory();
                updateHarvestChart();

                checkAchievements();
            });
        } else {
            // For normal potatoes or if potatoElement not found
            potatoField[index] = null;
            updatePotatoFieldDisplay();
            updateDisplay();

            updateHarvestHistory();

            checkAchievements();
        }
    }
}

// Update the plant button state and cooldown display
function updatePlantButton() {
    const plantButton = document.getElementById('plant-button');
    const currentTime = Date.now();
    const timeLeft = Math.max(0, plantingDelay - (currentTime - lastPlantTime));
    
    if (timeLeft > 0) {
        plantButton.disabled = true;
        plantButton.textContent = `${(timeLeft / 1000).toFixed(1)}s`;
    } else {
        plantButton.disabled = false;
        plantButton.textContent = 'Plant Potato';
    }
}

// Update the updatePotatoFieldDisplay function to handle both manual and automated actions
function updatePotatoFieldDisplay() {
    const fieldContainer = document.getElementById('potato-field');
    if (!fieldContainer) return;

    // Cache the slot elements to avoid repeated queries
    const slotElements = Array.from(fieldContainer.children);
    
    potatoField.forEach((potato, index) => {
        const slotElement = slotElements[index];
        if (!slotElement) return;

        // Don't remove existing poof animations
        const existingPoof = slotElement.querySelector('.poof-animation-red');
        if (existingPoof) return;

        let potatoElement = slotElement.querySelector('.potato');
        
        if (potato) {
            if (!potatoElement) {
                // Clone from cached template
                potatoElement = potatoTemplate.content.firstElementChild.cloneNode(true);
                slotElement.appendChild(potatoElement);
            }

            // Update existing potato element using direct properties instead of style
            potatoElement.style.cssText = `
                transform: scale(${potato.scaleX}, ${potato.scaleY});
                border-radius: ${potato.borderRadius};
            `;
            potatoElement.className = `potato ${potato.textureClass}${potato.growthStage >= 100 ? ' harvestable' : ''}`;

            // Update growth indicator and text using cached references
            const growthIndicator = potatoElement.firstElementChild;
            const growthText = potatoElement.lastElementChild.firstElementChild;
            
            growthIndicator.style.height = `${potato.growthStage}%`;
            growthText.textContent = `${Math.floor(potato.growthStage)}%`;

        } else if (potatoElement) {
            potatoElement.remove();
        }
    });
}

// ==========================================
//           SAVE AND LOAD
// ==========================================

// Function to save the game state
function saveGame() {
    const gameState = {
        potatoCount,
        water,
        nutrients,
        ice,
        areResourcesDepleted,
        plantingDelay,
        lastPlantTime,
        potatoesPerClick,
        waterEfficiency,
        soilEfficiency,
        iceEfficiency,
        waterMeltingClicks,
        isManualIceMeltingUnlocked,
        isIceMeltingBasinUnlocked,
        iceMeltingBasinTimer,
        iceMeltingBasinActive,
        isNuclearIceMelterUnlocked,
        isNuclearIceMelterActive,
        isMartianPotatoColonizerUnlocked,
        isMartianPotatoColonizerActive,
        colonizerCycle,
        potatoField,
        achievements,
        autoplanters,
        autoHarvesters,
        MAX_FIELD_SIZE,
        unlockedActionCards: window.unlockedActionCards,
        currentTier, // Save the currentTier
        upgrades: upgrades.map(upgrade => ({
            name: upgrade.name,
            purchased: upgrade.purchased || false,
            count: upgrade.count || 0 // Ensure count is saved even if zero
        })),
        isFirstPlant,
        hasSeenInitialGlow,
        isPolarCapMiningUnlocked,
        isPolarCapMiningActive,
        growthTimeMultiplier,
        totalPotatoesHarvested,
        harvestHistory,         
        gameStartTime,
        isSubsurfaceAquiferTapperUnlocked,
        isSubsurfaceAquiferTapperActive,
        isBucketWheelExcavatorUnlocked,
        isSubterraneanTuberTunnelerUnlocked,          
        explorationResourceMultiplier: window.explorationResourceMultiplier,
        lastExploreTime: window.lastExploreTime,
        exploreDelay: window.exploreDelay,
        waterExplorationMultiplier: window.waterExplorationMultiplier,
        growthUpgradesApplied,
        nuclearIceMelterPercentage: nuclearIceMelterPercentage,
        isSubsurfaceAquiferTapperActive: window.isSubsurfaceAquiferTapperActive,
        isBucketWheelExcavatorActive: window.isBucketWheelExcavatorActive,
        isSubterraneanTuberTunnelerActive: window.isSubterraneanTuberTunnelerActive,
        neuralNetworkActive: window.neuralNetworkActive,
        neuralNetworkState: getNeuralNetworkState()
    };
    localStorage.setItem('martianPotatoSave', JSON.stringify(gameState));
    showToast('Game saved successfully!', 'Your progress has been saved.', 'success');
    
    trackEvent('game_saved', {
        playtime_seconds: Math.floor((Date.now() - gameStartTime) / 1000),
        total_potatoes: Math.floor(potatoCount),
        total_harvested: totalPotatoesHarvested,
        current_tier: currentTier,
        automation_devices: getAutomationDevicesCount()
    });
}

// Function to load the game state
function loadGame() {
    const savedState = localStorage.getItem('martianPotatoSave');

    if (savedState) {
        try {
            const gameState = JSON.parse(savedState);
            // IMPORTANT: Load neural network first, before other state
            if (gameState.neuralNetworkActive || (gameState.neuralNetworkState && gameState.neuralNetworkState.isActive)) {
                window.neuralNetworkActive = true; // Make sure it's global
                initializeNeuralNetwork(gameState.neuralNetworkState);
            }

            // Restore game variables, respecting saved values even if they're zero
            gameStartTime = gameState.gameStartTime || Date.now();
            potatoCount = gameState.potatoCount !== undefined ? gameState.potatoCount : 0;
            water = gameState.water !== undefined ? gameState.water : 100;
            nutrients = gameState.nutrients !== undefined ? gameState.nutrients : 100;
            ice = gameState.ice !== undefined ? gameState.ice : 100;
            areResourcesDepleted = gameState.areResourcesDepleted || false;

            // Restore game variables with default values if not present
            plantingDelay = gameState.plantingDelay || 5000;
            lastPlantTime = gameState.lastPlantTime || 0;
            potatoesPerClick = gameState.potatoesPerClick || 1;
            waterEfficiency = gameState.waterEfficiency || 1;
            soilEfficiency = gameState.soilEfficiency || 1;
            iceEfficiency = gameState.iceEfficiency || 1;
            waterMeltingClicks = gameState.waterMeltingClicks || 0;
            isManualIceMeltingUnlocked = gameState.isManualIceMeltingUnlocked || false;
            isIceMeltingBasinUnlocked = gameState.isIceMeltingBasinUnlocked || false;
            iceMeltingBasinTimer = gameState.iceMeltingBasinTimer || 0;
            iceMeltingBasinActive = gameState.iceMeltingBasinActive || false;
            isNuclearIceMelterUnlocked = gameState.isNuclearIceMelterUnlocked || false;
            isNuclearIceMelterActive = gameState.isNuclearIceMelterActive || false;
            isPolarCapMiningUnlocked = gameState.isPolarCapMiningUnlocked || false;
            isPolarCapMiningActive = gameState.isPolarCapMiningActive || false;
            potatoField = gameState.potatoField || [];
            achievements = { ...defaultAchievements, ...(gameState.achievements || {}) };
            autoplanters = gameState.autoplanters || [];
            autoHarvesters = gameState.autoHarvesters || [];
            MAX_FIELD_SIZE = gameState.MAX_FIELD_SIZE || 8;
            unlockedActionCards = gameState.unlockedActionCards || ['exploration-container'];
            currentTier = gameState.currentTier || 1;
            hasSeenInitialGlow = gameState.hasSeenInitialGlow || false;
            growthTimeMultiplier = gameState.growthTimeMultiplier || 1;
            totalPotatoesHarvested = gameState.totalPotatoesHarvested || 0;
            harvestHistory = gameState.harvestHistory || [];

            restoreUpgrades(gameState.upgrades);

            // Restore unlockedActionCards
            window.unlockedActionCards = gameState.unlockedActionCards || [];
        
            // Ensure all unlocked features have their cards added
            if (isManualIceMeltingUnlocked) {
                unlockedActionCards.push('ice-melting-container');
            }
            if (isIceMeltingBasinUnlocked) {
                unlockedActionCards.push('ice-melting-basin-container');
            }
            if (isNuclearIceMelterUnlocked) {
                unlockedActionCards.push('nuclear-ice-melter-container');
            }
            if (isPolarCapMiningUnlocked) {
                unlockedActionCards.push('polar-cap-mining-container');
            }

            if (gameState.isMartianPotatoColonizerUnlocked) {
                isMartianPotatoColonizerUnlocked = true;
                unlockedActionCards.push('martian-potato-colonizer-container');
                initializeMartianPotatoColonizer();

                colonizerCycle = gameState.colonizerCycle || 0;
                
                if (gameState.isMartianPotatoColonizerActive && colonizerCycle < maxColonizerCycles) {
                    isMartianPotatoColonizerActive = true;
                    startMartianPotatoColonizer();
                } else {
                    isMartianPotatoColonizerActive = false;
                    if (colonizerCycle >= maxColonizerCycles) {
                        const toggleSwitch = document.getElementById('martian-potato-colonizer-toggle');
                        if (toggleSwitch) {
                            toggleSwitch.disabled = true;
                        }
                    }
                }
            }

            isSubsurfaceAquiferTapperUnlocked = gameState.isSubsurfaceAquiferTapperUnlocked || false;
            isBucketWheelExcavatorUnlocked = gameState.isBucketWheelExcavatorUnlocked || false;
            isSubterraneanTuberTunnelerUnlocked = gameState.isSubterraneanTuberTunnelerUnlocked || false;

            // Update unlockedActionCards based on the unlock flags
            if (isSubsurfaceAquiferTapperUnlocked) {
                if (!unlockedActionCards.includes('subsurface-aquifer-tapper-container')) {
                    unlockedActionCards.push('subsurface-aquifer-tapper-container');
                }
            }

            if (isBucketWheelExcavatorUnlocked) {
                if (!unlockedActionCards.includes('bucket-wheel-excavator-container')) {
                    unlockedActionCards.push('bucket-wheel-excavator-container');
                }
            }

            if (isSubterraneanTuberTunnelerUnlocked) {
                if (!unlockedActionCards.includes('subterranean-tuber-tunneler-container')) {
                    unlockedActionCards.push('subterranean-tuber-tunneler-container');
                }
            }

            // Remove duplicates
            unlockedActionCards = [...new Set(unlockedActionCards)];
            
            // Reinitialize game elements
            initializePotatoField();
            createTechTree();
            updateDisplay();
            updateIceMeltingProgress();
            updateIceMeltingBasinButton();
            updateActionCards();

            // Ensure DOM is ready before updating action cards
            if (document.readyState === 'complete') {
                updateActionCards();
            } else {
                window.addEventListener('load', updateActionCards);
            }

            // Restart autoplanters and auto harvesters
            reinitializeAutoplanters();
            reinitializeAutoHarvesters();

            // Restart Nuclear Ice Melter if it was active
            if (isNuclearIceMelterActive) {
                startNuclearIceMelter();
            }

            // Handle initial glow on the plant button
            if (!hasSeenInitialGlow) {
                document.getElementById('plant-button').classList.add('glow');
            }

            // Re-initialize chart with loaded data
            initializeHarvestChart();
            updateHarvestChart();

            showToast('Game loaded successfully!', 'Your progress has been restored.', 'success');

            // Restore exploration variables
            window.explorationResourceMultiplier = gameState.explorationResourceMultiplier || 1;
            window.lastExploreTime = gameState.lastExploreTime || 0;
            window.exploreDelay = gameState.exploreDelay || 10000;
            window.waterExplorationMultiplier = gameState.waterExplorationMultiplier || 1;

            growthUpgradesApplied = gameState.growthUpgradesApplied || {
                potatoCompost: false,
                genomeModification: false,
                soilBacteria: false,
                gravitropismAccelerator: false
            };

            nuclearIceMelterPercentage = gameState.nuclearIceMelterPercentage || 3; // Default to 3 if not found
            initializeNuclearIceMelter();

            // Inside the loadGame function
            isSubsurfaceAquiferTapperUnlocked = gameState.isSubsurfaceAquiferTapperUnlocked || false;
            isSubsurfaceAquiferTapperActive = gameState.isSubsurfaceAquiferTapperActive || false; // Add this line

            // After restoring the state
            if (isSubsurfaceAquiferTapperUnlocked) {
                unlockSubsurfaceAquiferTapper();
            }

            if (isBucketWheelExcavatorUnlocked) {
                unlockBucketWheelExcavator();
                if (gameState.isBucketWheelExcavatorActive) {
                    window.isBucketWheelExcavatorActive = true;
                    const toggle = document.getElementById('bucket-wheel-excavator-toggle');
                    if (toggle) {
                        toggle.checked = true;
                        startBucketWheelExcavator();
                    }
                }
            }

            if (isSubterraneanTuberTunnelerUnlocked) {
                unlockSubterraneanTuberTunneler();
                if (gameState.isSubterraneanTuberTunnelerActive) {
                    window.isSubterraneanTuberTunnelerActive = true;
                    const toggle = document.getElementById('subterranean-tuber-tunneler-toggle');
                    if (toggle) {
                        toggle.checked = true;
                        startSubterraneanTuberTunneler();
                    }
                }
            }

            // Neural Network Loading
            neuralNetworkActive = gameState.neuralNetworkActive;
            
            // If it was active, we MUST reinitialize it
            if (neuralNetworkActive) {
                initializeNeuralNetwork(gameState.neuralNetworkState);
            }
        } catch (error) {
            console.error('Error parsing saved game state:', error);
            showToast('Error loading game', 'There was an error loading your saved game. Starting a new game.', 'error');
            return false;
        }
    } else {
        console.log('No saved game state found');
        showToast('No saved game found', 'Starting a new game.', 'info');
        return false;
    }
    
    trackEvent('game_loaded', {
        playtime_seconds: Math.floor((Date.now() - gameStartTime) / 1000),
        save_age_hours: Math.floor((Date.now() - gameStartTime) / (1000 * 60 * 60)),
        total_potatoes: Math.floor(potatoCount),
        current_tier: currentTier
    });
    
    return true; // Successfully loaded a game
}

function restoreUpgrades(savedUpgrades) {
    if (savedUpgrades && Array.isArray(savedUpgrades)) {
        upgrades.forEach(upgrade => {
            const savedUpgrade = savedUpgrades.find(u => u.name === upgrade.name);
            if (savedUpgrade) {
                upgrade.purchased = savedUpgrade.purchased || false;
                upgrade.count = savedUpgrade.count || 0;

                const isMilestoneUpgrade = upgrade.unlocksNextTier || false;

                if (!upgrade.repeatable && upgrade.purchased && upgrade.effect && !isMilestoneUpgrade) {
                    // For non-repeatable upgrades, apply the effect once without showing toasts
                    const originalShowToast = window.showToast;
                    window.showToast = () => {}; // Temporarily disable toasts
                    upgrade.effect();
                    window.showToast = originalShowToast; // Restore toast functionality
                }
            }
        });
    }
}

// Function to update the visibility of action cards
function updateActionCards() {
    const allActionCards = document.querySelectorAll('.action-card');
    const depletableCards = [
        'martian-potato-colonizer-container',
        'subsurface-aquifer-tapper-container',
        'bucket-wheel-excavator-container',
        'subterranean-tuber-tunneler-container',
        'polar-cap-mining-container'
    ];
    
    allActionCards.forEach(card => {
        const cardId = card.id;
        const isUnlocked = unlockedActionCards.includes(cardId);
        const currentDisplay = card.style.display;
        const shouldBeVisible = isUnlocked || cardId === 'exploration-container';
        
        // Only update display if it needs to change
        if ((shouldBeVisible && currentDisplay === 'none') || (!shouldBeVisible && currentDisplay === 'block')) {
            card.style.display = shouldBeVisible ? 'block' : 'none';
        }

        // Only check depletion status for visible, depletable cards
        if (shouldBeVisible && depletableCards.includes(cardId)) {
            updateDepletedActionCard(cardId, areResourcesDepleted, "Resources Depleted");
        }
    });
}

function onResourcesDepleted() {
    areResourcesDepleted = true;
    updateActionCards();
    showToast("Resources Depleted", "All resources on Mars have been depleted!", 'warning');
    
    // Specifically handle the Martian Potato Colonizer
    stopMartianPotatoColonizer();
    updateDepletedActionCard('martian-potato-colonizer-container', true, "Resources Depleted");
}

// ==========================================
//            AUTOMATION
// ==========================================

// Check and restart any stopped auto harvesters
function checkAndRestartAutoHarvesters() {
    autoHarvesters.forEach(autoHarvester => {
        if (!autoHarvester.interval) {
            startAutoHarvester(autoHarvester);
        }
    });
}

function reinitializeAutoplanters() {
    autoplanters.forEach(autoplanter => {
        // Restart the interval
        startAutoplanter(autoplanter);
    });
}

function reinitializeAutoHarvesters() {
    autoHarvesters.forEach(autoHarvester => {
        // Restart the interval
        startAutoHarvester(autoHarvester);
    });
}

function createCyclicActionCard(containerId, buttonId, startFunction, stopFunction, cycleEffect, cycleDuration, initialText, activeText, inactiveText) {
    let interval = null;
    let cycleProgress = 0;
    const LED_COUNT = 10;
    const LED_INTERVAL = cycleDuration / LED_COUNT;
    let isFirstLaunch = true;

    function updateLEDProgress(progress) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const leds = container.querySelectorAll('.led-light');
        leds.forEach((led, index) => {
            if (index < progress) {
                led.classList.add('active');
            } else {
                led.classList.remove('active');
            }
        });
    }

    function start() {
        if (interval) return;
        startFunction();
        
        // Immediately light up the first LED
        cycleProgress = 1;
        updateLEDProgress(cycleProgress);
        
        interval = setInterval(() => {
            cycleProgress++;
            if (cycleProgress === LED_COUNT) {
                cycleEffect();
            }
            if (cycleProgress > LED_COUNT) {
                cycleProgress = 1;
            }
            updateLEDProgress(cycleProgress);
        }, LED_INTERVAL);
        
        document.getElementById(buttonId).textContent = activeText;
        document.getElementById(buttonId).classList.add('active');
    }

    function stop() {
        clearInterval(interval);
        interval = null;
        cycleProgress = 0;
        updateLEDProgress(cycleProgress);
        stopFunction();
        document.getElementById(buttonId).textContent = inactiveText;
        document.getElementById(buttonId).classList.remove('active');
    }

    function toggle() {
        if (interval) {
            stop();
        } else {
            if (isFirstLaunch) {
                isFirstLaunch = false;
            }
            start();
        }
    }

    // Set initial button text
    document.getElementById(buttonId).textContent = initialText;
    document.getElementById(buttonId).addEventListener('click', toggle);

    return { start, stop, toggle };
}

const cometaryIceHarvester = createCyclicActionCard(
    'cometary-ice-harvester-container',
    'cometary-ice-harvester-button',
    () => { 
        console.log('Cometary Ice Harvester started');
        isCometaryIceHarvesterActive = true;
    },
    () => { 
        console.log('Cometary Ice Harvester stopped');
        isCometaryIceHarvesterActive = false;
    },
    () => {
        ice += 50;
        updateDisplay();
        showToast("Resources Acquired", "Cometary Ice Harvester collected 50 units of ice!", 'achievement');
    },
    30000, // 30 seconds cycle duration
    "Launch", // initialText
    "Harvesting...", // activeText
    "Harvest Comets" // inactiveText
);

function unlockSubsurfaceAquiferTapper() {
    console.log('Unlocking Subsurface Aquifer Tapper');
    isSubsurfaceAquiferTapperUnlocked = true;
    const container = document.getElementById('subsurface-aquifer-tapper-container');
    if (container) {
        container.style.display = 'block';
    }
    if (!unlockedActionCards.includes('subsurface-aquifer-tapper-container')) {
        unlockedActionCards.push('subsurface-aquifer-tapper-container');
    }
    updateActionCards();
    
    // Initialize the toggle switch
    const toggleSwitch = document.getElementById('subsurface-aquifer-tapper-toggle');
    if (toggleSwitch) {
        toggleSwitch.checked = isSubsurfaceAquiferTapperActive;
        toggleSwitch.addEventListener('change', toggleSubsurfaceAquiferTapper);
    }
}

function unlockBucketWheelExcavator() {
    console.log('Unlocking Bucket Wheel Excavator');
    isBucketWheelExcavatorUnlocked = true;
    const container = document.getElementById('bucket-wheel-excavator-container');
    if (container) {
        container.style.display = 'block';
    }
    if (!unlockedActionCards.includes('bucket-wheel-excavator-container')) {
        unlockedActionCards.push('bucket-wheel-excavator-container');
    }
    console.log('Current unlockedActionCards:', unlockedActionCards);
    updateActionCards();
}

function unlockSubterraneanTuberTunneler() {
    console.log('Unlocking Subterranean Tuber Tunneler');
    isSubterraneanTuberTunnelerUnlocked = true;
    isSubterraneanTuberTunnelerActive = false; // Ensure it starts inactive
    const container = document.getElementById('subterranean-tuber-tunneler-container');
    if (container) {
        container.style.display = 'block';
    }
    if (!unlockedActionCards.includes('subterranean-tuber-tunneler-container')) {
        unlockedActionCards.push('subterranean-tuber-tunneler-container');
    }
    console.log('Current unlockedActionCards:', unlockedActionCards);
    updateActionCards();
}

function toggleSubterraneanTuberTunneler() {
    if (isSubterraneanTuberTunnelerUnlocked) {
        isSubterraneanTuberTunnelerActive = !isSubterraneanTuberTunnelerActive;
        const toggleSwitch = document.getElementById('subterranean-tuber-tunneler-toggle');
        if (toggleSwitch) {
            toggleSwitch.checked = isSubterraneanTuberTunnelerActive;
        }
        if (isSubterraneanTuberTunnelerActive) {
            startSubterraneanTuberTunneler();
        } else {
            stopSubterraneanTuberTunneler();
        }
        console.log('Subterranean Tuber Tunneler active:', isSubterraneanTuberTunnelerActive);
    }
}

function startSubterraneanTuberTunneler() {
    console.log('Starting Subterranean Tuber Tunneler');
    isSubterraneanTuberTunnelerActive = true;
}

function stopSubterraneanTuberTunneler() {
    console.log('Stopping Subterranean Tuber Tunneler');
    isSubterraneanTuberTunnelerActive = false;
}

document.addEventListener('DOMContentLoaded', function() {
    const toggleSwitch = document.getElementById('subterranean-tuber-tunneler-toggle');
    if (toggleSwitch) {
        toggleSwitch.addEventListener('change', toggleSubterraneanTuberTunneler);
    }
});

// ==========================================
//            ACHIEVEMENTS
// ==========================================

// Display a toast notification to the user
window.showToast = function(title, message, type = 'achievement') {
    console.log("Showing toast:", title, message, type);
    const toastContainer = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
    `;
    toastContainer.appendChild(toast);

    // Trigger reflow to enable transition
    toast.offsetHeight;

    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toastContainer.removeChild(toast);
        }, 300);
    }, 3000);
}

// Check and update game achievements
function checkAchievements() {
    if (totalPotatoesHarvested >= 1 && !achievements.firstPotato) {
        achievements.firstPotato = true;
        queueAchievement(
            "First Potato",
            "You've harvested your first Martian potato!",
            "This marks the beginning of your journey to colonize Mars with potatoes.",
            "🥔"
        );
    }
    if (totalPotatoesHarvested >= 100 && !achievements.potatoCentury) {
        achievements.potatoCentury = true;
        queueAchievement(
            "Potato Century",
            "You've harvested 100 Martian potatoes!",
            "Your potato farm is starting to take shape. The future of Mars is looking delicious!",
            "potato_century.webp"
        );
    }

    // Tech Savvy achievement check
    const purchasedUpgrades = upgrades.filter(upgrade => upgrade.purchased).length;
    if (purchasedUpgrades >= 5 && !achievements.techSavvy) {
        achievements.techSavvy = true;
        queueAchievement(
            "Tech Savvy",
            "Purchase your first 5 upgrades",
            "Your technological prowess is growing! Keep advancing your Martian farming capabilities.",
            "tech_savvy.webp"
        );
    }

    // Martian Engineer achievement check
    const totalUpgrades = upgrades.length;
    const allUpgradesPurchased = upgrades.every(upgrade => upgrade.purchased);
    if (allUpgradesPurchased && !achievements.martianEngineer) {
        achievements.martianEngineer = true;
        queueAchievement(
            "Martian Engineer",
            "Unlock all upgrades",
            "You've mastered every technological advancement available. Mars trembles before your engineering prowess!",
            "martian_engineer.webp"
        );
    }
    // Add more achievement checks here as needed

    // One Sol Wonder achievement check
    const currentTime = Date.now();
    const playTime = currentTime - gameStartTime;
    
    if (playTime >= MARTIAN_SOL_LENGTH && !achievements.oneSolWonder) {
        achievements.oneSolWonder = true;
        queueAchievement(
            "One Sol Wonder",
            "Play for One Martian Day",
            "You've survived a full Martian day (24 hours and 37 minutes) of potato farming. Your dedication to Mars is impressive!",
            "one_sol_wonder.webp"
        );
    }

    // Potato Empire achievement check
    if (!achievements.potatoEmpire && 
        potatoCount >= 1000 && 
        water >= 1000 && 
        nutrients >= 1000 && 
        ice >= 1000) {
        achievements.potatoEmpire = true;
        queueAchievement(
            "Potato Empire",
            "Resource Mastery",
            "Your Martian colony has reached unprecedented prosperity with massive stockpiles of all resources!",
            "potato_empire.webp"
        );
    }
}

// ==========================================
//            DISPLAY
// ==========================================

// Initialize the visual representation of the potato field
function initializePotatoField() {
    const fieldContainer = document.getElementById('potato-field');
    fieldContainer.innerHTML = ''; // Clear existing slots
    for (let i = 0; i < MAX_FIELD_SIZE; i++) {
        const slotElement = document.createElement('div');
        slotElement.className = 'potato-slot';
        slotElement.setAttribute('data-index', i);
        fieldContainer.appendChild(slotElement);
    }
}

// Update the game display with current resource counts and rates
function updateDisplay() {
    updateResourceCounts();
    updateAutoHarvestersInfo();
    updateAutoPlantersInfo();
    updateNuclearIceMelterToggle();
    updateExploreButton();
    updatePotatoField();
    updateTechTree();
    updateIceMeltingProgress();
    updateIceMeltingBasinButton();
    if (neuralNetworkActive) {
        updateTerminalDisplay(); // Update neural network terminal
    }
}

function updateAutoHarvestersInfo() {
    updateElementIfChanged('auto-harvesters', `Harvesting Rovers: ${autoHarvesters.length}`);
}

function updateAutoPlantersInfo() {
    const autoplantersElement = document.getElementById('automated-planters');
    if (autoplantersElement) {
        const newText = `Planting Rovers: ${autoplanters.length}`;
        if (autoplantersElement.textContent !== newText) {
            autoplantersElement.textContent = newText;
            autoplantersElement.style.display = autoplanters.length > 0 ? 'block' : 'none';
        }
    }
}

function updateNuclearIceMelterToggle() {
    const nuclearIceMelterToggle = document.getElementById('nuclear-ice-melter-toggle');
    const nuclearIceMelterDisplay = document.getElementById('nuclear-ice-melter-display');
    if (nuclearIceMelterToggle) {
        nuclearIceMelterToggle.checked = isNuclearIceMelterActive;
    }
    if (nuclearIceMelterDisplay) {
        const displayValue = (nuclearIceMelterPercentage * 10).toString();
        // Pad with a single zero only if it's a one-digit number
        const paddedValue = displayValue.length === 1 ? '0' + displayValue : displayValue;
        nuclearIceMelterDisplay.textContent = `${paddedValue}%`;
    }
}

function updateElementIfChanged(id, newText) {
    const element = document.getElementById(id);
    if (element && element.textContent !== newText) {
        element.textContent = newText;
    }
}

// Update the explore button state and cooldown display
function updateExploreButton() {
    const exploreCard = document.getElementById('exploration-container');
    const cooldownElement = document.getElementById('exploration-cooldown');
    
    if (!exploreCard || !cooldownElement) return;

    const currentTime = Date.now();
    const timeLeft = Math.max(0, window.exploreDelay - (currentTime - window.lastExploreTime));
    const isDisabled = timeLeft > 0;
    
    // Only update disabled state if it changed
    if (isDisabled !== exploreCard.hasAttribute('disabled')) {
        if (isDisabled) {
            exploreCard.setAttribute('disabled', 'true');
        } else {
            exploreCard.removeAttribute('disabled');
        }
    }
    
    // Only update cooldown text if it changed
    const newText = isDisabled ? `(${(timeLeft / 1000).toFixed(1)}s)` : 'Ready';
    if (cooldownElement.textContent !== newText) {
        cooldownElement.textContent = newText;
    }
}

// Update the visual representation of the potato field
function updatePotatoField() {
    const fieldContainer = document.getElementById('potato-field');
    const fragment = document.createDocumentFragment(); // Use document fragment
    
    potatoField.forEach((potato, index) => {
        let slotElement = fieldContainer.querySelector(`.potato-slot[data-index="${index}"]`);
        if (!slotElement) {
            slotElement = document.createElement('div');
            slotElement.className = 'potato-slot';
            slotElement.setAttribute('data-index', index);
            fragment.appendChild(slotElement);
        }

        if (potato === null) {
            slotElement.innerHTML = '';
        } else {
            updatePotatoElement(slotElement, potato);
        }
    });

    if (fragment.children.length > 0) {
        fieldContainer.appendChild(fragment); // Batch DOM updates
    }
}

// Update the visual representation of a single potato
function updatePotatoElement(slotElement, potato) {
    let potatoElement = slotElement.querySelector('.potato');
    if (!potatoElement) {
        potatoElement = document.createElement('div');
        potatoElement.className = 'potato';
        potatoElement.innerHTML = `
            <div class="growth-indicator"></div>
            <div class="growth-text-container">
                <span class="growth-text"></span>
            </div>
        `;
                slotElement.appendChild(potatoElement);
            }

    const growthStage = potato.growthStage;
    const harvestableClass = growthStage >= 100 ? 'harvestable' : '';
    const quantumClass = potato.isQuantumSpawned ? 'quantum-potato' : '';
    const growthColor = growthStage < 33 ? 'rgba(139, 195, 74, 0.4)' : 
                        growthStage < 66 ? 'rgba(76, 175, 80, 0.4)' : 
                        'rgba(56, 142, 60, 0.4)';

    potatoElement.className = `potato ${harvestableClass} ${quantumClass} ${potato.textureClass}`;
            potatoElement.style.transform = `scale(${potato.scaleX}, ${potato.scaleY})`;
            potatoElement.style.borderRadius = potato.borderRadius;

            const growthIndicator = potatoElement.querySelector('.growth-indicator');
    growthIndicator.style.height = `${growthStage}%`;
    growthIndicator.style.backgroundColor = growthColor;
    
    const growthText = potatoElement.querySelector('.growth-text');
    growthText.textContent = `${growthStage}%`;
}


// ==========================================
//            MANUAL ACTION FUNCTIONS
// ==========================================

// Handle manual ice melting process
function meltIce(event) {   
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    if (!isManualIceMeltingUnlocked) {
        console.log('Ice melting not unlocked');
        return;
    }
    
    if (ice >= 1) {
        waterMeltingClicks++;
        updateIceMeltingProgress();
        
        if (waterMeltingClicks >= CLICKS_PER_WATER) {
            ice--;
            water++;
            waterMeltingClicks = 0;
            showToast("Water Collected", "You've melted ice and collected 1 unit of water!", 'achievement');
        }
        updateDisplay();
    } else {
        showToast("Not Enough Ice", "You need at least 1 ice to melt!", 'setback');
    }
}

// Unlock the manual ice melting feature
function unlockManualIceMelting() {
    console.log('Unlocking manual ice melting');
    isManualIceMeltingUnlocked = true;
    
    const iceMeltingContainer = document.getElementById('ice-melting-container');
    if (iceMeltingContainer) {
        console.log('Setting up ice melting container display');
        iceMeltingContainer.style.display = 'block';
        // Check if we're accidentally adding another event listener here
        console.log('Current click listeners on container:', iceMeltingContainer.onclick);
    }
}

// Update the visual progress of ice melting
function updateIceMeltingProgress() {
    const progressElement = document.getElementById('ice-melting-progress');
    if (progressElement) {
        progressElement.textContent = `Clicks: ${waterMeltingClicks} / ${CLICKS_PER_WATER}`;
    }
}

// Unlock the Ice Melting Basin
function unlockIceMeltingBasin() {
    isIceMeltingBasinUnlocked = true;
    if (!unlockedActionCards.includes('ice-melting-basin-container')) {
        unlockedActionCards.push('ice-melting-basin-container');
    }
    updateActionCards();
    updateIceMeltingBasinButton();
}

// Handle filling the Ice Melting Basin
function fillIceMeltingBasin() {
    const container = document.getElementById('ice-melting-basin-container');
    if (container && !container.hasAttribute('disabled')) {
        if (!isIceMeltingBasinUnlocked || iceMeltingBasinActive) return;
        
        if (ice >= 8) {
            ice -= 8;
            iceMeltingBasinActive = true;
            iceMeltingBasinTimer = 8;
            updateDisplay();
            updateIceMeltingBasinButton();
        } else {
            showToast("Not Enough Ice", "You need at least 8 ice to fill the basin!", 'setback');
        }
    }
}

// Update the Ice Melting Basin button
function updateIceMeltingBasinButton() {
    const basinContainer = document.getElementById('ice-melting-basin-container');
    const cooldownElement = document.getElementById('basin-cooldown');
    if (basinContainer && cooldownElement) {
        if (iceMeltingBasinActive) {
            basinContainer.setAttribute('disabled', 'true');
            cooldownElement.textContent = `Melting (${iceMeltingBasinTimer}s)`;
        } else {
            basinContainer.removeAttribute('disabled');
            cooldownElement.textContent = 'Ready';
        }
    }
}

// ==========================================
//            COMETARY ICE FUNCTIONS
// ==========================================

function unlockCometaryIceHarvester() {
    isCometaryIceHarvesterUnlocked = true;
    if (!unlockedActionCards.includes('cometary-ice-harvester-container')) {
        unlockedActionCards.push('cometary-ice-harvester-container');
    }
    updateActionCards();
}

function toggleCometaryIceHarvester() {
    if (!isCometaryIceHarvesterUnlocked) return;
    cometaryIceHarvester.toggle();
}

// ==========================================
//            POTATO COLONIZER FUNCTIONS
// ==========================================

function unlockMartianPotatoColonizer() {
    isMartianPotatoColonizerUnlocked = true;
    colonizerCycle = 0;
    if (!unlockedActionCards.includes('martian-potato-colonizer-container')) {
        unlockedActionCards.push('martian-potato-colonizer-container');
    }
    updateActionCards();
    initializeMartianPotatoColonizer();
}

function initializeMartianPotatoColonizer() {
    console.log('Initializing Martian Potato Colonizer');
    const button = document.querySelector('.action-button.colonizer');
    if (button) {
        console.log('Martian Potato Colonizer button found');
        button.removeEventListener('click', toggleMartianPotatoColonizer);
        button.addEventListener('click', toggleMartianPotatoColonizer);
    } else {
        console.warn('Martian Potato Colonizer button not found');
    }
    updateMartianPotatoColonizerUI();
}

function toggleMartianPotatoColonizer() {
    console.log('Toggling Martian Potato Colonizer');
    console.log('Current state:', isMartianPotatoColonizerActive);
    if (isMartianPotatoColonizerActive) {
        stopMartianPotatoColonizer();
    } else {
        startMartianPotatoColonizer();
    }
    updateMartianPotatoColonizerUI();
}

function startMartianPotatoColonizer() {
    console.log('Starting Martian Potato Colonizer');
    console.log('Current cycle:', colonizerCycle, 'Max cycles:', maxColonizerCycles);
    if (colonizerCycle >= maxColonizerCycles) {
        console.log('Colonizer Depleted');
        showToast("Colonizer Depleted", "The Martian Potato Colonizer has reached its maximum cycles.", 'warning');
        return;
    }
    isMartianPotatoColonizerActive = true;
    updateMartianPotatoColonizerUI();
    runMartianPotatoColonizerCycle();
}

function stopMartianPotatoColonizer() {
    console.log('Stopping Martian Potato Colonizer');
    isMartianPotatoColonizerActive = false;
    if (window.martianPotatoColonizerIntervalId) {
        clearInterval(window.martianPotatoColonizerIntervalId);
        window.martianPotatoColonizerIntervalId = null;
        console.log('Cleared Martian Potato Colonizer interval');
    }
    if (areResourcesDepleted) {
        console.log('Resources Depleted');
        updateDepletedActionCard('martian-potato-colonizer-container', true, "Resources Depleted");
    } else {
        updateMartianPotatoColonizerUI();
    }
}

function runMartianPotatoColonizerCycle() {
    console.log('Running Martian Potato Colonizer cycle');
    if (!isMartianPotatoColonizerActive) return;

    // Calculate the current cycle duration based on the cycle number
    const cycleDuration = Math.max(
        INITIAL_COLONIZER_CYCLE_DURATION * Math.pow(0.7, colonizerCycle),
        MIN_COLONIZER_CYCLE_DURATION
    );
    console.log(`Current cycle duration: ${cycleDuration}ms`);

    const ledCount = 10;
    const ledUpdateInterval = cycleDuration / ledCount;

    let currentLed = 0;
    window.martianPotatoColonizerIntervalId = setInterval(() => {
        if (!isMartianPotatoColonizerActive) {
            clearInterval(window.martianPotatoColonizerIntervalId);
            window.martianPotatoColonizerIntervalId = null;
            return;
        }

        updateLEDProgress('martian-potato-colonizer-container', currentLed + 1);
        currentLed++;

        if (currentLed >= ledCount) {
            clearInterval(window.martianPotatoColonizerIntervalId);
            window.martianPotatoColonizerIntervalId = null;
            martianPotatoColonizerEffect();
            updateMartianPotatoColonizerUI();

            if (colonizerCycle < maxColonizerCycles && isMartianPotatoColonizerActive) {
                runMartianPotatoColonizerCycle();
            } else {
                stopMartianPotatoColonizer();
            }
        }
    }, ledUpdateInterval);
}

function updateMartianPotatoColonizerUI() {
    console.log('Updating Martian Potato Colonizer UI');
    const button = document.querySelector('.action-button.colonizer');
    if (button) {
        const newText = isMartianPotatoColonizerActive ? "Colonizing..." : "Colonize";
        console.log('Button state:', newText);
        button.textContent = newText;
        button.classList.toggle('active', isMartianPotatoColonizerActive);
    } else {
        console.warn('Martian Potato Colonizer button not found in updateMartianPotatoColonizerUI');
    }
    updateLEDProgress('martian-potato-colonizer-container', 0);
}

function updateLEDProgress(containerId, progress) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const leds = container.querySelectorAll('.led-light');
    leds.forEach((led, index) => {
        led.classList.toggle('active', index < progress);
    });
}

function martianPotatoColonizerEffect() {
    let resourceAmount = Math.pow(2, colonizerCycle) * 100;

    potatoCount += resourceAmount;
    totalPotatoesHarvested += resourceAmount;
    water += resourceAmount;
    nutrients += resourceAmount;
    ice += resourceAmount;

    updateDisplay();
    
    const nextCycleDuration = Math.max(
        INITIAL_COLONIZER_CYCLE_DURATION * Math.pow(0.7, colonizerCycle + 1),
        MIN_COLONIZER_CYCLE_DURATION
    );
    showToast("Resources Acquired", `Martian Potato Colonizer harvested ${resourceAmount} of each resource! Next cycle in ${(nextCycleDuration / 1000).toFixed(1)}s`, 'achievement');

    colonizerCycle++;

    if (colonizerCycle >= maxColonizerCycles) {
        onResourcesDepleted(); // Call this function when max cycles are reached
    }

    updateHarvestHistory();
}

// ==========================================
//       QUANTUM SPUD SPAWNER FUNCTIONS
// ==========================================

function startQuantumSpudSpawner() {
    if (!isQuantumSpudSpawnerActive) {
        isQuantumSpudSpawnerActive = true;
        quantumSpudSpawnerInterval = setInterval(() => {
            for (let i = 0; i < potatoField.length; i++) {
                if (potatoField[i] === null && consumeResources()) {
                    // Plant a new potato with isQuantumSpawned set to true
                    potatoField[i] = createPotato(true, true);
                    updatePotatoFieldDisplay();
                } else if (potatoField[i] && potatoField[i].growthStage >= 100) {
                    // Harvest the potato
                    harvestPotatoAtIndex(i, true);
                }
            }
            updateDisplay();
        }, 600);
    }
}

function stopQuantumSpudSpawner() {
    if (isQuantumSpudSpawnerActive) {
        isQuantumSpudSpawnerActive = false;
        clearInterval(quantumSpudSpawnerInterval);
    }
}

function createPotato(instantGrowth = false, isQuantumSpawned = false) {
    const currentTime = Date.now();
    const scaleX = 0.95 + Math.random() * 0.1;
    const scaleY = 0.95 + Math.random() * 0.1;
    const borderRadius = `${45 + Math.random() * 10}% ${55 + Math.random() * 10}% ${50 + Math.random() * 10}% ${50 + Math.random() * 10}% / ${50 + Math.random() * 10}% ${50 + Math.random() * 10}% ${55 + Math.random() * 10}% ${45 + Math.random() * 10}%`;
    const textureClass = `potato-texture-${Math.floor(Math.random() * 8) + 1}`;
    
    return {
        plantedAt: currentTime,
        growthStage: instantGrowth ? 100 : 0,
        scaleX,
        scaleY,
        borderRadius,
        textureClass,
        isQuantumSpawned
    };
}

// function to toggle the Quantum Spud Spawner
function toggleQuantumSpudSpawner() {
    if (isQuantumSpudSpawnerActive) {
            stopQuantumSpudSpawner();
    } else {
        startQuantumSpudSpawner();
    }
    updateQuantumSpudSpawnerToggle();
}

// function to update the Quantum Spud Spawner toggle button
function updateQuantumSpudSpawnerToggle() {
    const toggleElement = document.getElementById('quantum-spud-spawner-toggle');
    if (toggleElement) {
        toggleElement.checked = isQuantumSpudSpawnerActive;
    }
}

// ==========================================
//            NUCLEAR ICE MELTER FUNCTIONS
// ==========================================

// Unlock the Nuclear Ice Melter
function unlockNuclearIceMelter() {
    isNuclearIceMelterUnlocked = true;
    if (!unlockedActionCards.includes('nuclear-ice-melter-container')) {
        unlockedActionCards.push('nuclear-ice-melter-container');
    }
    updateActionCards();
}

// Start the Nuclear Ice Melter
function startNuclearIceMelter() {
    if (potatoCount >= 100) {
        potatoCount -= 100;
        updateDisplay();

        nuclearIceMelterInterval = setInterval(() => {
            // Calculate ice to melt based on the knob's percentage
            const iceToMelt = Math.max(1, Math.floor((ice * nuclearIceMelterPercentage) / 100));

            if (ice >= iceToMelt) {
                ice -= iceToMelt;
                water += iceToMelt;
                updateDisplay();
            } else if (ice >= 1) {
                // Melt remaining ice if less than iceToMelt but at least 1
                water += ice;
                ice = 0;
                updateDisplay();
            } else {
                showToast("Resource Shortage", "Not enough ice to continue melting!", 'setback');
                toggleNuclearIceMelter(); // Turn off if resources are insufficient
            }
        }, 1000); // Runs every second
    } else {
        showToast("Resource Shortage", "Not enough potatoes to start the Nuclear Ice Melter!", 'setback');
        // Turn off the toggle switch
        const toggle = document.getElementById('nuclear-ice-melter-toggle');
        if (toggle) {
            toggle.checked = false;
        }
    }
}

// Stop the Nuclear Ice Melter
function stopNuclearIceMelter() {
    clearInterval(nuclearIceMelterInterval);
}

// Toggle the Nuclear Ice Melter
function toggleNuclearIceMelter() {
    if (isNuclearIceMelterActive) {
        isNuclearIceMelterActive = false;
        stopNuclearIceMelter();
    } else {
        isNuclearIceMelterActive = true;
        startNuclearIceMelter();
    }
}

// Initialize the Nuclear Ice Melter
function initializeNuclearIceMelter() {
    const knobElement = document.getElementById('nuclear-ice-melter-knob');
    if (knobElement) {
        if (!iceMelterKnob) {
            // Create the knob if it doesn't exist
            iceMelterKnob = new Knob({
                id: 'nuclear-ice-melter-knob',
                lowVal: 1,
                highVal: 10,
                value: nuclearIceMelterPercentage,
                sensitivity: 1,
                type: 'FStyle',
                size: 'large',
                label: false
            });
        } else {
            // Update the existing knob
            iceMelterKnob.setValue(nuclearIceMelterPercentage);
        }
        updateNuclearIceMelterDisplay();
    }
}

// Knob Change Handler
window.knobChanged = function(id, val) {
    if (id === 'nuclear-ice-melter-knob') {
        nuclearIceMelterPercentage = parseInt(val);
        console.log(`Nuclear Ice Melter percentage set to ${nuclearIceMelterPercentage * 10}%`);
        updateNuclearIceMelterDisplay();
    }
};

// Update the Nuclear Ice Melter Display
function updateNuclearIceMelterDisplay() {
    const nuclearIceMelterDisplay = document.getElementById('nuclear-ice-melter-display');
    if (nuclearIceMelterDisplay) {
        const displayValue = (nuclearIceMelterPercentage * 10).toString();
        nuclearIceMelterDisplay.textContent = `${displayValue}%`;
    }
}

// ==========================================
//           Polar Cap Mining Functions
// ==========================================

function unlockPolarCapMining() {
    isPolarCapMiningUnlocked = true;
    const miningContainer = document.getElementById('polar-cap-mining-container');
    if (miningContainer) {
        miningContainer.style.display = 'block';
    }
}

function togglePolarCapMining() {
    if (!isPolarCapMiningUnlocked) return;

    isPolarCapMiningActive = !isPolarCapMiningActive;
    const toggleSwitch = document.getElementById('polar-cap-mining-toggle');
    if (toggleSwitch) {
        toggleSwitch.checked = isPolarCapMiningActive;
    }

    if (isPolarCapMiningActive) {
        startPolarCapMining();
    } else {
        stopPolarCapMining();
    }
}

function startPolarCapMining() {
    polarCapMiningInterval = setInterval(() => {
        if (potatoCount >= 1) {  
            potatoCount -= 1;    
            ice += 4;             
            updateDisplay();
        } else {
            showToast("Resource Shortage", "Not enough potatoes to run Polar Cap Mining!", 'setback');
            togglePolarCapMining(); // Turn off if resources are insufficient
        }
    }, 1000); // Runs every second
}

function stopPolarCapMining() {
    clearInterval(polarCapMiningInterval);
}

// ==========================================
//           Chart / Harvest History Functions
// ==========================================

// Function to get the playtime
function getPlaytime() {
    const playtimeMillis = Date.now() - gameStartTime;
    const playtimeSeconds = Math.floor((playtimeMillis / 1000) % 60);
    const playtimeMinutes = Math.floor((playtimeMillis / (1000 * 60)) % 60);
    const playtimeHours = Math.floor(playtimeMillis / (1000 * 60 * 60));
    return `${playtimeHours}h ${playtimeMinutes}m ${playtimeSeconds}s`;
}

// Function to update harvest history with time-based aggregation
function updateHarvestHistory() {
    const now = Date.now();
    const updateInterval = harvestHistory.length < EARLY_GAME_THRESHOLD ? 
        EARLY_GAME_UPDATE_INTERVAL : 
        REGULAR_UPDATE_INTERVAL;
    
    // Only update if enough time has passed or if it's the first entry
    if (harvestHistory.length === 0 || now - lastHarvestUpdateTime >= updateInterval) {
        harvestHistory.push({
            timestamp: now,
            totalPotatoes: totalPotatoesHarvested
        });
        lastHarvestUpdateTime = now;
        updateHarvestChart();
    }
}

// Initialize the harvest chart
let harvestChart;

function initializeHarvestChart() {
    if (harvestChart) {
        harvestChart.destroy();
    }
    
    const formatMissionTime = (timestamp) => {
        const elapsed = timestamp - gameStartTime;
        const minutes = Math.floor(elapsed / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        // Calculate Martian Sols (1 sol = 24h 37m = 88620 seconds)
        const sols = Math.floor(elapsed / MARTIAN_SOL_LENGTH);
        
        if (sols > 0) return `T+${sols} ${sols === 1 ? 'Sol' : 'Sols'}`;
        if (days > 0) return `T+${days}d`;
        if (hours > 0) return `T+${hours}h`;
        if (minutes > 0) return `T+${minutes}m`;
        return 'T+0';
    };

    const ctx = document.getElementById('harvestChart').getContext('2d');
    harvestChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Total Potatoes Harvested',
                data: [],
                borderColor: '#C2A378',
                borderWidth: 2,
                fill: false,
                tension: 0.1
            }]
        },
        options: {
            animation: false,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'minute',
                    },
                    ticks: {
                        maxTicksLimit: 8,
                        maxRotation: 0,
                        autoSkip: true,
                        callback: function(value) {
                            return formatMissionTime(value);
                        }
                    },
                    title: {
                        display: true,
                        text: 'Mission Time'
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Total Potatoes Harvested'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            return formatMissionTime(context[0].parsed.x);
                        },
                        label: function(context) {
                            return `Total Potatoes: ${context.parsed.y}`;
                        }
                    }
                },
                decimation: {
                    enabled: true,
                    algorithm: 'min-max',
                    samples: 200
                }
            }
        }
    });
}

// Update the harvest chart data
function updateHarvestChart() {
    if (!harvestChart) return;

    // Map harvestHistory to chart data
    const timestamps = harvestHistory.map(entry => new Date(entry.timestamp));
    const totals = harvestHistory.map(entry => entry.totalPotatoes);

    harvestChart.data.labels = timestamps;
    harvestChart.data.datasets[0].data = totals;
    harvestChart.update();

    // Update UI elements
    const totalPotatoesCount = document.getElementById('total-potatoes-count');
    if (totalPotatoesCount) {
        totalPotatoesCount.textContent = totalPotatoesHarvested;
    }

    const missionTimeValue = document.getElementById('mission-time-value');
    if (missionTimeValue) {
        missionTimeValue.textContent = getElapsedMartianTime();
    }
}

function getElapsedMartianTime() {
    const elapsedMillis = Date.now() - gameStartTime;
    const elapsedEarthSeconds = elapsedMillis / 1000;
    const martianSeconds = elapsedEarthSeconds / 1.02749;

    const martianHours = Math.floor(martianSeconds / 3698.958);
    const remainingSeconds = martianSeconds % 3698.958;
    const martianMinutes = Math.floor(remainingSeconds / 61.6493);
    const finalMartianSeconds = Math.floor(remainingSeconds % 61.6493);

    return `${martianHours.toString().padStart(2, '0')}:${martianMinutes.toString().padStart(2, '0')}:${finalMartianSeconds.toString().padStart(2, '0')} MTC`;
}

// ==========================================
//            EVENT LISTENERS
// ==========================================

function initializeEventListeners() {
    // Core Game Controls
    addEventListenerIfExists('plant-button', 'click', plantPotato);
    addEventListenerIfExists('save-button', 'click', saveGame);
    addEventListenerIfExists('reset-button', 'click', resetGame);

    // Save game shortcut (Ctrl/Cmd + S)
    document.addEventListener('keydown', function(event) {
        if ((event.metaKey || event.ctrlKey) && event.key === 's') {
            event.preventDefault();
            saveGame();
        }
    });
    
    // Game Field Interactions
    document.getElementById('potato-field').addEventListener('click', handlePotatoFieldClick);

    // Debug Controls
    document.addEventListener('keydown', handleKeyPress);  // 'D' key toggle
    addEventListenerIfExists('minimize-debug', 'click', toggleDebugInfoMinimize);

    // Toggle Switches
    addEventListenerIfExists('subsurface-aquifer-tapper-toggle', 'change', 
        () => window['toggleSubsurfaceAquiferTapper']());
    addEventListenerIfExists('bucket-wheel-excavator-toggle', 'change', 
        () => window['toggleBucketWheelExcavator']());
    addEventListenerIfExists('polar-cap-mining-toggle', 'change', togglePolarCapMining);
    addEventListenerIfExists('quantum-spud-spawner-toggle', 'change', toggleQuantumSpudSpawner);

    // Action Cards
    addEventListenerIfExists('exploration-container', 'click', exploreMarsSurface);
    
    // Nuclear Ice Melter Controls
    initializeNuclearIceMelterControls();

    // Chart Modal Controls
    initializeChartModalListeners();
}

// Control Initialization Functions

function initializeNuclearIceMelterControls() {
    // Nuclear Ice Melter Toggle
    const nuclearIceMelterToggle = document.getElementById('nuclear-ice-melter-toggle');
    if (nuclearIceMelterToggle) {
        nuclearIceMelterToggle.removeEventListener('change', toggleNuclearIceMelter);
        nuclearIceMelterToggle.removeEventListener('click', handleNuclearIceMelterClick);
        nuclearIceMelterToggle.addEventListener('click', handleNuclearIceMelterClick);
    }

    // Nuclear Ice Melter Knob Handler
    window.knobChanged = function(id, val) {
        if (id === 'nuclear-ice-melter-knob') {
            nuclearIceMelterPercentage = parseInt(val);
            updateNuclearIceMelterDisplay();
        }
    };
}

// ---------------
// Event Handler Functions
// ---------------

function handlePotatoFieldClick(event) {
    const slotElement = event.target.closest('.potato-slot');
    if (slotElement) {
        const index = parseInt(slotElement.getAttribute('data-index'), 10);
        if (potatoField[index] && potatoField[index].growthStage >= 100) {
            harvestPotatoAtIndex(index);
        }
    }
}

function handleKeyPress(event) {
    if (event.key.toLowerCase() === 'd') {
        toggleDebugMode();
    }
}

function handleNuclearIceMelterClick(event) {
    event.preventDefault();
    event.stopPropagation();
    toggleNuclearIceMelter();
}

function toggleDebugInfoMinimize() {
    const debugInfo = document.getElementById('debug-info');
    debugInfo.classList.toggle('minimized');
    const minimizeDebugButton = document.getElementById('minimize-debug');
    minimizeDebugButton.setAttribute('data-text', 
        debugInfo.classList.contains('minimized') ? 'Maximize' : 'Minimize');
}

function initializeChartModalListeners() {
    let harvestChartInitialized = false;
    const chartButton = document.getElementById('chart-button');
    const chartModal = document.getElementById('chart-modal');
    const closeChartModal = document.querySelector('.close-chart-modal');
    
    if (chartButton && chartModal && closeChartModal) {
        // Open chart modal
        chartButton.addEventListener('click', () => {
            chartModal.style.display = 'flex';
            if (!harvestChartInitialized) {
                initializeHarvestChart();
                harvestChartInitialized = true;
            }
            updateHarvestChart();
        });

        // Close chart modal
        closeChartModal.addEventListener('click', () => {
            chartModal.style.display = 'none';
        });

        // Close on outside click
        chartModal.addEventListener('click', (event) => {
            if (event.target === chartModal) {
                chartModal.style.display = 'none';
            }
        });
    }
}

// Initialize everything when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    initializeGame();
});

// ==========================================
//            DEBUGGING FUNCTIONS
// ==========================================

// Toggle debug mode on/off
function toggleDebugMode() {
    debugMode = !debugMode;
    console.log('Debug mode toggled:', debugMode);
    const debugInfo = document.getElementById('debug-info');
    
    if (debugInfo) {
        debugInfo.style.display = debugMode ? 'block' : 'none';
        
        if (debugMode) {
            // Start debug updates every second
            debugUpdateInterval = setInterval(() => {
                updateDebugInfo(performance.now());
            }, 1000);
            
            potatoCount += 1000000;
            updateDisplay();
            showToast("Debug Mode Enabled", "Added 1,000,000 potatoes for testing. Press 'D' to toggle.", 'debug');
        } else {
            // Clear the interval when debug mode is disabled
            if (debugUpdateInterval) {
                clearInterval(debugUpdateInterval);
                debugUpdateInterval = null;
            }
            showToast("Debug Mode Disabled", "Press 'D' to re-enable debug mode.", 'debug');
        }
    }
}

// Update debug information display
function updateDebugInfo(currentTime) {
    const debugInfoContainer = document.getElementById('debug-info');
    if (!debugInfoContainer || debugInfoContainer.style.display === 'none') {
        return;
    }

    try {
        const updateElement = (id, text) => {
            const element = debugInfoContainer.querySelector(`#${id}`);
            if (element) element.textContent = text;
        };

        updateElement('memory-usage', `Memory Usage: ${performance.memory ? (performance.memory.usedJSHeapSize / (1024 * 1024)).toFixed(2) : 'N/A'} MB`);
        updateElement('potato-count-debug', `Potato Count: ${potatoCount.toFixed(2)}`);
        updateElement('active-potatoes', `Active Potatoes: ${potatoField.filter(potato => potato !== null).length}`);
        updateElement('planting-delay', `Planting Delay: ${plantingDelay}ms`);
        updateElement('playtime-debug', `Playtime: ${getPlaytime()}`);
    } catch (error) {
        console.error('Error updating debug info:', error);
    }
}

function getNeuralNetworkState() {
    const state = {
        isActive: isNeuralNetworkActive,
        progress: trainingProgress,
        phase: currentPhase,
        minimized: terminalMinimized,
        // Add any other state we need to persist
    };
    return state;
}

// Initialize header scroll behavior
function initializeHeaderScroll() {
    let lastScrollTop = 0;
    const header = document.getElementById('game-header');
    const scrollThreshold = 10;

    window.addEventListener('scroll', () => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // Show header when scrolling to top
        if (scrollTop <= 0) {
            header.classList.remove('hidden');
            return;
        }
        
        // Hide header when scrolling down, show when scrolling up
        if (Math.abs(scrollTop - lastScrollTop) > scrollThreshold) {
            if (scrollTop > lastScrollTop) {
                header.classList.add('hidden');
            } else {
                header.classList.remove('hidden');
            }
            lastScrollTop = scrollTop;
        }
    });
}


// Google Analytics Event Tracking
function trackEvent(eventName, eventParams = {}) {
    if (typeof gtag !== 'undefined') {
        // Add common parameters
        const commonParams = {
            total_potatoes: Math.floor(potatoCount),
            total_harvested: totalPotatoesHarvested,
            current_tier: currentTier,
            playtime_seconds: Math.floor((Date.now() - gameStartTime) / 1000)
        };
        
        gtag('event', eventName, { ...commonParams, ...eventParams });
    }
}

// Utility function to count automation devices
function getAutomationDevicesCount() {
    return {
        autoplanters: autoplanters.length,
        autoharvesters: autoHarvesters.length,
        quantum_spawner: isQuantumSpudSpawnerActive ? 1 : 0
    };
}