/**
 * Upgrade System
 * 
 * Manages the technology progression and upgrade mechanics:
 * - Defines available upgrades and their effects
 * - Manages tech tree UI and card interactions
 * - Handles upgrade purchases and cost scaling
 * - Controls automation devices (rovers, harvesters)
 * - Manages achievement system for unlocks
 * - Integrates with action card system
 * - Handles tier progression and unlocks
 */


// Game Constants
const TECH_TREE_UPDATE_INTERVAL = 1000; // Throttles tech tree UI updates to once per second to improve performance
const BASE_HARVEST_DELAY = 1000; // Base time between harvest checks, affects auto-harvester efficiency

// Upgrade System Variables
let currentPlantingUpgrade = 0;
let lastTechTreeUpdate = 0;
let currentTier = 1; // Initialize current tier to 1
const UPGRADE_COST_SCALING_FACTOR = 1.15;

// Add this near the top of the file
let growthUpgradesApplied = {
    potatoCompost: false,
    genomeModification: false,
    soilBacteria: false,
    gravitropismAccelerator: false
};

// Automation Arrays
let autoplanters = [];
let autoHarvesters = [];

// Achievement System Variables
let achievementQueue = [];
let isAchievementModalOpen = false;

// Utility Functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Add before the updateTechTree function
const debouncedUpdateTechTree = debounce(updateTechTree, 100);

