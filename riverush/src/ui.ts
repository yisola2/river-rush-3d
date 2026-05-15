type UiCallbacks = {
  setMode: (mode: string) => void;
  restart: () => void;
};

type UiRenderState = {
  score: number;
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
  hud = document.querySelector(".hud");
  score = document.getElementById("score");
  state = document.getElementById("state");
  message = document.getElementById("message");
  buttons = [...document.querySelectorAll<HTMLButtonElement>(".mode-button")];
  restartButton = document.getElementById("restartButton");
  settingsToggle = document.getElementById("settingsToggle");
  leanMarker = document.getElementById("leanMarker");
  cues = {
    jump: document.getElementById("jumpCue"),
    duck: document.getElementById("duckCue"),
    collect: document.getElementById("collectCue"),
  };
  tags = {
    seek: document.getElementById("seekTag"),
    arrive: document.getElementById("arriveTag"),
    flee: document.getElementById("fleeTag"),
    avoid: document.getElementById("avoidTag"),
    wander: document.getElementById("wanderTag"),
  };

  constructor(callbacks: UiCallbacks) {
    this.buttons.forEach((button) => {
      button.addEventListener("click", () => callbacks.setMode(button.dataset.mode));
    });
    this.restartButton.addEventListener("click", callbacks.restart);
    this.settingsToggle.addEventListener("click", () => this.toggleSettings());
  }

  render(state: UiRenderState) {
    this.score.textContent = String(state.score);
    if (!state.crashed) {
      this.state.textContent = this.getStateLabel(state.mode, state.zState);
    }

    this.buttons.forEach((button) => {
      button.classList.toggle("active", button.dataset.mode === state.mode);
    });

    this.leanMarker.style.left = `${50 + state.motionLean * 46}%`;
    this.cues.jump.classList.toggle("active", state.zState === "JUMPING");
    this.cues.duck.classList.toggle("active", state.zState === "DUCKING");
    this.cues.collect.classList.toggle("active", state.hasCollectible);

    this.tags.seek.classList.toggle("active", state.mode === "bot" || state.mode === "motion");
    this.tags.arrive.classList.toggle("active", state.needsZ || state.zState !== "NORMAL");
    this.tags.flee.classList.toggle("danger", state.nearBank);
    this.tags.avoid.classList.toggle("active", state.mode === "bot" && state.hasThreat);
    this.tags.wander.classList.toggle("active", state.mode === "bot" || state.mode === "motion");
  }

  showCollision() {
    this.message.classList.remove("hidden");
    this.state.textContent = "Crashed";
  }

  hideMessage() {
    this.message.classList.add("hidden");
  }

  closeSettings() {
    this.setSettingsCollapsed(true);
  }

  private getStateLabel(mode: string, zState: string) {
    if (mode === "bot") return "Autopilot";
    if (mode === "motion" && zState === "NORMAL") return "Lean";
    if (zState === "NORMAL") return "Run";
    return zState === "JUMPING" ? "Jump" : "Duck";
  }

  private toggleSettings() {
    const collapsed = !this.hud.classList.contains("collapsed");
    this.setSettingsCollapsed(collapsed);
  }

  private setSettingsCollapsed(collapsed: boolean) {
    this.hud.classList.toggle("collapsed", collapsed);
    this.settingsToggle.textContent = collapsed ? "⚙" : "☰";
    this.settingsToggle.setAttribute("aria-label", collapsed ? "Afficher les reglages" : "Masquer les reglages");
    this.settingsToggle.title = collapsed ? "Afficher les reglages" : "Masquer les reglages";
  }
}
