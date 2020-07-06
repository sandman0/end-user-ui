<template>
    <b-container fluid>
        <!-- <b-row>
            <div>
            <component :is="'Chess'" :userDetails="userDetails"></component>
            </div>
        </b-row> -->
        <b-row v-if="widgets.length" class="justify-content-md-center">
            <div v-for="(widget, index) in widgets" :class="{'col-sm-4': (widget.size === 'small' && widget.type != 'Chess'), 'col-sm-6': (widget.size === 'medium' && widget.type != 'Chess'), 'col-sm-12': (widget.size === 'large' && widget.type != 'Chess'), 'mt-4': widget.type != 'Chess'}" :key="widget.type + index">
            <!-- <div v-for="(widget, index) in widgets" :key="widget.type + index"> -->
                <component :is="widget.type" :userDetails="userDetails" :details="widget.details"></component>
            </div>
        </b-row>
        <b-jumbotron v-else class="mt-4 text-center">
            <div class="d-flex justify-content-center mt-3">
                <i class="fa fa-binoculars align-self-center flex-fow-1 mr-4 mb-3" style="font-size:52px;"></i>
                <div class="flex-fow-1">
                    <h2>{{$t('pages.dashboard.noWidget')}}</h2>
                    <p v-html="$t('pages.dashboard.noWidgetSubText')"></p>
                </div>
            </div>
        </b-jumbotron>
    </b-container>
</template>

<script>
import Welcome from '@/components/dashboard/widgets/WelcomeWidget';
import Workflow from '@/components/dashboard/widgets/WorkflowControlWidget';
import Chess from '@/components/dashboard/widgets/ChessWidget';

/**
 * @description Controlling component for the dashboard, loads widgets set and configured in the ui-dashboard config file.
 *
 * @fires GET config/ui/dashboard - Read of the config file ui-dashboard.json
 */
export default {
    name: 'Dashboard',
    components: {
        Welcome,
        Chess,
        Workflow
    },
    data () {
        return {
            widgets: [],
            userDetails: this.$root.userStore.getUserState()
        };
    },
    mounted () {
        this.loadData();
    },
    methods: {
        loadData () {
            // console.log(JSON.stringify(this.userDetails));
            /* istanbul ignore next */
            this.getRequestService().get('config/ui/dashboard')
                .then(({ data }) => {
                    this.widgets = data.dashboard.widgets;

                    if (this.$root.applicationStore.state.workflow) {
                        this.widgets.push({
                            type: 'Workflow',
                            size: 'large'
                        });
                    }
                })
                .catch((error) => {
                    this.displayNotification('error', error.response.data.message);
                });
        }
    }
};
</script>
