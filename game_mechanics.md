# Game Mechanics

*NOTE: THIS IS OUTDATED - WAS JUST TO GET STARTED*

## 1. Planting and Harvesting
- Manual planting and harvesting using clicks
- Each plot has a growth timer based on potato type and upgrades
- Harvesting yields potatoes and Martian Spuds (MS) currency
- Upgrades:
  - Hand Trowel: Reduces planting time
  - Automated Planter: Plants multiple plots at once
  - Harvester: Automatically harvests mature potatoes
  - Drone Harvester: Harvests remote plots
  - Self-Propelled Harvester: Harvests entire regions on a set schedule

## 2. Resource Management
- Water, nutrients, and oxygen are required for potato growth
- Each resource has a storage capacity and depletion rate based on farm size
- Upgrades:
  - Water: Ice Melter > Solar Still > Atmospheric Condenser
  - Nutrients: Martian Dust > Composting > Nutrient Synthesizer
  - Oxygen: Photosynthesis > Algae Bioreactor > Oxygen Generator

## 3. Technology Progression
- Potato-based technologies are unlocked through the research tree
- Each tier requires a certain amount of MS and potatoes to unlock
- Technologies:
  - Potato Chips: Increases MS value of potatoes
  - Potato Battery: Powers machines and increases efficiency
  - Potato Computer: Unlocks automation and advanced research

## 4. Exploration and Expansion
- Use MS to send rovers to explore new regions of Mars
- Discovered areas can be claimed for additional farming space
- Regions have different soil qualities, affecting growth and yield
- Artifacts found during exploration provide bonus MS or unique upgrades

## 5. Colony Management
- Colonists arrive seeking sustenance as the farm grows
- Each colonist requires a certain amount of potatoes per day
- Colonists provide labor, increasing farm efficiency and unlocking new upgrades
- Balancing potato production and colonist needs is a key challenge

## 6. Economy and Currency
- Martian Spuds (MS) are earned by selling potatoes and discovering artifacts
- MS is used to purchase upgrades, technologies, and exploration missions
- Prices and rewards are balanced to create meaningful choices and progression

## 7. Procedural Generation
- Martian landscapes and soil conditions are procedurally generated
- Exploration events and artifacts are randomly generated to encourage exploration
- Each playthrough offers a unique experience and new challenges

## 8. Game Loop and Progression
- Plant potatoes, manage resources, harvest, earn MS, spend MS, expand, and repeat
- Complexity and difficulty increase as the farm and colony grow
- Prestige system allows players to reset with bonuses for added replayability

## 9. Mini-Games and Puzzles
- Mini-games and puzzles for resource management and exploration
- Provides variety and additional challenges to keep gameplay engaging

## 10. Save and Load System
- Robust save and load system to allow players to continue their progress
- Serialization is used to store game state, including farm layout, resources, and upgrades
- Cloud saving options for cross-device play and backup



1. Set up the project structure:
   - Create a new directory for the project
   - Initialize a new Git repository
   - Create subdirectories for js, css, and assets
   - Create the main index.html file

2. Implement the basic game loop:
   - Create a game.js file in the js directory
   - Implement the plantPotato() function to handle potato planting
   - Implement the updateDisplay() function to update the game stats
   - Set up event listeners for the "Plant Potato" button

3. Implement resource management:
   - Add variables for water, soilNutrients, and oxygen
   - Modify the plantPotato() function to consume resources
   - Update the updateDisplay() function to show resource levels

4. Create the game UI:
   - Design the layout in index.html with placeholders for game elements
   - Create a style.css file in the css directory
   - Style the game elements, buttons, and resource displays

5. Implement the research system:
   - Create a research() function in game.js
   - Add research buttons for water, soil, and oxygen
   - Implement the logic to improve resource efficiency upon research
   - Update the updateDisplay() function to show research progress

6. Implement the upgrade system:
   - Create an upgrades.js file in the js directory
   - Define the upgrade tree structure
   - Implement the buyUpgrade() function to handle upgrades
   - Create a displayUpgrades() function to render upgrade buttons
   - Update the game UI to include an upgrades section

7. Implement the exploration system:
   - Create an exploration.js file in the js directory
   - Implement the exploreMarsSurface() function to handle exploration
   - Create a discoverRandomEvent() function to generate random events
   - Implement the handleSpecialEvent() function to process event outcomes
   - Update the game UI to include an exploration button and display

8. Implement the potato processing system:
   - Add variables for potatoChips, potatoBattery, and potatoComputer
   - Create functions to process potatoes into various products
   - Update the game UI to include potato processing options

9. Implement the colony management system:
   - Add variables for colonists and potatoConsumption
   - Create functions to manage colonists and their potato needs
   - Update the game UI to display colony information

10. Implement special events and challenges:
    - Create a specialEvents.js file in the js directory
    - Implement functions to trigger and handle special events
    - Update the game loop to periodically check for special events

11. Polish the game:
    - Playtest and balance the game mechanics
    - Add sound effects and music
    - Create game art and animations
    - Optimize the code for performance

12. Prepare for deployment:
    - Minify JavaScript and CSS files
    - Optimize assets for faster loading
    - Set up a build process (e.g., using Webpack or Parcel)

13. Deploy the game:
    - Choose a hosting platform (e.g., GitHub Pages, Netlify, or Heroku)
    - Deploy the game to the selected platform
    - Ensure the game is accessible and works as expected