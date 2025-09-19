class MonopolyGame {
    constructor() {
        this.players = [];
        this.currentPlayerIndex = 0;
        this.gameStarted = false;
        this.board = this.initializeBoard();
        this.doubleCount = 0;
        this.chanceCards = this.initializeChanceCards();
        this.lastRoll = null;
        this.colorGroups = this.initializeColorGroups();
        this.pendingAction = null; // Tracks actions like buy, payRent, etc.
    }

    initializeBoard() {
        return [
            { name: "START", type: "start", position: 0 },
            { name: "Alpha Block", type: "property", price: 100, color: "light-blue", position: 1, owner: null, houses: 0, baseRent: 10 },
            { name: "Delta Block", type: "property", price: 100, color: "light-blue", position: 2, owner: null, houses: 0, baseRent: 10 },
            { name: "Sigma Block", type: "property", price: 100, color: "light-blue", position: 3, owner: null, houses: 0, baseRent: 10 },
            { name: "Electricity", type: "utility", price: 200, position: 4, owner: null },
            { name: "Transport", type: "utility", price: 200, position: 5, owner: null },
            { name: "Sports", type: "property", price: 150, color: "light-green", position: 6, owner: null, houses: 0, baseRent: 15 },
            { name: "Parking", type: "property", price: 150, color: "light-green", position: 7, owner: null, houses: 0, baseRent: 15 },
            { name: "Courier Point", type: "property", price: 150, color: "light-green", position: 8, owner: null, houses: 0, baseRent: 15 },
            { name: "CHANCE", type: "chance", position: 9 },
            { name: "Aavin", type: "property", price: 170, color: "orange", position: 10, owner: null, houses: 0, baseRent: 17 },
            { name: "Hunger", type: "property", price: 170, color: "orange", position: 11, owner: null, houses: 0, baseRent: 17 },
            { name: "Gym Khana", type: "property", price: 200, color: "dark-blue", position: 12, owner: null, houses: 0, baseRent: 20 },
            { name: "Dominos", type: "property", price: 200, color: "dark-blue", position: 13, owner: null, houses: 0, baseRent: 20 },
            { name: "Water Pump", type: "utility", price: 200, position: 14, owner: null },
            { name: "VMart", type: "property", price: 220, color: "dark-green", position: 15, owner: null, houses: 0, baseRent: 22 },
            { name: "North Square", type: "property", price: 220, color: "dark-green", position: 16, owner: null, houses: 0, baseRent: 22 },
            { name: "Gazebo", type: "property", price: 220, color: "dark-green", position: 17, owner: null, houses: 0, baseRent: 22 },
            { name: "JAIL", type: "jail", position: 18 },
            { name: "Chota Dhobi", type: "property", price: 250, color: "brown", position: 19, owner: null, houses: 0, baseRent: 25 },
            { name: "Mess", type: "property", price: 250, color: "brown", position: 20, owner: null, houses: 0, baseRent: 25 },
            { name: "A Block", type: "property", price: 270, color: "yellow", position: 21, owner: null, houses: 0, baseRent: 27 },
            { name: "D1 Block", type: "property", price: 270, color: "yellow", position: 22, owner: null, houses: 0, baseRent: 27 },
            { name: "D2 Block", type: "property", price: 270, color: "yellow", position: 23, owner: null, houses: 0, baseRent: 27 },
            { name: "Health Center", type: "utility", price: 200, position: 24, owner: null },
            { name: "B Block", type: "property", price: 300, color: "pink", position: 25, owner: null, houses: 0, baseRent: 30 },
            { name: "C Block", type: "property", price: 300, color: "pink", position: 26, owner: null, houses: 0, baseRent: 30 },
            { name: "IOT", type: "iot", position: 27 },
            { name: "AB-1", type: "property", price: 350, color: "red", position: 28, owner: null, houses: 0, baseRent: 35 },
            { name: "AB-2", type: "property", price: 350, color: "red", position: 29, owner: null, houses: 0, baseRent: 35 },
            { name: "AB-3", type: "property", price: 350, color: "red", position: 30, owner: null, houses: 0, baseRent: 35 },
            { name: "AB-4", type: "property", price: 350, color: "red", position: 31, owner: null, houses: 0, baseRent: 35 },
            { name: "Library", type: "utility", price: 200, position: 32, owner: null },
            { name: "Guest House", type: "property", price: 400, color: "purple", position: 33, owner: null, houses: 0, baseRent: 40 },
            { name: "MG Auditorium", type: "property", price: 450, color: "purple", position: 34, owner: null, houses: 0, baseRent: 45 },
            { name: "ADMIN BLOCK", type: "property", price: 700, color: "orange-premium", position: 35, owner: null, houses: 0, baseRent: 70 }
        ];
    }

    initializeColorGroups() {
        return {
            "light-blue": [1, 2, 3],
            "light-green": [6, 7, 8],
            "orange": [10, 11],
            "dark-blue": [12, 13],
            "dark-green": [15, 16, 17],
            "brown": [19, 20],
            "yellow": [21, 22, 23],
            "pink": [25, 26],
            "red": [28, 29, 30, 31],
            "purple": [33, 34],
            "orange-premium": [35]
        };
    }

    initializeChanceCards() {
        return [
            { action: "move", description: "Advance to START - Collect $200", value: 0 },
            { action: "move", description: "Advance to GAZEBO", value: 17 },
            { action: "move", description: "Go directly to JAIL - Do not pass GO", value: 18 },
            { action: "move", description: "Take a trip to ADMIN BLOCK", value: 35 },
            { action: "money", description: "Bank pays you dividend of $100", value: 100 },
            { action: "money", description: "Pay poor tax of $50", value: -50 },
            { action: "money", description: "You won a coding contest! Collect $200", value: 200 },
            { action: "money", description: "Library fine - Pay $25", value: -25 },
            { action: "move", description: "Advance to the nearest Utility and pay double rent", value: "nearestUtility" },
            { action: "move", description: "Go back 3 spaces", value: "back3" },
            { action: "money", description: "Your semester fees are waived! Collect $300", value: 300 },
            { action: "money", description: "Pay for hostel damages - $75", value: -75 },
            
            { action: "money", description: "Bank error in your favor - Collect $150", value: 150 },
            { action: "money", description: "You lost your ID card - Pay $40 for replacement", value: -40 }
        ];
    }

    addPlayer(id, name) {
        if (this.players.length >= 4 || this.gameStarted) {
            return false;
        }
        const player = {
            id,
            name,
            position: 0,
            money: 1500,
            properties: [],
            inJail: false,
            jailTurns: 0,
            iotTurns: 0,
            active: true
        };
        this.players.push(player);
        return true;
    }

    startGame() {
        if (this.players.length < 2) {
            return false;
        }
        this.gameStarted = true;
        this.currentPlayerIndex = 0;
        return true;
    }

    nextTurn() {
        this.doubleCount = 0;
        let nextIndex = (this.currentPlayerIndex + 1) % this.players.length;
        let attempts = 0;
        while (!this.players[nextIndex].active && attempts < this.players.length) {
            nextIndex = (nextIndex + 1) % this.players.length;
            attempts++;
        }
        this.currentPlayerIndex = nextIndex;
        return this.players[this.currentPlayerIndex];
    }

    rollDice() {
        const die1 = Math.floor(Math.random() * 6) + 1;
        const die2 = Math.floor(Math.random() * 6) + 1;
        const isDouble = die1 === die2;
        if (isDouble) this.doubleCount++;
        return { die1, die2, total: die1 + die2, isDouble };
    }

    movePlayer(steps) {
        const player = this.players[this.currentPlayerIndex];
        const previousPosition = player.position;
        
        if (steps === "back3") {
            player.position = Math.max(0, player.position - 3);
            console.log(`Player ${player.name} moved back 3 to position ${player.position} (${this.board[player.position].name})`);
            return { passedStart: false };
        }
        
        player.position = (player.position + steps) % 36;
        console.log(`Player ${player.name} moved from ${previousPosition} to ${player.position} (${this.board[player.position].name}) with steps ${steps}`);
        
        if (player.position < previousPosition || (previousPosition > 30 && player.position < 10)) {
            player.money += 200;
            return { passedStart: true };
        }
        
        return { passedStart: false };
    }

    handlePosition(player) {
        const position = this.board[player.position];
        
        if (player.iotTurns > 0) {
            player.iotTurns--;
            return { action: "iot", turnsLeft: player.iotTurns };
        }
        
        switch (position.type) {
            case "property":
                if (position.owner === null) {
                    return { action: "buy", property: position };
                } else if (position.owner === player.id) {
                    if (position.houses < 4 && this.canUpgradeProperty(player, position)) {
                        return { action: "upgrade", property: position };
                    }
                } else if (position.owner !== player.id && player.iotTurns === 0) {
                    const rent = this.calculateRent(position);
                    return { action: "payRent", property: position, amount: rent, owner: position.owner };
                }
                break;
                
            case "utility":
                if (position.owner === null) {
                    return { action: "buy", property: position };
                } else if (position.owner !== player.id && player.iotTurns === 0) {
                    const rent = this.calculateRent(position);
                    return { action: "payRent", property: position, amount: rent, owner: position.owner };
                }
                break;
                
            case "chance":
                const card = this.drawChanceCard();
                this.executeChanceCard(card, player);
                return { action: "chance", card };
                
            case "jail":
                return { action: "jail-visit" };
                
            case "iot":
                player.iotTurns = 3;
                return { action: "iot", turnsLeft: player.iotTurns };
                
            case "start":
                break;
        }
        
        return { action: "none" };
    }

    canUpgradeProperty(player, property) {
        const colorGroup = this.colorGroups[property.color];
        if (!colorGroup) return false;
        return colorGroup.every(position => {
            const prop = this.board[position];
            return prop.owner === player.id;
        });
    }

    calculateRent(property) {
        if (property.type === "utility") {
            const utilitiesOwned = this.board.filter(p => 
                p.type === "utility" && p.owner === property.owner
            ).length;
            const multiplier = utilitiesOwned === 1 ? 4 : 
                              utilitiesOwned === 2 ? 10 : 
                              utilitiesOwned === 3 ? 15 : 20;
            return multiplier * (this.lastRoll ? this.lastRoll.total : 7);
        }
        
        let baseRent = property.baseRent;
        const colorGroup = this.colorGroups[property.color];
        if (colorGroup) {
            const ownsAll = colorGroup.every(position => {
                const prop = this.board[position];
                return prop.owner === property.owner;
            });
            if (ownsAll) {
                baseRent *= 2;
            }
        }
        
        const houseMultiplier = Math.pow(1.5, property.houses);
        return Math.floor(baseRent * houseMultiplier);
    }

    drawChanceCard() {
        const randomIndex = Math.floor(Math.random() * this.chanceCards.length);
        return this.chanceCards[randomIndex];
    }

    executeChanceCard(card, player) {
        switch (card.action) {
            case "move":
                if (card.value === "nearestUtility") {
                    const utilities = this.board.filter(p => p.type === "utility");
                    let nearestUtility = utilities[0];
                    let minDistance = this.calculateDistance(player.position, utilities[0].position);
                    for (let i = 1; i < utilities.length; i++) {
                        const distance = this.calculateDistance(player.position, utilities[i].position);
                        if (distance < minDistance) {
                            minDistance = distance;
                            nearestUtility = utilities[i];
                        }
                    }
                    player.position = nearestUtility.position;
                } else if (card.value === "back3") {
                    this.movePlayer("back3");
                } else if (card.value === "teleport") {
                    return;
                } else {
                    const previousPosition = player.position;
                    player.position = card.value;
                    if (card.value === 0 || (previousPosition > card.value && card.value < 10)) {
                        player.money += 200;
                    }
                }
                break;
                
            case "money":
                player.money = Math.max(0, player.money + card.value);
                break;
        }
    }

    calculateDistance(from, to) {
        const directDistance = Math.abs(to - from);
        const wrapAroundDistance = 36 - directDistance;
        return Math.min(directDistance, wrapAroundDistance);
    }

    buyProperty(player, propertyIndex) {
        const property = this.board[propertyIndex];
        if (property.owner !== null || player.money < property.price || 
            (property.type !== "property" && property.type !== "utility")) {
            return false;
        }
        player.money -= property.price;
        player.properties.push(propertyIndex);
        property.owner = player.id;
        return true;
    }

    upgradeProperty(player, propertyIndex) {
        const property = this.board[propertyIndex];
        const currentRent = this.calculateRent(property);
        const upgradeCost = Math.floor( property.price * 0.5);
        if (property.owner !== player.id || 
            player.money < upgradeCost || 
            property.houses >= 4 ||
            property.type !== "property") {
            return false;
        }
        if (!this.canUpgradeProperty(player, property)) {
            return false;
        }
        player.money -= upgradeCost;
        property.houses++;
        return true;
    }

    payRent(player, ownerId, amount) {
        if (player.iotTurns > 0) {
            return { success: false, bankrupt: false };
        }
        const owner = this.players.find(p => p.id === ownerId);
        if (!owner) return { success: false, bankrupt: false };
        if (player.money < amount) {
            player.active = false;
            player.properties.forEach(propIndex => {
                if (this.board[propIndex]) {
                    this.board[propIndex].owner = null;
                    this.board[propIndex].houses = 0;
                }
            });
            owner.money += player.money;
            player.money = 0;
            player.properties = [];
            return { success: false, bankrupt: true };
        }
        player.money -= amount;
        owner.money += amount;
        return { success: true, bankrupt: false };
    }

    payJailFine(player) {
        if (!player.inJail || player.money < 50) return false;
        player.money -= 50;
        player.inJail = false;
        player.jailTurns = 0;
        return true;
    }

    calculatePlayerValuation(player) {
        let valuation = player.money;
        player.properties.forEach(propIndex => {
            const property = this.board[propIndex];
            if (property) {
                valuation += property.price;
                if (property.houses > 0) {
                    const houseValue = Math.floor(property.price * 0.5);
                    valuation += property.houses * houseValue;
                }
            }
        });
        return valuation;
    }

    getGameState() {
        return {
            players: this.players,
            currentPlayerIndex: this.currentPlayerIndex,
            board: this.board,
            gameStarted: this.gameStarted,
            doubleCount: this.doubleCount,
            pendingAction: this.pendingAction
        };
    }

    resetGame() {
        this.players = [];
        this.currentPlayerIndex = 0;
        this.gameStarted = false;
        this.board = this.initializeBoard();
        this.doubleCount = 0;
        this.lastRoll = null;
        this.pendingAction = null;
    }
}

module.exports = MonopolyGame;