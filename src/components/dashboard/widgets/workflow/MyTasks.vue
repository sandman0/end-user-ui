<!--
Copyright (c) 2020 ForgeRock. All rights reserved.

This software may be modified and distributed under the terms
of the MIT license. See the LICENSE file for details.
-->

<template>
    <div>
        <fr-list-group :title="this.$t('pages.workflow.myTasks')">
            <template v-if="!isEmpty(tasks)">
                <transition-group name="fade" mode="out-in">
                    <fr-list-item :collapsible="true" v-for="(task, id) in tasks" :key="`myTask_${id}`" :ref="`collapse-${id}`" @shown="setShown(id)" @hidden="setHidden(id)">
                        <div slot="list-item-header" class="d-inline-flex w-100 media">
                            <div class="media-body align-self-center">
                                <h6>{{task.name}}</h6>
                            </div>
                            <div class="d-flex flex-row ml-2 align-self-center">
                                <b-button v-if="!isEmpty(task.task.candidates.candidateGroups)" variant="link" size="sm" @click.stop="requeue(id)">{{ $t('pages.workflow.requeue') }}</b-button>
                                <b-button v-if="panelShown[id] === true" variant="link" size="sm" :ref="`cancel-${id}`" class="btn-edit pb-2">{{ $t('common.form.cancel' )}}</b-button>
                                <b-button v-else variant="link" size="sm" class="btn-edit">{{ $t('common.form.edit' )}}</b-button>
                            </div>
                        </div>
                        <div slot="list-item-collapse-body" class="d-inline-flex w-100">
                            <fr-task :shown="panelShown[id]" :taskInstance="task" :ref="id" @loadProcess="(process) => $emit('loadProcess', process)" @cancel="cancel" @completeTask="completeTask"></fr-task>
                        </div>
                    </fr-list-item>
                </transition-group>
            </template>
            <fr-list-item v-else>
                <div slot="list-item-header" class="text-muted text-center w-100">
                    {{$t('pages.workflow.noAssignedTasks')}}
                </div>
            </fr-list-item>
        </fr-list-group>
    </div>
</template>

<script>
import _ from 'lodash';
import ListGroup from '@/components/utils/ListGroup';
import ListItem from '@/components/utils/ListItem';
import Task from './Task';

/**
* @description Dashboard widget that lists tasks currently assigned to the logged in user
*
**/
export default {
    name: 'My-Tasks',
    props: {
        tasks: Object
    },
    data () {
        let panelShown = {};

        _.forEach(this.tasks, (value, id) => {
            panelShown[id] = false;
        });

        return {
            panelShown,
            onHidden: null
        };
    },
    components: {
        'fr-list-group': ListGroup,
        'fr-list-item': ListItem,
        'fr-task': Task
    },
    methods: {
        setShown (id) {
            this.$set(this.panelShown, id, true);
        },
        setHidden (id) {
            this.$set(this.panelShown, id, false);

            if (_.isFunction(this.onHidden)) {
                this.onHidden();
                this.onHidden = null;
            }
        },
        cancel (id) {
            _.first(this.$refs[`cancel-${id}`]).click();
        },
        requeue (id) {
            let task = this.tasks[id].task,
                action = 'updateAssignment',
                payload = { id, task, assignee: null };

            this.update(id, action, payload);
        },
        completeTask (payload) {
            this.update(payload.id, 'completeTask', payload);
        },
        update (id, action, payload) {
            let update = () => {
                this.$emit(action, payload);
            };

            if (this.panelShown[id]) {
                this.onHidden = update;
                this.cancel(id);
            } else {
                update();
            }
        },
        isEmpty: _.isEmpty,
        first: _.first
    },
    watch: {
        tasks: {
            /**
                * This function sets the state of panelShown. Anytime new tasks are added to the tasks prop,
                * the prop key is added to the panelShown object with an initial state of `false`.
                */
            handler (val, oldVal) {
                let newVals = _.difference(_.keys(val), _.keys(oldVal));

                if (_.isUndefined(this.panelShown)) {
                    this.panelShown = {};
                }

                newVals.forEach((val) => {
                    this.$set(this.panelShown, val, false);
                });
            },
            deep: true
        }
    }

};
</script>

<style lang="scss" scoped></style>
