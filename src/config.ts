import {
    ActionRowBuilder,
    ChannelSelectMenuBuilder,
    MentionableSelectMenuBuilder,
    ModalBuilder,
    RoleSelectMenuBuilder,
    StringSelectMenuBuilder,
    TextInputBuilder,
    TextInputStyle,
    UserSelectMenuBuilder
} from "discord.js";

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
        this.type = type;
        this.sendIn = "modal"; // Always sent in a modal
    }

    public build(partId: string): TextInputBuilder {
        super.build(partId);
        return new TextInputBuilder()
            .setCustomId(this.name + this.partId)
            .setLabel(this.description)
            .setPlaceholder(this.placeholder)
            .setStyle(TextInputStyle.Short)
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
    public defaultValue?: string | string[];

    constructor(name: string, description: string, options: {
        label: string,
        value: string,
        emoji?: string
    }[], type: SelectConfigPartType, min?: number, max?: number, channelTypes?: ChannelType[], defaultValue?: string | string[]) {
        super(name, description, type, "message");
        this.options = options;
        this.type = type;
        this.min = min;
        this.max = max;
        this.channelTypes = channelTypes;
        this.sendIn = "message"; // Always sent in a message
        this.defaultValue = defaultValue;
    }

    public build(partId: string): any {
        super.build(partId);
        const customId = this.name + this.partId;

        let selectMenu;

        switch (this.type) {
            case "text":
            case "boolean":
                selectMenu = new StringSelectMenuBuilder()
                    .setCustomId(customId)
                    .setPlaceholder(this.description)
                    .addOptions(this.options);
                break;
            case "channel":
                selectMenu = new ChannelSelectMenuBuilder()
                    .setCustomId(customId)
                    .setPlaceholder(this.description);
                break;
            case "user":
                selectMenu = new UserSelectMenuBuilder()
                    .setCustomId(customId)
                    .setPlaceholder(this.description);
                break;
            case "role":
                selectMenu = new RoleSelectMenuBuilder()
                    .setCustomId(customId)
                    .setPlaceholder(this.description);
                break;
            case "mentionable":
                selectMenu = new MentionableSelectMenuBuilder()
                    .setCustomId(customId)
                    .setPlaceholder(this.description);
                break;
            default:
                console.warn(`Unsupported select type: ${this.type}`);
                return null;
        }

        if (this.min !== undefined) selectMenu.setMinValues(this.min);
        if (this.max !== undefined) selectMenu.setMaxValues(this.max);

        return new ActionRowBuilder().addComponents(selectMenu);
    }
}

// Please make a new instance of this class for each config session (unlike ConfigPart, which can use a single instance)
export class ConfigSession {
    public title: string;
    public parts: ConfigPart[];
    public guildId: string;
    public changes: { [key: string]: any };
    private readonly _load: (guildId: string) => Promise<any>;
    private readonly _save: (guildId: string, data: any) => Promise<any>;

    public constructor(title: string, guildId: string, load: (guildId: string) => Promise<any>, save: (guildId: string, data: any) => Promise<any>) {
        this.title = title;
        this.guildId = guildId;
        this.parts = [];
        this.changes = {};
        this._load = load;
        this._save = save;
    }

    public async load() {
        const data = await this._load(this.guildId);
        if (data) {
            for (const part of this.parts) {
                if (part instanceof InputConfigPart && data[part.name]) {
                    part.defaultValue = data[part.name];
                } else if (part instanceof SelectConfigPart && data[part.name]) {
                    part.defaultValue = data[part.name];
                }
            }
        }
    }

    public async save() {
        await this._save(this.guildId, this.changes);
    }

    public async send(interaction: any) {
        await this.load();
        const randomId = Math.floor(Math.random() * 1000000).toString();
        const modalId = this.title + randomId;

        const modalParts = this.parts.filter(p => p.sendIn === "modal");
        const selectParts = this.parts.filter(p => p.sendIn === "message");

        if (modalParts.length > 0) {
            const modal = new ModalBuilder()
                .setCustomId(modalId)
                .setTitle(this.title);

            for (const part of modalParts) {
                modal.addComponents([new ActionRowBuilder().addComponents([part.build(randomId)])]);
            }

            await interaction.showModal(modal);

            try {
                const modalInteraction = await interaction.awaitModalSubmit({
                    filter: (i: any) => i.customId === modalId,
                    time: 60_000 // 60s timeout
                });
                await this.handleModalSubmit(modalInteraction, randomId);
            } catch (err) {
                console.log(err);
                console.log("Modal submission timed out.");
            }
        } else if (selectParts.length > 0) {
            await this.sendSelectMenus(interaction, randomId);
        } else {
            await interaction.reply({content: "No configuration parts to display.", ephemeral: true});
        }
    }