// Upgrade Definitions
const upgrades = [
    { 
        name: "Hand Trowel", 
        cost: 1,
        effect: function() { 
            plantingDelay = Math.max(2500, plantingDelay - 500); 
        },
        icon: "🖐️",
        description: "Reduces planting time by 0.5 seconds.",
        metaMessage: "Introducing progression. By offering a small, affordable boost, the game conditions you to value incremental upgrades, priming you to invest more for future enhancements.", 
        weight: 1,
        category: "planting",
        tier: 1,
        count: 0, // Initialize count
        repeatable: false // Specify if the upgrade is repeatable
    },
    { 
        name: "Manual Ice Melting", 
        cost: 3,
        effect: () => { 
            unlockManualIceMelting();
        },
        icon: "🧊",
        description: "Collect water by manually melting Martian ice, 1 unit per 5 clicks.",
        metaMessage: "The art of artificial frustration. By making you manually melt ice in space (where it's -63°C), the game creates a problem so absurd you'll pay anything to solve it.", 
        weight: 2,
        category: "harvesting",
        tier: 1,
        count: 0,
        repeatable: false,
        actionCardId: 'ice-melting-container'
    },
    { 
        name: "Watering Can", 
        cost: 5,
        effect: function() { 
            plantingDelay = Math.max(2000, plantingDelay - 500); 
        },
        icon: "🚿",
        description: "Reduces planting time by 0.5 seconds.",
        metaMessage: "Reinforcing advancement. Another modest improvement convinces you that small investments lead to noticeable gains, encouraging continued spending and engagement.", // another small upgrade to give the user a little boost and reinforce the idea that they can progress by buying upgrades
        weight: 2,
        category: "planting",
        tier: 1,
        count: 0,
        repeatable: false
    },
    { 
        name: "Autonomous Planting Rover",  
        cost: 25,
        effect: () => { addAutoplanter(); }, 
        icon: "🤖",
        description: "Automatically plants potatoes.",
        metaMessage: "Rise of the machines (sort of). Your first robotic helper marks the moment you evolve from farmer to overseer, though it's really just a glorified roomba with a potato obsession. The game dangles automation like a carrot - or in this case, a potato - knowing you'll chase that hands-off efficiency forever.", 
        weight: 4,
        category: "planting",
        tier: 1,
        count: 0,
        repeatable: true
    },
    { 
        name: "Autonomous Harvesting Rover", 
        cost: 50,
        effect: () => { addAutoHarvester(); }, 
        icon: "🤖",
        description: "Automatically harvests mature potatoes.",
        metaMessage: "Delegating tasks. Further reducing your manual input, the game shifts your role from laborer to manager, increasing your engagement through strategic oversight.", // The game is reducing user's direct involvement in production, shifting their focus to management and strategy.
        weight: 5,
        category: "harvesting",
        tier: 1,
        count: 0,
        repeatable: true
    },
    { 
        name: "Quantum Spud Spawner", 
        cost: 1000,
        effect: function() { 
            unlockQuantumSpudSpawner(); 
        },
        icon: "⚛️",
        description: "Harness quantum mechanics to revolutionize potato farming on Mars. Automatically plants and harvests potatoes across all field slots instantly.",
        metaMessage: "Ultimate efficiency. Achieving near-total automation, the game entices you with unprecedented power while introducing new layers of complexity and resource management.",
        weight: 20,
        category: "automation",
        tier: 5,
        count: 0,
        repeatable: false,
        actionCardId: 'quantum-spud-spawner-container'
    },
    { 
        name: "Martian Map", 
        cost: 5,
        effect: () => { 
            window.exploreDelay = Math.max(1000, window.exploreDelay - 3000);
            updateExploreButton();
        },
        icon: "🗺️",
        description: "Reduces exploration time by 3 seconds.",
        metaMessage: "Early dopamine hit. This low-cost, high-reward upgrade provides an instant sense of progress by significantly cutting down wait times, training you to crave more upgrades and keeping you hooked.", // By providing a major boost to exploration speed early on, the game gives the user a taste of the rewards they can expect, encouraging them to continue playing and upgrading
        weight: 2,
        category: "exploration",
        tier: 1,
        count: 0,
        repeatable: false
    },
    { 
        name: "Binoculars", 
        cost: 20,
        effect: () => { 
            window.exploreDelay = Math.max(1000, window.exploreDelay - 1000);
            updateExploreButton();
        },
        icon: "🔭",
        description: "Reduces exploration time by 1 second.",
        metaMessage: "Incremental gains. Smaller improvements keep you chasing the next upgrade, fostering a continuous cycle of investment and reward.",
        weight: 3,
        category: "exploration",
        tier: 1,
        count: 0,
        repeatable: false
    },
    { 
        name: "Jetpack", 
        cost: 200, 
        effect: () => { 
            window.exploreDelay = Math.max(1000, Math.floor(window.exploreDelay * 0.5));
            updateExploreButton();
        },
        icon: "🚀",
        description: "Halves the exploration cooldown time.",
        metaMessage: "A substantial upgrade demonstrates how bigger investments yield larger rewards, nudging you to save up for significant advancements.", // Technological leaps. This upgrade represents a significant advancement, showing how larger investments can lead to more substantial improvements.",
        weight: 6,
        category: "exploration",
        tier: 2,
        count: 0,
        repeatable: false
    },
    { 
        name: "Spudnik Satellite", 
        cost: 200,
        effect: () => { 
            window.explorationResourceMultiplier = 2; 
            showToast("Upgrade Effect", "Spudnik Satellite now increases resource yields from exploration by 2X!", 'achievement');
        },
        icon: "🛰️",
        description: "Orbits Mars, providing detailed surface scans and increasing resource discovery by 50%.",
        metaMessage: "Enhancing rewards. By boosting returns on your efforts, the game reinforces your actions, encouraging continued engagement and pursuit of greater gains.",
        weight: 7,
        category: "exploration",
        tier: 2,
        count: 0,
        repeatable: false
    },
    {
        name: "Nutrient Prospecting Rover",
        cost: 50,
        effect: () => {
            addNutrientProspectingRover();
        },
        icon: "🚜",
        description: "Deploys a rover to prospect for nutrients in Martian regolith. Generates 6 nutrients every 20 seconds.",
        metaMessage: "Robotic prospector. This tireless rover scours the Martian surface for precious nutrients, providing a steady stream of resources to fuel your growth.",
        weight: 4,
        category: "nutrients",
        tier: 1,
        count: 0,
        repeatable: true
    },
    { 
        name: "Martian Bucket-Wheel Excavator", 
        cost: 500,
        effect: () => {
            unlockBucketWheelExcavator();
            isBucketWheelExcavatorUnlocked = true;
        },
        icon: "⛏️",
        description: "A massive mobile strip-mining machine that consumes 1 potato per second to generate 4 nutrients and 2 ice.",
        metaMessage: "Scaling operations. Introducing large-scale machinery makes previous efforts seem trivial, compelling you to adapt to increasing complexity.", // shifting the game's scale
        assetName: "bucket_wheel_excavator.webp",
        weight: 12,
        category: "exploration",
        tier: 3,
        count: 0,
        repeatable: false,
        actionCardId: 'bucket-wheel-excavator-container' 
    },
    { 
        name: "Subterranean Tuber Tunneler",
        cost: 1000,
        effect: () => {
            unlockSubterraneanTuberTunneler();
            isSubterraneanTuberTunnelerUnlocked = true;
        },
        icon: "🕳️",
        description: "Burrows beneath the Martian surface, uncovering hidden resource deposits.",
        metaMessage: "Revealing depths. By uncovering new resources, the game expands your horizons, keeping you invested in discovering what lies ahead.",
        weight: 13,
        category: "exploration",
        tier: 3,
        count: 0,
        repeatable: false,
        actionCardId: 'subterranean-tuber-tunneler-container' 
    },
    { 
        name: "Martian Potato Colonizer", 
        cost: 5000,
        effect: () => {
            console.log('Executing Martian Potato Colonizer upgrade effect');
            unlockMartianPotatoColonizer();
        },
        icon: "🚀",
        description: "Deploys potato colonies across Mars, harvesting exponentially increasing resources over time.",
        metaMessage: "Recursive simulation theory. As you spread potato colonies across Mars, you're unknowingly recreating the same game you're playing - making you wonder if you're just another potato farmer in someone else's simulation.",
        weight: 21,
        category: "exploration",
        tier: 5,
        count: 0,
        repeatable: false,
        actionCardId: 'martian-potato-colonizer-container'
    },
    {
        name: "Subsurface Aquifer Tapper",
        cost: 250,
        effect: () => {
            console.log('Executing Subsurface Aquifer Tapper effect');
            unlockSubsurfaceAquiferTapper();
            isSubsurfaceAquiferTapperUnlocked = true; 
        },
        icon: "💧",
        description: "Accesses underground water reserves. Consumes 1 potato per second to produce 3 water per second when active.",
        metaMessage: "Resource transformation. By introducing a way to convert excess potatoes into water, the game creates a strategic decision point between hoarding and spending resources, deepening player engagement through meaningful choices.",
        weight: 6,
        category: "exploration",
        tier: 2,
        count: 0,
        repeatable: false,
        actionCardId: 'subsurface-aquifer-tapper-container' 
    },
    {
        name: "Polar Cap Mining",
        cost: 1000,
        effect: () => { 
            unlockPolarCapMining();
        },
        icon: "🧊",
        description: "Enables mining operations at Mars' polar caps. Consumes 1 potatoe per second to produce 4 ice per second.",
        metaMessage: "Frozen ambition. By letting you strip-mine Mars' poles for ice, the game makes you pause and think: 'Am I the bad guy?' But then you remember Earth's climate is already toast, so... might as well add interplanetary environmental destruction to your potato empire's resume.",
        weight: 12,
        category: "exploration",
        tier: 3,
        count: 0,
        repeatable: false,
        actionCardId: 'polar-cap-mining-container'
    },
    {
        name: "Cometary Ice Harvester",
        cost: 2000,
        effect: () => { 
            unlockCometaryIceHarvester();
        },
        icon: "☄️",
        description: "Harnesses passing comets to harvest ice, providing 50 units of water every 10 seconds.",
        metaMessage: "Unlocking abundance. By granting you access to vast resources, the game entices you with accelerated progress, subtly increasing your dependence on continuous upgrades while introducing new challenges in resource management.",  // Updated metaMessage
        weight: 14,
        category: "exploration",
        tier: 3,
        count: 0,
        repeatable: false,
        actionCardId: 'cometary-ice-harvester-container' 
    },
    {
        name: "Ice Melting Basin",
        cost: 25,
        effect: () => { unlockIceMeltingBasin(); },
        icon: "🛁",
        description: "A large basin that can melt ice more efficiently. Consumes 8 ice to produce 1 water per second for 8 seconds.",
        metaMessage: "Introducing efficiency. Processing resources in batches teaches you to think long-term, subtly encouraging investment in optimizing processes.",
        assetName: "ice_melting_basin.webp",
        weight: 3,
        category: "harvesting",
        tier: 1,
        count: 0,
        repeatable: false,
        actionCardId: 'ice-melting-basin-container' 
    },
    {
        name: "Nuclear Ice Melter",
        cost: 500,
        effect: () => { 
            unlockNuclearIceMelter();
        },
        icon: "☢️",
        description: "A nuclear-powered ice melter. Consumes 100 potatoes to activate, then melts a chosen percentage of ice per second to produce water.",
        metaMessage: "Shifting dependencies. By providing a powerful tool to overcome previous limitations, the game reconfigures your constraints, moving you from water scarcity to new challenges. This manipulation keeps you engaged by constantly introducing new hurdles, ensuring that solving one problem leads to another.",  // Updated metaMessage
        assetName: "nuclear_ice_melter.webp",
        weight: 12,
        category: "harvesting",
        tier: 3,
        count: 0,
        repeatable: false,
        actionCardId: 'nuclear-ice-melter-container'
    },
    {
        name: "Field Expansion",
        cost: 500,
        effect: () => { 
            updateFieldSize(16);
            showToast("Upgrade Purchased", "Your potato field has been expanded to 16 plots!", 'upgrade');
        },
        icon: "🌱",
        description: "Increase your potato field from 8 to 16 plots",
        metaMessage: "Expanding horizons. Doubling your production capacity offers the allure of increased rewards, but also demands more from your resources.",
        weight: 10,
        category: "planting",
        tier: 2,
        count: 0,
        repeatable: false
    },
    {
        name: "Potato Compost",
        cost: 50,
        effect: () => {
            if (!growthUpgradesApplied.potatoCompost) {
                growthTimeMultiplier *= 0.5;
                growthUpgradesApplied.potatoCompost = true;
                showToast("Upgrade Effect", "Potato growth time reduced by 50%!", 'achievement');
            }
        },
        icon: "🌱",
        description: "Soil enrichment with potato compost to speed up potato growth by 50%.",
        metaMessage: "Introducing efficiency. By offering a significant boost to growth speed, the game reinforces the satisfaction of progress, subtly encouraging you to invest in further optimizations and deepen your engagement.",  // Updated metaMessage
        weight: 5,
        category: "growth",
        tier: 1,
        count: 0,
        repeatable: false
    },
    {
        name: "Potato Genome Modification",
        cost: 100,
        effect: () => {
            if (!growthUpgradesApplied.genomeModification) {
                growthTimeMultiplier *= 0.5;
                growthUpgradesApplied.genomeModification = true;
                showToast("Upgrade Effect", "Potato growth time reduced by an additional 50%!", 'achievement');
            }
        },
        icon: "🧬",
        description: "Genetically modify potatoes to grow faster in Martian conditions.",
        metaMessage: "Enhancing dependency. Another substantial improvement hooks you further into the game's systems, making you reliant on continuous upgrades to maintain the exhilarating pace, while masking the increasing complexity you're managing.",  // Updated metaMessage
        weight: 10,
        category: "growth",
        tier: 2,
        count: 0,
        repeatable: false
    },
    {
        name: "Martian Soil Bacteria Inoculant",
        cost: 175,
        effect: () => {
            if (!growthUpgradesApplied.soilBacteria) {
                growthTimeMultiplier *= 0.5;
                growthUpgradesApplied.soilBacteria = true;
                showToast("Upgrade Effect", "Potato growth time reduced by an additional 50%!", 'achievement');
            }
        },
        icon: "🦠",
        description: "Introduce beneficial Martian soil bacteria to enhance nutrient uptake and accelerate potato growth.",
        metaMessage: "Advancing complexity. By adding layers of biological enhancement, the game immerses you deeper into its mechanics, subtly complicating your strategy while you chase the benefits of accelerated growth.",  // Updated metaMessage
        weight: 12,
        category: "growth",
        tier: 3,
        count: 0,
        repeatable: false
    },
    {
        name: "Gravitropism Accelerator",
        cost: 1000,
        effect: () => {
            if (!growthUpgradesApplied.gravitropismAccelerator) {
                growthTimeMultiplier *= 0.5;
                growthUpgradesApplied.gravitropismAccelerator = true;
                showToast("Upgrade Effect", "Potato growth time reduced by an additional 50%!", 'achievement');
            }
        },
        icon: "🌍",
        description: "Manipulate the gravity sensing mechanisms in potato roots to accelerate growth in Martian gravity.",
        metaMessage: "Pushing boundaries. By manipulating fundamental plant biology, the game offers powerful advantages, enticing you to invest more while increasing your commitment and the complexity of your gameplay.",  // Updated metaMessage
        weight: 15,
        category: "growth",
        tier: 3,
        count: 0,
        repeatable: false
    },
    // Milestone upgrades
    {
        name: "Potato Battery",
        cost: 50,
        effect: () => { 
            unlockNextTier(); // Function to unlock the next tier
        },
        unlocksNextTier: true,
        icon: "🔋",
        description: "Unlocks new technologies.",
        metaMessage: "Opening new horizons. By introducing a new tier of technology, the game fuels your desire for progression, keeping you engaged and invested in exploring the possibilities ahead.",  // Updated metaMessage
        weight: 6,
        category: "energy",
        tier: 1,
        count: 0,
        repeatable: false
    },
    {
        name: "Potato Chip",
        cost: 200,
        effect: () => {
            unlockNextTier(); // Unlock tier 3
        },
        unlocksNextTier: true,
        icon: "💻",
        description: "Unlocks new technologies.",
        metaMessage: "Silicon revolution meets starch innovation. By transforming potatoes into computational components, the game byte-sized-ly suggests that even the humblest tuber can become something more.",
        weight: 11,
        category: "technology",
        tier: 2,
        count: 0,
        repeatable: false
    },
    {
        name: "Potato Computer",
        cost: 1000,
        effect: () => {
            unlockNextTier(); // Unlock tier 4
        },
        unlocksNextTier: true,
        icon: "🖥️",
        description: "Unlocks new technologies.",
        metaMessage: "Technological escalation. Building a computer from potatoes significantly advances your capabilities, but also increases the game's complexity, ensuring you remain engaged in mastering the new systems.",  // Updated metaMessage
        weight: 16,
        category: "technology",
        tier: 3,
        count: 0,
        repeatable: false
    },
    {
        name: "Potato Quantum Computer",
        cost: 2000,
        effect: () => {
            unlockNextTier(); // Unlock tier 5
        },
        unlocksNextTier: true,
        icon: "🔬",
        description: "Unlocks new technologies. Harness quantum properties of specially grown potatoes for advanced computing.",
        metaMessage: "Superposition of starch. By entangling potatoes at the quantum level, the game simultaneously exists in a state of profound technological achievement and delicious absurdity. Your engagement collapses into a singular wave function of 'just one more upgrade'.",
        weight: 21,
        category: "technology",
        tier: 4,
        count: 0,
        repeatable: false
    },
    {
        name: "Potato Neural Network",
        cost: 1000000,
        effect: () => { 
            initializeNeuralNetwork();
        },
        icon: "🧠",
        description: "Implement a sophisticated neural network to optimize potato farming... what could go wrong?",
        metaMessage: "You've spent hours training this AI to optimize potato farming, while the game has spent hours training you to optimize potato farming. Who's really learning from whom?",
        weight: 25,
        category: "technology",
        tier: 5,
        count: 0,
        repeatable: false
    }
];

