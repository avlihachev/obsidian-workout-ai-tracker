import {
  App,
  Editor,
  MarkdownView,
  MarkdownFileInfo,
  Modal,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  TFile,
} from "obsidian";

import Anthropic from "@anthropic-ai/sdk";
import {
  TemplateManager,
  WorkoutTemplate,
  ExerciseTemplate,
} from "./templates";

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

interface WorkoutAISettings {
  claudeApiKey: string;
  workoutsFolder: string;
  defaultRestTime: number;
  enableNotifications: boolean;
  autoAnalyze: boolean;
  customTemplates: WorkoutTemplate[];
}

const DEFAULT_SETTINGS: WorkoutAISettings = {
  claudeApiKey: "",
  workoutsFolder: "Workouts",
  defaultRestTime: 90,
  enableNotifications: true,
  autoAnalyze: false,
  customTemplates: [],
};

interface Exercise {
  name: string;
  sets: ExerciseSet[];
  notes?: string;
}

interface ExerciseSet {
  setNumber: number;
  weight: number;
  reps: number;
  rpe?: number; // Rate of Perceived Exertion (1-10)
  heartRate?: number;
  restTime?: number;
  completed: boolean;
}

interface WorkoutSession {
  date: string;
  program: string;
  warmup?: CardioActivity;
  exercises: Exercise[];
  cooldown?: CardioActivity;
  duration: number;
  totalSets: number;
  totalVolume: number;
  notes?: string;
}

interface CardioActivity {
  type: string; // 'elliptical', 'rowing', etc.
  duration: number; // minutes
  resistance?: number;
  incline?: number;
  avgHeartRate?: number;
  distance?: number;
  calories?: number;
}

// ============================================================================
// MAIN PLUGIN CLASS
// ============================================================================

export default class WorkoutAIPlugin extends Plugin {
  settings!: WorkoutAISettings;
  private restTimer: RestTimerModal | null = null;
  templateManager!: TemplateManager;

  async onload() {
    await this.loadSettings();
    this.templateManager = new TemplateManager(this);

    // Add ribbon icon
    this.addRibbonIcon("activity", "Start workout", () => {
      new WorkoutModal(this.app, this).open();
    });

    // Commands
    this.addCommand({
      id: "start-workout",
      name: "Start new workout",
      callback: () => {
        new WorkoutModal(this.app, this).open();
      },
    });

    this.addCommand({
      id: "analyze-workouts",
      name: "Analyze workouts with AI",
      editorCallback: async (
        _editor: Editor,
        ctx: MarkdownView | MarkdownFileInfo
      ) => {
        if (ctx instanceof MarkdownView) {
          await this.analyzeWorkouts(ctx);
        }
      },
    });

    this.addCommand({
      id: "quick-exercise",
      name: "Quick add exercise to today",
      callback: () => {
        new QuickExerciseModal(this.app, this).open();
      },
    });

    this.addCommand({
      id: "rest-timer",
      // eslint-disable-next-line obsidianmd/ui/sentence-case -- Already in correct sentence case format
      name: "Start rest timer",
      callback: () => {
        if (!this.restTimer) {
          this.restTimer = new RestTimerModal(
            this.app,
            this.settings.defaultRestTime,
            () => {
              this.restTimer = null;
            }
          );
          this.restTimer.open();
        }
      },
    });

    this.addCommand({
      id: "manage-templates",
      name: "Manage workout templates",
      callback: () => {
        new TemplateManagementModal(this.app, this).open();
      },
    });

    // Settings tab
    this.addSettingTab(new WorkoutAISettingTab(this.app, this));
  }

