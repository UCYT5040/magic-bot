import {Events} from "discord.js";
import {trackInvites} from "../../inviteTracker";

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client: any) {
        trackInvites(client);
    }
};
