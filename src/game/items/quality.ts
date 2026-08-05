export enum Quality {
    WASTE,
    NORMAL,
    RARE,
    EPIC,
    LEGENDARY,
}

export interface QualityDefinition {
    readonly name: string;
    readonly color: string;
    readonly weight: number;
    readonly luckOffset: number;
}

export const QUALITY_DEFINITIONS: Readonly<Record<Quality, QualityDefinition>> = {
    [Quality.WASTE]: {
        name: "废品",
        color: "#777777",
        weight: 23,
        luckOffset: -1,
    },
    [Quality.NORMAL]: {
        name: "普通",
        color: "#f2f2f2",
        weight: 50,
        luckOffset: -2,
    },
    [Quality.RARE]: {
        name: "稀有",
        color: "#3d8fff",
        weight: 20,
        luckOffset: 0,
    },
    [Quality.EPIC]: {
        name: "史诗",
        color: "#a855f7",
        weight: 5,
        luckOffset: 1,
    },
    [Quality.LEGENDARY]: {
        name: "传说",
        color: "#ff9f1c",
        weight: 1,
        luckOffset: 0.5,
    },
};

export function getQualityName(quality: Quality): string {
    return QUALITY_DEFINITIONS[quality].name;
}

export function getQualityColor(quality: Quality): string {
    return QUALITY_DEFINITIONS[quality].color;
}

export function getQualityWeight(quality: Quality, luck: number = 0): number {
    const definition = QUALITY_DEFINITIONS[quality];
    return Math.max(1, definition.weight + definition.luckOffset * luck);
}
