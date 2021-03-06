<!--
Copyright (c) 2020 ForgeRock. All rights reserved.

This software may be modified and distributed under the terms
of the MIT license. See the LICENSE file for details.
-->

<template>
    <transition name="fade" mode="out-in" duration="250">
        <component v-if="processDefinition !== null && taskForm !== null"
                   :is="taskForm"
                   @submit="submit"
                   @cancel="cancel"
                   :processDefinition="processDefinition"
                   :taskDefinition="taskInstance.task"
                   :variables="taskInstance.task.variables"></component>
        <GenericTask v-else-if="processDefinition !== null"
                     :variables="taskInstance.task.variables"
                     :task-fields="taskInstance.task.taskDefinition.formProperties"
                     :process-fields="taskInstance.task.formProperties"
                     @submit="submit"
                     @cancel="cancel"></GenericTask>
        <clip-loader v-else class="m-auto" :color="loadingColor"></clip-loader>
    </transition>
</template>

<script>
import _ from 'lodash';
import styles from '@/scss/main.scss';
import { ClipLoader } from 'vue-spinner/dist/vue-spinner.min.js';
import GenericTask from '@/components/dashboard/widgets/workflow/GenericTask';

/**
* @description Dashboard widget that displays the specific details of a task
* @description Dashboard widget that displays the specific details of a task
*
**/
export default {
    name: 'Task',
    props: ['taskInstance', 'shown'],
    data () {
        let temporaryProcessInstance = null;

        if (this.taskInstance.process && this.taskInstance.process.processDefinition) {
            temporaryProcessInstance = this.taskInstance.process.processDefinition;
        }

        return {
            loadingColor: styles.baseColor,
            processDefinition: temporaryProcessInstance
        };
    },
    components: {
        'clip-loader': ClipLoader,
        GenericTask
    },
    computed: {
        taskForm () {
            const formGenerationTemplate = this.taskInstance.task.taskDefinition.formGenerationTemplate,
                    initializeForm = formGenerationTemplate ? Function(`return ${formGenerationTemplate}`) : null // eslint-disable-line

            if (!_.isNull(initializeForm)) {
                return initializeForm();
            } else {
                return null;
            }
        }
    },
    methods: {
        submit (formData) {
            this.$emit('completeTask', { id: this.taskInstance.task._id, formData });
        },
        cancel () {
            this.$emit('cancel', this.taskInstance.task._id);
        }
    },
    watch: {
        shown (val) {
            if (val && _.isNull(this.processDefinition)) {
                this.getRequestService().get(`/workflow/processdefinition/${this.taskInstance.task.processDefinitionId}`).then((processDetails) => {
                    this.processDefinition = processDetails.data;
                });
            }
        }
    }
};
</script>
