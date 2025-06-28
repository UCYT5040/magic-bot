import {Events, Message} from "discord.js";
import {PrismaClient} from "../../../generated/prisma";
import {trackInvites} from "../../inviteTracker";

const prisma = new PrismaClient();

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client: any) {
        trackInvites(client);
    }
};