function unlockNextTier(fromLoad = false) {
    if (currentTier < MAX_TIER) {
        currentTier += 1;
        if (!fromLoad) {
            showToast("New Technology Tier Unlocked!", `Tier ${currentTier} technologies are now available.`, 'upgrade');
            debouncedUpdateTechTree();
        }
    }
}

// Helper function to generate a standardized card ID based on the upgrade name
function getCardId(upgradeName) {
    return `upgrade-${upgradeName.replace(/\s+/g, '-').toLowerCase()}`;
}

// Add this helper function
function sortUpgrades(upgradesArray) {
    return [...upgradesArray].sort((a, b) => {
        // First sort by weight
        if (a.weight !== b.weight) {
            return a.weight - b.weight;
        }
        // If weights are equal, sort by cost
        return a.cost - b.cost;
    });
}

// Update createTechTree function
function createTechTree() {
    const techTree = document.getElementById('tech-tree');
    techTree.innerHTML = ''; // Clear existing content

    // Sort upgrades before displaying
    const sortedUpgrades = sortUpgrades(upgrades);
    
    sortedUpgrades.forEach((upgrade) => {
        let shouldDisplayCard = false;
        if (upgrade.tier <= currentTier) {
            if (upgrade.repeatable || upgrade.count === 0) {
                shouldDisplayCard = true;
            }
        }

        if (shouldDisplayCard) {
            const card = createCard(upgrade);
            techTree.appendChild(card);
        }
    });
}

