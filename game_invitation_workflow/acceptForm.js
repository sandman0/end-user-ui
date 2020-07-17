{
    name: 'accept-form',
    props: ['processDefinition', 'taskDefinition', 'variables'],
    watch: {
        formData: {
            handler: () => undefined,
            deep: true
        }
    },
    data () {
        return {
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
        accept () {
            this.formData.accepted = 'yes';
            this.submit();
        },
        cancel () {
            this.formData.accepted = 'no';
            this.submit();
        }
    },
    created () {
        this.setFormData();
    },
    template: `
        <form class="container" :name="processDefinition._id">
            <div class="form-group row justify-content-end">
            <p>{{variables['player1name']}} has invited you to a game of chess, do you accept the challenge?</p>
                <div class="col text-right">
                    <b-button variant="outline-danger" @click="cancel">No</b-button>
                    <b-button variant="primary" @click="accept">Yes</b-button>
                </div>
            </div>
        </form>
    `
}
