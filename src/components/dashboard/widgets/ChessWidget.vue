<template>
    <div v-if="gameOptIn">
        <h2>My chess games</h2>
        <div>
            Select a game:
            <!-- <b-form-select v-model="selectedGameId" :options="myGames" class="mb-3"> -->
            <b-form-select v-model="selectedGameId" @change="getGameDetails" :options="myGames" class="mb-3">
                <!-- <template v-slot:first>
                    <b-form-select-option :value="null" disabled>-- select a game --</b-form-select-option>
                </template> -->
            </b-form-select>
        </div>
        <div v-if="gameDetailsLoaded">
            <b-row>
                <div style="margin: 0 auto; color:blue;">
                    {{ gameStatus }}
                </div>
            </b-row>
            <b-row>
                <div style="margin: 0 auto">
                    <small>Started {{selectedGame.startts}}</small>
                </div>
            </b-row>
            <b-row>
                <div style="margin: 0 auto">
                <h4>&#9660; {{selectedGame.opponentname}} &#9660;</h4>
                </div>
            </b-row>
            <b-row>
                <div style="margin: 0 auto">
                    &nbsp;
                </div>
            </b-row>
            <b-row>
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
            </b-row>
            <b-row>
                <div style="margin: 0 auto">
                <h4>&#9650; Me &#9650; <span v-html="myStatus"></span></h4>
                <!-- <div v-html="myStatus"></div> -->
                </div>
            </b-row>
            <b-row>
                <div style="margin: 0 auto">
                    <b-button @click="reload" variant="success">Reload</b-button>
                </div>
            </b-row>
        </div>
        <div v-else>
                <b-row>
                    <b-col md="12" style="text-align: center">
                    --- No game selected ---
                    </b-col>
                </b-row>
        </div>
        <hr>
        <!-- <b-row>
        <div style="margin: 0 auto">OR</div>
        </b-row>
        <hr>
        <div>
            <invite-user :userDetails="userDetails"></invite-user>
        </div>
        <hr>
        <div>
            <manage-invites :userDetails="userDetails" @inviteAccepted="getMyGamesList"></manage-invites>
        </div> -->
    </div>
    <div v-else>
        <b-row>
            <div style="margin: 0 auto">
                <h2>Opt in for community games?</h2>
                <small>Clicking "Yes" below will allow you to search for other players who have opted in and challenge them to a game of chess</small>
            </div>
        </b-row>
        <b-row>
            <div style="margin: 0 auto">
                <b-button @click="optin" variant="success">YES</b-button>
            </div>
        </b-row>
    </div>
</template>
<script>
import _ from 'lodash';
import ChessBoard from 'chessboard-element';
import Chess from 'chess.js';
import InviteUser from '@/components/dashboard/widgets/game/InviteUser';
import ManageInvites from '@/components/dashboard/widgets/game/ManageInvites';

export default {
    name: 'Chess-Widget',
    components: {
        ChessBoard,
        InviteUser,
        ManageInvites
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
            selectedGame: null,
            gameStatus: '',
            myStatus: '',
            gameOptIn: false
        };
    },
    mounted () {
        this.gameOptIn = this.userDetails.profile.gameOptIn;
        this.highlightStyles = document.createElement('style');
        document.head.append(this.highlightStyles);
        this.getMyGamesList();
    },
    methods: {
        startPolling () {
            let pollingDelay = 5000;

            /* istanbul ignore next */
            this.timeoutId = _.delay(() => {
                this.getGameDetails(this.selectedGameId);
            }, pollingDelay);
        },
        resetPolling () {
            /* istanbul ignore next */
            if (!_.isNull(this.timeoutId)) {
                clearTimeout(this.timeoutId);
                this.timeoutId = null;
            }
        },
        // updateGameDetail () {
        //     if (selectedGameId != null) {
        //         this.getGameDetails(selectedGameId);
        //         this.startPolling();
        //     }
        // },
        getMyGamesList() {
            this.myGames.length = 0;
            this.idmInstance.get(`${this.userDetails.managedResource}/${this.userDetails.userId}?_fields=games/*`).then((gameResult) => {
                // console.log(`gameResult = ${JSON.stringify(gameResult)}`);
                if (gameResult.data.games.length > 0) {
                    for (const game of gameResult.data.games) {
                        // only get games with status != InviteSent
                        if(game.status != "InviteSent") {
                            this.myGames.push({
                                text: `Game with ${game._refProperties.opponentname}`,
                                value: game._refResourceId
                            });
                        }
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
                    this.selectedGame = {
                        id: gameResult.data._id,
                        name: gameResult.data.name,
                        status: gameResult.data.status,
                        startts: gameResult.data.startts,
                        currentFEN: gameResult.data.currentFEN,
                        oldFEN: gameResult.data.currentFEN,
                        color: gameResult.data.players[0]._refProperties.color,
                        opponentid: gameResult.data.players[0]._refProperties.opponentid,
                        opponentname: gameResult.data.players[0]._refProperties.opponentname,
                        chessjsgame: chessjsgame
                    };
                    this.updateMessageString(chessjsgame);
                    this.gameDetailsLoaded = true;
                    this.startPolling();
                }
            });
        },
        optin() {
            const payload = [
                {"operation":"replace", "field":"/gameOptIn", "value": true},
            ];
            this.idmInstance.patch(`${this.userDetails.managedResource}/${this.userDetails.userId}`, payload)
            .then((response) => {
                this.displayNotification('success', 'Opt in sucess');
                this.gameOptIn = true;
            })
            .catch((error) => {
                /* istanbul ignore next */
                this.displayNotification('error', 'Error when opting in');
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
        updateMessageString (g) {
            let turn = '';
            if (g.turn() === this.selectedGame.color) {
                turn = "my";
            } else {
                turn = "opponent's";
            }
            if (g.in_checkmate()) {
                // checkmate?
                this.myStatus = `<span style="color: blue;">Game over, ${moveColor} is in checkmate.</span>`;
            } else if (g.in_draw()) {
                // draw?
                this.myStatus = '<span style="color: blue;">Game over, drawn position</span>';
            } else {
                // check?
                this.myStatus = `<span style="color: blue;">${turn} turn</span>`;
                if (g.in_check()) {
                    this.myStatus += `, <span style="color: red;">in check</span>`;
                }
            }
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
                this.updateMessageString(this.selectedGame.chessjsgame);
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

<style lang="scss" scoped>
.chessboard-container {
    width: 425px;
    box-sizing: border-box;
    background-color: white;
    border-width: 1px;
    border-style: solid;
    border-color: lightgray;
}
</style>