// Update updateTechTree function
function updateTechTree() {
    const currentTime = Date.now();
    if (currentTime - lastTechTreeUpdate < TECH_TREE_UPDATE_INTERVAL) {
        return;
    }
    lastTechTreeUpdate = currentTime;

    // Quick check if any updates are needed
    const techTree = document.getElementById('tech-tree');
    const existingCards = new Set(Array.from(techTree.children).map(card => card.id));
    const sortedUpgrades = sortUpgrades(upgrades);
    
    // Check if any cards need to be added or removed
    const needsUpdate = sortedUpgrades.some(upgrade => {
        const cardId = getCardId(upgrade.name);
        const shouldDisplayCard = upgrade.tier <= currentTier && (upgrade.repeatable || upgrade.count === 0);
        
        // Update needed if card should exist but doesn't, or shouldn't exist but does
        return (shouldDisplayCard && !existingCards.has(cardId)) || 
               (!shouldDisplayCard && existingCards.has(cardId));
    });

    if (!needsUpdate) {
        return; // Skip DOM updates if no changes needed
    }

    // Proceed with existing update logic
    sortedUpgrades.forEach((upgrade) => {
        let shouldDisplayCard = false;
        if (upgrade.tier <= currentTier) {
            if (upgrade.repeatable || upgrade.count === 0) {
                shouldDisplayCard = true;
            }
        }

        const cardId = getCardId(upgrade.name); // Use helper function

        if (shouldDisplayCard) {
            if (!existingCards.has(cardId)) {
                techTree.appendChild(createCard(upgrade));
                existingCards.add(cardId);
            } else {
                const card = document.getElementById(cardId);
                const upgradeCost = getUpgradeCost(upgrade);
                const isPurchasable = (upgrade.repeatable ? (potatoCount >= upgradeCost) : (potatoCount >= upgradeCost && upgrade.count === 0));

                // Update purchasability and cost display
                card.classList.toggle('purchasable', isPurchasable);
                const costElement = card.querySelector('.tech-card-cost');
                if (costElement) {
                    costElement.textContent = `Cost: ${upgradeCost} potatoes`;
                }
            }
        } else if (existingCards.has(cardId)) {
            const card = document.getElementById(cardId);
            if (card) {
                techTree.removeChild(card);
                existingCards.delete(cardId);
            }
        }
    });

    // After updating the tech tree, update the arrow visibility
    updateCarouselArrows();
}

