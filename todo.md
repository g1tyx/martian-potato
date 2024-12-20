TODO:
- [x] Update achievement system
    - [x] Achievement modal instead of toast
    - [ ] Add image files for achievements:
        - [x] Use potato emoji (🥔) for first_potato achievement
        - [x] potato_century.webp
- [x] Implement better click effect on Plant Potato button
- [x] Implement Ice as a resource to replace Oxygen
- [x] Update ice melting to consume ice
- [x] Implement Ice Mining
- [x] Implement Automated Ice Melting
    - [x] Ice Melting Basin
        - Asset: ice_melting_basin.webp
    - [x] Nuclear Ice Melter
        - Asset: nuclear_ice_melter.webp
- [x] Change Soil Nutrients to just nutrients
    - [x] add nutrient gathering upgrades
- [x] Add exploration upgrades for water extraction:
    - [x] Thermal Drill
    - [x] Subsurface Aquifer Tapper
    - [x] Martian Polar Cap Extractor
    - [x] Cometary Ice Harvester
- [x] Implement upgrade to increase plots from 8 to 16 and possibly more
- [x] Implement "tutorial" hover effect to highlight the initial actions the user should take
- [x] Implement save/load functionality
- [x] Make it so that planting potatoes does not consume or require ice, just water and nutrients
- [x] Implement upgrades that reduce the time it takes for potatoes to be ready to harvest
- [x] Replace soil enrichment with potato compost
- [x] Implement the following upgrades which unlock additional technologies in the tech tree:
    - [x] Potato Battery
    - [x] Potato Computer Chip
    - [x] Potato Computer
    - [x] Potato Quantum Computer
- [x] Remove exploration stats
- [x] Implement time tracking to show user how many potatoes they've harvested over the course of their playtime and graph the potatoes over time in a chart
- [x] Remove harvest all ready potatoes debug button
- [x] Fix or remove Potatoes per second calculation
- [x] Hide debug menu
- [x] Add exploration cards for remaining upgrades
    - [x] Subsurface Aquifer Tapper
    - [x] Martian Polar Cap Extractor
    - [x] Subterranean Tunneler
    - [x] Cometary Ice Harvester
    - [x] Martian Potato Colonizer
- [x] add hide/show button for the potatoes over time graph
- [x] Implement functionality for Quantum Spud Spawner
- [x] Change the martian potato colonizer and commetary ice melter action card toggle switch to be a spinner countdown or something instead of a toggle
- [x] Consider making nuclear ice melter melt 5% of available ice resource instead fo a fixed amount
    - [x] Or even consider allowing the player to adjust the percentage
- [x] Style the toggle switches to match the specific resource generated
- [x] Add cumulative potato stats to graph modal
- [x] Add "running low" message for resources with help text on what to do about it like "explore mars surface to gather more resources"
- [x] colonizer cooldown should decrease by 50% each "cycle" so that the end game is faster
- [x] remove thermal drill or make it more interesting
- [x] start with 20 resources of each type
- [x] reduce cost of spudnik satellite
- [x] Write real meta messages and descriptions
- [x] Command+S should save the game
- [x] Add new achievements:
    - [x] "Tech Savvy": Purchase your first 5 upgrades
    - [x] "Martian Engineer": Unlock all upgrades
    - [x] "One Sol Wonder": Play the game continuously for 1 Martian day (24 hours and 37 minutes)
    - [x] "Potato Empire": Have 1000 potatoes, 1000 water, 1000 soil nutrients, and 1000 oxygen simultaneously
- [x] Revise end screen to feature the final achievement at the top where it currently says "Potato civilization statistics"
- [x] Once neural network training is completed, increment the version number label on the neural network console rapidly to indicate rapid self-improvement
- [x] Add minimize functionality to the neural network console
- [x] Add potato sentience upgrade effect
- [x] Mobile styling
- [x] Fix UI scaling and accessibility
- [x] Fix Nuclear Ice Melter upgrade control switch bug
- [x] Implement game settings
    - [x] Create mobile-friendly settings modal
        - [x] Design responsive layout
        - [x] Implement open/close functionality
        - [x] Add save/cancel buttons
    - [x] Fix settings modal styling and layout
        - [x] Center modal on desktop
        - [x] Reduce modal size and add proper spacing
        - [x] Fix mobile scrolling issues
        - [x] Ensure save/cancel buttons are always visible
        - [x] Add proper padding and margins
        - [x] Improve toggle layout and sizing
    - [x] Implement settings functionality
        - [x] Sound toggle (placeholder)
            - [x] Create game sound system structure
            - [x] Add mute state to localStorage
            - [x] Prepare sound toggle logic for future sound effects
            - [x] Fix sound system state synchronization
        - [x] Animation toggle
            - [x] Add CSS class for disabling potato growth animation
            - [x] Store animation preference in localStorage
            - [x] Apply animation settings on game load
            - [x] Update growth indicator visibility
            - [x] Fix growth indicator animation behavior
        - [x] Auto-save system
            - [x] Implement interval-based saving
            - [x] Handle interval changes
            - [x] Add save confirmation toasts
        - [x] Toast notification system
            - [x] Implement notification filtering
            - [x] Handle importance levels (using existing notification types)
            - [x] Test all notification scenarios
    - [x] Implement settings groups
