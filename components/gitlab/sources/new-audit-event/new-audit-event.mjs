import base from "../common/base.mjs";
import fetch from 'node-fetch'
import { 
    create_destination,
    list_destinations,
    delete_destination 
} from "./queries.mjs";

export default {
    ...base,
    key: "gitlab-new-audit-event",
    name: "New Audit Event (Instant)",
    description: "Emit new event when a new audit event is created",
    version: "0.1.0",
    dedupe: "unique",
    type: "source",
    hooks: {
        ...base.hooks,
        async activate() {
            console.log("Activating streaming audit events.");
            console.log(`Event destination: ${this.http.endpoint}`);
            console.log(`Group name: ${this.groupPath}`);

            // the variable must be named "query" to work with JSON.stringify and GraphQL
            const query = create_destination(this.http.endpoint, this.groupPath);

            try {
                const data = await fetch('https://gitlab.com/api/graphql', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${this.gitlab.$auth.oauth_access_token}`
                    },
                    body: JSON.stringify({
                        query,
                    })
                })
                    .then(r => r.json())

            } catch(err) {
                console.log(`Error thrown during activation: ${JSON.stringify(err)}`);
            }
        },
        async deactivate() {
            console.log("Deactivating streaming audit events.");
            console.log(`Event destiniation: ${this.http.endpoint}`);
            console.log(`Group name: ${this.groupPath}`);

            // the variable must be named "query" to work with JSON.stringify and GraphQL
            var query = list_destinations(this.groupPath); 

            try {

                const data = await fetch('https://gitlab.com/api/graphql', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                            'Authorization': `Bearer ${this.gitlab.$auth.oauth_access_token}`
                        },
                        body: JSON.stringify({
                            query,
                        })
                    })
                    .then(r => r.json())

                const todelete = data.data.group.externalAuditEventDestinations.nodes.filter(item => item.destinationUrl == this.http.endpoint)[0].id;
                console.log(`Deleting object ID: ${JSON.stringify(todelete)}`);

                query = delete_destination(todelete);
            
                const data_delete = await fetch('https://gitlab.com/api/graphql', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                            'Authorization': `Bearer ${this.gitlab.$auth.oauth_access_token}`
                        },
                        body: JSON.stringify({
                            query,
                        })
                    })
                    .then(r => r.json())

                console.log("Done deactivating!");

            } catch(err) {
                console.log(`Error thrown during deactivation: ${JSON.stringify(err)}`);
            }
        },
    },
    methods: {
        ...base.methods,
        generateMeta(branch) {
            const id = branch.ref;
            return {
                id,
                summary: `New Audit Event: ${id}`,
                ts: +new Date(),
            };
        },
        emitEvent(event) {
            // Gitlab doesn't offer a specific hook for "new branch" events,
            // but such event can be deduced from the payload of "push" events.
            const meta = this.generateMeta(event);
            this.$emit(event, meta);
        },
    },
};
