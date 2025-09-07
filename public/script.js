

    const socket = io();
    
    // Game state variables
    let gameState = {};
    let currentPlayer = null;
    
    // Socket event listeners
    socket.on('game-state', (state) => {
        gameState = state;
        updateUI();
    });
    
    socket.on('turn-changed', (player) => {
        currentPlayer = player;
        alert(`It's now ${player.name}'s turn`);
    });
    
    socket.on('dice-rolled', (data) => {
        // Update UI with dice roll results
        alert(`${data.player.name} rolled ${data.roll.die1} and ${data.roll.die2}`);
        
        if (data.moved) {
            // Handle position effects
            switch (data.positionResult.action) {
                case 'buy':
                    showBuyPropertyModal(data.positionResult.property);
                    break;
                case 'payRent':
                    showPayRentModal(data.positionResult.property, data.positionResult.amount);
                    break;
                case 'chance':
                    alert(`Chance: ${data.positionResult.card.description}`);
                    break;
                case 'iot':
                    alert('You got IOT protection for 3 turns!');
                    break;
            }
        }
    });
    
    // Join game with player name
    function joinGame() {
        const playerName = document.getElementById('player-name').value;
        if (playerName) {
            socket.emit('join-game', playerName);
        }
    }
    
    // Start the game
    function startGame() {
        socket.emit('start-game');
    }
    
    // Roll dice
    function rollDice() {
        socket.emit('roll-dice');
    }
    
    // Buy property
    function buyProperty(propertyIndex) {
        socket.emit('buy-property', propertyIndex);
    }
    
    // Pay rent
    function payRent(propertyIndex) {
        socket.emit('pay-rent', propertyIndex);
    }
    
    // Update UI based on game state
    function updateUI() {
        // Implement UI updates based on gameState
        // This would include updating player positions, money, properties, etc.
    }