  onunload() {
    // Plugin cleanup
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  // ========================================================================
  // WORKOUT DATA MANAGEMENT
  // ========================================================================

  async createWorkoutFile(session: WorkoutSession): Promise<TFile> {
    const folder = this.settings.workoutsFolder;

    // Ensure folder exists
    if (!this.app.vault.getAbstractFileByPath(folder)) {
      await this.app.vault.createFolder(folder);
    }

    const fileName = `${folder}/${session.date} - ${session.program}.md`;
    const content = this.generateWorkoutMarkdown(session);

    const file = await this.app.vault.create(fileName, content);
    new Notice(`Workout saved: ${session.program}`);

    return file;
  }

  generateWorkoutMarkdown(session: WorkoutSession): string {
    const properties = {
      date: session.date,
      program: session.program,
      duration: session.duration,
      totalSets: session.totalSets,
      totalVolume: session.totalVolume,
      type: "workout",
    };

    let markdown = "---\n";
    for (const [key, value] of Object.entries(properties)) {
      markdown += `${key}: ${value}\n`;
    }
    markdown += "---\n\n";

    markdown += `# ${session.program}\n\n`;
    markdown += `📅 ${session.date}  |  ⏱️ ${session.duration} min  |  💪 ${session.totalSets} sets  |  📊 ${session.totalVolume} kg volume\n\n`;

    // Warmup
    if (session.warmup) {
      markdown += `## 🏃 Warmup \n\n`;
      markdown += `- **Type:** ${session.warmup.type}\n`;
      markdown += `- **Duration:** ${session.warmup.duration} min\n`;
      if (session.warmup.resistance)
        markdown += `- **Resistance:** ${session.warmup.resistance}\n`;
      if (session.warmup.incline)
        markdown += `- **Incline:** ${session.warmup.incline}\n`;
      if (session.warmup.avgHeartRate)
        markdown += `- **Average Heart Rate:** ${session.warmup.avgHeartRate} bpm\n`;
      markdown += "\n";
    }

    // Exercises
    markdown += `## 💪 Exercises\n\n`;
    session.exercises.forEach((exercise) => {
      markdown += `### ${exercise.name}\n\n`;
      markdown += `| Set | Weight (kg) | Reps | RPE | Heart Rate | Rest (sec) |\n`;
      markdown += `|--------|----------|------------|-----|-------|-------------|\n`;

      exercise.sets.forEach((set) => {
        const rpe = set.rpe || "-";
        const hr = set.heartRate || "-";
        const rest = set.restTime || "-";
        markdown += `| ${set.setNumber} | ${set.weight} | ${set.reps} | ${rpe} | ${hr} | ${rest} |\n`;
      });

      if (exercise.notes) {
        markdown += `\n*Notes:* ${exercise.notes}\n`;
      }
      markdown += "\n";
    });

    // Cooldown
    if (session.cooldown) {
      markdown += `## 🏃 Cooldown\n\n`;
      markdown += `- **Type:** ${session.cooldown.type}\n`;
      markdown += `- **Duration:** ${session.cooldown.duration} min\n`;
      if (session.cooldown.resistance)
        markdown += `- **Resistance:** ${session.cooldown.resistance}\n`;
      if (session.cooldown.incline)
        markdown += `- **Incline:** ${session.cooldown.incline}\n`;
      if (session.cooldown.avgHeartRate)
        markdown += `- **Average Heart Rate:** ${session.cooldown.avgHeartRate} bpm\n`;
      markdown += "\n";
    }

    // Notes
    if (session.notes) {
      markdown += `## 📝 Notes\n\n${session.notes}\n\n`;
    }

    return markdown;
  }

  // ========================================================================
  // AI ANALYSIS
  // ========================================================================

  async analyzeWorkouts(view: MarkdownView) {
    if (!this.settings.claudeApiKey) {
      new Notice("Please set your Claude API key in settings");
      return;
    }

    const workouts = await this.getAllWorkouts();

    if (workouts.length === 0) {
      new Notice("No workouts found to analyze");
      return;
    }

    new Notice("Analyzing workouts with AI...");

    try {
      const analysis = await this.getAIAnalysis(workouts);

      // Insert analysis into current note
      const editor = view.editor;
      const cursor = editor.getCursor();
      editor.replaceRange(`\n\n## 🤖 AI Analysis\n\n${analysis}\n\n`, cursor);

      new Notice("Analysis complete!");
    } catch (error) {
      console.warn("AI analysis failed:", error);
      new Notice("Failed to analyze workouts - check API key and connection");
    }
  }

  async getAllWorkouts(): Promise<string[]> {
    const folder = this.settings.workoutsFolder;
    const files = this.app.vault
      .getMarkdownFiles()
      .filter((file) => file.path.startsWith(folder));

    const workouts: string[] = [];
    for (const file of files) {
      const content = await this.app.vault.read(file);
      workouts.push(content);
    }

    return workouts;
  }

  async getAIAnalysis(workouts: string[]): Promise<string> {
    const anthropic = new Anthropic({
      apiKey: this.settings.claudeApiKey,
      dangerouslyAllowBrowser: true, // For Obsidian plugin
    });

    const workoutData = workouts.slice(-30).join("\n\n---\n\n"); // Last 30 workouts

    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `You are a fitness and workout expert. Analyze the following workout data and provide:

1. **Progress in weights and repetitions** - which exercises are improving, which have plateaued
2. **Program recommendations** - what needs to be changed, added, or removed
3. **Recovery analysis** - is there enough rest, are there signs of overtraining
4. **Imbalance identification** - which muscle groups are lagging
5. **Specific advice** - what to focus on in the next workout

Workout data:

${workoutData}

Please provide a detailed but structured analysis in English.`,
        },
      ],
    });

    return message.content[0].type === "text"
      ? message.content[0].text
      : "Analysis failed";
  }
}

// ============================================================================
// WORKOUT MODAL
// ============================================================================

class WorkoutModal extends Modal {
  plugin: WorkoutAIPlugin;
  selectedTemplate: WorkoutTemplate | null = null;

