// This file contains the core game logic for the Martian Potato game
// It manages game state, resource handling, potato planting and harvesting, and UI updates

// Game Constants
let MAX_FIELD_SIZE = 8;
const GROWTH_TIME = 8000; // Base growth time in milliseconds
const UPDATE_INTERVAL = 1000; // Update every second
const FRAME_RATE = 30; // 30 fps
const FRAME_DELAY = 1000 / FRAME_RATE;
const CLICKS_PER_WATER = 5;

// System Variables
let lastUpdateTime = 0;
let lastFrameTime = 0;
let debugMode = false;
let lastSaveTime = 0;

// Resource Variables
let potatoCount = 0;
let water = 100;
let nutrients = 100;
let ice = 100;

// Planting Variables
let plantingDelay = 3000;
let lastPlantTime = 0;
let potatoesPerClick = 1;
let isFirstPlant = true;

// Resource Efficiency Multipliers
let waterEfficiency = 1;
let soilEfficiency = 1;
let iceEfficiency = 1;

// Ice Melting Variables
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

// Polar Cap Mining Variables
let isPolarCapMiningUnlocked = false;
let isPolarCapMiningActive = false;
let polarCapMiningInterval = null;

// Large Data Structures
let potatoField = new Array(MAX_FIELD_SIZE).fill(null);

// Achievement Tracking
const defaultAchievements = {
    firstPotato: false,
    potatoCentury: false,
    // Add other achievements here
};
let achievements = { ...defaultAchievements };
let MAX_TIER = 5;

// Debug Variables
let fpsValues = [];
let lastDebugUpdateTime = 0;
let lastResourceValues = { water: 0, nutrients: 0, ice: 0 };
let lastAction = "None";

// Add this variable at the top of the file with other game state variables
let hasSeenInitialGlow = false;

// **Introduce a multiplier for growth time**
let growthTimeMultiplier = 1; // Starts at 1, decreases with upgrades

// Add this with other variables
let totalPotatoesHarvested = 0;

// Add harvest history array to store harvest events
let harvestHistory = [];

// Initialize game start time
let gameStartTime = Date.now();

// Main game loop function
function gameLoop(currentTime) {
    if (currentTime - lastFrameTime >= FRAME_DELAY) {
        updatePlantButton();
        if (updateResources(currentTime)) {
            updateDisplay();
            checkAndRestartAutoplanters();
        }
        updatePotatoGrowth();
        updateTechTree();
        updateExploreButton();
        
        // Auto-save every minute
        if (currentTime - lastSaveTime >= 60000) {
            saveGame();
            lastSaveTime = currentTime;
        }
        
        if (debugMode) {
            const updateTime = performance.now() - startTime;
            updateDebugInfo(currentTime, updateTime);
        }
        
        lastFrameTime = currentTime;
    }
    requestAnimationFrame(gameLoop);
}

// Update game resources and ensure they don't go below zero
function updateResources(currentTime) {
    if (currentTime - lastUpdateTime >= UPDATE_INTERVAL) {
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

        lastUpdateTime = currentTime;
        return true;
    }
    return false;
}

// Update non-critical elements during idle time
function updateNonCriticalElements() {
    requestIdleCallback(() => {
        displayExplorationUpgrades();
    });
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
        // Generate random potato appearance properties
        const scaleX = 0.95 + Math.random() * 0.1;
        const scaleY = 0.95 + Math.random() * 0.1;
        const borderRadius = `${45 + Math.random() * 10}% ${55 + Math.random() * 10}% ${50 + Math.random() * 10}% ${50 + Math.random() * 10}% / ${50 + Math.random() * 10}% ${50 + Math.random() * 10}% ${55 + Math.random() * 10}% ${45 + Math.random() * 10}%`;
        const textureClass = `potato-texture-${Math.floor(Math.random() * 8) + 1}`;
        
        potatoField[emptySlotIndex] = {
            plantedAt: currentTime,
            growthStage: 0,
            scaleX,
            scaleY,
            borderRadius,
            textureClass
        };

        if (!hasSeenInitialGlow) {
            hasSeenInitialGlow = true;
            document.getElementById('plant-button').classList.remove('glow');
        }

        lastPlantTime = currentTime;
        updateDisplay();
        updateLastAction("Planted Potato");
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
            const growthTime = currentTime - potato.plantedAt;
            const actualGrowthTime = GROWTH_TIME * growthTimeMultiplier;
            potato.growthStage = Math.min(100, Math.floor((growthTime / actualGrowthTime) * 100));
        }
        return potato;
    });
    updateDisplay();
}

