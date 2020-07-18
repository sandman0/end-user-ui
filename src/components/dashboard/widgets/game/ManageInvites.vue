<template>
    <div>
        <b-row>
            <div style="margin: 0 auto">
                <h3>Invites received:</h3>
            </div>
        </b-row>
        <b-row>
            <div style="margin: 0 auto">
                <b-table
                    striped
                    hover
                    :items="myGames"
                    :fields="fields"
                >
                    <template v-slot:cell(actions)="row">
                        <b-button size="sm" variant="success" @click="accept(row.item, row.index, $event.target)" class="mr-1">
                            Accept
                        </b-button>
                    </template>
                </b-table>
            </div>
        </b-row>
    </div>
</template>
<script>
export default {
    name: 'ManageInvites',
    components: {
    },
    props: ['userDetails'],
    data () {
        return {
            idmInstance: this.getRequestService(),
            fields: [
                'from',
                'sent_at',
                { key: 'actions', label: 'Actions' },
                'name'
            ],
            myGames: []
        };
    },
    mounted () {
        this.getInvites();
    },
    methods: {
        getInvites () {
            this.myGames.splice(0, this.myGames.length);
            this.idmInstance.get(`${this.userDetails.managedResource}/${this.userDetails.userId}?_fields=games/*`).then((gameResult) => {
                // console.log(`gameResult = ${JSON.stringify(gameResult)}`);
                if (gameResult.data.games.length > 0) {
                    for (const game of gameResult.data.games) {
                        // we only need games which are in "InviteSent" state and which have
                        // the current user as the "b" player
                        if (game.status === 'InviteSent' && game._refProperties.color === 'b') {
                            console.log('adding game');
                            this.myGames.push({
                                id: game._refResourceId,
                                from: game._refProperties.opponentname,
                                sent_at: game.invitets,
                                name: game.name
                            });
                        }
                    }
                    // console.log(`myGames = ${this.myGames.length}`);
                }
            });
        },
        accept (item, index, button) {
            console.log(`accepted: ${JSON.stringify(item, null, 2)}`);
            const acceptData = [
                { 'operation': 'replace', 'field': '/status', 'value': 'Ongoing' },
                { 'operation': 'add', 'field': '/startts', 'value': new Date().toLocaleString() },
                { 'operation': 'add', 'field': '/currentFEN', 'value': 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' }
            ];
            this.idmInstance.patch(`managed/game/${item.id}`, acceptData).then(() => {
                this.displayNotification('success', 'Invite accepted. Game started.');
                this.getInvites();
                this.$emit('inviteAccepted');
            },
            (error) => {
                this.displayNotification('error', `Error posting move - ${error.response}`);
            });
        }
    }
};
</script>

<style lang="scss" scoped>
</style>