// Function to update the visibility of carousel arrows
function updateCarouselArrows() {
    const techTreeContainer = document.getElementById('tech-tree');
    const leftArrow = document.getElementById('tech-tree-left');
    const rightArrow = document.getElementById('tech-tree-right');

    // Check if scrolling to the left is possible
    if (techTreeContainer.scrollLeft > 0) {
        leftArrow.style.display = 'block';
    } else {
        leftArrow.style.display = 'none';
    }

    // Check if scrolling to the right is possible
    if (techTreeContainer.scrollWidth - techTreeContainer.clientWidth - techTreeContainer.scrollLeft > 0) {
        rightArrow.style.display = 'block';
    } else {
        rightArrow.style.display = 'none';
    }
}

// Also, call updateCarouselArrows when the window is resized or when the tech tree is scrolled
window.addEventListener('resize', updateCarouselArrows, { passive: true });
document.getElementById('tech-tree').addEventListener('scroll', updateCarouselArrows, { passive: true });

// Main game loop function, called on each animation frame
function gameLoop(currentTime) {
    if (currentTime - lastFrameTime >= FRAME_DELAY) {
        updatePlantButton();
        if (updateResources(currentTime)) {
            updateDisplay();
            checkAndRestartAutoplanters();
        }
        updatePotatoGrowth();
        updateTechTree(); // Call updateTechTree here, it will self-throttle
        lastFrameTime = currentTime;
    }
    requestAnimationFrame(gameLoop);
}

// Create a single tech card for the given upgrade
function createCard(upgrade) {
    const card = document.createElement('div');
    const cardId = getCardId(upgrade.name); // Use helper function
    card.id = cardId; // Assign unique ID to prevent duplicates
    card.className = 'tech-card';
    card.dataset.upgradeName = upgrade.name;
    card.dataset.weight = upgrade.weight;
    card.dataset.tier = upgrade.tier;

    const iconElement = document.createElement('div');
    iconElement.className = 'tech-card-icon';

    const imageName = upgrade.assetName || (upgrade.name.replace(/\s+/g, '_').toLowerCase() + '.webp');
    const imageUrl = `images/${imageName}`;

    const img = new Image();
    img.src = imageUrl;
    img.onerror = () => {
        iconElement.textContent = upgrade.icon;
        console.log(`Failed to load image: ${imageUrl}`);
    };
    img.onload = () => {
        iconElement.innerHTML = '';
        iconElement.appendChild(img);
    };

    // Fallback content
    iconElement.textContent = upgrade.icon; 

    const detailsElement = document.createElement('div');
    detailsElement.className = 'tech-card-details';
    detailsElement.innerHTML = `
        <h3 class="tech-card-name" title="${upgrade.name}">${upgrade.name}</h3>
        <p class="tech-card-cost">Cost: ${getUpgradeCost(upgrade)} potatoes</p>
    `;

    // Add the details button if the upgrade's tier is less than or equal to the current tier
    if (upgrade.tier <= currentTier) {
        const detailsButton = document.createElement('button');
        detailsButton.className = 'details-button';
        detailsButton.textContent = 'Details';
        detailsButton.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent card click event
            showUpgradeModal(upgrade);
        });
        detailsElement.appendChild(detailsButton);
    } else {
        // For upgrades in higher tiers, you can optionally display a lock icon or message
        const lockedMessage = document.createElement('div');
        lockedMessage.className = 'locked-message';
        lockedMessage.textContent = 'Locked';
        detailsElement.appendChild(lockedMessage);
    }

    card.appendChild(iconElement);
    card.appendChild(detailsElement);

    // Click event listener to open the upgrade modal
    if (upgrade.tier <= currentTier) {
        card.addEventListener('click', () => {
            showUpgradeModal(upgrade);
        });
    }

    return card;
}

// Calculate the cost of an upgrade, considering potential count-based scaling
function getUpgradeCost(upgrade) {
    // Early return for non-repeatable upgrades or first purchase
    if (!upgrade.repeatable || upgrade.count === 0) {
        return upgrade.cost;
    }
    
    // Only calculate scaling cost for repeatable upgrades with previous purchases
    return Math.floor(upgrade.cost * Math.pow(UPGRADE_COST_SCALING_FACTOR, upgrade.count));
}

// Display a modal with detailed information about an upgrade
function showUpgradeModal(upgrade) {
    console.log("Showing upgrade modal for:", upgrade.name);
    const existingModal = document.querySelector('.upgrade-modal');
    if (existingModal) {
        existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.className = 'modal upgrade-modal'; // Assign both classes
    
    const upgradeCost = getUpgradeCost(upgrade);
    const content = `
        <div class="modal-content">
            <span class="close-modal">&times;</span>
            <h2>${upgrade.name}</h2>
            <p>${upgrade.description}</p>
            <p class="tech-card-cost">Cost: ${upgradeCost} potatoes</p>
            <button class="buy-upgrade-button" ${potatoCount >= upgradeCost ? '' : 'disabled'}>Buy Upgrade</button>
        </div>
    `;
    modal.innerHTML = content;

    const buyButton = modal.querySelector('.buy-upgrade-button');
    buyButton.addEventListener('click', () => {
        buyUpgrade(upgrade);
        modal.remove();
    });

    const closeButton = modal.querySelector('.close-modal');
    closeButton.addEventListener('click', () => {
        modal.remove();
    });

    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.remove();
        }
    });

    document.body.appendChild(modal);
}

