const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const MonopolyGame = require('./game.js');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Initialize game
let game = new MonopolyGame();
// NEW: pendingAction holds the action that the landing player must resolve before the turn advances.
// Example: { playerId: 'socketid', action: 'buy'|'payRent'|'upgrade'|'teleport', propertyIndex: 5, amount: 50, card: {...} }
game.pendingAction = null;

// Helper to clear any pending action
function clearPendingAction() {
    game.pendingAction = null;
}

// Routes
app.get('/', (req, res) => {
    const gameState = game.getGameState();
    res.render('index', { 
        gameState: gameState,
        players: game.players,
        currentPlayer: game.players[game.currentPlayerIndex] || null
    });
});

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Send current game state to newly connected client
    socket.emit('game-state', game.getGameState());

    // Handle player joining
    socket.on('join-game', (playerName) => {
        const success = game.addPlayer(socket.id, playerName);
        if (success) {
            io.emit('player-joined', { id: socket.id, name: playerName });
            io.emit('game-state', game.getGameState());
        } else {
            socket.emit('join-failed', 'Game is full or already started');
        }
    });

    // Handle game start
    socket.on('start-game', () => {
        const success = game.startGame();
        if (success) {
            io.emit('game-started');
            io.emit('game-state', game.getGameState());
        } else {
            socket.emit('start-failed', 'Need at least 2 players to start');
        }
    });

    // Handle dice roll
    socket.on('roll-dice', () => {
        if (!game.gameStarted) {
            socket.emit('game-not-started');
            return;
        }

        const currentPlayer = game.players[game.currentPlayerIndex];
        
        // Verify it's this player's turn
        if (!currentPlayer || currentPlayer.id !== socket.id) {
            socket.emit('not-your-turn');
            return;
        }

        // If there's already a pending action for this or another player, reject roll
        if (game.pendingAction) {
            socket.emit('action-pending', 'Resolve the pending action before rolling.');
            return;
        }

        // Check if player is in jail
        if (currentPlayer.inJail) {
            currentPlayer.jailTurns++;
            
            if (currentPlayer.jailTurns >= 3) {
                // Released from jail
                currentPlayer.inJail = false;
                currentPlayer.jailTurns = 0;
                io.emit('jail-released', { player: currentPlayer });
            } else {
                // Still in jail, skip turn -> advance immediately
                io.emit('jail-turn', { player: currentPlayer, turnsLeft: 3 - currentPlayer.jailTurns });
                io.emit('game-state', game.getGameState());
                
                const nextPlayer = game.nextTurn();
                io.emit('turn-changed', nextPlayer);
                return;
            }
        }

        const roll = game.rollDice();
        game.lastRoll = roll;

        // Move player (no doubles extra-turn rule)
        const moveResult = game.movePlayer(roll.total);
        const positionResult = game.handlePosition(currentPlayer);
        
        // Check for game end (valuation >= 6000)
        const playerValuation = game.calculatePlayerValuation(currentPlayer);
        if (playerValuation >= 6000) {
            io.emit('game-over', { winner: currentPlayer });
            return;
        }
        
        // Emit dice result to everyone
        io.emit('dice-rolled', { 
            player: currentPlayer, 
            roll, 
            moved: true,
            moveResult,
            positionResult
        });
        io.emit('game-state', game.getGameState());

        // --- Key change: If position requires player's decision, set a pendingAction and DO NOT advance.
        // Actions that require the player's explicit choice: buy, payRent, upgrade, teleport
        const needsDecision = positionResult.action === 'buy' ||
                              positionResult.action === 'payRent' ||
                              positionResult.action === 'upgrade' ||
                              positionResult.action === 'teleport';

        if (needsDecision) {
            // store pending action so server can validate follow-up events
            game.pendingAction = {
                playerId: currentPlayer.id,
                action: positionResult.action,
                propertyIndex: positionResult.property ? positionResult.property.position : null,
                amount: positionResult.amount || null,
                card: positionResult.card || null
            };

            // Notify landing player explicitly (optional extra event)
            io.to(currentPlayer.id).emit('action-required', game.pendingAction);
            // Do NOT call nextTurn() — wait for buy/pay/upgrade/pass-turn from that player
            return;
        }

        // Otherwise, no decision needed; advance to next player after short delay so UI can show dice
        setTimeout(() => {
            const nextPlayer = game.nextTurn();
            io.emit('turn-changed', nextPlayer);
            io.emit('game-state', game.getGameState());
        }, 1200); // small delay to let front-end show movement
    });

    // Handle passing turn (when player declines to buy/upgrade/pay)
    socket.on('pass-turn', () => {
        // If there's a pendingAction for this player, clear it and advance
        if (game.pendingAction && game.pendingAction.playerId === socket.id) {
            clearPendingAction();
            const nextPlayer = game.nextTurn();
            io.emit('turn-changed', nextPlayer);
            io.emit('game-state', game.getGameState());
            return;
        }

        // Otherwise normal pass (only current player may pass)
        const currentPlayer = game.players[game.currentPlayerIndex];
        if (!currentPlayer || currentPlayer.id !== socket.id) {
            socket.emit('not-your-turn');
            return;
        }

        const nextPlayer = game.nextTurn();
        io.emit('turn-changed', nextPlayer);
        io.emit('game-state', game.getGameState());
    });

    // Handle property purchase
    socket.on('buy-property', (propertyIndex) => {
        // Identify acting player by socket id (don't rely solely on currentPlayerIndex)
        const actor = game.players.find(p => p.id === socket.id);
        if (!actor) {
            socket.emit('buy-failed', 'Player not found');
            return;
        }

        // Validate pendingAction: must exist, belong to this player and action must be 'buy'
        if (!game.pendingAction || game.pendingAction.playerId !== socket.id || game.pendingAction.action !== 'buy' || game.pendingAction.propertyIndex !== propertyIndex) {
            // Allow buy only if it matches pendingAction
            socket.emit('buy-failed', 'No buy action pending for you');
            return;
        }

        const success = game.buyProperty(actor, propertyIndex);
        
        if (success) {
            io.emit('property-bought', { player: actor, propertyIndex });
            io.emit('game-state', game.getGameState());

            // Clear pending and advance
            clearPendingAction();
            const nextPlayer = game.nextTurn();
            io.emit('turn-changed', nextPlayer);
            io.emit('game-state', game.getGameState());

            const playerValuation = game.calculatePlayerValuation(actor);
            if (playerValuation >= 6000) {
                io.emit('game-over', { winner: actor });
                return;
            }
        } else {
            socket.emit('buy-failed', 'Cannot buy this property');
        }
    });

    // Handle rent payment
    socket.on('pay-rent', (propertyIndex) => {
        // Identify acting player by socket id
        const actor = game.players.find(p => p.id === socket.id);
        if (!actor) {
            socket.emit('pay-failed', 'Player not found');
            return;
        }

        // Validate pendingAction
        if (!game.pendingAction || game.pendingAction.playerId !== socket.id || game.pendingAction.action !== 'payRent' || game.pendingAction.propertyIndex !== propertyIndex) {
            socket.emit('pay-failed', 'No rent payment pending for you');
            return;
        }

        const property = game.board[propertyIndex];
        if (!property) {
            socket.emit('pay-failed', 'Invalid property');
            return;
        }

        const rent = game.calculateRent(property);
        const result = game.payRent(actor, property.owner, rent);

        io.emit('rent-paid', { 
            player: actor, 
            propertyIndex, 
            amount: rent, 
            result 
        });

        io.emit('game-state', game.getGameState());

        // Clear pending and advance
        clearPendingAction();

        if (result.bankrupt) {
            // If bankrupt, check remaining players
            const activePlayers = game.players.filter(p => p.active);
            if (activePlayers.length === 1) {
                io.emit('game-over', { winner: activePlayers[0] });
                return;
            }
        }

        const nextPlayer = game.nextTurn();
        io.emit('turn-changed', nextPlayer);
        io.emit('game-state', game.getGameState());
    });

    // Handle property upgrade
    socket.on('upgrade-property', (propertyIndex) => {
        const actor = game.players.find(p => p.id === socket.id);
        if (!actor) {
            socket.emit('upgrade-failed', 'Player not found');
            return;
        }

        // Validate pending action
        if (!game.pendingAction || game.pendingAction.playerId !== socket.id || game.pendingAction.action !== 'upgrade' || game.pendingAction.propertyIndex !== propertyIndex) {
            socket.emit('upgrade-failed', 'No upgrade pending for you');
            return;
        }

        const success = game.upgradeProperty(actor, propertyIndex);

        if (success) {
            io.emit('property-upgraded', { player: actor, propertyIndex });
            io.emit('game-state', game.getGameState());

            // Clear pending and advance
            clearPendingAction();
            const nextPlayer = game.nextTurn();
            io.emit('turn-changed', nextPlayer);
            io.emit('game-state', game.getGameState());

            const playerValuation = game.calculatePlayerValuation(actor);
            if (playerValuation >= 6000) {
                io.emit('game-over', { winner: actor });
                return;
            }
        } else {
            socket.emit('upgrade-failed', 'Cannot upgrade this property');
        }
    });

    // If you implement teleport in future: handle teleport action similarly (validate pendingAction, then clear and advance).
    socket.on('teleport-to', (propertyIndex) => {
        const actor = game.players.find(p => p.id === socket.id);
        if (!actor) return;

        if (!game.pendingAction || game.pendingAction.playerId !== socket.id || game.pendingAction.action !== 'teleport') {
            socket.emit('teleport-failed', 'No teleport pending for you');
            return;
        }

        // Safety: ensure propertyIndex is valid
        if (typeof propertyIndex !== 'number' || !game.board[propertyIndex]) {
            socket.emit('teleport-failed', 'Invalid target');
            return;
        }

        // move player directly (use movePlayer? but teleport is direct)
        actor.position = propertyIndex;
        const positionResult = game.handlePosition(actor); // note: this may set further pendingAction — handle if needed

        io.emit('teleported', { player: actor, positionResult });
        io.emit('game-state', game.getGameState());

        // if handlePosition returned another decision (like buy/pay), set pendingAction accordingly and DO NOT advance.
        if (positionResult.action === 'buy' || positionResult.action === 'payRent' || positionResult.action === 'upgrade' || positionResult.action === 'teleport') {
            game.pendingAction = {
                playerId: actor.id,
                action: positionResult.action,
                propertyIndex: positionResult.property ? positionResult.property.position : null,
                amount: positionResult.amount || null,
                card: positionResult.card || null
            };
            io.to(actor.id).emit('action-required', game.pendingAction);
            return;
        }

        // Otherwise advance
        clearPendingAction();
        const nextPlayer = game.nextTurn();
        io.emit('turn-changed', nextPlayer);
        io.emit('game-state', game.getGameState());
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        
        // If the disconnected player had a pendingAction, clear it and advance turn if needed
        if (game.pendingAction && game.pendingAction.playerId === socket.id) {
            clearPendingAction();
            // attempt to advance turn if players remain
            if (game.players.length > 1) {
                const nextPlayer = game.nextTurn();
                io.emit('turn-changed', nextPlayer);
            }
        }

        const playerIndex = game.players.findIndex(p => p.id === socket.id);
        if (playerIndex !== -1) {
            const disconnectedPlayer = game.players[playerIndex];
            
            disconnectedPlayer.properties.forEach(propIndex => {
                if (game.board[propIndex]) {
                    game.board[propIndex].owner = null;
                    game.board[propIndex].houses = 0;
                }
            });
            
            game.players.splice(playerIndex, 1);
            
            if (game.currentPlayerIndex >= playerIndex && game.players.length > 0) {
                game.currentPlayerIndex = Math.max(0, game.currentPlayerIndex - 1);
                if (game.players.length > 0) {
                    const nextPlayer = game.nextTurn();
                    io.emit('turn-changed', nextPlayer);
                }
            }
            
            if (game.players.length < 2 && game.gameStarted) {
                if (game.players.length === 1) {
                    io.emit('game-over', { winner: game.players[0] });
                } else {
                    game = new MonopolyGame();
                    game.pendingAction = null;
                }
            }
            
            io.emit('player-left', socket.id);
            io.emit('game-state', game.getGameState());
        }
    });

    // Handle chat messages
    socket.on('chat-message', (message) => {
        const player = game.players.find(p => p.id === socket.id);
        if (player) {
            io.emit('chat-message', { player: player.name, message });
        }
    });
});

// Error handling
io.on('error', (error) => {
    console.error('Socket.IO error:', error);
});

server.on('error', (error) => {
    console.error('Server error:', error);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Monopoly server running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT} to play!`);
});