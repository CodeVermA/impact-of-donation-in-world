// Get a reference to the main simulation area
const simulationArea = document.querySelector('.simulation-view');

// Get all the elements we need
const amountButtons = document.querySelectorAll('.amount-btn');
const customAmountInput = document.querySelector('.custom-amount-input');

// Combine them into one list for easier management
const allAmountOptions = [...amountButtons, customAmountInput];

// Define the size of our grid
const gridSize = 20 * 10; // 200 tiles

// Loop to create and add each tile to the grid
for (let i = 0; i < gridSize; i++) {
    // 1. Create a new div element
    const tile = document.createElement('div');

    // 2. Add the 'tile' class to it for styling
    tile.classList.add('tile');

    // 3. Append the new tile to the simulation area
    simulationArea.appendChild(tile);
}

// In script.js, add this function near the top
function addLogMessage(message) {
    const logList = document.getElementById('log-list');
    const newLogItem = document.createElement('li');
    
    // Optional: Add a timestamp for clarity
    const time = new Date().toLocaleTimeString();
    newLogItem.textContent = `[${time}] ${message}`;
    
    // Add the new message to the top of the list
    logList.prepend(newLogItem);
}

function clearAllSelections() {
    allAmountOptions.forEach(option => {
        option.classList.remove('selected');
    });
}

// 3. Add click listeners to the preset amount buttons
amountButtons.forEach(button => {
    button.addEventListener('click', () => {
        // First, clear any previous selection
        clearAllSelections();
        
        // Then, add the 'selected' class to the clicked button
        button.classList.add('selected');

        // Optional: Clear the text in the 'Other' box if a preset is chosen
        customAmountInput.value = '';
    });
});

// 4. Add a click listener to the custom amount input box
customAmountInput.addEventListener('click', () => {
    // First, clear any selected buttons
    clearAllSelections();

    // Then, add the 'selected' class to the input box itself
    customAmountInput.classList.add('selected');
});

// === LOGIC FOR PROCESSING DONATIONS ===

// 1. A variable to store the currently selected amount
let selectedAmount = 0;

// REPLACE your old charityData and charityTotals objects with this single, detailed object.
// In script.js, replace your old charityData object with this one.
const charityData = {
    environmental: {
        donated: 0,
        spent: 0,
        itemCost: 5,
        itemsBought: 0,
        folder: 'trees',
        growthImages: [
            ['sapling.png'],
            ['Tree1.png', 'Fruit_tree1.png'],
            ['Autumn_tree1.png', 'Moss_tree1.png', 'Christmas_tree1.png']
        ]
    },
    animal: {
        donated: 0,
        spent: 0,
        itemCost: 10,
        itemsBought: 0,
        folder: 'animals',
        shelterImage: 'shelter.png',
        animalImages: ["cat.png", "dog.png", "bird.png", "cat2.png", "dog2.png"],
        shelters: [], // Each shelter will be an object: { tile: element, animalCount: 0 }
        shelterCapacity: 5 // The max number of animals per shelter
    },
    education: {
        donated: 0,
        spent: 0,
        itemCost: 20,
        itemsBought: 0,
        folder: 'education',
        buildings: [], // Each building will be an object: { tile: element, stage: 0 }
        buildingImages: [
            'foundation.png',
            'walls.png',
            'roof.png',
            'school_complete.png'
        ],
        studentCapacity: 10,
        studentImages: [
            'student1.png',
            'student2.png',
            'student3.png'
        ]
    }
};

amountButtons.forEach(button => {
    button.addEventListener('click', () => {
        clearAllSelections();
        button.classList.add('selected');
        customAmountInput.value = '';

        selectedAmount = parseInt(button.innerText.replace('$', ''));
    });
});

customAmountInput.addEventListener('input', () => {
    clearAllSelections();
    customAmountInput.classList.add('selected');

    selectedAmount = parseInt(customAmountInput.value) || 0;
});


// 5. Get all the "Donate" buttons and add the core logic
const donateButtons = document.querySelectorAll('.card-button');

