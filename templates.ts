// Workout Program Templates
// Predefined and custom templates for quick workout start

export interface ExerciseTemplate {
  name: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  restSeconds: number;
  notes?: string;
  targetWeight?: number; // Suggested weight from last workout
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  description?: string;
  warmup?: {
    type: string;
    duration: number;
    resistance?: number;
    incline?: number;
  };
  exercises: ExerciseTemplate[];
  cooldown?: {
    type: string;
    duration: number;
    resistance?: number;
    incline?: number;
  };
  estimatedDuration: number; // minutes
  tags?: string[];
}

// Default templates based on recommended_program.md
export const DEFAULT_TEMPLATES: WorkoutTemplate[] = [
  {
    id: "day-1-back-biceps",
    name: "Day 1 - Back and Biceps",
    description: "Back and biceps workout",
    warmup: {
      type: "Elliptical",
      duration: 10,
      resistance: 7,
      incline: 8,
    },
    exercises: [
      {
        name: "Bent Over Row (Barbell)",
        sets: 3,
        repsMin: 8,
        repsMax: 10,
        restSeconds: 90,
        notes: "Pull to lower abdomen, focus on technique",
      },
      {
        name: "Lat Pulldown (Machine)",
        sets: 3,
        repsMin: 10,
        repsMax: 12,
        restSeconds: 90,
      },
      {
        name: "Seated Row (Machine)",
        sets: 3,
        repsMin: 10,
        repsMax: 12,
        restSeconds: 90,
      },
      {
        name: "Face Pull (Cable)",
        sets: 3,
        repsMin: 12,
        repsMax: 15,
        restSeconds: 60,
        notes: "Pull to nose, focus on rear delts",
      },
      {
        name: "Hammer Curl (Dumbbell)",
        sets: 3,
        repsMin: 10,
        repsMax: 12,
        restSeconds: 60,
      },
      {
        name: "Cable Curl",
        sets: 3,
        repsMin: 12,
        repsMax: 15,
        restSeconds: 60,
      },
      {
        name: "Back Extension",
        sets: 3,
        repsMin: 15,
        repsMax: 20,
        restSeconds: 60,
      },
    ],
    cooldown: {
      type: "Elliptical",
      duration: 10,
      resistance: 7,
      incline: 8,
    },
    estimatedDuration: 60,
    tags: ["back", "biceps", "pull"],
  },
  {
    id: "day-2-chest-shoulders-triceps",
    name: "Day 2 - Chest, Shoulders and Triceps",
    description: "Chest, shoulders and triceps workout",
    warmup: {
      type: "Elliptical",
      duration: 10,
      resistance: 7,
      incline: 8,
    },
    exercises: [
      {
        name: "Bench Press (Dumbbell)",
        sets: 3,
        repsMin: 8,
        repsMax: 10,
        restSeconds: 120,
      },
      {
        name: "Incline Bench Press (Dumbbell)",
        sets: 3,
        repsMin: 10,
        repsMax: 12,
        restSeconds: 120,
      },
      {
        name: "Chest Press (Machine)",
        sets: 3,
        repsMin: 12,
        repsMax: 15,
        restSeconds: 90,
      },
      {
        name: "Seated Overhead Press (Dumbbell)",
        sets: 3,
        repsMin: 8,
        repsMax: 10,
        restSeconds: 120,
      },
      {
        name: "Lateral Raise (Dumbbell)",
        sets: 3,
        repsMin: 12,
        repsMax: 15,
        restSeconds: 60,
      },
      {
        name: "Reverse Fly (Dumbbell)",
        sets: 3,
        repsMin: 12,
        repsMax: 15,
        restSeconds: 60,
        notes: "Important for shoulder health and posture",
      },
      {
        name: "Cable Pushdown (Triceps)",
        sets: 3,
        repsMin: 12,
        repsMax: 15,
        restSeconds: 60,
        notes: "Critical for arm growth (2/3 of volume)",
      },
      {
        name: "Back Extension",
        sets: 3,
        repsMin: 15,
        repsMax: 20,
        restSeconds: 60,
      },
    ],
    cooldown: {
      type: "Elliptical",
      duration: 10,
      resistance: 7,
      incline: 8,
    },
    estimatedDuration: 65,
    tags: ["chest", "shoulders", "triceps", "push"],
  },
  {
    id: "day-3-legs-abs",
    name: "Day 3 - Legs and Abs",
    description: "Legs and abs workout",
    warmup: {
      type: "Elliptical",
      duration: 10,
      resistance: 7,
      incline: 8,
    },
    exercises: [
      {
        name: "Goblet Squat (Kettlebell)",
        sets: 3,
        repsMin: 10,
        repsMax: 12,
        restSeconds: 90,
      },
      {
        name: "Leg Press",
        sets: 4,
        repsMin: 10,
        repsMax: 12,
        restSeconds: 120,
        notes: "Increase weight to 120-150 kg",
      },
      {
        name: "Romanian Deadlift (Dumbbell)",
        sets: 3,
        repsMin: 10,
        repsMax: 12,
        restSeconds: 90,
      },
      {
        name: "Bulgarian Split Squat (Dumbbell)",
        sets: 3,
        repsMin: 10,
        repsMax: 12,
        restSeconds: 90,
        notes: "Great exercise for glutes and quads",
      },
      {
        name: "Leg Curl (Machine)",
        sets: 3,
        repsMin: 12,
        repsMax: 15,
        restSeconds: 60,
        notes: "Important for balance",
      },
      {
        name: "Standing Calf Raise (Dumbbell)",
        sets: 3,
        repsMin: 15,
        repsMax: 20,
        restSeconds: 60,
      },
      {
        name: "Crunch (Machine)",
        sets: 3,
        repsMin: 15,
        repsMax: 20,
        restSeconds: 45,
      },
      {
        name: "Knee Raise (Captain's Chair)",
        sets: 3,
        repsMin: 12,
        repsMax: 15,
        restSeconds: 45,
      },
      {
        name: "Plank",
        sets: 3,
        repsMin: 45,
        repsMax: 60,
        restSeconds: 45,
        notes: "For core stability (in seconds)",
      },
    ],
    cooldown: {
      type: "Elliptical",
      duration: 10,
      resistance: 7,
      incline: 8,
    },
    estimatedDuration: 70,
    tags: ["legs", "abs", "core"],
  },
  {
    id: "quick-upper",
    name: "Quick Upper Body",
    description: "Quick upper body workout (30 min)",
    exercises: [
      {
        name: "Push-ups",
        sets: 3,
        repsMin: 15,
        repsMax: 20,
        restSeconds: 60,
      },
      {
        name: "Pull-ups / Assisted Pull-ups",
        sets: 3,
        repsMin: 8,
        repsMax: 12,
        restSeconds: 90,
      },
      {
        name: "Dumbbell Overhead Press",
        sets: 3,
        repsMin: 10,
        repsMax: 12,
        restSeconds: 60,
      },
      {
        name: "Dumbbell Row",
        sets: 3,
        repsMin: 12,
        repsMax: 15,
        restSeconds: 60,
      },
    ],
    estimatedDuration: 30,
    tags: ["quick", "upper", "minimal-equipment"],
  },
  {
    id: "quick-lower",
    name: "Quick Lower Body",
    description: "Quick lower body workout (30 min)",
    exercises: [
      {
        name: "Goblet Squat",
        sets: 3,
        repsMin: 12,
        repsMax: 15,
        restSeconds: 60,
      },
      {
        name: "Lunges (Bodyweight or Weighted)",
        sets: 3,
        repsMin: 10,
        repsMax: 12,
        restSeconds: 60,
      },
      {
        name: "Romanian Deadlift",
        sets: 3,
        repsMin: 12,
        repsMax: 15,
        restSeconds: 60,
      },
      {
        name: "Calf Raises",
        sets: 3,
        repsMin: 20,
        repsMax: 25,
        restSeconds: 45,
      },
    ],
    estimatedDuration: 30,
    tags: ["quick", "lower", "minimal-equipment"],
  },
];

