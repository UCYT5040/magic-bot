let inviteCache = new Map<string, Map<string, number>>(); // guild id -> user id -> invite count
let queue: number[] = [];
let processing = false;

function wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchInvites(guildId: string, client: any): Promise<Map<string, number>> {
    const guild = await client.guilds.fetch(guildId);
    if (!guild) {
        console.error(`Guild with ID ${guildId} not found.`);
        return new Map();
    }

    const invites = await guild.invites.fetch();
    invites.forEach(invite => {
        if (!inviteCache.has(guildId)) {
            inviteCache.set(guildId, new Map());
        }
        const userId = invite.inviter?.id;
        if (userId) {
            inviteCache.get(guildId)?.set(userId, invite.uses);
        }
    });
}

export async function trackInvites(client: any) {
    const guilds = client.guilds.cache.map(guild => guild.id);
    for (const guildId of guilds) {
        queue.push(guildId);
    }
    queueProcessor(client);
    await wait(1000 * 60 * 30);
    trackInvites(client);
}

export async function getGuildInvites(guildId: string, client: any) {
    // Returns updated invite counts for a specific guild, unless the queue is busy, in which case it will return
    // historic data.
    if ((queue.length === 0 || !processing) && !queue.includes(guildId)) {
        queue.push(guildId);
        await fetchInvites(guildId, client);
        queue.splice(queue.indexOf(guildId), 1); // Remove guildId from queue after fetching
    }
    if (inviteCache.has(guildId)) {
        // Return sorted array of [userId, inviteCount] tuples, descending by inviteCount
        return Array.from(inviteCache.get(guildId)!)
            .sort((a, b) => b[1] - a[1]);
    } else {
        console.warn(`No cached invites found for guild ${guildId}.`);
        return [];
    }
}

async function queueProcessor(client: any) {
    if (processing) return; // Prevent multiple concurrent processes
    processing = true;
    while (queue.length > 0) {
        const guildId = queue.shift();
        if (guildId) {
            await fetchInvites(guildId, client);
        }
        await wait(1000); // Wait for 1 second before processing the next guild
    }
    processing = false;
}
