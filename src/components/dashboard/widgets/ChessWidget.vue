<template>
    <div v-if="userDetails.profile.gameOptIn">
        <b-card>
            <b-card-title>Your chess games</b-card-title>
            <div>
                Select a game:
                <!-- <b-form-select v-model="selectedGameId" :options="myGames" class="mb-3"> -->
                <b-form-select v-model="selectedGameId" @change="getGameDetails" :options="myGames" class="mb-3">
                    <!-- <template v-slot:first>
                        <b-form-select-option :value="null" disabled>-- select a game --</b-form-select-option>
                    </template> -->
                </b-form-select>
            </div>
            <div>
                <b-card no-body style="max-width: 750px; margin-left: auto; margin-right: auto;">
                    <b-row v-if="gameDetailsLoaded">
                    <b-col md="6">
                        <chess-board
                            style="width: 400px"
                            draggable-pieces
                            :position="selectedGame.currentFEN"
                            :orientation="selectedGame.color=='w'?'white':'black'"
                            @drag-start="dragStart($event)"
                            @drop="drop($event)"
                            @snap-end="snapEnd()"
                            @mouseover-square="mouseoverSquare($event)"
                            @mouseout-square="mouseoutSquare($event)"
                        ></chess-board>
                    </b-col>
                    <b-col md="6">
                        <b-card-body :title="'Game with ' + selectedGame.opponentid">
                        <b-card-sub-title class="mb-2">Started {{selectedGame.startts}}</b-card-sub-title>
                        <b-card-text>
                            I am {{selectedGame.color=="w"?"White":"Black"}}
                            <br>
                            {{selectedGame.opponentid}} {{selectedGame.color=="w"?"Black":"White"}}
                            <br>
                            {{ selectedGame.message }}
                        </b-card-text>
                        </b-card-body>
                        <b-card-footer><b-button @click="reload" variant="success">Reload</b-button></b-card-footer>
                    </b-col>
                    </b-row>
                    <b-row v-else>
                        <b-col md="12" style="text-align: center">
                        --- No game selected ---
                        </b-col>
                    </b-row>
                </b-card>
            </div>
        </b-card>
            <!-- <div v-if="gameDetailsLoaded">
                        <chess-board
                            style="width: 400px"
                            draggable-pieces
                            :position="selectedGame.currentFEN"
                            :orientation="selectedGame.color=='w'?'white':'black'"
                            @drag-start="dragStart($event)"
                            @drop="drop($event)"
                            @snap-end="snapEnd()"
                            @mouseover-square="mouseoverSquare($event)"
                            @mouseout-square="mouseoutSquare($event)"
                        ></chess-board>
            </div> -->
    </div>