  constructor(app: App, plugin: WorkoutAIPlugin) {
    super(app);
    this.plugin = plugin;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("workout-modal");

    new Setting(contentEl).setHeading().setName("New workout");
    contentEl.createEl("p", { text: "Select a workout program" });

    // Get all templates
    const templates = this.plugin.templateManager.getAllTemplates();

    // Display templates as cards
    const templatesContainer = contentEl.createDiv("templates-container");

    templates.forEach((template) => {
      const templateCard = templatesContainer.createDiv("template-card");

      templateCard.createEl("div", {
        text: template.name,
        cls: "template-card-title",
      });

      if (template.description) {
        templateCard.createEl("p", {
          text: template.description,
          cls: "template-description",
        });
      }

      // Template details
      const details = templateCard.createDiv("template-details");
      details.createEl("span", {
        text: `⏱️ ${template.estimatedDuration} min`,
      });
      details.createEl("span", {
        text: `💪 ${template.exercises.length} exercises`,
      });

      if (template.tags) {
        const tags = templateCard.createDiv("template-tags");
        template.tags.forEach((tag) => {
          tags.createEl("span", { text: tag, cls: "template-tag" });
        });
      }

      // Start button
      const startBtn = templateCard.createEl("button", {
        text: "Start workout",
        cls: "mod-cta",
      });

      startBtn.addEventListener("click", () => {
        this.startFromTemplate(template);
      });

      templateCard.addEventListener("click", (e) => {
        if (e.target !== startBtn) {
          this.selectedTemplate = template;
          // Highlight selected
          templatesContainer
            .querySelectorAll(".template-card")
            .forEach((card) => {
              card.removeClass("selected");
            });
          templateCard.addClass("selected");
        }
      });
    });

    // Custom workout option
    contentEl.createEl("hr");

    new Setting(contentEl)
      .setName("Or create a custom workout")
      .addButton((btn) =>
        btn.setButtonText("Create empty workout").onClick(() => {
          this.startCustomWorkout();
        })
      );
  }

  startFromTemplate(template: WorkoutTemplate) {
    const session: WorkoutSession = {
      date: (
        window as unknown as {
          moment: () => { format: (format: string) => string };
        }
      )
        .moment()
        .format("YYYY-MM-DD"),
      program: template.name,
      warmup: template.warmup,
      exercises: [],
      cooldown: template.cooldown,
      duration: 0,
      totalSets: 0,
      totalVolume: 0,
    };

    new Notice(`Workout started: ${template.name}`);
    this.close();

    // Open exercise tracking with template pre-loaded
    new ExerciseTrackingModal(this.app, this.plugin, session, template).open();
  }

