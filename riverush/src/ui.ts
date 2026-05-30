declare const BABYLON: any;

type UiCallbacks = {
  restart: () => void;
  backToMenu: () => void;
  togglePauseMenu: () => void;
};

type UiRenderState = {
  score: number;
  highScore: number;
  profile: string;
  phase: string;
  countdown: number;
  mode: string;
  crashed: boolean;
  zState: string;
  motionLean: number;
  hasCollectible: boolean;
  hasThreat: boolean;
  needsZ: boolean;
  nearBank: boolean;
};

export class UiController {
  private callbacks: UiCallbacks;
  private texture;
  private compactHud;
  private cueBar;
  private message;
  private countdownText;
  private scoreText;
  private stateText;
  private modeText;
  private profileText;
  private highScoreText;
  private cues = new Map<string, any>();

  constructor(callbacks: UiCallbacks) {
    this.callbacks = callbacks;
  }

  attachScene(scene) {
    this.texture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("riverRushUi", true, scene);
    this.createCompactHud();
    this.createCueBar();
    this.createCollisionMessage();
    this.createCountdown();
  }

  showMenu() {}
  toggleMenu() {}
  closeSettings() {}

  render(state: UiRenderState) {
    if (!this.texture) return;

    const inMenu = state.phase === "menu" || state.phase === "paused";
    this.compactHud.isVisible = !inMenu;
    this.cueBar.isVisible = state.phase === "playing" || state.phase === "crashed";

    this.scoreText.text = `★ ${state.score}`;
    this.stateText.text = this.getPhaseLabel(state);
    this.modeText.text = this.getModeLabel(state.mode);
    this.profileText.text = state.profile;
    this.highScoreText.text = `Best ${state.highScore}`;

    if (this.countdownText) {
      this.countdownText.isVisible = state.phase === "countdown";
      this.countdownText.text = state.countdown > 0.5 ? String(Math.ceil(state.countdown)) : "GO!";
    }

    this.setCue("jump", state.zState === "JUMPING" || state.needsZ);
    this.setCue("duck", state.zState === "DUCKING" || state.needsZ);
    this.setCue("collect", state.hasCollectible);
  }

  showCollision() {
    if (this.message) this.message.isVisible = true;
  }

  hideMessage() {
    if (this.message) this.message.isVisible = false;
  }

  private createCompactHud() {
    this.compactHud = new BABYLON.GUI.Rectangle("compactHud");
    this.compactHud.width = "790px";
    this.compactHud.height = "58px";
    this.compactHud.thickness = 0;
    this.compactHud.cornerRadius = 18;
    this.compactHud.background = "rgba(9, 20, 22, 0.66)";
    this.compactHud.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    this.compactHud.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
    this.compactHud.left = "18px";
    this.compactHud.top = "18px";
    this.texture.addControl(this.compactHud);

    const row = new BABYLON.GUI.StackPanel("compactHudRow");
    row.isVertical = false;
    row.paddingLeft = "14px";
    row.paddingRight = "8px";
    row.spacing = 8;
    this.compactHud.addControl(row);

    row.addControl(this.makeLabel("River Rush", "140px", 18, "#fae69f", "900"));
    this.scoreText = this.makePill("★ 0", "82px");
    this.stateText = this.makePill("Menu", "100px");
    this.modeText = this.makePill("Keyboard", "108px");
    this.profileText = this.makePill("Guest", "100px");
    this.highScoreText = this.makePill("Best 0", "95px");
    row.addControl(this.scoreText);
    row.addControl(this.stateText);
    row.addControl(this.modeText);
    row.addControl(this.profileText);
    row.addControl(this.highScoreText);
    row.addControl(this.makeButton("☰", () => this.callbacks.togglePauseMenu(), "46px", "#26383a"));
  }

  private createCueBar() {
    this.cueBar = new BABYLON.GUI.StackPanel("cueBar");
    this.cueBar.isVertical = false;
    this.cueBar.height = "44px";
    this.cueBar.width = "360px";
    this.cueBar.spacing = 8;
    this.cueBar.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.cueBar.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
    this.cueBar.top = "-28px";
    this.texture.addControl(this.cueBar);

    this.cues.set("jump", this.makeCue("Jump"));
    this.cues.set("duck", this.makeCue("Duck"));
    this.cues.set("collect", this.makeCue("Stars"));
    this.cues.forEach((cue) => this.cueBar.addControl(cue));
  }

