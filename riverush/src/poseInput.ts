declare const BABYLON: any;

type PoseControlState = {
  lean: number;
  jumpIntent: boolean;
  duckIntent: boolean;
  duckHeld: boolean;
  clapIntent: boolean;
  confidence: number;
  active: boolean;
  calibrated: boolean;
  status: string;
};

const VISION_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/vision_bundle.mjs";
const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm";
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task";

export class PoseInputController {
  private video: HTMLVideoElement;
  private stream: MediaStream | null = null;
  private landmarker: any = null;
  private initializing = false;
  private lastVideoTime = -1;
  private leanSmoothed = 0;
  private heightBaseline = 0;
  private neutralCenterX = 0.5;
  private currentBodyCenterX = 0.5;
  private currentBodyHeight = 0;
  private lastBodyCenterY = 0;
  private lastUpdateMs = 0;
  private jumpCooldownMs = 0;
  private clapCooldownMs = 0;

  state: PoseControlState = {
    lean: 0,
    jumpIntent: false,
    duckIntent: false,
    duckHeld: false,
    clapIntent: false,
    confidence: 0,
    active: false,
    calibrated: false,
    status: "Camera off",
  };

  constructor() {
    this.video = document.createElement("video");
    this.video.id = "poseCamera";
    this.video.playsInline = true;
    this.video.muted = true;
    this.video.autoplay = true;
    this.video.style.position = "fixed";
    this.video.style.right = "16px";
    this.video.style.bottom = "16px";
    this.video.style.width = "180px";
    this.video.style.height = "135px";
    this.video.style.objectFit = "cover";
    this.video.style.border = "2px solid rgba(250, 230, 159, 0.55)";
    this.video.style.borderRadius = "18px";
    this.video.style.zIndex = "9";
    this.video.style.transform = "scaleX(-1)";
    this.video.style.display = "none";
    document.body.appendChild(this.video);
  }