donateButtons.forEach(button => {
    button.addEventListener('click', () => {
        const charityId = button.dataset.charityId;
        const charity = charityData[charityId];

        if (selectedAmount > 0) {
            // 1. Add the donation amount immediately
            charity.donated += selectedAmount;

            // 2. Calculate how many NEW items can be bought
            let newItemsToPlace = Math.floor((charity.donated - charity.spent) / charity.itemCost);

            if (newItemsToPlace > 0) {
                // 3. Use an interval to place items one by one
                const placeInterval = setInterval(() => {
                    if (newItemsToPlace > 0) {
                        const placementSuccess = placeItemOnGrid(charityId);
                        if (placementSuccess) {
                            // If placed, update counts and UI
                            charity.itemsBought++;
                            charity.spent = charity.itemsBought * charity.itemCost;

                            document.getElementById(`${charityId}-donated-amount`).innerText = '$' + charity.donated;
                            document.getElementById(`${charityId}-spent-amount`).innerText = '$' + charity.spent;
                        } else {
                            // Grid is full, stop trying
                            clearInterval(placeInterval);
                        }
                        newItemsToPlace--;
                    } else {
                        // All items placed, stop the interval
                        clearInterval(placeInterval);
                    }
                }, 200); // Place one item every 200ms
            } else {
                 // If no new items can be bought, just update the donated amount display
                 document.getElementById(`${charityId}-donated-amount`).innerText = '$' + charity.donated;
            }

        } else {
            alert('Please select an amount to donate first.');
        }
    });
});

// Function to place an item on the grid based on charity type
function placeItemOnGrid(charityId) {
    const charity = charityData[charityId];
    const emptyTiles = Array.from(document.querySelectorAll('.tile:not(:has(*))'));

    // =================================================
    //  EDUCATION CHARITY LOGIC (Multiple Schools)
    // =================================================
    if (charityId === 'education') {
    const maxStage = charity.buildingImages.length - 1;

    // Priority 1: Find a COMPLETED school with available student capacity.
    let availableSchool = charity.buildings.find(b => b.stage === maxStage && b.studentCount < charity.studentCapacity);
    
    if (availableSchool) {
        // If we found a school with space, add a student to the grid.
        if (emptyTiles.length > 0) {
            const randomEmptyTile = emptyTiles[Math.floor(Math.random() * emptyTiles.length)];
            const imageName = charity.studentImages[Math.floor(Math.random() * charity.studentImages.length)];
            const imagePath = `assets/images/${charity.folder}/${imageName}`;
            randomEmptyTile.innerHTML = `<img src="${imagePath}" alt="Student" class="new-item">`;
            
            // Increment the student count for that specific school.
            availableSchool.studentCount++;
            addLogMessage("A new student has been enrolled."); // LOG
            return true;
        }
    }

    // Priority 2: If no students can be added, find an INCOMPLETE school to continue building.
    let buildingToUpgrade = charity.buildings.find(b => b.stage < maxStage);

    if (buildingToUpgrade) {
        // If we found an incomplete building, upgrade it.
        buildingToUpgrade.stage++;
        const imageName = charity.buildingImages[buildingToUpgrade.stage];
        const imagePath = `assets/images/${charity.folder}/${imageName}`;
        buildingToUpgrade.tile.innerHTML = `<img src="${imagePath}" alt="School part" class="new-item">`;

        const stageMessages = ["School walls have been built.", "The school roof is complete!", "The school is now open!"];
        addLogMessage(stageMessages[buildingToUpgrade.stage -1]); // LOG
        return true;
    }

    // Priority 3: If all schools are full or none exist, start a new one.
    if (emptyTiles.length > 0) {
        const newTile = emptyTiles[0];
        // Note the new studentCount property
        const newBuilding = { tile: newTile, stage: 0, studentCount: 0 };
        charity.buildings.push(newBuilding);

        const imageName = charity.buildingImages[0]; // Foundation
        const imagePath = `assets/images/${charity.folder}/${imageName}`;
        newTile.innerHTML = `<img src="${imagePath}" alt="School foundation" class="new-item">`;
        addLogMessage("A new school foundation was laid."); // LOG
        return true;
    }
    
    return false; // No space for any action.
}

    // =================================================
    //  ANIMAL CHARITY LOGIC (Shelter with Capacity)
    // =================================================
    if (charityId === 'animal') {
        // Find a shelter that has space for another animal.
        let availableShelter = charity.shelters.find(s => s.animalCount < charity.shelterCapacity);

        if (availableShelter) {
            // If there's a shelter with space, add an animal to the grid.
            if (emptyTiles.length > 0) {
                const randomEmptyTile = emptyTiles[Math.floor(Math.random() * emptyTiles.length)];
                const imageName = charity.animalImages[Math.floor(Math.random() * charity.animalImages.length)];
                const imagePath = `assets/images/${charity.folder}/${imageName}`;
                randomEmptyTile.innerHTML = `<img src="${imagePath}" alt="Rescued Animal" class="new-item">`;
                
                // Increment the count for the shelter that had space.
                availableShelter.animalCount++;
                addLogMessage("An animal has been rescued!"); // LOG
                return true;
            }
        } else {
            // All existing shelters are full (or none exist), so build a new one.
            if (emptyTiles.length > 0) {
                const newTile = emptyTiles[0];
                const newShelter = { tile: newTile, animalCount: 0 };
                charity.shelters.push(newShelter);

                const imagePath = `assets/images/${charity.folder}/${charity.shelterImage}`;
                newTile.innerHTML = `<img src="${imagePath}" alt="Animal Shelter" class="new-item">`;
                addLogMessage("A new animal shelter has been built."); // LOG
                return true;
            }
        }
        return false; // No space for a new animal or shelter.
    }

    // =================================================
    //  ENVIRONMENTAL CHARITY LOGIC (Remains the same)
    // =================================================
    if (charityId === 'environmental') {
        const upgradableTiles = document.querySelectorAll('.tile[data-charity="environmental"]:not([data-stage="2"])');
        if (upgradableTiles.length > 0) {
            const tileToUpgrade = upgradableTiles[Math.floor(Math.random() * upgradableTiles.length)];
            const currentStage = parseInt(tileToUpgrade.dataset.stage);
            const nextStage = currentStage + 1;
            const imageList = charity.growthImages[nextStage];
            const randomImageName = imageList[Math.floor(Math.random() * imageList.length)];
            const imagePath = `assets/images/${charity.folder}/${randomImageName}`;
            tileToUpgrade.innerHTML = `<img src="${imagePath}" alt="Upgraded Tree" class="new-item">`;
            tileToUpgrade.dataset.stage = nextStage;
            addLogMessage("A tree has grown larger."); // LOG
            return true;
        }
    }

    // =================================================
    //  DEFAULT PLACEMENT (For new saplings)
    // =================================================
    if (charityId === 'environmental' && emptyTiles.length > 0) {
        const randomEmptyTile = emptyTiles[Math.floor(Math.random() * emptyTiles.length)];
        const imageName = charity.growthImages[0][0];
        const imagePath = `assets/images/${charity.folder}/${imageName}`;
        randomEmptyTile.innerHTML = `<img src="${imagePath}" alt="Donated Item" class="new-item">`;
        randomEmptyTile.dataset.charity = 'environmental';
        randomEmptyTile.dataset.stage = '0';
        addLogMessage("A sapling was planted."); // LOG
        return true;
    }

    console.log("No empty tiles or valid action available!");
    return false;
}


