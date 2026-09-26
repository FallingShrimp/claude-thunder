export enum DataFormat {
    INTEGER = "INTEGER",
    VALUE = "VALUE",
    PERCENT = "PERCENT",
    ANGLE = "ANGLE",
    FREQUENCY = "FREQUENCY",
}

export type StatsData = Record<string, number>;

export type StatsFormats<T extends StatsData> = {
    readonly [K in keyof T]: DataFormat;
};

export function defineStats<T extends StatsData>(formats: StatsFormats<T>): StatsFormats<T> {
    return Object.freeze({ ...formats });
}