- [x] Implement toast notification settings
    - [x] Add toggle for all toast notifications
    - [x] Add option for "Important notifications only"
    - [x] Create UI for notification preferences
    - [x] Define which notifications are "important"
    - [x] Persist notification settings in save game
- [x] Settings UI fixes
    - [x] Move animations toggle to graphics section
    - [x] Reduce spacing between label and toggle
    - [x] Update settings saved success message
    - [x] Center settings modal on desktop
    - [x] Fix modal background color (broken in 4bfc788)
- [x] Create instructions for how to play
- [x] Implement basic automation panel
    - [x] Resource consumption + production rates per machine
    - [x] Machine states
--------------------------------------------------------------------------------------------
    - [ ] Automation panel net production rates
- [ ] Enhance upgrade UI/UX
    - [ ] Implement full screen upgrades modal
    - [ ] Implement upgrade categories
    - [ ] Update typography
    - [ ] Create menu instead of header buttons
- [ ] Balance upgrade costs and effects
- [ ] Implement nuclear meltdown if too much ice is melted too quickly
- [ ] Write a README.md for the project




Bugs/Issues:
- [x] The blur on the tech tree is reappearing on load even after a level 10 upgrade is purchased
- [x] Manual exploration should reward no water and twice as much ice as nutrients since ice is melted into water and we want to encourage that action without ice going to 0 to use the nutrients gained from exploration
- [x] Reduce initial planting delay from 5 to 3 seconds, and adjust the upgrades to match
- [x] clicking tech tree cards should open the modal not try to purchase the upgrade
- [x] increase weight of thermal drill by 5
- [x] disabled action cards should not have a click effect
- [x] increase cost of potato genome modification by 50 potatoes
- [x] remove ice melting acheivments
    - [x] iceMeltingBasinMaster
    - [x] nuclearIceMelterMaster
- [x] reduce cost of jetpack to 200 potatoes
- [x] remove the ice 2x multiple for manual exploration
- [x] potato century achievent should be based on cumulative total, not just current count
- [x] The last milestone tech cards arent being removed
- [x] Subterrarean tunneler starts generating resources right away, even before it is turned on with the toggle switch
- [x] Exploration bonus doesnt seem to be increasing (or maybe its not persistent between loads)
- [x] Toasts about exploration rates changing are showing every load instead of just when the upgrade is purchased
- [x] move potato colonizer to right of spud spawner
- [x] make the spud spawner faster
- [x] Currently the fully upgraded game consumes more than one potato to produce one potato, we need to make it positive so that the game is sustainable. Unlocked tech should consume different resources if possible, not always just potatoes, and we should reward more of each resource.
- [x] Subsurface Aquifer Tapper is not working after loading from save
- [x] Logic for removing graph datapoints when there are too many is broken
- [x] Bucket wheel excavator and subterranean tunneler do not generate resources after refreshing the game / loading the game from a save
- [x] Unlocking the nuclear ice melter hides the Subsurface aquifer tapper and polar cap mining action cards... which appear again on refresh
- [x] Refreshing the page / loading the game from a save changes the order of the technology upgrades. I noticed ice melting basin goes from like 4th to 12th or something, higher that some of the much higher tier upgrades. It should be sorted by tier though... so this should not be happening.
- [x] Unlocking all tech doesn't show the achievement
- [x] Potato spots can appear over the growth indicator percentage
- [x] Buttons dont have convincing click effects because they move a bit
- [x] Auto Harvester should be relabeled Autonomous Harvesting Rover, Automated Planter should be relabeled Autonomous Planting Rover. In production stats it sh ould be abbreviated as Planting Rovers and Harvesting Rovers.
- [x] Martian map reduces exploration time by too much
- [x] Reduce weight of ice melting basin to make it more visible in the tech tree
- [x] Polar cap mining should consume only 1 potato not 2, and should generate 4 ice not 2
- [x] Gravitropism upgrade cost increase from 250 to 1000
- [x] Manual ice melting is double counting clicks
- [x] Exit to reality should open in the same tab not a new tab
- [x] critical bug: upgrade modals are not working!
- [x] quantum spud spawner poof appearing not on the potato but above
--------------------------------------------------------------------------------------------