// Plugin interface for TemplateManager (to avoid circular dependency)
interface WorkoutPlugin {
  settings: {
    customTemplates: WorkoutTemplate[];
  };
  saveSettings(): Promise<void>;
}

export class TemplateManager {
  private plugin: WorkoutPlugin;

  constructor(plugin: WorkoutPlugin) {
    this.plugin = plugin;
  }

  getAllTemplates(): WorkoutTemplate[] {
    // Start with default templates
    const templates = [...DEFAULT_TEMPLATES];

    // Override with custom versions (including edited defaults)
    this.plugin.settings.customTemplates.forEach((customTemplate) => {
      const index = templates.findIndex((t) => t.id === customTemplate.id);
      if (index >= 0) {
        // Replace default with custom version
        templates[index] = customTemplate;
      } else {
        // Add new custom template
        templates.push(customTemplate);
      }
    });

    return templates;
  }

  getTemplate(id: string): WorkoutTemplate | undefined {
    return this.getAllTemplates().find((t) => t.id === id);
  }

  async addTemplate(template: WorkoutTemplate): Promise<void> {
    // Check if template with this ID already exists in custom templates
    const existingIndex = this.plugin.settings.customTemplates.findIndex(
      (t) => t.id === template.id
    );

    if (existingIndex >= 0) {
      // Update existing
      this.plugin.settings.customTemplates[existingIndex] = template;
    } else if (this.isDefaultTemplate(template.id)) {
      // Adding a modified version of default template - override it
      this.plugin.settings.customTemplates.push(template);
    } else {
      // New custom template - ensure unique ID
      let newId = template.id;
      while (this.getTemplate(newId)) {
        newId = `${template.id}-${Date.now()}`;
      }
      template.id = newId;
      this.plugin.settings.customTemplates.push(template);
    }

    await this.plugin.saveSettings();
  }