// Harvest a fully grown potato at the specified index
function harvestPotatoAtIndex(index) {
    updateLastAction(`Attempting to harvest potato at index ${index}`);
    if (potatoField[index] && potatoField[index].growthStage >= 100) {
        potatoCount = Math.floor(potatoCount + 1);
        totalPotatoesHarvested += 1; // Increment total harvested
        potatoField[index] = null; // Replace with empty slot instead of removing
        updateLastAction(`Harvested potato at index ${index}`);

        // Record the harvest event
        harvestHistory.push({
            timestamp: Date.now(),
            totalPotatoes: totalPotatoesHarvested // Use cumulative total
        });

        aggregateHarvestHistory(); // Aggregate data if necessary
        updateHarvestChart(); // Update the chart with new data

        updateDisplay();
        checkAchievements(); // Call checkAchievements after updating totalPotatoesHarvested
    } else {
        updateLastAction(`Potato at index ${index} is not ready for harvesting`);
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

// Check and update game achievements
function checkAchievements() {
    if (totalPotatoesHarvested >= 1 && !achievements.firstPotato) {
        achievements.firstPotato = true;
        queueAchievement(
            "First Potato",
            "You've harvested your first Martian potato!",
            "This marks the beginning of your journey to colonize Mars with potatoes.",
            "🥔" // Use the potato emoji instead of an image file
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
    // Add more achievement checks here as needed
}

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
    const updateElementIfChanged = (id, newText) => {
        const element = document.getElementById(id);
        if (element && element.textContent !== newText) {
            element.textContent = newText;
        }
    };

    updateElementIfChanged('potato-count', `Potatoes: ${Math.floor(potatoCount)}`);
    updateElementIfChanged('water-count', `Water: ${Math.floor(water)}`);
    updateElementIfChanged('nutrients', `Nutrients: ${Math.floor(nutrients)}`);
    updateElementIfChanged('ice-level', `Ice: ${Math.floor(ice)}`);
    updateElementIfChanged('exploration-rate', `Exploration Rate: ${Math.floor(window.totalExplorationRate * 60)} per minute`);
    updateElementIfChanged('purchased-upgrades', `Purchased Upgrades: ${(window.purchasedUpgrades || []).map(u => u.name).join(', ')}`);
    updateElementIfChanged('auto-harvesters', `Auto Harvesters: ${autoHarvesters.length}`);

    const autoplantersElement = document.getElementById('automated-planters');
    if (autoplantersElement) {
        const newText = `Automated Planters: ${autoplanters.length}`;
        if (autoplantersElement.textContent !== newText) {
            autoplantersElement.textContent = newText;
            autoplantersElement.style.display = autoplanters.length > 0 ? 'block' : 'none';
        }
    }

    const nuclearIceMelterToggle = document.getElementById('nuclear-ice-melter-toggle');
    if (nuclearIceMelterToggle) {
        nuclearIceMelterToggle.checked = isNuclearIceMelterActive;
    }

    updateExploreButton();
    updatePotatoField();
    updateTechTree();
    updateIceMeltingProgress();
    updateIceMeltingBasinButton();
}

// Update the explore button state and cooldown display
function updateExploreButton() {
    const exploreCard = document.getElementById('exploration-container');
    const cooldownElement = document.getElementById('exploration-cooldown');
    
    if (!exploreCard || !cooldownElement) return;

    const currentTime = Date.now();
    const timeLeft = Math.max(0, window.exploreDelay - (currentTime - window.lastExploreTime));
    
    if (timeLeft > 0) {
        exploreCard.setAttribute('disabled', 'true');
        cooldownElement.textContent = `(${(timeLeft / 1000).toFixed(1)}s)`;
    } else {
        exploreCard.removeAttribute('disabled');
        cooldownElement.textContent = 'Ready';
    }
}

// Update the visual representation of the potato field
function updatePotatoField() {
    const fieldContainer = document.getElementById('potato-field');
    potatoField.forEach((potato, index) => {
        let slotElement = fieldContainer.querySelector(`.potato-slot[data-index="${index}"]`);
        if (!slotElement) {
            slotElement = document.createElement('div');
            slotElement.className = 'potato-slot';
            slotElement.setAttribute('data-index', index);
            fieldContainer.appendChild(slotElement);
        }

        if (potato === null) {
            if (slotElement.firstChild) slotElement.innerHTML = '';
        } else {
            updatePotatoElement(slotElement, potato);
        }
    });
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
    const growthColor = growthStage < 33 ? 'rgba(139, 195, 74, 0.4)' : growthStage < 66 ? 'rgba(76, 175, 80, 0.4)' : 'rgba(56, 142, 60, 0.4)';

    if (potatoElement.className !== `potato ${harvestableClass} ${potato.textureClass}`) {
        potatoElement.className = `potato ${harvestableClass} ${potato.textureClass}`;
    }
    if (potatoElement.style.transform !== `scale(${potato.scaleX}, ${potato.scaleY})`) {
        potatoElement.style.transform = `scale(${potato.scaleX}, ${potato.scaleY})`;
    }
    if (potatoElement.style.borderRadius !== potato.borderRadius) {
        potatoElement.style.borderRadius = potato.borderRadius;
    }
    
    let growthIndicator = potatoElement.querySelector('.growth-indicator');
    if (growthIndicator.style.height !== `${growthStage}%` || growthIndicator.style.backgroundColor !== growthColor) {
        growthIndicator.style.height = `${growthStage}%`;
        growthIndicator.style.backgroundColor = growthColor;
    }
    
    let growthText = potatoElement.querySelector('.growth-text');
    if (growthText.textContent !== `${growthStage}%`) {
        growthText.textContent = `${growthStage}%`;
    }
}

// Toggle debug mode on/off
function toggleDebugMode() {
    debugMode = !debugMode;
    const debugInfo = document.getElementById('debug-info');
    if (debugInfo) {
        debugInfo.style.display = debugMode ? 'block' : 'none';
        if (debugMode) {
            // Initialize debug info when first enabled
            updateDebugInfo(performance.now(), 0);
            // Add 1,000,000 potatoes when debug mode is enabled
            potatoCount += 1000000;
            updateDisplay();
            showToast("Debug Mode", "Added 1,000,000 potatoes for testing", 'debug');
        }
    }
}

// Update debug information display
function updateDebugInfo(currentTime, updateTime) {
    const debugInfoContainer = document.getElementById('debug-info');
    if (!debugInfoContainer || debugInfoContainer.style.display === 'none') {
        return; // Exit if debug info is not visible
    }

    try {
        const fps = 1000 / (currentTime - lastDebugUpdateTime);
        fpsValues.push(fps);
        if (fpsValues.length > 60) fpsValues.shift();
        const averageFps = fpsValues.reduce((a, b) => a + b, 0) / fpsValues.length;
        
        const memoryUsage = performance.memory ? (performance.memory.usedJSHeapSize / (1024 * 1024)).toFixed(2) : 'N/A';
        const activePotatoes = potatoField.filter(potato => potato !== null).length;
        
        const resourceGeneration = {
            water: ((water - lastResourceValues.water) * 1000 / (currentTime - lastDebugUpdateTime)).toFixed(2),
            nutrients: ((nutrients - lastResourceValues.nutrients) * 1000 / (currentTime - lastDebugUpdateTime)).toFixed(2),
            potatoes: ((potatoCount - lastResourceValues.potatoes) * 1000 / (currentTime - lastDebugUpdateTime)).toFixed(2)
        };
        
        const updateElement = (id, text) => {
            const element = debugInfoContainer.querySelector(`#${id}`);
            if (element) element.textContent = text;
        };

        updateElement('fps', `FPS: ${averageFps.toFixed(2)}`);
        updateElement('update-time', `Last Update Time: ${updateTime.toFixed(2)}ms`);
        updateElement('memory-usage', `Memory Usage: ${memoryUsage} MB`);
        updateElement('potato-count-debug', `Potato Count: ${potatoCount.toFixed(2)}`);
        updateElement('active-potatoes', `Active Potatoes: ${activePotatoes}`);
        updateElement('resource-usage', `Resource Usage: Water (${water.toFixed(2)}), Nutrients (${nutrients.toFixed(2)}), Potatoes (${potatoCount.toFixed(2)})`);
        updateElement('resource-generation', `Resource Generation: Water (${resourceGeneration.water}/s), Nutrients (${resourceGeneration.nutrients}/s), Potatoes (${resourceGeneration.potatoes}/s)`);
        updateElement('last-action', `Last Action: ${lastAction}`);
        updateElement('planting-delay', `Planting Delay: ${plantingDelay}ms`);
        
        const playtime = getPlaytime();
        updateElement('playtime-debug', `Playtime: ${playtime}`);
        
        lastDebugUpdateTime = currentTime;
        lastResourceValues = { water, nutrients, potatoes: potatoCount };
    } catch (error) {
        console.error('Error updating debug info:', error);
    }
}

// Update the last action for debugging purposes
function updateLastAction(action) {
    lastAction = action;
    if (debugMode) {
        document.getElementById('last-action').textContent = `Last Action: ${lastAction}`;
    }
}

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

// Initialize the game when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    const plantButton = document.getElementById('plant-button');
    plantButton.addEventListener('click', plantPotato);

    initializePotatoField();

    document.getElementById('potato-field').addEventListener('click', (event) => {
        const slotElement = event.target.closest('.potato-slot');
        if (slotElement) {
            const index = parseInt(slotElement.getAttribute('data-index'), 10);
            if (potatoField[index] && potatoField[index].growthStage >= 100) {
                harvestPotatoAtIndex(index);
            }
        }
    });

    createTechTree(); // Create the tech tree

    requestAnimationFrame(gameLoop);

    const toggleDebugModeButton = document.getElementById('toggle-debug-mode');
    toggleDebugModeButton.addEventListener('click', toggleDebugMode);

    const minimizeDebugButton = document.getElementById('minimize-debug');
    const debugInfo = document.getElementById('debug-info');

    minimizeDebugButton.addEventListener('click', () => {
        debugInfo.classList.toggle('minimized');
        minimizeDebugButton.setAttribute('data-text', 
            debugInfo.classList.contains('minimized') ? 'Maximize' : 'Minimize');
    });

    const exploreCard = document.getElementById('exploration-container');
    exploreCard.addEventListener('click', () => {
        if (!exploreCard.hasAttribute('disabled')) {
            exploreMarsSurface(); // Use the function from exploration.js
        }
    });

    const subsurfaceAquiferTapperToggle = document.getElementById('subsurface-aquifer-tapper-toggle');
    if (subsurfaceAquiferTapperToggle) {
        subsurfaceAquiferTapperToggle.addEventListener('change', toggleSubsurfaceAquiferTapper);
    }

    const bucketWheelExcavatorToggle = document.getElementById('bucket-wheel-excavator-toggle');
    if (bucketWheelExcavatorToggle) {
        bucketWheelExcavatorToggle.addEventListener('change', toggleBucketWheelExcavator);
    }

    const iceMeltingBasinContainer = document.getElementById('ice-melting-basin-container');
    if (iceMeltingBasinContainer) {
        iceMeltingBasinContainer.addEventListener('click', () => {
            if (!iceMeltingBasinContainer.hasAttribute('disabled')) {
                fillIceMeltingBasin();
            }
        });
    }

    const nuclearIceMelterToggle = document.getElementById('nuclear-ice-melter-toggle');
    if (nuclearIceMelterToggle) {
        nuclearIceMelterToggle.removeEventListener('change', toggleNuclearIceMelter);
        nuclearIceMelterToggle.removeEventListener('click', handleNuclearIceMelterClick);
        nuclearIceMelterToggle.addEventListener('click', handleNuclearIceMelterClick);
    }

    const saveButton = document.getElementById('save-button');
    saveButton.addEventListener('click', saveGame);

    const resetButton = document.getElementById('reset-button');
    resetButton.addEventListener('click', resetGame);

    const polarCapMiningToggle = document.getElementById('polar-cap-mining-toggle');
    if (polarCapMiningToggle) {
        polarCapMiningToggle.addEventListener('change', () => {
            togglePolarCapMining();
        });
    }
});

// Function to handle the click event
function handleNuclearIceMelterClick(event) {
    event.preventDefault(); // Prevent the default toggle behavior
    event.stopPropagation();
    toggleNuclearIceMelter();
}

// Modify the toggleNuclearIceMelter function
function toggleNuclearIceMelter() {
    if (!isNuclearIceMelterUnlocked) {
        return;
    }

    const toggleSwitch = document.getElementById('nuclear-ice-melter-toggle');

    if (!isNuclearIceMelterActive) {
        if (potatoCount >= 100) {
            potatoCount -= 100; 
            isNuclearIceMelterActive = true;
            startNuclearIceMelter();
            if (toggleSwitch) toggleSwitch.checked = true;
        } else {
            showToast("Not Enough Potatoes", "You need 100 potatoes to activate the Nuclear Ice Melter!", 'setback');
            if (toggleSwitch) toggleSwitch.checked = false;
            return;
        }
    } else {
        isNuclearIceMelterActive = false;
        stopNuclearIceMelter();
        if (toggleSwitch) toggleSwitch.checked = false;
    }

    updateDisplay();
}

// Handle manual ice melting process
function meltIce(event) {
    if (event && event.stopPropagation) {
        event.stopPropagation(); // Prevent event bubbling only if event exists
    }
    
    if (!isManualIceMeltingUnlocked) return;
    
    if (ice >= 1) {  // Check if there's enough ice
        waterMeltingClicks++;
        updateIceMeltingProgress();
        
        if (waterMeltingClicks >= CLICKS_PER_WATER) {
            ice--;  // Consume 1 ice
            water++;
            waterMeltingClicks = 0;
            showToast("Water Collected", "You've melted ice and collected 1 unit of water!", 'achievement');
        }
        updateDisplay();
        updateLastAction("Melted ice");
    } else {
        showToast("Not Enough Ice", "You need at least 1 ice to melt!", 'setback');
    }
}

// Unlock the manual ice melting feature
function unlockManualIceMelting() {
    isManualIceMeltingUnlocked = true;
    if (!unlockedActionCards.includes('ice-melting-container')) {
        unlockedActionCards.push('ice-melting-container');
    }
    updateActionCards();
    updateIceMeltingProgress();
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
    nuclearIceMelterInterval = setInterval(() => {
        if (ice >= 5) {
            ice -= 5;
            water += 5;
            updateDisplay();
        } else {
            showToast("Resource Shortage", "Not enough ice to run the Nuclear Ice Melter!", 'setback');
            toggleNuclearIceMelter(); // Turn off if resources are insufficient
        }
    }, 1000); // Run every second
}

// Stop the Nuclear Ice Melter
function stopNuclearIceMelter() {
    clearInterval(nuclearIceMelterInterval);
    nuclearIceMelterInterval = null;
}

// Function to update the field size
function updateFieldSize(newSize) {
    MAX_FIELD_SIZE = newSize;
    potatoField = potatoField.concat(new Array(newSize - potatoField.length).fill(null));
    initializePotatoField();
    updateDisplay();
}

// Function to save the game state
function saveGame() {
    const gameState = {
        potatoCount,
        water,
        nutrients,
        ice,
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
        potatoField,
        achievements,
        autoplanters,
        autoHarvesters,
        MAX_FIELD_SIZE,
        unlockedActionCards,
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

        growthTimeMultiplier, // Add this line to save the variable
        totalPotatoesHarvested, // Add this line
        harvestHistory,          // Add this line
        gameStartTime,           // Add this line
    };
    localStorage.setItem('martianPotatoSave', JSON.stringify(gameState));
    showToast('Game saved successfully!', 'Your progress has been saved.', 'success');
}

// Function to load the game state
function loadGame() {
    try {
        const savedState = localStorage.getItem('martianPotatoSave');

        if (savedState) {
            const gameState = JSON.parse(savedState);
            
            // Restore game variables with default values if not present
            gameStartTime = gameState.gameStartTime || Date.now(); // Load or initialize
            potatoCount = gameState.potatoCount || 0;
            water = gameState.water || 100;
            nutrients = gameState.nutrients || 100;
            ice = gameState.ice || 100;
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
            currentTier = gameState.currentTier || 1; // Restore currentTier
            hasSeenInitialGlow = gameState.hasSeenInitialGlow || false;
            growthTimeMultiplier = gameState.growthTimeMultiplier || 1;
            totalPotatoesHarvested = gameState.totalPotatoesHarvested || 0; // Add this line
            harvestHistory = gameState.harvestHistory || [];               // Add this line

            // Restore upgrades
            if (gameState.upgrades && Array.isArray(gameState.upgrades)) {
                upgrades.forEach(upgrade => {
                    const savedUpgrade = gameState.upgrades.find(u => u.name === upgrade.name);
                    if (savedUpgrade) {
                        upgrade.purchased = savedUpgrade.purchased || false;
                        upgrade.count = savedUpgrade.count || 0;

                        const isMilestoneUpgrade = upgrade.unlocksNextTier || false;

                        if (!upgrade.repeatable && upgrade.purchased && upgrade.effect && !isMilestoneUpgrade) {
                            // For non-repeatable upgrades, apply the effect once
                            upgrade.effect();
                        }
                    }
                });
            }

            // Restore unlocked action cards
            if (gameState.unlockedActionCards) {
                unlockedActionCards = [...new Set([...unlockedActionCards, ...gameState.unlockedActionCards])];
            }

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
            // Add similar checks for other unlockable features

            // Remove duplicates
            unlockedActionCards = [...new Set(unlockedActionCards)];

            // Reinitialize game elements
            initializePotatoField();
            createTechTree();
            updateDisplay();
            updateIceMeltingProgress();
            updateIceMeltingBasinButton();

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

            // Restart other active features if necessary

            // Handle initial glow on the plant button
            if (!hasSeenInitialGlow) {
                document.getElementById('plant-button').classList.add('glow');
            }

            // Re-initialize chart with loaded data
            initializeHarvestChart();
            updateHarvestChart();

            showToast('Game loaded successfully!', 'Your progress has been restored.', 'success');
        } else {
            // New game initialization
            gameStartTime = Date.now(); // Start time for new game
            hasSeenInitialGlow = false;
            document.getElementById('plant-button').classList.add('glow');
            unlockedActionCards = ['exploration-container'];
            updateActionCards();
            showToast('No saved game found', 'Starting a new game.', 'info');
        }
    } catch (error) {
        console.error('Error loading game:', error);
        gameStartTime = Date.now(); // Ensure it's set even if load fails
        unlockedActionCards = ['exploration-container'];
        updateActionCards();
        showToast('Error loading game', 'There was an error loading your saved game. Starting a new game.', 'error');
    }
}

// Function to update the visibility of action cards
function updateActionCards() {
    const allActionCards = document.querySelectorAll('.action-card');
    allActionCards.forEach(card => {
        if (unlockedActionCards.includes(card.id)) {
            card.style.display = 'block';
        } else if (card.id !== 'exploration-container') { // Always show exploration
            card.style.display = 'none';
        }
    });
}

// Function to reset the game state
function resetGame() {
    if (confirm('Are you sure you want to reset the game? This will erase all your progress.')) {
        localStorage.removeItem('martianPotatoSave');
        location.reload();
    }
}

// Initialize the game
function initGame() {
    loadGame();
    requestAnimationFrame(gameLoop);
}

// Call initGame when the window loads
window.addEventListener('load', initGame);

// Modify the initGame function to ensure it only runs once
let gameInitialized = false;
function initGame() {
    if (!gameInitialized) {
        loadGame();
        requestAnimationFrame(gameLoop);
        gameInitialized = true;
        
        
        // Ensure action cards are updated after the DOM is fully loaded
        if (document.readyState === 'complete') {
            updateActionCards();
        } else {
            window.addEventListener('load', updateActionCards);
        }
    }
}

// Call initGame when the window loads
window.addEventListener('load', initGame);

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
        if (potatoCount >= 2) {
            potatoCount -= 2;
            ice += 2;
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

// Function to get the playtime
function getPlaytime() {
    const playtimeMillis = Date.now() - gameStartTime;
    const playtimeSeconds = Math.floor((playtimeMillis / 1000) % 60);
    const playtimeMinutes = Math.floor((playtimeMillis / (1000 * 60)) % 60);
    const playtimeHours = Math.floor(playtimeMillis / (1000 * 60 * 60));
    return `${playtimeHours}h ${playtimeMinutes}m ${playtimeSeconds}s`;
}

// Function to aggregate harvest history data
function aggregateHarvestHistory() {
    const maxDataPoints = 200; // Set a maximum number of data points
    if (harvestHistory.length > maxDataPoints) {
        const aggregatedHistory = [];
        for (let i = 0; i < harvestHistory.length; i += 2) {
            const first = harvestHistory[i];
            const second = harvestHistory[i + 1];
            const aggregatedEntry = {
                timestamp: second ? Math.floor((first.timestamp + second.timestamp) / 2) : first.timestamp,
                totalPotatoes: second ? Math.floor((first.totalPotatoes + second.totalPotatoes) / 2) : first.totalPotatoes
            };
            aggregatedHistory.push(aggregatedEntry);
        }
        harvestHistory = aggregatedHistory;
    }
}

// Initialize the harvest chart
let harvestChart;

function initializeHarvestChart() {
    if (harvestChart) {
        harvestChart.destroy(); // Destroy existing chart instance if it exists
    }
    const ctx = document.getElementById('harvestChart').getContext('2d');
    harvestChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [], // Timestamps
            datasets: [{
                label: 'Total Potatoes Harvested',
                data: [], // Total potatoes
                borderColor: 'rgba(255, 99, 132, 1)',
                borderWidth: 2,
                fill: false,
                tension: 0.1
            }]
        },
        options: {
            animation: false, // Disable animations for the chart
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'minute',
                        tooltipFormat: 'MMM d, h:mm:ss a'
                    },
                    title: {
                        display: true,
                        text: 'Time'
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
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.dataset.label || '';
                            const value = context.parsed.y || 0;
                            return `${label}: ${value}`;
                        }
                    }
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
}

// Initialize the chart on window load
window.addEventListener('load', () => {
    initializeHarvestChart();

    // If harvestHistory has data (e.g., after loading a saved game), update the chart
    if (harvestHistory.length > 0) {
        updateHarvestChart();
    }
});