// RESET BUTTON LOGIC
const resetButton = document.getElementById('reset-button');
const allTiles = document.querySelectorAll('.tile');

resetButton.addEventListener('click', () => {
    // 1. Clear all images and data from the grid tiles
    allTiles.forEach(tile => {
        tile.innerHTML = '';
        // Also remove any data attributes set for the environmental charity
        delete tile.dataset.charity;
        delete tile.dataset.stage;
    });

    const logList = document.getElementById('log-list');
    logList.innerHTML = '';

    // 2. Reset all the charity data in the main JavaScript object
    for (const charityId in charityData) {
        const charity = charityData[charityId];
        charity.donated = 0;
        charity.spent = 0;
        charity.itemsBought = 0;

        // Reset the unique arrays for animal and education charities
        if (charityId === 'animal') {
            charity.shelters = [];
        }
        if (charityId === 'education') {
            charity.buildings = [];
        }

        // Update the UI text display to show $0
        document.getElementById(`${charityId}-donated-amount`).innerText = '$0';
        document.getElementById(`${charityId}-spent-amount`).innerText = '$0';
    }

    // 3. Reset the donation amount selection
    clearAllSelections(); // This function already exists in your code
    customAmountInput.value = '';
    selectedAmount = 0;

    console.log("Simulation has been reset!");
});