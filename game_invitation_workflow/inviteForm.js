{
    name: 'invite-form',
    props: ['processDefinition', 'taskDefinition', 'variables'],
    watch: {
        formData: {
            handler: () => undefined,
            deep: true
        }
    },
    data () {
        return {
            selected: '',
            formData: {}
        };
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
        invite () {
            this.formData.selected = this.selected;
            this.submit();
        },
        cancel () {
            this.formData.selected = '';
            this.submit();
        }
    },
    created () {
        this.setFormData();
    },
    template: `
        <form class="container" :name="processDefinition._id">
            <label class="col-md-3 col-form-label" for="selecteduser">Select your opponent from the list and click "Invite":</label>
            <select id="selecteduser" v-model="selected">
                <option v-for="option in variables['userList']" v-bind:value="option.userName" class="form-group row">
                    {{option.givenName}} {{option.sn}} ({{ option.userName }})
                </option>
            </select>
            <div class="form-group row justify-content-end">
                <div class="col text-right">
                    <b-button variant="outline-danger" @click="cancel">Cancel</b-button>
                    <b-button variant="primary" @click="invite">Invite</b-button>
                </div>
            </div>
            <div class="form-group row justify-content-end">
            If the other user accepts the invite, the game will start and you will be able to see it ### TODO ###
            </div>
        </form>
    `
}
