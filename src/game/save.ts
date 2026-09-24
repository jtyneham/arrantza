import { stages } from "../data";
export const SAVE_KEY = "arrantza.save.v1";
export interface Preferences {
  music: number;
  sfx: number;
  haptics: boolean;
}
export interface StageSave {
  discovered: string[];
  nextIndex: number;
  cleared: boolean;
}
export interface Save {
  version: 1;
  stages: Record<string, StageSave>;
  preferences: Preferences;
  lastBookStage: string;
}
const freshStage = (): StageSave => ({
  discovered: [],
  nextIndex: 0,
  cleared: false,
});
export const freshSave = (): Save => ({
  version: 1,
  stages: Object.fromEntries(stages.map((s) => [s.id, freshStage()])),
  preferences: { music: 0.35, sfx: 0.7, haptics: true },
  lastBookStage: "lake",
});
export class SaveStore {
  data = freshSave();
  available = true;
  constructor(private storage: Pick<Storage, "getItem" | "setItem"> | null) {
    try {
      const raw = storage?.getItem(SAVE_KEY);
      if (!storage) this.available = false;
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved.version !== 1) return;
      for (const stage of stages) {
        const old = saved.stages?.[stage.id];
        if (!old) continue;
        const discovered = Array.isArray(old.discovered)
          ? [
              ...new Set<string>(
                old.discovered.filter(
                  (id: unknown) =>
                    typeof id === "string" && stage.roster.includes(id),
                ),
              ),
            ]
          : [];
        let nextIndex = 0;
        while (
          nextIndex < stage.roster.length &&
          discovered.includes(stage.roster[nextIndex])
        )
          nextIndex++;
        this.data.stages[stage.id] = {
          discovered,
          nextIndex,
          cleared: stage.roster.length > 0 && nextIndex === stage.roster.length,
        };
      }
      for (const key of ["music", "sfx"] as const) {
        const value = saved.preferences?.[key];
        if (typeof value === "number" && Number.isFinite(value))
          this.data.preferences[key] = Math.max(0, Math.min(1, value));
      }
      if (typeof saved.preferences?.haptics === "boolean")
        this.data.preferences.haptics = saved.preferences.haptics;
      if (stages.some((s) => s.id === saved.lastBookStage))
        this.data.lastBookStage = saved.lastBookStage;
    } catch {
      this.available = false;
    }
  }
  write() {
    try {
      if (!this.storage) throw new Error("Storage unavailable");
      this.storage.setItem(SAVE_KEY, JSON.stringify(this.data));
      this.available = true;
    } catch {
      this.available = false;
    }
  }
  catch(stageId: string, creatureId: string) {
    const stage = stages.find((s) => s.id === stageId);
    if (!stage?.roster.includes(creatureId)) return false;
    const save = (this.data.stages[stageId] ??= freshStage());
    const isNew = !save.discovered.includes(creatureId);
    if (isNew) save.discovered.push(creatureId);
    while (
      save.nextIndex < stage.roster.length &&
      save.discovered.includes(stage.roster[save.nextIndex])
    )
      save.nextIndex++;
    save.cleared = save.nextIndex === stage.roster.length;
    this.write();
    return isNew;
  }
}
