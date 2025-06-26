import {Events, TextInputBuilder} from "discord.js";

type ConfigPartType = "text" | "number" | "boolean" | "user" | "role" | "mentionable" | "channel";

// Does not need individual instances
export class ConfigPart {
    public name: string;
    public partId: string;
    public description: string;
    public type: ConfigPartType;
    public sendIn: "modal" | "message";

    constructor(name: string, description: string, type: ConfigPartType, sendIn: "modal" | "message") {
        this.name = name;
        this.description = description;
        this.type = type;
        this.sendIn = sendIn;
        this.partId = "";
    }

    public build(partId: string = ""): any {
        this.partId = partId;
        return null;
    }
}

type InputConfigPartType = "text" | "number";

export class InputConfigPart extends ConfigPart {
    public placeholder: string;
    public defaultValue: string | number;
    public type: InputConfigPartType;
    public sendIn: "modal";

    public constructor(name: string, description: string, placeholder: string, defaultValue: string | number, type: InputConfigPartType) {
        super(name, description, type, "modal");
        this.placeholder = placeholder;
        this.defaultValue = defaultValue;
    }

    public build(partId: string): TextInputBuilder {
        super.build(partId);
        return new TextInputBuilder()
            .setCustomId(this.name + this.partId)
            .setLabel(this.description)
            .setPlaceholder(this.placeholder)
            .setValue(this.defaultValue.toString());
    }
}

type ChannelType =
    "GUILD_TEXT"
    | "GUILD_VOICE"
    | "GUILD_NEWS"
    | "GUILD_STORE"
    | "GUILD_STAGE_VOICE"
    | "GUILD_PUBLIC_THREAD"
    | "GUILD_PRIVATE_THREAD"
    | "GUILD_NEWS_THREAD"
    | "GUILD_CATEGORY"
    | "GUILD_DIRECTORY"
    | "GUILD_FORUM";
type SelectConfigPartType = ConfigPartType;

export class SelectConfigPart extends ConfigPart {
    public options: { label: string, value: string, emoji?: string }[];
    public type: SelectConfigPartType;
    public min?: number; // If min/max not provided, only one option can be selected
    public max?: number; // If min/max not provided, only one option can be selected
    public channelTypes?: ChannelType[]; // If type is "channel", this specifies which channel types are allowed (otherwise, ignored)
    public sendIn: "message";

    constructor(name: string, description: string, options: {
        label: string,
        value: string,
        emoji?: string
    }[], type: SelectConfigPartType, min?: number, max?: number, channelTypes?: ChannelType[]) {
        super(name, description, type, "message");
    }

    public build(partId: string): any {
        super.build(partId);
        // TODO: Implement the build method for SelectConfigPart
    }
}

// Please make a new instance of this class for each config session (unlike ConfigPart, which can use a single instance)
export class ConfigSession {
    public title: string;
    public parts: ConfigPart[];
    public modalId: string;

    public constructor(title: string) {
        this.title = title;
        this.parts = [];
    }

    public send(interaction) {
        const randomId = Math.floor(Math.random() * 1000000);
        this.modalId = this.title + randomId;
        const modal = interaction.client.modals.createModal()
            .setCustomId(this.modalId)
            .setTitle(this.title);

        for (const part of this.parts) {
            if (part.sendIn === "modal") {
                modal.addComponents(part.build());
            }
        }

        if (modal.components.length === 0) {
            // TODO: In the future, just send the user to the select configs
            interaction.reply({
                content: "No configuration parts to display.",
                ephemeral: true
            });
            return;
        }

        interaction.showModal(modal);

        interaction.client.on(Events.InteractionCreate, this.modalSubmit);
    }

    public modalSubmit(interacrtion) {
        if (!interacrtion.isModalSubmit()) return;
        if (interacrtion.customId !== this.modalId) return;
        // TODO: Handle modal submission
        interacrtion.client.off(Events.InteractionCreate, this.modalSubmit);
    }
}