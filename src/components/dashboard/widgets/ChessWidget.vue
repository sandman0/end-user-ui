<template>
    <div v-if="gameOptIn">
        <h2>My completed chess games</h2>
        <div>
            Select a game:
            <!-- <b-form-select v-model="selectedGameId" :options="myGames" class="mb-3"> -->
            <b-form-select v-model="selectedGameId" @change="getGameDetails" :options="myGames">
                <!-- <template v-slot:first>
                    <b-form-select-option :value="null" disabled>-- select a game --</b-form-select-option>
                </template> -->
            </b-form-select>
        </div>
        <div v-if="gameDetailsLoaded">
            <b-row>
                <div style="margin: 0 auto">
                    <small>Started {{selectedGame.startts}}</small> | <small>Ended {{selectedGame.endts}}</small>
                </div>
            </b-row>
            <b-row>
                <div style="margin: 0 auto">
                <h4>&#9660; Opponent &#9660;</h4>
                </div>
            </b-row>
            <b-row>
                <div style="margin: 0 auto">
                ({{selectedGame.opponentname}})
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
                    :fen="currentFEN"
                    :side="selectedGame.color"
                >
                </chessboard>
            </b-row>
            <b-row>
                <div style="margin: 0 auto">
                <h4>&#9650; Me &#9650;</h4>
                <!-- <div v-html="myStatus"></div> -->
                </div>
            </b-row>
            <b-row>
                <div style="margin: 0 auto">
                <span v-html="myStatus"></span>
                </div>
            </b-row>
            <b-row>
                <div style="margin: 0 auto">&nbsp;
                </div>
            </b-row>
            <b-row>
                <div style="margin: 0 auto;">
                    <div style="margin: 0 auto">
                        Game replay controls
                    </div>
                    <div style="margin: 0 auto">
                        <vue-slider
                            width="400px"
                            v-model="slidervalue"
                            :data="slider"
                            :adsorb="true"
                            :marks="true"
                            :contained="true"
                            @drag-start="stopreplay"
                            @change="stopreplay"
                        ></vue-slider>
                    </div>
                    <div style="margin: 0 auto">&nbsp;
                    </div>
                    <div style="margin: 0 auto">
                        <b-button 
                            @click="prev" 
                            :disabled="slidervalue == 0" 
                            size="sm" 
                            variant="light">
                            &#x23ea;
                        </b-button>
                        <b-button 
                            @click="playpause" 
                            :disabled="slidervalue == (selectedGame.pastFEN.length-1)" 
                            size="sm" 
                            variant="light">
                                <span v-html="playButton"></span>
                            </b-button>
                        <b-button 
                            @click="next" 
                            size="sm" 
                            variant="light">
                            &#x23e9;
                        </b-button>
                    </div>
                </div>
            </b-row>
            <b-row>
            </b-row>
            <b-row>
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
import Chessboard from '@/components/dashboard/widgets/chessboard/chessboard.vue';
import Chess from 'chess.js';
import _ from 'lodash';
// import VueSlideBar from 'vue-slide-bar'
import VueSlider from 'vue-slider-component'
import 'vue-slider-component/theme/default.css'