</template>
<script>
import ChessBoard from 'chessboard-element';
import Chess from 'chess.js';
export default {
    name: 'Chess-Widget',
    components: {
        ChessBoard
    },
    props: ['userDetails', 'widgetDetails'],
    data () {
        return {
            whiteSquareGrey: '#a9a9a9',
            blackSquareGrey: '#696969',
            highlightStyles: null,
            idmInstance: this.getRequestService(),
            myGames: [],
            positionInfo: null,
            gameDetailsLoaded: false,
            selectedGameId: null,
            selectedGame: null
        };
    },
    mounted () {
        this.highlightStyles = document.createElement('style');
        document.head.append(this.highlightStyles);
        this.getMyGamesList();
    },
    // computed: {
    //     selectedGame () {
    //         if (this.selectedGameId) {
    //             return this.getGameDetails(this.selectedGameId);
    //         }
    //         return null;
    //     }
    // },
    methods: {
        getMyGamesList() {
            this.myGames.length = 0;
            this.idmInstance.get(`${this.userDetails.managedResource}/${this.userDetails.userId}?_fields=games`).then((gameResult) => {
                // console.log(`gameResult = ${JSON.stringify(gameResult)}`);
                if (gameResult.data.games.length > 0) {
                    for (const game of gameResult.data.games) {
                        this.myGames.push({
                            text: `game with ${game._refProperties.opponent}`,
                            value: game._refResourceId
                        });
                    }
                    // console.log(`myGames = ${this.myGames.length}`);
                }
            });
        },
        getGameDetails(id) {
            // this.gameDetailsLoaded = false;
            this.idmInstance.get(`managed/game/${id}?_fields=*,players`).then((gameResult) => {
                // console.log(`gameResult = ${JSON.stringify(gameResult)}`);
                if (gameResult.data) {
                    // let whoseMove = game.currentFEN.split(" ")[1]==game._refProperties.color?"My":"my opponent's";
                    const chessjsgame = new Chess(gameResult.data.currentFEN);
                    const message = this.getMessageString(chessjsgame);
                    this.selectedGame = {
                        id: gameResult.data._id,
                        name: gameResult.data.name,
                        status: gameResult.data.status,
                        startts: gameResult.data.startts,
                        currentFEN: gameResult.data.currentFEN,
                        oldFEN: gameResult.data.currentFEN,
                        color: gameResult.data.players[0]._refProperties.color,
                        opponentid: gameResult.data.players[0]._refProperties.opponent,
                        chessjsgame: chessjsgame,
                        message: message
                        // whoseMove: whoseMove
                    };
                    this.gameDetailsLoaded = true;
                }
            });
        },
        reload() {
            this.getGameDetails(this.selectedGameId);
        },
        removeGreySquares () {
            this.highlightStyles.textContent = '';
        },
        greySquare (square) {
            const highlightColor = (square.charCodeAt(0) % 2) ^ (square.charCodeAt(1) % 2)
                ? this.whiteSquareGrey
                : this.blackSquareGrey;
            this.highlightStyles.textContent += `
                chess-board::part(${square}) {
                background-color: ${highlightColor};
                }
            `;
        },
        getMessageString (g) {
            let statusMessage = '';
            let moveColor = 'White';
            if (g.turn() === 'b') {
                moveColor = 'Black';
            }
            if (g.in_checkmate()) {
                // checkmate?
                statusMessage = `Game over, ${moveColor} is in checkmate.`;
            } else if (g.in_draw()) {
                // draw?
                statusMessage = 'Game over, drawn position';
            } else {
                // game still on
                statusMessage = `${moveColor} to move`;

                // check?
                if (g.in_check()) {
                    statusMessage += `, ${moveColor} is in check`;
                }
            }
            return statusMessage;
        },
        snapEnd () {
            console.log('snapend');
            // this.position = this.game.fen();
            this.selectedGame.currentFEN = this.selectedGame.chessjsgame.fen();
        },
        saveGame(newFEN) {
            const saveData = [
                {"operation":"replace", "field":"/currentFEN", "value":newFEN},
                {"operation":"add", "field":"/pastFEN/-", "value": {"FEN":this.selectedGame.oldFEN} }
            ];
            this.idmInstance.patch(`managed/game/${this.selectedGame.id}`, saveData).then(() => {
                this.displayNotification('success', 'Move posted successfully');
                this.selectedGame.message = this.getMessageString(this.selectedGame.chessjsgame);
            },
            (error) => {
                this.displayNotification('error', `Error posting move - ${error.response}`);
            });
        },
        drop (e) {
            const { source, target, setAction } = e.detail,
                oldFEN = this.selectedGame.chessjsgame.fen(),
                move = this.selectedGame.chessjsgame.move({
                    from: source,
                    to: target,
                    promotion: 'q' // NOTE: always promote to a queen for example simplicity
                });

            // illegal move
            if (move === null) {
                setAction('snapback');
            }
            const newFEN = this.selectedGame.chessjsgame.fen();
            if (newFEN != oldFEN) {
                this.saveGame(newFEN);
            }
        },
        dragStart (e) {
            const { piece } = e.detail;

            if (this.selectedGame.chessjsgame.game_over()) {
                e.preventDefault();
                return;
            }
            if ((this.selectedGame.chessjsgame.turn() != this.selectedGame.color || piece.indexOf(this.selectedGame.color) !== 0)) {
                e.preventDefault();
            }
        },
        mouseoverSquare (e) {
            if(this.selectedGame.chessjsgame.turn() === this.selectedGame.color) {
                const { square } = e.detail,
                    moves = this.selectedGame.chessjsgame.moves({
                        square: square,
                        verbose: true
                    });

                // exit if there are no moves available for this square
                if (moves.length === 0) {
                    return;
                }

                // highlight the square they moused over
                this.greySquare(square);

                // highlight the possible squares for this piece
                for (const move of moves) {
                    this.greySquare(move.to);
                }
            }
        },
        mouseoutSquare () {
            this.removeGreySquares();
        }
    }
};
</script>

<style lang="scss" scoped></style>