  private createCollisionMessage() {
    this.message = new BABYLON.GUI.Rectangle("collisionMessage");
    this.message.width = "500px";
    this.message.height = "150px";
    this.message.cornerRadius = 28;
    this.message.thickness = 3;
    this.message.color = "rgba(250, 230, 159, 0.58)";
    this.message.background = "rgba(21, 33, 28, 0.92)";
    this.message.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.message.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
    this.message.top = "-88px";
    this.message.isVisible = false;
    this.texture.addControl(this.message);

    const stack = new BABYLON.GUI.StackPanel();
    stack.paddingTop = "14px";
    stack.paddingLeft = "20px";
    stack.paddingRight = "20px";
    stack.spacing = 8;
    this.message.addControl(stack);
    stack.addControl(this.makeLabel("Collision", "100%", 26, "#ffb16b", "900", "34px"));
    stack.addControl(this.makeLabel("Restart the run or return to the main menu.", "100%", 14, "#d6d1b0", "700", "24px"));
    const buttons = new BABYLON.GUI.StackPanel();
    buttons.isVertical = false;
    buttons.height = "44px";
    buttons.spacing = 10;
    stack.addControl(buttons);
    buttons.addControl(this.makeButton("Restart", () => this.callbacks.restart(), "220px", "#FEB941"));
    buttons.addControl(this.makeButton("Menu", () => this.callbacks.backToMenu(), "220px", "#334345"));
  }

  private createCountdown() {
    this.countdownText = this.makeLabel("3", "260px", 104, "#FEB941", "900", "160px");
    this.countdownText.shadowColor = "black";
    this.countdownText.shadowBlur = 12;
    this.countdownText.isVisible = false;
    this.texture.addControl(this.countdownText);
  }

  private makeLabel(text: string, width = "100%", size = 14, color = "#f7f2e8", weight = "600", height = "100%") {
    const label = new BABYLON.GUI.TextBlock();
    label.text = text;
    label.width = width;
    label.height = height;
    label.color = color;
    label.fontSize = size;
    label.fontWeight = weight;
    label.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    return label;
  }

  private makePill(text: string, width: string) {
    return this.makeLabel(text, width, 15, "#fae69f", "800");
  }

  private makeButton(text: string, onClick: () => void, width = "100%", background = "#334345") {
    const button = BABYLON.GUI.Button.CreateSimpleButton(text, text);
    button.width = width;
    button.height = "44px";
    button.cornerRadius = 16;
    button.thickness = 2;
    button.color = "#fae69f";
    button.background = background;
    button.fontSize = 16;
    button.fontWeight = "900";
    button.onPointerClickObservable.add(onClick);
    return button;
  }

  private makeCue(text: string) {
    const cue = BABYLON.GUI.Button.CreateSimpleButton(`${text}Cue`, text);
    cue.width = "110px";
    cue.height = "38px";
    cue.cornerRadius = 18;
    cue.thickness = 2;
    cue.color = "#d6d1b0";
    cue.background = "rgba(21,33,28,0.7)";
    cue.fontSize = 13;
    cue.fontWeight = "900";
    cue.alpha = 0.45;
    return cue;
  }

  private setCue(name: string, active: boolean) {
    const cue = this.cues.get(name);
    if (!cue) return;
    cue.alpha = active ? 1 : 0.36;
    cue.background = active ? "#67e8bd" : "rgba(21,33,28,0.7)";
    cue.color = active ? "#102022" : "#d6d1b0";
  }

  private getPhaseLabel(state: UiRenderState) {
    if (state.phase === "menu") return "Menu";
    if (state.phase === "countdown") return "Ready";
    if (state.phase === "paused") return "Paused";
    if (state.phase === "crashed") return "Crashed";
    return this.getStateLabel(state.mode, state.zState);
  }

  private getModeLabel(mode: string) {
    if (mode === "bot") return "Bot";
    if (mode === "motion") return "Motion";
    if (mode === "camera") return "Camera";
    return "Keyboard";
  }

  private getStateLabel(mode: string, zState: string) {
    if (mode === "bot") return "Autopilot";
    if (mode === "motion" && zState === "NORMAL") return "Lean";
    if (zState === "NORMAL") return "Run";
    return zState === "JUMPING" ? "Jump" : "Duck";
  }
}