export default {
    name: 'Chess-Widget',
    components: {
        Chessboard,
        VueSlider
    },
    props: ['userDetails', 'widgetDetails'],
    data () {
        return {
            idmInstance: this.getRequestService(),
            myGames: [],
            currentFEN: '',
            gameDetailsLoaded: false,
            selectedGameId: null,
            selectedGame: null,
            myStatus: '',
            gameOptIn: false,
            iconDir: '@/components/dashboard/widgets/chessboard/chess-pieces/',
            slider: [],
            slidervalue: 0,
            timeoutId: null
        };
    },
    computed: {
        playButton: function () {
            return this.timeoutId==null?"&#x23f5;":"&#x23f8;";
        }
    },
    watch: {
        slidervalue: function (newval, oldval) {
            this.currentFEN = this.selectedGame.pastFEN[newval-1];
        }
    },
    mounted () {
        this.gameOptIn = this.userDetails.profile.gameOptIn;
        this.getMyGamesList();
    },
    methods: {
        getMyGamesList () {
            this.myGames.splice(0, this.myGames.length);
            this.idmInstance.get(`${this.userDetails.managedResource}/${this.userDetails.userId}?_fields=games/*`).then((gameResult) => {
                // console.log(`gameResult = ${JSON.stringify(gameResult)}`);
                if (gameResult.data.games.length > 0) {
                    for (const game of gameResult.data.games) {
                        // only get games with status != InviteSent
                        if (game.status === 'Over') {
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
        getGameDetails (id) {
            // this.gameDetailsLoaded = false;
            this.idmInstance.get(`managed/game/${id}?_fields=*,players`).then((gameResult) => {
                // console.log(`gameResult = ${JSON.stringify(gameResult)}`);
                if (gameResult.data) {
                    const chessjsgame = new Chess(gameResult.data.currentFEN);
                    this.selectedGame = {
                        id: gameResult.data._id,
                        name: gameResult.data.name,
                        status: gameResult.data.status,
                        startts: gameResult.data.startts,
                        endts: gameResult.data.endts,
                        winner: gameResult.data.winner,
                        pastFEN: gameResult.data.pastFEN,
                        color: gameResult.data.players[0]._refProperties.color,
                        opponentid: gameResult.data.players[0]._refProperties.opponentid,
                        opponentname: gameResult.data.players[0]._refProperties.opponentname,
                        chessjsgame: chessjsgame
                    };
                    // console.log(`selectedGame = ${JSON.stringify(this.selectedGame)}`);
                    // console.log('update string from load');
                    this.updateMessageString(chessjsgame);
                    this.createSlider();
                    this.gameDetailsLoaded = true;
                }
            });
        },
        createSlider() {
            this.slider.splice(0, this.slider.length);
            let fenCounter = 1;
            for(let i=0; i<this.selectedGame.pastFEN.length;i++) {
                this.slider.push(i+1);
            }
        },
        optin () {
            const payload = [
                { 'operation': 'replace', 'field': '/gameOptIn', 'value': true }
            ];
            this.idmInstance.patch(`${this.userDetails.managedResource}/${this.userDetails.userId}`, payload)
                .then((response) => {
                    this.displayNotification('success', 'Opt in sucess');
                    this.gameOptIn = true;
                })
                .catch((error) => {
                /* istanbul ignore next */
                    this.displayNotification('error', `Error when opting in ${error}`);
                });
        },
        prev () {
            this.stopreplay();
            if(this.slidervalue > 0) {
                this.slidervalue--;
            }
        },
        next () {
            this.stopreplay();
            if(this.slidervalue < (this.selectedGame.pastFEN.length-1)) {
                this.slidervalue++;
            }
        },
        playpause () {
            if (!_.isNull(this.timeoutId)) {
                this.stopreplay();
            } else {
                this.startreplay();
            }
        },
        startreplay() {
            let playSpeed = 2000;
            this.next();
            /* istanbul ignore next */
            this.timeoutId = setTimeout(() => {
                this.startreplay();
            }, playSpeed);
        },
        stopreplay() {
            if (!_.isNull(this.timeoutId)) {
                let id = this.timeoutId;
                this.timeoutId = null;
                clearTimeout(id);
            }
        },
        updateMessageString (g) {
            let turn = '';
            if(this.selectedGame.winner === this.selectedGame.color) {
                this.myStatus = `<span style="color: green;">I won</span>`;
            } else if(this.selectedGame.winner === 'd') {
                this.myStatus = `<span style="color: blue;">DRAW</span>`;
            } else {
                this.myStatus = `<span style="color: red;">Opponent won</span>`;
            }
        }
    }
};
</script>

<style lang="scss" scoped>
.chessboard {
  flex: 1;
  flex-basis: 40%;
  max-width: 40vh;
}
</style>
