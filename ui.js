export class UiController {
    callbacks;
    texture;
    compactHud;
    cueBar;
    message;
    collisionSubtitle;
    collisionTitle;
    collisionIcon;
    collisionButtons;
    restartButton;
    collisionMenuButton;
    countdownText;
    scoreText;
    stateText;
    modeText;
    profileText;
    highScoreText;
    titleText;
    menuButton;
    cues = new Map();
    constructor(callbacks) {
        this.callbacks = callbacks;
    }
    attachScene(scene) {
        this.texture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("riverRushUi", true, scene);
        this.createCompactHud();
        this.createCueBar();
        this.createCollisionMessage();
        this.createCountdown();
    }
    showMenu() { }
    toggleMenu() { }
    closeSettings() { }
    render(state) {
        if (!this.texture)
            return;
        const inMenu = state.phase === "menu" || state.phase === "paused";
        this.compactHud.isVisible = !inMenu;
        this.cueBar.isVisible = state.phase === "playing" || state.phase === "crashed";
        this.scoreText.text = `★ ${state.score}`;
        this.stateText.text = this.getPhaseLabel(state);
        this.modeText.text = this.getModeLabel(state.mode);
        this.profileText.text = state.profile;
        this.highScoreText.text = `Best ${state.highScore}`;
        this.applyScaleForMode(state.mode);
        if (this.countdownText) {
            this.countdownText.isVisible = state.phase === "countdown";
            this.countdownText.text = state.countdown > 0.5 ? String(Math.ceil(state.countdown)) : "GO!";
        }
        this.setCue("jump", state.zState === "JUMPING" || state.needsZ);
        this.setCue("duck", state.zState === "DUCKING" || state.needsZ);
        this.setCue("collect", state.hasCollectible);
    }
    showCollision(mode = "keyboard") {
        const isCamera = mode === "camera";
        if (this.collisionIcon) {
            this.collisionIcon.text = isCamera ? "👏" : "💥";
            this.collisionIcon.height = isCamera ? "58px" : "48px";
        }
        if (this.collisionTitle) {
            this.collisionTitle.text = isCamera ? "CLAP TO RESTART" : "RUN OVER";
            this.collisionTitle.fontSize = isCamera ? 52 : 44;
            this.collisionTitle.height = isCamera ? "68px" : "60px";
        }
        if (this.collisionSubtitle) {
            this.collisionSubtitle.text = isCamera
                ? "Stand ready, clap once, then ride again."
                : "Restart the run or return to the main menu.";
            this.collisionSubtitle.fontSize = isCamera ? 24 : 22;
            this.collisionSubtitle.height = isCamera ? "50px" : "46px";
        }
        if (this.collisionButtons) {
            this.collisionButtons.width = isCamera ? "500px" : "480px";
            this.collisionButtons.height = isCamera ? "58px" : "56px";
        }
        if (this.restartButton && this.collisionMenuButton) {
            this.restartButton.width = isCamera ? "235px" : "228px";
            this.collisionMenuButton.width = isCamera ? "235px" : "228px";
            this.restartButton.height = isCamera ? "54px" : "52px";
            this.collisionMenuButton.height = isCamera ? "54px" : "52px";
        }
        if (this.message) {
            this.message.width = isCamera ? "780px" : "640px";
            this.message.height = isCamera ? "340px" : "300px";
            this.message.cornerRadius = isCamera ? 42 : 36;
            this.message.thickness = isCamera ? 4 : 4;
            this.message.background = "rgba(13, 26, 24, 0.94)";
            this.message.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
            this.message.top = "0px";
            this.message.isVisible = true;
        }
    }
    hideMessage() {
        if (this.message)
            this.message.isVisible = false;
    }
    createCompactHud() {
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
        this.titleText = this.makeLabel("River Rush", "140px", 18, "#fae69f", "900");
        row.addControl(this.titleText);
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
        this.menuButton = this.makeButton("☰", () => this.callbacks.togglePauseMenu(), "46px", "#26383a");
        row.addControl(this.menuButton);
    }
    applyScaleForMode(mode) {
        const isCamera = mode === "camera";
        this.compactHud.width = isCamera ? "980px" : "790px";
        this.compactHud.height = isCamera ? "78px" : "58px";
        this.compactHud.cornerRadius = isCamera ? 24 : 18;
        this.titleText.fontSize = isCamera ? 24 : 18;
        this.scoreText.fontSize = isCamera ? 26 : 15;
        this.stateText.fontSize = isCamera ? 22 : 15;
        this.modeText.fontSize = isCamera ? 22 : 15;
        this.profileText.fontSize = isCamera ? 22 : 15;
        this.highScoreText.fontSize = isCamera ? 22 : 15;
        this.menuButton.fontSize = isCamera ? 24 : 16;
        this.menuButton.width = isCamera ? "62px" : "46px";
        this.menuButton.height = isCamera ? "58px" : "44px";
        this.cueBar.width = isCamera ? "540px" : "360px";
        this.cueBar.height = isCamera ? "66px" : "44px";
        this.cueBar.top = isCamera ? "-38px" : "-28px";
        this.cues.forEach((cue) => {
            cue.width = isCamera ? "160px" : "110px";
            cue.height = isCamera ? "56px" : "38px";
            cue.fontSize = isCamera ? 20 : 13;
            cue.cornerRadius = isCamera ? 26 : 18;
        });
    }
    createCueBar() {
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
    createCollisionMessage() {
        this.message = new BABYLON.GUI.Rectangle("collisionMessage");
        this.message.width = "520px";
        this.message.height = "176px";
        this.message.cornerRadius = 28;
        this.message.thickness = 3;
        this.message.color = "rgba(250, 230, 159, 0.58)";
        this.message.background = "rgba(21, 33, 28, 0.92)";
        this.message.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        this.message.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        this.message.top = "-88px";
        this.message.isVisible = false;
        this.texture.addControl(this.message);
        const layout = new BABYLON.GUI.Grid("collisionLayout");
        layout.paddingLeft = "34px";
        layout.paddingRight = "34px";
        layout.paddingTop = "22px";
        layout.paddingBottom = "22px";
        layout.addRowDefinition(0.12);
        layout.addRowDefinition(0.18);
        layout.addRowDefinition(0.23);
        layout.addRowDefinition(0.17);
        layout.addRowDefinition(0.18);
        layout.addRowDefinition(0.12);
        this.message.addControl(layout);
        this.collisionIcon = this.makeLabel("", "100%", 40, "#FEB941", "900", "0px");
        layout.addControl(this.collisionIcon, 1, 0);
        this.collisionTitle = this.makeLabel("Collision", "100%", 34, "#ffb16b", "900", "52px");
        this.collisionTitle.shadowColor = "rgba(0,0,0,0.65)";
        this.collisionTitle.shadowBlur = 6;
        layout.addControl(this.collisionTitle, 2, 0);
        this.collisionSubtitle = this.makeLabel("Restart the run or return to the main menu.", "100%", 20, "#d6d1b0", "700", "42px");
        layout.addControl(this.collisionSubtitle, 3, 0);
        const buttons = new BABYLON.GUI.StackPanel();
        buttons.isVertical = false;
        buttons.width = "440px";
        buttons.height = "52px";
        buttons.spacing = 16;
        buttons.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        buttons.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
        layout.addControl(buttons, 4, 0);
        this.collisionButtons = buttons;
        this.restartButton = this.makeButton("Restart", () => this.callbacks.restart(), "210px", "#FEB941");
        this.collisionMenuButton = this.makeButton("Menu", () => this.callbacks.backToMenu(), "210px", "#334345");
        buttons.addControl(this.restartButton);
        buttons.addControl(this.collisionMenuButton);
    }
    createCountdown() {
        this.countdownText = this.makeLabel("3", "260px", 104, "#FEB941", "900", "160px");
        this.countdownText.shadowColor = "black";
        this.countdownText.shadowBlur = 12;
        this.countdownText.isVisible = false;
        this.texture.addControl(this.countdownText);
    }
    makeLabel(text, width = "100%", size = 14, color = "#f7f2e8", weight = "600", height = "100%") {
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
    makePill(text, width) {
        return this.makeLabel(text, width, 15, "#fae69f", "800");
    }
    makeButton(text, onClick, width = "100%", background = "#334345") {
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
    makeCue(text) {
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
    setCue(name, active) {
        const cue = this.cues.get(name);
        if (!cue)
            return;
        cue.alpha = active ? 1 : 0.36;
        cue.background = active ? "#67e8bd" : "rgba(21,33,28,0.7)";
        cue.color = active ? "#102022" : "#d6d1b0";
    }
    getPhaseLabel(state) {
        if (state.phase === "menu")
            return "Menu";
        if (state.phase === "countdown")
            return "Ready";
        if (state.phase === "paused")
            return "Paused";
        if (state.phase === "crashed")
            return "Crashed";
        return this.getStateLabel(state.mode, state.zState);
    }
    getModeLabel(mode) {
        if (mode === "bot")
            return "Bot";
        if (mode === "camera")
            return "Camera";
        return "Keyboard";
    }
    getStateLabel(mode, zState) {
        if (mode === "bot")
            return "Autopilot";
        if (zState === "NORMAL")
            return "Run";
        return zState === "JUMPING" ? "Jump" : "Duck";
    }
}