// Handle the purchase of an upgrade
function buyUpgrade(upgrade) {
    const cost = getUpgradeCost(upgrade);
    if (potatoCount >= cost) {
        potatoCount -= cost;
        
        // Track the upgrade purchase
        trackEvent('upgrade_unlocked', {
            upgrade_name: upgrade.name,
            upgrade_cost: cost,
            upgrade_category: upgrade.category,
            upgrade_tier: upgrade.tier,
            times_purchased: (upgrade.count || 0) + 1,
            total_potatoes: Math.floor(potatoCount),
            playtime_seconds: Math.floor((Date.now() - gameStartTime) / 1000),
            is_repeatable: upgrade.repeatable,
            unlocks_next_tier: upgrade.unlocksNextTier || false
        });

        if (upgrade.effect) {
            console.log(`Applying effect for upgrade: ${upgrade.name}`);
            upgrade.effect();
        }
        if (upgrade.count !== undefined) {
            upgrade.count++;
        } else {
            upgrade.purchased = true;
        }
        console.log(`Upgrade ${upgrade.name} count: ${upgrade.count}`);
        updateDisplay();

        const techCard = document.getElementById(getCardId(upgrade.name));
        if (techCard) {
            if (!upgrade.repeatable && upgrade.count >= 1) {
                techCard.remove();
            } else if (upgrade.repeatable) {
                const costElement = techCard.querySelector('.tech-card-cost');
                if (costElement) {
                    costElement.textContent = `Cost: ${getUpgradeCost(upgrade)} potatoes`;
                }
            }
        }

        showToast("Upgrade Unlocked", `You have unlocked the ${upgrade.name} upgrade!`, 'achievement');
        
        unlockActionCardForUpgrade(upgrade.name);
        saveGame();
        debouncedUpdateTechTree();

        queueAchievement(
            `Technology Unlocked: ${upgrade.name}`,
            upgrade.description,
            upgrade.metaMessage,
            upgrade.name.replace(/\s+/g, '_').toLowerCase() + '.webp'
        );

    } else {
        // Track failed purchase attempt
        trackEvent('upgrade_purchase_failed', {
            upgrade_name: upgrade.name,
            upgrade_cost: cost,
            current_potatoes: Math.floor(potatoCount),
            potatoes_short: Math.floor(cost - potatoCount)
        });
        
        showToast("Not Enough Potatoes", "You don't have enough potatoes to purchase this upgrade.", 'setback');
    }
}

function unlockQuantumSpudSpawner() {
    console.log("Unlocking Quantum Spud Spawner");
    isQuantumSpudSpawnerUnlocked = true;
    const spawnerContainer = document.getElementById('quantum-spud-spawner-container');
    if (spawnerContainer) {
        spawnerContainer.style.display = 'block';
        console.log("Quantum Spud Spawner container displayed");
    } else {
        console.warn("Quantum Spud Spawner container not found in the DOM");
    }
    
    // Add the Quantum Spud Spawner to the unlockedActionCards array
    if (!unlockedActionCards.includes('quantum-spud-spawner-container')) {
        unlockedActionCards.push('quantum-spud-spawner-container');
        console.log("Added Quantum Spud Spawner to unlockedActionCards");
    }
    
    showToast("New Technology Unlocked", "You've unlocked the Quantum Spud Spawner!", 'upgrade');
    
    // Update the game state or UI as needed
    updateActionCards();
    updateDisplay();
}

// Add a new autoplanter to the game
function addAutoplanter() {
    const autoplanter = {
        interval: null,
        cost: Math.floor(20 * Math.pow(1.15, upgrades.find(u => u.name === "Autonomous Planting Rover").count))
    };
    autoplanters.push(autoplanter);
    startAutoplanter(autoplanter);
    updateDisplay();
}

// Start the autoplanting process for a given autoplanter
function startAutoplanter(autoplanter) {
    autoplanter.interval = setInterval(() => {
        const emptySlotIndex = potatoField.findIndex(slot => slot === null);
        if (emptySlotIndex !== -1 && consumeResources()) {
            const currentTime = Date.now();
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
            updateDisplay();
        }
    }, 2000); // Try to plant every 2 seconds
}

// Check and restart any stopped autoplanters
function checkAndRestartAutoplanters() {
    autoplanters.forEach(autoplanter => {
        if (!autoplanter.interval) {
            startAutoplanter(autoplanter);
        }
    });
}

// Add a new auto harvester to the game
function addAutoHarvester() {
    const autoHarvester = {
        interval: null,
        cost: Math.floor(100 * Math.pow(1.15, upgrades.find(u => u.name === "Autonomous Harvesting Rover").count))
    };
    
    autoHarvesters.push(autoHarvester);
    startAutoHarvester(autoHarvester);
    updateDisplay();
}

// Start the auto harvesting process for a given auto harvester
function startAutoHarvester(autoHarvester) {
    autoHarvester.interval = setInterval(() => {
        harvestOneReadyPotato();
    }, BASE_HARVEST_DELAY);
}

// Check and restart any stopped auto harvesters
function checkAndRestartAutoHarvesters() {
    autoHarvesters.forEach(autoHarvester => {
        if (!autoHarvester.interval) {
            startAutoHarvester(autoHarvester);
        }
    });
}

// Harvest a single ready potato from the field
function harvestOneReadyPotato() {
    const readyIndex = potatoField.findIndex(potato => potato?.growthStage >= 100);
    if (readyIndex !== -1) {
        harvestPotatoAtIndex(readyIndex);
    }
}

// Initialize the tech tree with correct costs
function initializeTechTree() {
    createTechTree();
    updateTechTree(); // Ensure initial costs are set correctly
}

// Set up event listeners and initialize the game when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeTechTree();

    const techTree = document.getElementById('tech-tree');
    const leftArrow = document.getElementById('tech-tree-left');
    const rightArrow = document.getElementById('tech-tree-right');

    leftArrow.addEventListener('click', () => {
        techTree.scrollBy({ left: -200, behavior: 'smooth' });
    });

    rightArrow.addEventListener('click', () => {
        techTree.scrollBy({ left: 200, behavior: 'smooth' });
    });

    // Use the existing updateCarouselArrows function
    techTree.addEventListener('scroll', updateCarouselArrows, { passive: true });
    window.addEventListener('resize', updateCarouselArrows, { passive: true });

    updateCarouselArrows(); // Initial check

    const iceMeltingContainer = document.getElementById('ice-melting-container');
    if (iceMeltingContainer) {
        iceMeltingContainer.style.display = 'none'; // Hide by default
    }

    const subsurfaceAquiferTapperContainer = document.getElementById('subsurface-aquifer-tapper-container');
    if (subsurfaceAquiferTapperContainer) {
        subsurfaceAquiferTapperContainer.style.display = 'none'; // Hide by default
    }

    const subsurfaceAquiferTapperToggle = document.getElementById('subsurface-aquifer-tapper-toggle');
    if (subsurfaceAquiferTapperToggle) {
        subsurfaceAquiferTapperToggle.addEventListener('change', toggleSubsurfaceAquiferTapper);
    }

    const bucketWheelExcavatorToggle = document.getElementById('bucket-wheel-excavator-toggle');
    if (bucketWheelExcavatorToggle) {
        bucketWheelExcavatorToggle.addEventListener('change', toggleBucketWheelExcavator);
    }

    const nuclearIceMelterToggle = document.getElementById('nuclear-ice-melter-toggle');
    if (nuclearIceMelterToggle) {
        nuclearIceMelterToggle.addEventListener('change', (event) => {
            event.stopPropagation(); // Prevent event from bubbling up
            toggleNuclearIceMelter();
        });
    }
});

