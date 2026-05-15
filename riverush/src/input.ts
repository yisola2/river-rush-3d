declare const BABYLON: any;

type InputCallbacks = {
  getMode: () => string;
  setMode: (mode: string) => void;
  restart: () => void;
  jump: () => void;
  duck: () => void;
  toggleHitboxes: () => void;
};

export class InputController {
  keys = new Set<string>();
  keyCodes = new Set<string>();
  motionLean = 0;
  pointer = {
    active: false,
    y: 0,
    lastY: 0,
    lastTime: 0,
  };

  constructor(private callbacks: InputCallbacks) {
    window.addEventListener("keydown", (event) => this.handleKeyDown(event));
    window.addEventListener("keyup", (event) => this.handleKeyUp(event));
    window.addEventListener("pointerdown", (event) => this.handlePointerDown(event));
    window.addEventListener("pointermove", (event) => this.handlePointerMove(event));
    window.addEventListener("pointerup", () => {
      this.pointer.active = false;
    });
  }

  isLeanLeftPressed() {
    return this.keys.has("arrowleft") || this.keys.has("q") || this.keys.has("a") || this.keyCodes.has("KeyA") || this.keyCodes.has("KeyQ");
  }

  isLeanRightPressed() {
    return this.keys.has("arrowright") || this.keys.has("d") || this.keyCodes.has("KeyD");
  }

  resetMotion() {
    this.motionLean = 0;
  }

  private handleKeyDown(event: KeyboardEvent) {
    this.keys.add(event.key.toLowerCase());
    this.keyCodes.add(event.code);

    if (["ArrowLeft", "ArrowRight", "ArrowDown", " "].includes(event.key) || ["KeyA", "KeyD", "KeyQ", "KeyS", "KeyW", "KeyZ"].includes(event.code)) {
      event.preventDefault();
    }

    const key = event.key.toLowerCase();
    if (key === "m") this.callbacks.setMode(this.callbacks.getMode() === "motion" ? "keyboard" : "motion");
    if (key === "b") this.callbacks.setMode(this.callbacks.getMode() === "bot" ? "keyboard" : "bot");
    if (key === "r") this.callbacks.restart();
    if (key === "h") this.callbacks.toggleHitboxes();
    if (this.isJumpKey(event)) this.callbacks.jump();
    if (this.isDuckKey(event)) this.callbacks.duck();
  }

  private handleKeyUp(event: KeyboardEvent) {
    this.keys.delete(event.key.toLowerCase());
    this.keyCodes.delete(event.code);
  }

  private handlePointerDown(event: PointerEvent) {
    if ((event.target as HTMLElement).closest(".hud, .message")) return;

    this.pointer.active = true;
    this.pointer.lastY = event.clientY;
    this.pointer.y = event.clientY;
    this.pointer.lastTime = performance.now();
    this.updateMotionLean(event.clientX);
    if (this.callbacks.getMode() === "keyboard") this.callbacks.setMode("motion");
  }

  private handlePointerMove(event: PointerEvent) {
    this.updateMotionLean(event.clientX);
    const now = performance.now();
    const dy = event.clientY - this.pointer.lastY;
    const elapsed = Math.max(16, now - this.pointer.lastTime);
    const velocityY = dy / elapsed;

    if (this.callbacks.getMode() === "motion" && this.pointer.active) {
      if (velocityY < -0.9) this.callbacks.jump();
      if (velocityY > 0.9) this.callbacks.duck();
    }

    this.pointer.y = event.clientY;
    this.pointer.lastY = event.clientY;
    this.pointer.lastTime = now;
  }

  private updateMotionLean(clientX: number) {
    const normalized = clientX / Math.max(1, window.innerWidth);
    this.motionLean = BABYLON.Scalar.Clamp((normalized - 0.5) * 2.25, -1, 1);
  }

  private isJumpKey(event: KeyboardEvent) {
    const key = event.key.toLowerCase();
    return event.key === " " || key === "z" || key === "w" || event.code === "Space" || event.code === "KeyW" || event.code === "KeyZ";
  }

  private isDuckKey(event: KeyboardEvent) {
    return event.key.toLowerCase() === "s" || event.key === "ArrowDown" || event.code === "KeyS";
  }
}