  async start() {
    if (this.state.active || this.initializing) return;
    this.initializing = true;
    this.state.status = "Starting camera...";

    try {
      if (!this.landmarker) {
        this.state.status = "Loading pose model...";
        const vision = await import(VISION_URL);
        const fileset = await vision.FilesetResolver.forVisionTasks(WASM_URL);
        this.landmarker = await vision.PoseLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
          runningMode: "VIDEO",
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
      }

      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
        audio: false,
      });
      this.video.srcObject = this.stream;
      await this.video.play();
      this.video.style.display = "block";
      this.state.active = true;
      this.state.status = "Stand ready, then clap";
      this.resetCalibration();
    } catch (error) {
      console.error("PoseInput start failed", error);
      this.state.status = "Camera unavailable";
      this.state.active = false;
    } finally {
      this.initializing = false;
    }
  }

  stop() {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.video.style.display = "none";
    this.state.active = false;
    this.state.lean = 0;
    this.state.jumpIntent = false;
    this.state.duckIntent = false;
    this.state.duckHeld = false;
    this.state.clapIntent = false;
    this.state.confidence = 0;
    this.state.status = "Camera off";
  }

  resetCalibration() {
    this.heightBaseline = 0;
    this.neutralCenterX = 0.5;
    this.currentBodyCenterX = 0.5;
    this.currentBodyHeight = 0;
    this.lastBodyCenterY = 0;
    this.leanSmoothed = 0;
    this.state.calibrated = false;
  }

  calibrateFromCurrentPose() {
    if (this.state.confidence < 0.45 || !this.currentBodyHeight) return false;
    this.neutralCenterX = this.currentBodyCenterX;
    this.heightBaseline = this.currentBodyHeight;
    this.leanSmoothed = 0;
    this.state.lean = 0;
    this.state.calibrated = true;
    this.state.status = "Calibrated";
    return true;
  }

  update() {
    this.state.jumpIntent = false;
    this.state.duckIntent = false;
    this.state.clapIntent = false;
    if (!this.state.active || !this.landmarker || this.video.readyState < 2) return this.state;
    if (this.video.currentTime === this.lastVideoTime) return this.state;

    this.lastVideoTime = this.video.currentTime;
    const now = performance.now();
    const result = this.landmarker.detectForVideo(this.video, now);
    const landmarks = result.landmarks?.[0];
    if (!landmarks) {
      this.state.confidence = 0;
      this.state.duckHeld = false;
      this.state.status = "No pose";
      return this.state;
    }

    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftWrist = landmarks[15];
    const rightWrist = landmarks[16];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    const leftKnee = landmarks[25];
    const rightKnee = landmarks[26];
    if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) return this.state;

    const confidence = Math.min(
      leftShoulder.visibility ?? 1,
      rightShoulder.visibility ?? 1,
      leftHip.visibility ?? 1,
      rightHip.visibility ?? 1,
    );
    this.state.confidence = confidence;
    if (confidence < 0.45) {
      this.state.duckHeld = false;
      this.state.status = "Low confidence";
      return this.state;
    }

    const shoulderCenterX = (leftShoulder.x + rightShoulder.x) * 0.5;
    const hipCenterX = (leftHip.x + rightHip.x) * 0.5;
    const bodyCenterX = (shoulderCenterX + hipCenterX) * 0.5;
    this.currentBodyCenterX = bodyCenterX;

    const shoulderCenterY = (leftShoulder.y + rightShoulder.y) * 0.5;
    const hipCenterY = (leftHip.y + rightHip.y) * 0.5;
    const bodyHeight = Math.abs(hipCenterY - shoulderCenterY);
    this.currentBodyHeight = bodyHeight;

    if (!this.state.calibrated && !this.heightBaseline) this.heightBaseline = bodyHeight;
    if (!this.state.calibrated) {
      this.heightBaseline = BABYLON.Scalar.Lerp(this.heightBaseline, Math.max(bodyHeight, this.heightBaseline * 0.985), 0.025);
      this.neutralCenterX = BABYLON.Scalar.Lerp(this.neutralCenterX, bodyCenterX, 0.02);
    }

    // Mirror the webcam: leaning screen-left should move raft left.
    const rawLean = BABYLON.Scalar.Clamp((this.neutralCenterX - bodyCenterX) * 6.2, -1, 1);
    this.leanSmoothed = BABYLON.Scalar.Lerp(this.leanSmoothed, rawLean, 0.32);
    this.state.lean = this.leanSmoothed;

    const bodyCenterY = (shoulderCenterY + hipCenterY) * 0.5;
    const dt = Math.max(16, now - (this.lastUpdateMs || now));
    const verticalVelocity = (this.lastBodyCenterY ? (this.lastBodyCenterY - bodyCenterY) / dt : 0);
    this.lastBodyCenterY = bodyCenterY;
    this.lastUpdateMs = now;

    const crouchRatio = bodyHeight / Math.max(0.001, this.heightBaseline || bodyHeight);
    const kneesVisible = leftKnee && rightKnee;
    const kneeY = kneesVisible ? (leftKnee.y + rightKnee.y) * 0.5 : hipCenterY + 0.18;
    const kneesHigh = kneeY < hipCenterY + 0.12;
    const duckHeld = this.state.calibrated && (crouchRatio < 0.74 || kneesHigh);
    this.state.duckIntent = duckHeld && !this.state.duckHeld;
    this.state.duckHeld = duckHeld;

    this.jumpCooldownMs = Math.max(0, this.jumpCooldownMs - dt);
    this.clapCooldownMs = Math.max(0, this.clapCooldownMs - dt);

    const armsUp = leftWrist && rightWrist && leftWrist.y < shoulderCenterY - 0.08 && rightWrist.y < shoulderCenterY - 0.08;
    const bodyLift = this.state.calibrated && verticalVelocity > 0.00105 && crouchRatio > 0.72;
    if (this.jumpCooldownMs <= 0 && this.state.calibrated && (bodyLift || armsUp)) {
      this.state.jumpIntent = true;
      this.jumpCooldownMs = 720;
    }

    if (leftWrist && rightWrist) {
      const wristConfidence = Math.min(leftWrist.visibility ?? 1, rightWrist.visibility ?? 1);
      const dx = leftWrist.x - rightWrist.x;
      const dy = leftWrist.y - rightWrist.y;
      const wristDistance = Math.hypot(dx, dy);
      const handsNearTorso = (leftWrist.y + rightWrist.y) * 0.5 > shoulderCenterY - 0.08 && (leftWrist.y + rightWrist.y) * 0.5 < hipCenterY + 0.12;
      if (this.clapCooldownMs <= 0 && wristConfidence > 0.45 && handsNearTorso && wristDistance < 0.13) {
        this.state.clapIntent = true;
        this.clapCooldownMs = 1200;
      }
    }

    this.state.status = this.state.calibrated ? "Tracking" : "Clap to calibrate/start";
    return this.state;
  }
}