    private async handleModalSubmit(modalInteraction: any, randomId: string) {
        const modalParts = this.parts.filter(part => part.sendIn === "modal");

        for (const part of modalParts) {
            if (part instanceof InputConfigPart) {
                const customIdFromModal = part.name + part.partId;
                const value = modalInteraction.fields.getTextInputValue(customIdFromModal);
                this.changes[part.name] = value;
                part.defaultValue = value;
            }
        }
        await this.save();
        console.log(`Modal submitted for ${this.title}. Changes:`, this.changes);

        const selectParts = this.parts.filter(part => part.sendIn === "message");
        if (selectParts.length > 0) {
            await this.sendSelectMenus(modalInteraction, randomId);
        } else {
            await modalInteraction.reply({content: "Configuration saved!", ephemeral: true});
        }
    }

    private _buildContent(selectParts: ConfigPart[]): string {
        let content = "Please configure the following options. This message will time out after 60 seconds of inactivity.\n\n**Current Settings:**\n";
        for (const part of selectParts) {
            if (part instanceof SelectConfigPart) {
                let valueStr = "Not set";
                if (part.defaultValue && (Array.isArray(part.defaultValue) ? part.defaultValue.length > 0 : part.defaultValue)) {
                    const values = Array.isArray(part.defaultValue) ? part.defaultValue : [part.defaultValue];
                    if (part.type === "role") {
                        valueStr = values.map(v => `<@&${v}>`).join(", ");
                    } else if (part.type === "user") {
                        valueStr = values.map(v => `<@${v}>`).join(", ");
                    } else if (part.type === "channel") {
                        valueStr = values.map(v => `<#${v}>`).join(", ");
                    } else if (part.type === "text" || part.type === "boolean") {
                        const labels = [];
                        for (const val of values) {
                            const option = part.options.find(o => o.value === val);
                            labels.push(option ? option.label : val);
                        }
                        valueStr = labels.join(", ");
                    } else { // mentionable
                        valueStr = values.map(v => `<@${v}>`).join(", ");
                    }
                }
                content += `**${part.name}**: ${valueStr}\n`;
            }
        }
        return content;
    }

    private async sendSelectMenus(interaction: any, randomId: string) {
        const selectParts = this.parts.filter(p => p.sendIn === "message");
        const messageComponents: any[] = [];
        for (const part of selectParts) {
            const component = part.build(randomId);
            if (component) messageComponents.push(component);
        }

        if (messageComponents.length === 0) {
            return;
        }

        const replyOptions = {
            content: this._buildContent(selectParts),
            components: messageComponents,
            ephemeral: true,
            fetchReply: true
        };

        const message = await (interaction.replied || interaction.deferred
            ? interaction.followUp(replyOptions)
            : interaction.reply(replyOptions));

        while (true) {
            try {
                const selectInteraction = await message.awaitMessageComponent({
                    filter: (i: any) => selectParts.some(p => (p.name + randomId) === i.customId),
                    time: 60_000
                });

                const relevantPart = this.parts.find(part => part.sendIn === "message" && (part.name + randomId) === selectInteraction.customId) as SelectConfigPart;
                if (!relevantPart) {
                    console.warn(`No relevant part found for interaction: ${selectInteraction.customId}`);
                    continue;
                }

                const selectedValues = selectInteraction.values;
                console.log(selectedValues);

                if (selectedValues.length > 0) {
                    const newValue = selectedValues.length === 1 && (!relevantPart.max || relevantPart.max == 1) ? selectedValues[0] : selectedValues;
                    this.changes[relevantPart.name] = newValue;
                    relevantPart.defaultValue = newValue;
                } else {
                    delete this.changes[relevantPart.name];
                    relevantPart.defaultValue = undefined;
                }

                await this.save();
                console.log(`Select menu submitted for ${this.title}, part ${relevantPart.name}. Changes:`, this.changes);

                await selectInteraction.update({
                    content: this._buildContent(selectParts),
                    components: messageComponents
                });

            } catch (err) {
                if (err.code === "INTERACTION_COLLECTOR_ERROR") {
                    console.log("Select menu interaction timed out.");
                    const disabledComponents = messageComponents.map(row => {
                        row.components.forEach(c => c.setDisabled(true));
                        return row;
                    });
                    await message.edit({
                        content: "Configuration session has ended due to inactivity.",
                        components: disabledComponents
                    }).catch(e => console.error("Failed to edit message on timeout:", e));
                } else {
                    console.error("Error handling select menu interaction:", err);
                }
                break;
            }
        }
    }
}
