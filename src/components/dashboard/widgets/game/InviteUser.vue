<template>
    <div>
        <b-row>
            <div style="margin: 0 auto">
                <h3>Search for someone to play with:</h3>
            </div>
        </b-row>
        <b-row>
            <div style="margin: 0 auto">
                <!-- <b-form-select v-model="selectedGameId" :options="myGames" class="mb-3"> -->
                <b-form-select v-model="selectedUser" :options="userList" class="mb-3">
                    <!-- <template v-slot:first>
                        <b-form-select-option :value="null" disabled>-- select a game --</b-form-select-option>
                    </template> -->
                </b-form-select>
            </div>
        </b-row>
        <b-row>
            <div style="margin: 0 auto">
                <b-button @click="invite" variant="success">Invite</b-button>
            </div>
        </b-row>
    </div>
</template>
<script>
export default {
    name: 'InviteUser',
    components: {
    },
    props: ['userDetails'],
    data () {
        return {
            idmInstance: this.getRequestService(),
            selectedUser: null,
            userList: []
        };
    },
    mounted () {
        this.getUsers();
    },
    methods: {
        getUsers () {
            this.idmInstance.get('endpoint/searchUsers?myid=' + this.userDetails.userId).then((userResult) => {
                // console.log(`userResult = ${JSON.stringify(userResult)}`);
                if (userResult.data.result.length > 0) {
                    for (const item of userResult.data.result) {
                        this.userList.push(
                            {
                                value: {
                                    id: item._id,
                                    username: item.userName,
                                    name: `${item.givenName} ${item.sn}`
                                },
                                text: `${item.givenName} ${item.sn} (${item.userName})`
                            }
                        );
                    }
                }
            });
        },
        invite () {
            let invitedata = {
                name: `${this.userDetails.givenName} ${this.userDetails.sn} vs. ${this.selectedUser.name}`,
                status: 'InviteSent',
                invitets: new Date().toLocaleString(),
                endts: '',
                players: [
                    {
                        _ref: 'managed/user/' + this.userDetails.userId,
                        _refProperties: {
                            color: 'w',
                            opponentid: this.selectedUser.username,
                            opponentname: this.selectedUser.name
                        }
                    },
                    {
                        _ref: 'managed/user/' + this.selectedUser.id,
                        _refProperties: {
                            color: 'b',
                            opponentid: this.userDetails.userName,
                            opponentname: `${this.userDetails.givenName} ${this.userDetails.sn}`
                        }
                    }
                ],
                currentFEN: '',
                pastFEN: []
            };
            this.idmInstance.post(`managed/game?_action=create`, invitedata).then(() => {
                this.displayNotification('success', 'Invitation sent');
            },
            (error) => {
                this.displayNotification('error', `Error while sending invitation ${error}`);
            });
        }
    }
};
</script>

<style lang="scss" scoped>
</style>