// Queue an achievement for display
function queueAchievement(title, message, metaMessage = '', imageName = '') {
    achievementQueue.push({ title, message, metaMessage, imageName });
    if (!isAchievementModalOpen) {
        showNextAchievement();
    }
}

// Display the next queued achievement
function showNextAchievement() {
    if (achievementQueue.length === 0) {
        isAchievementModalOpen = false;
        return;
    }

    isAchievementModalOpen = true;

    const achievement = achievementQueue.shift();
    const modal = document.createElement('div');
    modal.className = 'achievement-modal';

    let imageHtml = '';
    if (achievement.title.startsWith('Technology Unlocked:')) {
        const upgradeName = achievement.title.replace('Technology Unlocked: ', '');
        const upgrade = upgrades.find(u => u.name === upgradeName);
        if (upgrade) {
            const imageName = upgrade.assetName || (upgrade.name.replace(/\s+/g, '_').toLowerCase() + '.webp');
            imageHtml = `<img src="images/${imageName}" alt="${upgradeName}" onerror="this.onerror=null;this.parentNode.innerHTML='${upgrade.icon}';">`;
        }
    } else if (achievement.imageName) {
        if (achievement.imageName.startsWith('🥔')) {
            // If the imageName is the potato emoji, display it directly
            imageHtml = `<span style="font-size: 80px;">${achievement.imageName}</span>`;
        } else {
            // Otherwise, treat it as an image file
            imageHtml = `<img src="images/${achievement.imageName}" alt="${achievement.title}" onerror="this.onerror=null;this.parentNode.innerHTML='🏆';">`;
        }
    }

    modal.innerHTML = `
        <div class="achievement-content">
            <h2>${achievement.title}</h2>
            <div class="achievement-body">
                <div class="achievement-image">
                    ${imageHtml}
                </div>
                <div class="achievement-text">
                    <p>${achievement.message}</p>
                </div>
            </div>
            ${achievement.metaMessage ? `<p class="meta-message">${achievement.metaMessage}</p>` : ''}
            <button id="continue-button">Continue</button>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('continue-button').addEventListener('click', () => {
        document.body.removeChild(modal);
        showNextAchievement();
    });
}

// ==========================================
//            MANUAL ACTION FUNCTIONS
// ==========================================


// Unlock the Ice Melting Basin
function unlockIceMeltingBasin() {
    isIceMeltingBasinUnlocked = true;
    const iceMeltingBasinContainer = document.getElementById('ice-melting-basin-container');
    if (iceMeltingBasinContainer) {
        iceMeltingBasinContainer.style.display = 'block';
    }
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
//            AUTOMATION FUNCTIONS
// ==========================================

// General function to manage automation devices
function createAutomationDevice(deviceConfig) {
    const { 
        id, 
        containerId, 
        toggleId, 
        isUnlocked, 
        isActive, 
        unlockFunction, 
        startFunction, 
        stopFunction, 
        resourceCheck, 
        resourceConsume, 
        resourceProduce, 
        intervalTime 
    } = deviceConfig;

    let interval = null; // Track interval locally

    // Unlock the device
    window[unlockFunction] = function() {
        window[isUnlocked] = true;
        const container = document.getElementById(containerId);
        if (container) {
            container.style.display = 'block';
        }
        // Restore active state if it was running before
        const toggleSwitch = document.getElementById(toggleId);
        if (toggleSwitch && window[isActive]) {
            toggleSwitch.checked = true;
            window[startFunction]();
        }
    };

    // Toggle the device
    window[`toggle${id}`] = function() {
        // Prevent toggling on if resources are depleted
        if (!window[isUnlocked] || areResourcesDepleted) return;

        window[isActive] = !window[isActive];
        const toggleSwitch = document.getElementById(toggleId);
        if (toggleSwitch) {
            toggleSwitch.checked = window[isActive];
        }

        if (window[isActive]) {
            window[startFunction]();
        } else {
            window[stopFunction]();
        }
    };

    // Start the device
    window[startFunction] = function() {
        if (areResourcesDepleted) {
            window[isActive] = false;
            const toggleSwitch = document.getElementById(toggleId);
            if (toggleSwitch) {
                toggleSwitch.checked = false;
            }
            updateDepletedActionCard(containerId, true, "Resources Depleted");
            return;
        }

        // Clear any existing interval
        if (interval) {
            clearInterval(interval);
        }

        interval = setInterval(() => {
            if (resourceCheck()) {
                resourceConsume();
                resourceProduce();
                updateDisplay();
            }
        }, intervalTime);
    };

    // Stop the device
    window[stopFunction] = function() {
        if (interval) {
            clearInterval(interval);
            interval = null;
        }
        window[isActive] = false;
        const toggleSwitch = document.getElementById(toggleId);
        if (toggleSwitch) {
            toggleSwitch.checked = false;
        }
    };
}

// Configuration for Subsurface Aquifer Tapper
createAutomationDevice({
    id: 'SubsurfaceAquiferTapper',
    containerId: 'subsurface-aquifer-tapper-container',
    toggleId: 'subsurface-aquifer-tapper-toggle',
    isUnlocked: 'isSubsurfaceAquiferTapperUnlocked',
    isActive: 'isSubsurfaceAquiferTapperActive',
    unlockFunction: 'unlockSubsurfaceAquiferTapper',
    startFunction: 'startSubsurfaceAquiferTapper',
    stopFunction: 'stopSubsurfaceAquiferTapper',
    resourceCheck: () => potatoCount >= 1,
    resourceConsume: () => { potatoCount -= 1; },
    resourceProduce: () => { water += 3; },
    intervalTime: 1000
});

// Configuration for Bucket-Wheel Excavator
createAutomationDevice({
    id: 'BucketWheelExcavator',
    containerId: 'bucket-wheel-excavator-container',
    toggleId: 'bucket-wheel-excavator-toggle',
    isUnlocked: 'isBucketWheelExcavatorUnlocked',
    isActive: 'isBucketWheelExcavatorActive',
    unlockFunction: 'unlockBucketWheelExcavator',
    startFunction: 'startBucketWheelExcavator',
    stopFunction: 'stopBucketWheelExcavator',
    resourceCheck: () => potatoCount >= 1,
    resourceConsume: () => { potatoCount -= 1; },
    resourceProduce: () => { nutrients += 4; ice += 2; },
    intervalTime: 1000
});

// Configuration for Subterranean Tuber Tunneler
createAutomationDevice({
    id: 'SubterraneanTuberTunneler',
    containerId: 'subterranean-tuber-tunneler-container',
    toggleId: 'subterranean-tuber-tunneler-toggle',
    isUnlocked: 'isSubterraneanTuberTunnelerUnlocked',
    isActive: 'isSubterraneanTuberTunnelerActive',
    unlockFunction: 'unlockSubterraneanTuberTunneler',
    startFunction: 'startSubterraneanTuberTunneler',
    stopFunction: 'stopSubterraneanTuberTunneler',
    resourceCheck: () => window.isSubterraneanTuberTunnelerActive && potatoCount >= 2,
    resourceConsume: () => { potatoCount -= 1; },
    resourceProduce: () => { 
        nutrients += 2; 
        ice += 2; 
    },
    intervalTime: 2000 // Runs every 2 seconds
});

// Configuration for Cometary Ice Harvester
createAutomationDevice({
    id: 'CometaryIceHarvester',
    containerId: 'cometary-ice-harvester-container',
    toggleId: 'cometary-ice-harvester-toggle',
    isUnlocked: 'isCometaryIceHarvesterUnlocked',
    isActive: 'isCometaryIceHarvesterActive',
    unlockFunction: 'unlockCometaryIceHarvester',
    startFunction: 'startCometaryIceHarvester',
    stopFunction: 'stopCometaryIceHarvester',
    resourceCheck: () => potatoCount >= 5,
    resourceConsume: () => { potatoCount -= 5; },
    resourceProduce: () => {
        ice += 50;
        updateDisplay();
        showToast("Resources Acquired", "Cometary Ice Harvester collected 50 units of ice!", 'achievement');
    },
    intervalTime: 30000 // Runs every 30 seconds
});

// Update event listeners
document.getElementById('subsurface-aquifer-tapper-toggle').addEventListener('change', () => {
    window['toggleSubsurfaceAquiferTapper']();
});

document.getElementById('bucket-wheel-excavator-toggle').addEventListener('change', () => {
    window['toggleBucketWheelExcavator']();
});

document.getElementById('subterranean-tuber-tunneler-toggle').addEventListener('change', () => {
    window['toggleSubterraneanTuberTunneler']();
});

document.getElementById('cometary-ice-harvester-button').addEventListener('change', () => {
    toggleCometaryIceHarvester();
});


// ==========================================
//            ACTION CARD FUNCTIONS
// ==========================================

// This function handles clicks on action cards, executing the appropriate function based on the action name.
function handleActionCardClick(actionName) {
    switch (actionName) {
        case 'exploration':
            exploreMarsSurface();
            break;
            case 'ice-melting':
                meltIce();  
                break;
        case 'ice-melting-basin':
            fillIceMeltingBasin();
            break;
        case 'nuclear-ice-melter':
            toggleNuclearIceMelter();
            break;
        case 'polar-cap-mining':
            togglePolarCapMining();
            break;
        // Add more cases for future clickable action cards
        default:
            console.warn(`No handler for action card: ${actionName}`);
    }
}

function initializeActionCards() {
    const clickableCards = document.querySelectorAll('.action-card.clickable');
    clickableCards.forEach(card => {
        card.addEventListener('click', (event) => {
            if (!card.hasAttribute('disabled') && card.style.display !== 'none') {
                const actionName = card.id.replace('-container', '');
                handleActionCardClick(actionName);
            }
        });
    });
}

function unlockActionCardForUpgrade(upgradeName) {
    const actionCardIdMap = {
        "Manual Ice Melting": 'ice-melting-container',
        "Ice Melting Basin": 'ice-melting-basin-container',
        "Nuclear Ice Melter": 'nuclear-ice-melter-container',
        "Cometary Ice Harvester": 'cometary-ice-harvester-container',
        "Martian Potato Colonizer": 'martian-potato-colonizer-container',
        "Quantum Spud Spawner": 'quantum-spud-spawner-container',
        "Subterranean Tuber Tunneler": 'subterranean-tuber-tunneler-container',
        "Bucket Wheel Excavator": 'bucket-wheel-excavator-container',
        "Subsurface Aquifer Tapper": 'subsurface-aquifer-tapper-container',
        "Polar Cap Mining": 'polar-cap-mining-container',
    };

    const actionCardId = actionCardIdMap[upgradeName];
    if (actionCardId && !window.unlockedActionCards.includes(actionCardId)) {
        window.unlockedActionCards.push(actionCardId);
        const actionCard = document.getElementById(actionCardId);
        if (actionCard) {
            actionCard.style.display = 'block';
        }
    }
}