  startCustomWorkout() {
    const session: WorkoutSession = {
      date: (
        window as unknown as {
          moment: () => { format: (format: string) => string };
        }
      )
        .moment()
        .format("YYYY-MM-DD"),
      program: "Custom workout",
      exercises: [],
      duration: 0,
      totalSets: 0,
      totalVolume: 0,
    };

    this.close();
    new ExerciseTrackingModal(this.app, this.plugin, session, null).open();
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

// ============================================================================
// EXERCISE TRACKING MODAL
// ============================================================================

class ExerciseTrackingModal extends Modal {
  plugin: WorkoutAIPlugin;
  session: WorkoutSession;
  template: WorkoutTemplate | null;
  expandedExercises: Set<string> = new Set();

  constructor(
    app: App,
    plugin: WorkoutAIPlugin,
    session: WorkoutSession,
    template: WorkoutTemplate | null
  ) {
    super(app);
    this.plugin = plugin;
    this.session = session;
    this.template = template;
  }

  onOpen() {
    this.renderContent();
  }

  renderContent() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("workout-tracking-modal");

    // Header
    const header = contentEl.createDiv("workout-header");
    header.createEl("div", {
      text: this.session.program,
      cls: "workout-session-title",
    });

    // Summary stats
    const stats = contentEl.createDiv("workout-stats");
    stats.createEl("span", {
      text: `Sets: ${this.session.totalSets}`,
      cls: "stat-item",
    });
    stats.createEl("span", {
      text: `Volume: ${this.session.totalVolume} kg`,
      cls: "stat-item",
    });

    // Exercise list
    const exerciseList = contentEl.createDiv("exercise-list-container");

    if (this.template) {
      this.template.exercises.forEach((exerciseTemplate, index) => {
        this.renderExerciseBlock(exerciseList, exerciseTemplate, index);
      });
    } else {
      // Custom workout - allow adding exercises manually
      const addExerciseBtn = exerciseList.createEl("button", {
        text: "Add exercise",
        cls: "add-exercise-btn",
      });
      addExerciseBtn.addEventListener("click", () => {
        // Add custom exercise
        new Notice("Add custom exercise feature is under development");
      });
    }

    // Finish button
    const finishBtn = contentEl.createEl("button", {
      text: "Finish workout",
      cls: "finish-workout-btn",
    });
    finishBtn.addEventListener("click", () => {
      void this.finishWorkout();
    });
  }

  renderExerciseBlock(
    container: HTMLElement,
    exerciseTemplate: ExerciseTemplate,
    index: number
  ) {
    const block = container.createDiv("exercise-block");
    const isExpanded = this.expandedExercises.has(exerciseTemplate.name);

    // Exercise header
    const headerRow = block.createDiv("exercise-header-row");
    headerRow.addEventListener("click", () => {
      if (isExpanded) {
        this.expandedExercises.delete(exerciseTemplate.name);
      } else {
        this.expandedExercises.add(exerciseTemplate.name);
      }
      this.renderContent();
    });

    headerRow.createEl("span", {
      text: isExpanded ? "▼" : "▶",
      cls: "expand-icon",
    });

    const title = headerRow.createDiv("exercise-title");
    title.createEl("span", {
      text: `${index + 1}. ${exerciseTemplate.name}`,
      cls: "exercise-name",
    });

    title.createEl("span", {
      text: `${exerciseTemplate.sets}×${exerciseTemplate.repsMin}-${exerciseTemplate.repsMax} • ${exerciseTemplate.restSeconds}s`,
      cls: "exercise-info-inline",
    });

    // Progress indicator
    const completedSets =
      this.session.exercises.find((e) => e.name === exerciseTemplate.name)?.sets
        .length || 0;
    headerRow.createEl("span", {
      text: `${completedSets}/${exerciseTemplate.sets}`,
      cls:
        completedSets >= exerciseTemplate.sets
          ? "exercise-progress-complete"
          : "exercise-progress",
    });

    // Exercise body (collapsible)
    if (isExpanded) {
      const body = block.createDiv("exercise-body");

      // Show exercise notes if any
      if (exerciseTemplate.notes) {
        body.createEl("div", {
          text: `💡 ${exerciseTemplate.notes}`,
          cls: "exercise-notes-inline",
        });
      }

      // Completed sets table
      const completedExercise = this.session.exercises.find(
        (e) => e.name === exerciseTemplate.name
      );
      if (completedExercise && completedExercise.sets.length > 0) {
        const setsTable = body.createDiv("sets-table");

        completedExercise.sets.forEach((set) => {
          const row = setsTable.createDiv("set-row-inline");
          row.createEl("span", { text: `#${set.setNumber}`, cls: "set-num" });
          row.createEl("span", { text: `${set.weight} кг`, cls: "set-weight" });
          row.createEl("span", { text: `× ${set.reps}`, cls: "set-reps" });
          if (set.rpe) {
            row.createEl("span", { text: `RPE ${set.rpe}`, cls: "set-rpe" });
          }
        });
      }

      // Add set form
      const form = body.createDiv("add-set-form");

      const inputs = form.createDiv("form-inputs");

      const weightInput = inputs.createEl("input", {
        type: "number",
        placeholder: "Weight (kg)",
        cls: "set-input",
      });
      if (exerciseTemplate.targetWeight) {
        weightInput.value = String(exerciseTemplate.targetWeight);
      }

      const repsInput = inputs.createEl("input", {
        type: "number",
        placeholder: "Reps",
        cls: "set-input",
      });
      repsInput.placeholder = String(exerciseTemplate.repsMin);

      const rpeInput = inputs.createEl("input", {
        type: "number",
        placeholder: "RPE",
        cls: "set-input-small",
      });

      const addBtn = form.createEl("button", {
        text: "Add set",
        cls: "add-set-btn",
      });

      addBtn.addEventListener("click", () => {
        const weight = parseFloat(weightInput.value);
        const reps = parseInt(repsInput.value);
        const rpe = rpeInput.value ? parseInt(rpeInput.value) : undefined;

        if (!weight || !reps) {
          new Notice("Please enter weight and reps");
          return;
        }

        this.addSet(
          exerciseTemplate.name,
          weight,
          reps,
          rpe,
          undefined,
          exerciseTemplate.restSeconds
        );

        // Clear inputs
        weightInput.value = exerciseTemplate.targetWeight
          ? String(exerciseTemplate.targetWeight)
          : "";
        repsInput.value = "";
        rpeInput.value = "";

        // Refresh
        this.renderContent();
      });
    }
  }

  addSet(
    exerciseName: string,
    weight: number,
    reps: number,
    rpe?: number,
    heartRate?: number,
    restTime?: number
  ) {
    let exercise = this.session.exercises.find((e) => e.name === exerciseName);

    if (!exercise) {
      exercise = {
        name: exerciseName,
        sets: [],
      };
      this.session.exercises.push(exercise);
    }

    const finalRestTime = restTime || this.plugin.settings.defaultRestTime;

    exercise.sets.push({
      setNumber: exercise.sets.length + 1,
      weight,
      reps,
      rpe: rpe || undefined,
      heartRate: heartRate || undefined,
      restTime: finalRestTime,
      completed: true,
    });

    this.session.totalSets++;
    this.session.totalVolume += weight * reps;

    new Notice(`✅ ${exerciseName}: ${weight}кг × ${reps}`);
  }

  async finishWorkout() {
    this.session.duration = 45; // Would calculate actual duration
    await this.plugin.createWorkoutFile(this.session);
    this.close();
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

// ============================================================================
// QUICK EXERCISE MODAL
// ============================================================================

class QuickExerciseModal extends Modal {
  plugin: WorkoutAIPlugin;

  constructor(app: App, plugin: WorkoutAIPlugin) {
    super(app);
    this.plugin = plugin;
  }

  onOpen() {
    const { contentEl } = this;
    new Setting(contentEl).setHeading().setName("Quick add");
    // Implementation for quick exercise addition
    contentEl.createEl("p", {
      text: "Quickly add an exercise to today's workout",
    });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

// ============================================================================
// REST TIMER MODAL
// ============================================================================

class RestTimerModal extends Modal {
  seconds: number;
  interval: number | null = null;
  onFinish: () => void;

  constructor(app: App, seconds: number, onFinish: () => void) {
    super(app);
    this.seconds = seconds;
    this.onFinish = onFinish;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.addClass("rest-timer-modal");

    const timerDisplay = contentEl.createEl("div", {
      cls: "timer-display",
      text: this.formatTime(this.seconds),
    });

    this.interval = window.setInterval(() => {
      this.seconds--;
      timerDisplay.setText(this.formatTime(this.seconds));

      if (this.seconds <= 0) {
        // eslint-disable-next-line obsidianmd/ui/sentence-case -- Already in correct sentence case format
        new Notice("Rest time is over!");
        this.close();
      }
    }, 1000);

    new Setting(contentEl).addButton((btn) =>
      btn.setButtonText("Skip").onClick(() => this.close())
    );
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  onClose() {
    if (this.interval) {
      clearInterval(this.interval);
    }
    this.onFinish();
    const { contentEl } = this;
    contentEl.empty();
  }
}

// ============================================================================
// TEMPLATE EDITOR MODAL
// ============================================================================

class TemplateEditorModal extends Modal {
  plugin: WorkoutAIPlugin;
  template: WorkoutTemplate;
  editableTemplate: WorkoutTemplate;

  constructor(app: App, plugin: WorkoutAIPlugin, template: WorkoutTemplate) {
    super(app);
    this.plugin = plugin;
    this.template = template;
    // Create a deep copy for editing
    this.editableTemplate = JSON.parse(JSON.stringify(template));
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("template-editor-modal");

    new Setting(contentEl).setHeading().setName("Edit template");

    // Basic info section
    const basicSection = contentEl.createDiv("editor-section");
    new Setting(basicSection).setHeading().setName("Basic information");
    new Setting(basicSection).setName("Name").addText((text) =>
      text.setValue(this.editableTemplate.name).onChange((value) => {
        this.editableTemplate.name = value;
      })
    );

    new Setting(basicSection).setName("Description").addTextArea((text) =>
      text
        .setValue(this.editableTemplate.description || "")
        .setPlaceholder("Workout program description")
        .onChange((value) => {
          this.editableTemplate.description = value;
        })
    );

    new Setting(basicSection)
      .setName("Estimated duration (minutes)")
      .addText((text) =>
        text
          .setValue(String(this.editableTemplate.estimatedDuration))
          .onChange((value) => {
            this.editableTemplate.estimatedDuration = parseInt(value) || 0;
          })
      );

    new Setting(basicSection)
      .setName("Tags")
      .setDesc("Comma separated")
      .addText((text) =>
        text
          .setValue(this.editableTemplate.tags?.join(", ") || "")
          .setPlaceholder("Strength, mass, legs")
          .onChange((value) => {
            this.editableTemplate.tags = value
              .split(",")
              .map((t) => t.trim())
              .filter((t) => t);
          })
      );

    // Exercises section
    const exercisesSection = contentEl.createDiv("editor-section");
    new Setting(exercisesSection).setHeading().setName("Exercises");

    const exercisesList = exercisesSection.createDiv("exercises-list");
    this.renderExercises(exercisesList);

    // Add exercise button
    new Setting(exercisesSection).addButton((btn) =>
      btn.setButtonText("Add exercise").onClick(() => {
        this.editableTemplate.exercises.push({
          name: "New exercise",
          sets: 3,
          repsMin: 8,
          repsMax: 12,
          restSeconds: 90,
          notes: "",
        });
        this.renderExercises(exercisesList);
      })
    );

    // Warmup/Cooldown section
    const cardioSection = contentEl.createDiv("editor-section");
    new Setting(cardioSection).setHeading().setName("Warmup and cooldown");

    const warmupEnabled = this.editableTemplate.warmup !== undefined;
    new Setting(cardioSection).setName("Warmup").addToggle((toggle) =>
      toggle.setValue(warmupEnabled).onChange((enabled) => {
        if (enabled && !this.editableTemplate.warmup) {
          this.editableTemplate.warmup = {
            type: "Elliptical",
            duration: 10,
            resistance: 7,
            incline: 8,
          };
        } else if (!enabled) {
          this.editableTemplate.warmup = undefined;
        }
        this.onOpen(); // Refresh
      })
    );

    if (this.editableTemplate.warmup) {
      new Setting(cardioSection)
        .setName("Warmup type")
        .addDropdown((dropdown) =>
          dropdown
            // Cardio equipment
            .addOption("Elliptical", "Elliptical")
            .addOption("Treadmill", "Treadmill")
            .addOption("Rowing", "Rowing machine")
            .addOption("Bike", "Stationary bike")
            .addOption("Stairmaster", "Stairmaster")
            // Light cardio
            .addOption("Walk", "Walking")
            .addOption("Jog", "Light jog")
            .addOption("Jump rope", "Jump rope")
            .addOption("Swimming", "Swimming")
            // Mobility & flexibility
            .addOption("Dynamic stretching", "Dynamic stretching")
            .addOption("Joint mobility", "Joint mobility")
            .addOption("Activation exercises", "Activation exercises")
            .addOption("Band work", "Resistance band work")
            // Recovery
            .addOption("Foam rolling", "Foam rolling")
            .addOption("Massage gun", "Massage gun")
            // Sport specific
            .addOption("Shadow boxing", "Shadow boxing")
            .addOption("Sport drills", "Sport-specific drills")
            .addOption("Agility ladder", "Agility ladder")
            // Other
            .addOption("Custom", "Custom")
            .setValue(this.editableTemplate.warmup?.type || "Elliptical")
            .onChange((value) => {
              if (this.editableTemplate.warmup) {
                this.editableTemplate.warmup.type = value;
                this.onOpen(); // Refresh to show/hide fields
              }
            })
        );

      new Setting(cardioSection)
        .setName("Warmup duration (minutes)")
        .addText((text) =>
          text
            .setValue(String(this.editableTemplate.warmup?.duration || 10))
            .onChange((value) => {
              if (this.editableTemplate.warmup) {
                this.editableTemplate.warmup.duration = parseInt(value) || 10;
              }
            })
        );

      // Show resistance/incline only for cardio equipment
      const cardioTypes = [
        "Elliptical",
        "Treadmill",
        "Rowing",
        "Bike",
        "Stairmaster",
      ];
      if (cardioTypes.includes(this.editableTemplate.warmup.type)) {
        new Setting(cardioSection)
          .setName("Resistance level (optional)")
          .addText((text) =>
            text
              .setValue(String(this.editableTemplate.warmup?.resistance || ""))
              .setPlaceholder("1-20")
              .onChange((value) => {
                if (this.editableTemplate.warmup) {
                  const level = parseInt(value);
                  this.editableTemplate.warmup.resistance =
                    level > 0 ? level : undefined;
                }
              })
          );

        new Setting(cardioSection)
          .setName("Incline level (optional)")
          .addText((text) =>
            text
              .setValue(String(this.editableTemplate.warmup?.incline || ""))
              .setPlaceholder("0-15")
              .onChange((value) => {
                if (this.editableTemplate.warmup) {
                  const level = parseInt(value);
                  this.editableTemplate.warmup.incline =
                    level >= 0 ? level : undefined;
                }
              })
          );
      }
    }

    const cooldownEnabled = this.editableTemplate.cooldown !== undefined;
    new Setting(cardioSection).setName("Cooldown").addToggle((toggle) =>
      toggle.setValue(cooldownEnabled).onChange((enabled) => {
        if (enabled && !this.editableTemplate.cooldown) {
          this.editableTemplate.cooldown = {
            type: "Elliptical",
            duration: 10,
            resistance: 7,
            incline: 8,
          };
        } else if (!enabled) {
          this.editableTemplate.cooldown = undefined;
        }
        this.onOpen(); // Refresh
      })
    );

    if (this.editableTemplate.cooldown) {
      new Setting(cardioSection)
        .setName("Cooldown type")
        .addDropdown((dropdown) =>
          dropdown
            // Light cardio
            .addOption("Walk", "Walking")
            .addOption("Jog", "Light jog")
            .addOption("Elliptical", "Elliptical")
            .addOption("Treadmill", "Treadmill")
            .addOption("Rowing", "Rowing machine")
            .addOption("Bike", "Stationary bike")
            .addOption("Swimming", "Swimming")
            // Stretching & flexibility
            .addOption("Static stretching", "Static stretching")
            .addOption("Dynamic stretching", "Dynamic stretching")
            .addOption("Yoga poses", "Yoga poses")
            .addOption("Pilates", "Pilates exercises")
            // Recovery & restoration
            .addOption("Foam rolling", "Foam rolling")
            .addOption("Massage gun", "Massage gun")
            .addOption("Lacrosse ball", "Lacrosse ball work")
            .addOption("Sauna", "Sauna")
            // Breathing & relaxation
            .addOption("Breathing exercises", "Breathing exercises")
            .addOption("Meditation", "Meditation")
            // Other
            .addOption("Custom", "Custom")
            .setValue(this.editableTemplate.cooldown?.type || "Walk")
            .onChange((value) => {
              if (this.editableTemplate.cooldown) {
                this.editableTemplate.cooldown.type = value;
                this.onOpen(); // Refresh to show/hide fields
              }
            })
        );

      new Setting(cardioSection)
        .setName("Cooldown duration (minutes)")
        .addText((text) =>
          text
            .setValue(String(this.editableTemplate.cooldown?.duration || 10))
            .onChange((value) => {
              if (this.editableTemplate.cooldown) {
                this.editableTemplate.cooldown.duration = parseInt(value) || 10;
              }
            })
        );

      // Show resistance/incline only for cardio equipment
      const cardioTypes = [
        "Elliptical",
        "Treadmill",
        "Rowing",
        "Bike",
        "Stairmaster",
      ];
      if (cardioTypes.includes(this.editableTemplate.cooldown.type)) {
        new Setting(cardioSection)
          .setName("Resistance level (optional)")
          .addText((text) =>
            text
              .setValue(
                String(this.editableTemplate.cooldown?.resistance || "")
              )
              .setPlaceholder("1-20")
              .onChange((value) => {
                if (this.editableTemplate.cooldown) {
                  const level = parseInt(value);
                  this.editableTemplate.cooldown.resistance =
                    level > 0 ? level : undefined;
                }
              })
          );

        new Setting(cardioSection)
          .setName("Incline level (optional)")
          .addText((text) =>
            text
              .setValue(String(this.editableTemplate.cooldown?.incline || ""))
              .setPlaceholder("0-15")
              .onChange((value) => {
                if (this.editableTemplate.cooldown) {
                  const level = parseInt(value);
                  this.editableTemplate.cooldown.incline =
                    level >= 0 ? level : undefined;
                }
              })
          );
      }
    }

    // Save/Cancel buttons
    const buttonsDiv = contentEl.createDiv("editor-buttons");

    const saveBtn = buttonsDiv.createEl("button", {
      text: "Save template",
      cls: "mod-cta",
    });
    saveBtn.addEventListener("click", () => {
      void this.saveTemplate();
    });

    const cancelBtn = buttonsDiv.createEl("button", {
      text: "Cancel",
    });
    cancelBtn.addEventListener("click", () => {
      this.close();
    });
  }

  renderExercises(container: HTMLElement) {
    container.empty();

    this.editableTemplate.exercises.forEach((exercise, index) => {
      const exerciseCard = container.createDiv("exercise-editor-card");

      // Exercise header with delete button
      const header = exerciseCard.createDiv("exercise-editor-header");
      header.createEl("span", {
        text: `${index + 1}. ${exercise.name}`,
        cls: "exercise-number",
      });

      const deleteBtn = header.createEl("button", {
        text: "Delete",
        cls: "exercise-delete-btn",
      });
      deleteBtn.addEventListener("click", () => {
        this.editableTemplate.exercises.splice(index, 1);
        this.renderExercises(container);
      });

      // Exercise fields
      new Setting(exerciseCard).setName("Exercise name").addText((text) =>
        text.setValue(exercise.name).onChange((value) => {
          exercise.name = value;
        })
      );

      const setsRepsDiv = exerciseCard.createDiv("sets-reps-row");

      new Setting(setsRepsDiv).setName("Sets").addText((text) =>
        text.setValue(String(exercise.sets)).onChange((value) => {
          exercise.sets = parseInt(value) || 3;
        })
      );

      new Setting(setsRepsDiv).setName("Repetitions (min)").addText((text) =>
        text.setValue(String(exercise.repsMin)).onChange((value) => {
          exercise.repsMin = parseInt(value) || 8;
        })
      );

      new Setting(setsRepsDiv).setName("Repetitions (max)").addText((text) =>
        text.setValue(String(exercise.repsMax)).onChange((value) => {
          exercise.repsMax = parseInt(value) || 12;
        })
      );

      // eslint-disable-next-line obsidianmd/ui/sentence-case -- Already in correct sentence case format
      new Setting(exerciseCard).setName("Rest (seconds)").addText((text) =>
        text.setValue(String(exercise.restSeconds)).onChange((value) => {
          exercise.restSeconds = parseInt(value) || 90;
        })
      );

      new Setting(exerciseCard)
        .setName("Target weight (kg, optional)")
        .addText((text) =>
          text
            .setValue(String(exercise.targetWeight || ""))
            .setPlaceholder("Leave empty or specify weight")
            .onChange((value) => {
              const weight = parseInt(value);
              exercise.targetWeight = weight > 0 ? weight : undefined;
            })
        );

      new Setting(exerciseCard).setName("Notes").addTextArea((text) =>
        text
          .setValue(exercise.notes || "")
          .setPlaceholder("Technique, tips, progression...")
          .onChange((value) => {
            exercise.notes = value;
          })
      );
    });
  }

  async saveTemplate() {
    // Validate
    if (!this.editableTemplate.name.trim()) {
      new Notice("Name cannot be empty");
      return;
    }

    if (this.editableTemplate.exercises.length === 0) {
      new Notice("Please add at least one exercise");
      return;
    }

    // Check if editing existing template
    const existingTemplate = this.plugin.templateManager.getTemplate(
      this.template.id
    );

    if (existingTemplate) {
      // Update existing (works for both default and custom)
      await this.plugin.templateManager.updateTemplate(
        this.template.id,
        this.editableTemplate
      );
      new Notice(`✅ Template saved: ${this.editableTemplate.name}`);
    } else {
      // New template
      await this.plugin.templateManager.addTemplate(this.editableTemplate);
      new Notice(`✅ New template created: ${this.editableTemplate.name}`);
    }

    this.close();
    new TemplateManagementModal(this.app, this.plugin).open();
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

// ============================================================================
// TEMPLATE MANAGEMENT MODAL
// ============================================================================

class TemplateManagementModal extends Modal {
  plugin: WorkoutAIPlugin;

  constructor(app: App, plugin: WorkoutAIPlugin) {
    super(app);
    this.plugin = plugin;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("template-management-modal");

    new Setting(contentEl).setHeading().setName("Template management");

    const templates = this.plugin.templateManager.getAllTemplates();

    // List all templates
    templates.forEach((template) => {
      const templateItem = contentEl.createDiv("template-management-item");

      const header = templateItem.createDiv("template-header");
      header.createEl("div", {
        text: template.name,
        cls: "template-management-title",
      });

      const info = templateItem.createDiv("template-info");
      info.createEl("span", {
        text: `${template.exercises.length} exercises, ${template.estimatedDuration} min`,
      });

      const actions = templateItem.createDiv("template-actions");

      // Edit button
      actions
        .createEl("button", { text: "Edit template" })
        .addEventListener("click", () => {
          this.close();
          new TemplateEditorModal(this.app, this.plugin, template).open();
        });

      // Duplicate button
      actions
        .createEl("button", { text: "Duplicate template" })
        .addEventListener("click", () => {
          void (async () => {
            const duplicate =
              await this.plugin.templateManager.duplicateTemplate(template.id);
            if (duplicate) {
              new Notice(`Template duplicated: ${duplicate.name}`);
              this.onOpen(); // Refresh
            }
          })();
        });

      // Delete/Reset button
      if (!this.plugin.templateManager.isDefaultTemplate(template.id)) {
        // Custom template - can be deleted
        actions
          .createEl("button", { text: "Delete template" })
          .addEventListener("click", () => {
            void (async () => {
              await this.plugin.templateManager.deleteTemplate(template.id);
              new Notice(`Template deleted: ${template.name}`);
              this.onOpen(); // Refresh
            })();
          });
      } else if (this.plugin.templateManager.isModifiedDefault(template.id)) {
        // Modified default template - can be reset
        actions
          .createEl("button", { text: "Reset to default" })
          .addEventListener("click", () => {
            void (async () => {
              await this.plugin.templateManager.resetToDefault(template.id);
              new Notice(`Template reset to default: ${template.name}`);
              this.onOpen(); // Refresh
            })();
          });
      } else {
        // Unmodified default template
        actions.createEl("span", {
          text: "(built-in)",
          cls: "default-template-label",
        });
      }
    });

    // Add new template button
    new Setting(contentEl).addButton((btn) =>
      btn
        .setButtonText("Create new template")
        .setCta()
        .onClick(() => {
          // Create empty template
          const newTemplate: WorkoutTemplate = {
            id: `custom-${Date.now()}`,
            name: "New template",
            description: "",
            exercises: [],
            estimatedDuration: 60,
            tags: [],
          };
          this.close();
          new TemplateEditorModal(this.app, this.plugin, newTemplate).open();
        })
    );
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

// ============================================================================
// SETTINGS TAB
// ============================================================================

class WorkoutAISettingTab extends PluginSettingTab {
  plugin: WorkoutAIPlugin;

  constructor(app: App, plugin: WorkoutAIPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setHeading()
      .setName("Workout AI tracker settings");

    new Setting(containerEl)
      .setName("Claude API key")
      .setDesc("Claude key for analysis")
      .addText((text) =>
        text
          .setPlaceholder("Enter your Claude API key")
          .setValue(this.plugin.settings.claudeApiKey)
          .onChange(async (value) => {
            this.plugin.settings.claudeApiKey = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Workouts folder")
      .setDesc("Folder where workout files will be saved")
      .addText((text) =>
        text
          .setPlaceholder("Workouts")
          .setValue(this.plugin.settings.workoutsFolder)
          .onChange(async (value) => {
            this.plugin.settings.workoutsFolder = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      // eslint-disable-next-line obsidianmd/ui/sentence-case -- Already in correct sentence case format
      .setName("Default rest time")
      // eslint-disable-next-line obsidianmd/ui/sentence-case -- Already in correct sentence case format
      .setDesc("Default rest time between sets (seconds)")
      .addText((text) =>
        text
          .setPlaceholder("90")
          .setValue(String(this.plugin.settings.defaultRestTime))
          .onChange(async (value) => {
            this.plugin.settings.defaultRestTime = parseInt(value) || 90;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Enable notifications")
      // eslint-disable-next-line obsidianmd/ui/sentence-case -- Already in correct sentence case format
      .setDesc("Show notifications for rest timer and workout events")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.enableNotifications)
          .onChange(async (value) => {
            this.plugin.settings.enableNotifications = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
