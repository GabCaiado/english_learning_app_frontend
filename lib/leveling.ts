/**
 * Habitica-style leveling: XP required per level grows linearly,
 * so cumulative XP to reach a level grows quadratically (increasing curve).
 */

const XP_STEP = 50 // XP needed to go from level L to L+1 is XP_STEP * L

// Cumulative XP required to reach the start of `level` (1-indexed)
function totalXpForLevel(level: number): number {
  return (XP_STEP * level * (level - 1)) / 2
}

export interface LevelProgress {
  level: number
  currentLevelXp: number
  xpToNextLevel: number
  progressPercent: number
}

export function getLevelProgress(totalXp: number): LevelProgress {
  const xp = Math.max(0, totalXp)

  let level = 1
  while (totalXpForLevel(level + 1) <= xp) {
    level += 1
  }

  const xpAtLevelStart = totalXpForLevel(level)
  const xpForThisLevel = XP_STEP * level
  const currentLevelXp = xp - xpAtLevelStart

  return {
    level,
    currentLevelXp,
    xpToNextLevel: xpForThisLevel,
    progressPercent: Math.min(100, Math.round((currentLevelXp / xpForThisLevel) * 100)),
  }
}