  async updateTemplate(
    id: string,
    updates: Partial<WorkoutTemplate>
  ): Promise<void> {
    // Check if it's in custom templates
    const customIndex = this.plugin.settings.customTemplates.findIndex(
      (t) => t.id === id
    );

    if (customIndex >= 0) {
      // Update existing custom template
      this.plugin.settings.customTemplates[customIndex] = {
        ...this.plugin.settings.customTemplates[customIndex],
        ...updates,
      };
    } else if (this.isDefaultTemplate(id)) {
      // Editing a default template - create custom override
      const defaultTemplate = DEFAULT_TEMPLATES.find((t) => t.id === id);
      if (defaultTemplate) {
        this.plugin.settings.customTemplates.push({
          ...defaultTemplate,
          ...updates,
          id, // Keep same ID to override
        });
      }
    }

    await this.plugin.saveSettings();
  }

  async deleteTemplate(id: string): Promise<void> {
    // Remove from custom templates (works for both overrides and truly custom templates)
    const index = this.plugin.settings.customTemplates.findIndex(
      (t) => t.id === id
    );
    if (index >= 0) {
      this.plugin.settings.customTemplates.splice(index, 1);
      await this.plugin.saveSettings();
    }
  }

  async resetToDefault(id: string): Promise<boolean> {
    // Reset a default template to its original version by removing custom override
    if (!this.isDefaultTemplate(id)) {
      return false; // Not a default template
    }

    const index = this.plugin.settings.customTemplates.findIndex(
      (t) => t.id === id
    );
    if (index >= 0) {
      this.plugin.settings.customTemplates.splice(index, 1);
      await this.plugin.saveSettings();
      return true;
    }

    return false; // No custom override exists
  }

  async duplicateTemplate(id: string): Promise<WorkoutTemplate | undefined> {
    const original = this.getTemplate(id);
    if (!original) return undefined;

    const duplicate: WorkoutTemplate = {
      ...JSON.parse(JSON.stringify(original)), // Deep copy
      id: `${original.id}-copy-${Date.now()}`,
      name: `${original.name} (Copy)`,
    };

    await this.addTemplate(duplicate);
    return duplicate;
  }

  isDefaultTemplate(id: string): boolean {
    return DEFAULT_TEMPLATES.some((t) => t.id === id);
  }

  isModifiedDefault(id: string): boolean {
    // Check if this default template has been modified
    return (
      this.isDefaultTemplate(id) &&
      this.plugin.settings.customTemplates.some((t) => t.id === id)
    );
  }

  // Get last weights for exercises in a template
  async getLastWeights(
    template: WorkoutTemplate,
    workoutsFolder: string
  ): Promise<Map<string, number>> {
    // This would query recent workout files to get last used weights
    // For now, return empty map - will be implemented with file system access
    return new Map();
  }
}
