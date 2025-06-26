import {ConfigPart, InputConfigPart} from "../config";

export const starboardConfigParts: ConfigPart[] = [
    // TODO: Add select-based configs
    new InputConfigPart(
        "starboardReaction",
        "Reaction used to star messages",
        "e.g. :star: or ⭐",
        "⭐",
        "text"
    ),
    new InputConfigPart(
        "starboardThreshold",
        "Stars needed to send a message to starboard",
        "#",
        10,
        "number"
    )
]