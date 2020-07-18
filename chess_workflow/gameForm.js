{
    name: 'tag-form',
    props: ['processDefinition', 'taskDefinition', 'variables'],
    computed: {
        taskId () {
            if (this.taskDefinition && this.taskDefinition._id) {
                return this.taskDefinition._id;
            } else {
                return 'startEvent';
            }
        }
    },
    watch: {
        formData: {
            handler: () => undefined,
            deep: true
        }
    },
    data () {
        return {
            idmInstance: this.getRequestService(),
            myGames: [],
            newFEN: "",
            oldFEN: "",
            gameDetailsLoaded: false,
            selectedGameId: null,
            selectedGame: null,
            myStatus: '',
            gameOptIn: false,
            iconDir: '@/components/dashboard/widgets/chessboard/chess-pieces/',
            formData: {}
        };
    },
    created () {
        this.setFormData();
    },
    mounted () {
        this.selectedGameId = this.variables['gameId'];
        this.reload();
        console.log(`mounted ${this.selectedGameId}`)
    },
    methods: {
        setFormData () {
            this.formData = this.processDefinition.formProperties.reduce((acc, formProperty) => {
                if (this.variables && this.variables[formProperty._id]) {
                    return Object.assign(acc, { [formProperty._id]: this.variables[formProperty._id] });
                } else {
                    return Object.assign(acc, { [formProperty._id]: formProperty.type.name === 'boolean' ? false : '' });
                }
            }, {});
        },
        submit () {
            let payload = this.formData;
            this.$emit('submit', payload);
        },
        tag () {
            this.formData.decision = 'tag';
            this.submit();
        },
        stop () {
            this.formData.decision = 'stop';
            this.submit();
        },
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
        getGameDetails(id) {
            // this.gameDetailsLoaded = false;
            this.idmInstance.get(`managed/game/${id}?_fields=*,players`).then((gameResult) => {
                // console.log(`gameResult = ${JSON.stringify(gameResult)}`);
                if (gameResult.data) {
                    const chessjsgame = new this.$chess(gameResult.data.currentFEN);
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
                    // console.log(`selected game: ${JSON.stringify(this.selectedGame)}`);
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
                    if(this.selectedGame.status == "Ongoing") {
                        this.startPolling();
                    }
                }
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
                this.gameOver(g.turn()=="w"?"b":"w");
                this.myStatus = `<span style="color: blue;">Game over, ${g.turn()=="w"?"White":"Black"} is in checkmate.</span>`;
            } else if (g.in_draw()) {
                // draw?
                this.gameOver("d");
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
        finishGame() {
            this.submit();
        },
        gameOver(winner) {
            if(this.selectedGame.status === 'Over') {
                // game was already saved with Over status last time, do not save again
                return;
            }
            this.selectedGame.status = "Over";
            this.selectedGame.winner = winner;
            this.saveGame();
        },
        saveGame() {
            const saveData = [];
            if(this.selectedGame.status == "Over") {
                saveData.push({"operation":"replace", "field":"/status", "value": this.selectedGame.status});
                saveData.push({"operation":"add", "field":"/endts", "value": new Date().toLocaleString() });
                saveData.push({"operation":"add", "field":"/winner", "value": this.selectedGame.winner });
            } else {
                saveData.push({"operation":"replace", "field":"/currentFEN", "value":this.newFEN});
                saveData.push({"operation":"replace", "field":"/seen", "value":false});
                saveData.push({"operation":"add", "field":"/pastFEN/-", "value": this.oldFEN });
            }
            this.idmInstance.patch(`managed/game/${this.selectedGame.id}`, saveData).then(() => {
                this.displayNotification('success', 'Move posted successfully');
                if(this.selectedGame.status == "Ongoing") {
                    console.log('update string from save');
                    this.updateMessageString(this.selectedGame.chessjsgame);
                }
            },
            (error) => {
                this.displayNotification('error', `Error posting move - ${error.response}`);
            });
            this.oldFEN = this.newFEN;
            if(this.selectedGame.status == "Ongoing") {
                this.startPolling();
            }
},
        undo() {
            const loaded = this.selectedGame.chessjsgame.load(this.oldFEN);
            this.selectedGame.currentFEN = this.oldFEN;
            this.newFEN = this.oldFEN;
        },
        boardChange (fen) {
            this.oldFEN = this.selectedGame.chessjsgame.fen();
            this.selectedGame.currentFEN = fen;
            // console.log(`this.oldFEN ${this.oldFEN}`);
            this.newFEN = fen;
            // console.log(`this.newFEN ${this.newFEN}`);
            // console.log(`currentFEN ${this.selectedGame.currentFEN}`);
        }
    },
    template: `
        <form class="container" :name="processDefinition._id">
            <div v-if="gameDetailsLoaded">
                <b-row>
                    <div style="margin: 0 auto">
                        <small>Started {{selectedGame.startts}}</small>
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
                        style="flex: 1; flex-basis: 40%; max-width: 40vh;" 
                        :iconDir="iconDir" 
                        :fen="selectedGame.currentFEN" 
                        :side="selectedGame.color" 
                        v-on:change="boardChange($event)">
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
                    <div style="margin: 0 auto">
                        <b-button :disabled="newFEN == oldFEN" @click="saveGame()" variant="info">Commit</b-button>
                        <b-button :disabled="newFEN == oldFEN" @click="undo()" variant="info">Undo</b-button>
                        <b-button @click="reload" variant="info">Refresh</b-button>
                        &nbsp;
                        <b-button :disabled="selectedGame.status=='Ongoing'" @click="finishGame()" variant="warning">Finish game</b-button>
                    </div>
                </b-row>
            </div>
        </form>
    `
}
