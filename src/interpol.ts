export interface LevelXpPair {
    level: number;
    xp: number;
}

/* Interpolates a set of (level, xp) pairs to create a smooth curve.
 * Output numbers will follow input digit conversions (for example, if input is 1000 and 2000, output will be ending with at least 2 zeros)
 */
export function interpol(
    points: LevelXpPair[], // (level, xp) pairs
): LevelXpPair[] {
    if (points.length < 2) {
        throw new Error("At least two points are required for interpolation.");
    }

    // Sort points by level
    points.sort((a, b) => a.level - b.level);

    const result: LevelXpPair[] = [];
    const precision = 100; // Precision for the output, can be adjusted
    const seenLevels = new Set<number>();

    for (let i = 0; i < points.length - 1; i++) {
        const start = points[i];
        const end = points[i + 1];

        // Calculate the slope (change in xp per change in level)
        const slope = (end.xp - start.xp) / (end.level - start.level);

        // Interpolate between start and end
        for (let j = 0; j <= precision; j++) {
            const level = Math.round(start.level + (end.level - start.level) * (j / precision));
            const xp = Math.round(start.xp + slope * (level - start.level));
            if (!seenLevels.has(level)) {
                result.push({ level, xp });
                seenLevels.add(level);
            }
        }
    }

    return result;
}
