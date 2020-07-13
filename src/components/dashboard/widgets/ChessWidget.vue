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
                <chessboard 
                    class="chessboard" 
                    :iconDir="iconDir" 
                    :fen="selectedGame.currentFEN" 
                    :side="selectedGame.color" 
                    v-on:change="boardChange($event)">
                </chessboard>
            </b-row>
            <b-row>
                <div style="margin: 0 auto">
                <h4>&#9650; Me &#9650; <span v-html="myStatus"></span></h4>
                <!-- <div v-html="myStatus"></div> -->
                </div>
            </b-row>
            <b-row>
                <div style="margin: 0 auto">
                    <b-button :disabled="newFEN == oldFEN" @click="saveGame()" variant="success">Post</b-button>
                    <b-button :disabled="newFEN == oldFEN" @click="undo()" variant="success">Undo</b-button>
                    <b-button @click="reload" variant="success">Refresh</b-button>
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
import Chessboard from '@/components/dashboard/widgets/chessboard/chessboard.vue';
import Chess from 'chess.js';
import InviteUser from '@/components/dashboard/widgets/game/InviteUser';
import ManageInvites from '@/components/dashboard/widgets/game/ManageInvites';

export default {
    name: 'Chess-Widget',
    components: {
        Chessboard,
        InviteUser,
        ManageInvites
    },
    props: ['userDetails', 'widgetDetails'],
    data () {
        return {
            idmInstance: this.getRequestService(),
            myGames: [],
            newFEN: "",
            oldFEN: "",
            gameDetailsLoaded: false,
            selectedGameId: null,
            selectedGame: null,
            gameStatus: '',
            myStatus: '',
            gameOptIn: false,
            iconDir: '@/components/dashboard/widgets/chessboard/chess-pieces/'
        };
    },
    mounted () {
        this.gameOptIn = this.userDetails.profile.gameOptIn;
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
        getMyGamesList() {
            this.myGames.splice(0, this.myGames.length);
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
                    // if this is my turn
                    if(this.selectedGame.chessjsgame.turn() === this.selectedGame.color) {
                        // mark the update as "seen"
                        this.seenGame();
                    }
                    // if this is my turn
                    if(this.selectedGame) {
                        if(this.selectedGame.chessjsgame.turn() === this.selectedGame.color) {
                            // no need to poll
                            return;
                        }
                    }
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
        seenGame() {
            const saveData = [
                {"operation":"replace", "field":"/seen", "value":true}
            ];
            this.idmInstance.patch(`managed/game/${this.selectedGame.id}`, saveData).then(() => {
                //this.displayNotification('success', 'Move posted successfully');
                //this.updateMessageString(this.selectedGame.chessjsgame);
            },
            (error) => {
                this.displayNotification('error', `Error marking seen - ${error.response}`);
            });
        },
        saveGame() {
            // update the selectedGame with the new FEN
            const loaded = this.selectedGame.chessjsgame.load(this.newFEN);

            // commit the newFEN to repo
            const saveData = [
                {"operation":"replace", "field":"/currentFEN", "value":this.newFEN},
                {"operation":"replace", "field":"/seen", "value":false},
                {"operation":"add", "field":"/pastFEN/-", "value": {"FEN":this.oldFEN} }
            ];
            this.idmInstance.patch(`managed/game/${this.selectedGame.id}`, saveData).then(() => {
                this.displayNotification('success', 'Move posted successfully');
                this.updateMessageString(this.selectedGame.chessjsgame);
            },
            (error) => {
                this.displayNotification('error', `Error posting move - ${error.response}`);
            });
            this.oldFEN = this.newFEN;
            this.startPolling();
        },
        undo() {
            const loaded = this.selectedGame.chessjsgame.load(this.oldFEN);
            this.selectedGame.currentFEN = this.oldFEN;
            this.newFEN = this.oldFEN;
        },
        boardChange (fen) {
            this.oldFEN = this.selectedGame.chessjsgame.fen();
            this.selectedGame.currentFEN = fen;
            console.log(`this.oldFEN ${this.oldFEN}`);
            this.newFEN = fen;
            console.log(`this.newFEN ${this.newFEN}`);
            console.log(`currentFEN ${this.selectedGame.currentFEN}`);
        }
    }
};
</script>

<style lang="scss" scoped>
.chessboard {
  flex: 1;
  flex-basis: 70%;
  max-width: 100vh;
}
</style>
