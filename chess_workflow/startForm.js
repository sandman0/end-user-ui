{
    name: 'start-form',
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
        },
        searchText () {
            this.isTyping = false;
        },
        isTyping (value) {
            if (!value) {
                this.searchUsers(this.searchText);
            }
        }
    },
    data () {
        return {
            idmInstance: this.getRequestService(),
            selectedUser: null,
            selectedIndex: 0,
            formData: {},
            dataLoaded: false,

            searchText: "",
            isTyping: false,
            searchResult: [],
            isLoading: false       
        };
    },
    methods: {
        searchUsers (searchText) {
            this.searchResult.splice(0, this.searchResult.length);
            this.isLoading = true;
            this.idmInstance.get("endpoint/searchUsers?searchtext="+searchText).then((userResult) => {
                this.isLoading = false;
                // console.log(`userResult = ${JSON.stringify(userResult)}`);
                if (userResult.data.result.length > 0) {
                    for(const item of userResult.data.result) {
                        this.searchResult.push(
                            {
                                id: item._id,
                                username: item.userName,
                                name: `${item.givenName} ${item.sn}`
                            }
                        );
                    }
                }
                this.dataLoaded = true;
            });
        },
        setSelection (selected, index) {
            this.dataLoaded = false;
            this.searchText = selected.name + " (" + selected.username + ")";
            this.selectedUser = selected;
            this.selectedIndex = index;
        },
        isSelected (i) {
            return i === this.selectedIndex
        },
        handleClickOutside(evt) {
            if (!this.$el.contains(evt.target)) {
                this.dataLoaded = false;
                this.selectedIndex = -1;
            }
        },
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
            if (this.taskId === 'startEvent') {
                payload._processDefinitionId = this.processDefinition._id
            }
            console.log(`payload: ${JSON.stringify(payload)}`);
            this.$emit('submit', payload);
        },
        invite () {
            this.formData.selected = this.selectedUser.username;
            this.searchText = "";
            this.selectedUser = "";
            this.selectedIndex = 0;
            this.submit();
        },
        cancel () {
            this.formData.selected = '';
            this.submit();
        }
    },
    mounted() {
        document.addEventListener("click", this.handleClickOutside);
    },
    destroyed() {
        document.removeEventListener("click", this.handleClickOutside);
    },    
    created () {
        this.setFormData();
        this.dataLoaded = false;
    },
    template: `
        <div>
            <form class="container" :name="processDefinition._id">
                <b-row>
                    <div style="margin: 0 auto">
                        <h3>Invite someone to a game of chess</h3>
                    </div>
                </b-row>
                <b-row>
                    <div style="margin: 0 auto">
                        <b-form-input 
                            v-model="searchText" 
                            type="text" 
                            @input="isTyping = true" 
                            debounce="500" 
                            placeholder="Start typing name...">
                        </b-form-input>
                    </div>
                </b-row>
                <b-row>
                    <div style="margin: 0 auto; border: 1px solid gray; border-radius: 5px;">
                        <div align="center" v-if="isLoading">
                        <span>Searching...</span>
                        </div>
                        <b-list-group v-if="dataLoaded" style="max-height: 200px; overflow:scroll;">
                            <b-list-group-item 
                                href="#" 
                                v-for="(item,i) in searchResult"
                                :key="i" 
                                @click="setSelection(item, i)"
                            >
                                {{ item.name }} ({{ item.username }})
                            </b-list-group-item>
                        </b-list-group>
                    </div>
                </b-row>
                <b-row>
                    <div style="margin: 0 auto">
                            <b-button variant="outline-danger" @click="cancel">Cancel</b-button>
                            <b-button variant="primary" @click="invite">Invite</b-button>
                    </div>
                </b-row>
                <b-row>
                    <div style="margin: 0 auto">
                    If the other user accepts the invite, the game will start and you will be able to see it under "My chess games" above.
                    </div>
                </b-row>
            </form>
        </div>
    `
}
