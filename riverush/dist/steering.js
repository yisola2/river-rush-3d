import { OBSTACLE_TYPES } from "./constants.js";
export class Vehicle {
    position;
    velocity;
    acceleration;
    maxSpeed;
    maxForce;
    config;
    behaviors;
    constructor(config, x, z, maxSpeed = 7.6, maxForce = 22) {
        this.config = config;
        this.position = new BABYLON.Vector3(x, 0, z);
        this.velocity = BABYLON.Vector3.Zero();
        this.acceleration = BABYLON.Vector3.Zero();
        this.maxSpeed = maxSpeed;
        this.maxForce = maxForce;
        this.behaviors = new BehaviorManager(this);
    }
    sync(x, velocityX) {
        this.position.x = x;
        this.position.z = this.config.raftZ;
        this.velocity.x = velocityX;
        this.velocity.z = 0;
        this.acceleration.set(0, 0, 0);
    }
    applyForce(force, weight = 1) {
        this.acceleration.addInPlace(this.limit(force, this.maxForce).scale(weight));
    }
    seek(target) {
        const desired = target.subtract(this.position);
        if (desired.lengthSquared() === 0)
            return BABYLON.Vector3.Zero();
        desired.normalize().scaleInPlace(this.maxSpeed);
        return this.limit(desired.subtract(this.velocity), this.maxForce);
    }
    flee(target, panicRadius = 2.2) {
        const desired = this.position.subtract(target);
        const distance = desired.length();
        if (distance === 0 || distance > panicRadius)
            return BABYLON.Vector3.Zero();
        desired.normalize().scaleInPlace(this.maxSpeed);
        return this.limit(desired.subtract(this.velocity), this.maxForce).scale(1 - distance / panicRadius);
    }
    arrive(target, slowRadius = 3.6) {
        const desired = target.subtract(this.position);
        const distance = desired.length();
        if (distance === 0)
            return BABYLON.Vector3.Zero();
        const speed = distance < slowRadius ? this.maxSpeed * (distance / slowRadius) : this.maxSpeed;
        desired.normalize().scaleInPlace(speed);
        return this.limit(desired.subtract(this.velocity), this.maxForce);
    }
    avoidObstacles(obstaclesToAvoid) {
        // Inspired by the p5 steering project: project hazards into the vehicle's
        // local forward corridor, pick the closest collision candidate, then steer
        // laterally away with urgency based on time/distance to impact.
        let closest = null;
        let closestForward = Infinity;
        const lookAhead = this.config.sensorRange * BABYLON.Scalar.Clamp(0.72 + Math.abs(this.velocity.x) * 0.04, 0.72, 1.08);
        for (const obstacle of obstaclesToAvoid) {
            if (obstacle.type === OBSTACLE_TYPES.STAR || obstacle.scored)
                continue;
            const forward = obstacle.z - this.config.raftZ;
            if (forward < 0 || forward > lookAhead)
                continue;
            const corridor = obstacle.type === OBSTACLE_TYPES.JUMP_GATE
                ? this.config.riverHalfWidth
                : obstacle.radius + this.config.playerRadius + 0.42;
            const lateral = obstacle.x - this.position.x;
            if (Math.abs(lateral) > corridor)
                continue;
            if (forward < closestForward) {
                closestForward = forward;
                closest = { obstacle, forward, lateral, corridor };
            }
        }
        if (!closest)
            return BABYLON.Vector3.Zero();
        const progress = closest.forward / lookAhead;
        const urgency = BABYLON.Scalar.Clamp(1.18 - progress, 0, 1.18);
        const sideBias = closest.lateral === 0 ? (this.position.x <= 0 ? -1 : 1) : -Math.sign(closest.lateral);
        const clearanceDeficit = BABYLON.Scalar.Clamp((closest.corridor - Math.abs(closest.lateral)) / Math.max(0.001, closest.corridor), 0, 1);
        const steer = new BABYLON.Vector3(sideBias * this.maxForce * urgency * (0.55 + clearanceDeficit), 0, 0);
        return this.limit(steer, this.maxForce);
    }
    bankGuard() {
        const leftBankTarget = new BABYLON.Vector3(-this.config.riverHalfWidth, 0, this.config.raftZ);
        const rightBankTarget = new BABYLON.Vector3(this.config.riverHalfWidth, 0, this.config.raftZ);
        return this.flee(leftBankTarget, 1.75).add(this.flee(rightBankTarget, 1.75));
    }
    laneArrive(targetLane) {
        return this.arrive(new BABYLON.Vector3(targetLane, 0, this.config.raftZ), 2.4);
    }
    update(dt) {
        this.velocity.addInPlace(this.acceleration.scale(dt));
        this.velocity = this.limit(this.velocity, this.maxSpeed);
        this.position.addInPlace(this.velocity.scale(dt));
        this.acceleration.set(0, 0, 0);
    }
    limit(vector, max) {
        const length = vector.length();
        if (length <= max || length === 0)
            return vector.clone();
        return vector.normalize().scale(max);
    }
}
export function planRiverRushSteering({ obstacles, raftX, raftZ, riverHalfWidth, playerRadius, obstacleSpeed, zState }) {
    let nearestThreat = null;
    let nearestTime = Infinity;
    let nearestForward = Infinity;
    let nearestLogTime = Infinity;
    let bestStar = null;
    let bestStarScore = -Infinity;
    for (const obstacle of obstacles) {
        if (obstacle.scored)
            continue;
        const forward = obstacle.z - raftZ;
        if (forward < -0.4 || forward > 17)
            continue;
        if (obstacle.type === OBSTACLE_TYPES.STAR) {
            const distanceCost = Math.abs(obstacle.x - raftX) * 0.28 + forward * 0.035;
            const score = 1 - distanceCost;
            if (score > bestStarScore) {
                bestStarScore = score;
                bestStar = obstacle;
            }
            continue;
        }
        // Collision does not happen when the obstacle center reaches the raft; it
        // starts when it enters the collision depth around RAFT_Z. Using contact
        // time instead of center time prevents jump/duck from firing too early.
        const timeToContact = (forward - 1.05) / Math.max(0.001, obstacleSpeed);
        const width = obstacle.type === OBSTACLE_TYPES.JUMP_GATE ? riverHalfWidth : obstacle.radius + playerRadius + 0.22;
        const isInCorridor = obstacle.type === OBSTACLE_TYPES.JUMP_GATE || Math.abs(obstacle.x - raftX) < width + 0.35;
        if (isInCorridor && timeToContact < nearestTime) {
            nearestThreat = obstacle;
            nearestTime = timeToContact;
            nearestForward = forward;
        }
        if (obstacle.type === OBSTACLE_TYPES.LOG) {
            const lateralOverlap = Math.abs(obstacle.x - raftX) < playerRadius + obstacle.radius + 0.2;
            if (lateralOverlap && timeToContact < nearestLogTime) {
                nearestLogTime = timeToContact;
            }
        }
    }
    const hasThreat = Boolean(nearestThreat && nearestTime < 1.45);
    const jumpWindow = nearestTime > 0.18 && nearestTime < 0.38;
    // Ducking is a hold action, not a jump impulse. If it starts too early it
    // expires while the log is still overlapping the raft, so trigger it close to
    // contact and allow a tiny late margin because update() runs before collision.
    const logDuckWindow = nearestLogTime > -0.12 && nearestLogTime < 0.32;
    const centeredOnRock = nearestThreat ? Math.abs(nearestThreat.x - raftX) < playerRadius + 0.35 : false;
    const shouldJump = Boolean(hasThreat && jumpWindow && (nearestThreat?.type === OBSTACLE_TYPES.JUMP_GATE || (nearestThreat?.type === OBSTACLE_TYPES.ROCK && centeredOnRock)));
    const shouldDuck = Boolean(logDuckWindow);
    const zSolvesThreat = Boolean(nearestThreat?.escapeActions?.includes(zState));
    if (hasThreat && !zSolvesThreat && nearestThreat?.type !== OBSTACLE_TYPES.JUMP_GATE) {
        const urgency = 1 - BABYLON.Scalar.Clamp(nearestForward / 17, 0, 1);
        const dodgeSign = nearestThreat.x >= raftX ? -1 : 1;
        const targetX = BABYLON.Scalar.Clamp(raftX + dodgeSign * (2.1 + urgency * 1.2), -riverHalfWidth + playerRadius, riverHalfWidth - playerRadius);
        return { targetX, hasThreat, nearestThreat, activeBehavior: "avoid", shouldJump, shouldDuck };
    }
    if (bestStar && (!hasThreat || nearestTime > 0.85)) {
        const targetX = BABYLON.Scalar.Clamp(bestStar.x, -riverHalfWidth + playerRadius, riverHalfWidth - playerRadius);
        return { targetX, hasThreat, nearestThreat, activeBehavior: "collect", shouldJump, shouldDuck };
    }
    return { targetX: 0, hasThreat, nearestThreat, activeBehavior: "center", shouldJump, shouldDuck };
}
export class BehaviorManager {
    vehicle;
    behaviors = new Map();
    constructor(vehicle) {
        this.vehicle = vehicle;
        this.add("seekForward", 0.15, () => this.vehicle.seek(new BABYLON.Vector3(0, 0, this.vehicle.config.raftZ + 8)));
        this.add("bankGuard", 1.4, () => this.vehicle.bankGuard());
        this.add("avoidObstacles", 1.7, (context) => this.vehicle.avoidObstacles(context.obstacles));
        this.add("laneArrive", 1.05, (context) => {
            const targetX = context.steeringPlan?.targetX ?? context.targetLane;
            const force = this.vehicle.laneArrive(context.hasThreat ? targetX : 0);
            return context.hasThreat ? force : force.scale(0.36);
        });
    }
    add(name, weight, apply) {
        this.behaviors.set(name, { enabled: true, weight, apply });
    }
    remove(name) {
        this.behaviors.delete(name);
    }
    enable(name) {
        const behavior = this.behaviors.get(name);
        if (behavior)
            behavior.enabled = true;
    }
    disable(name) {
        const behavior = this.behaviors.get(name);
        if (behavior)
            behavior.enabled = false;
    }
    setWeight(name, weight) {
        const behavior = this.behaviors.get(name);
        if (behavior)
            behavior.weight = weight;
    }
    isActive(name) {
        return Boolean(this.behaviors.get(name)?.enabled);
    }
    update(context, dt) {
        if (context.steeringPlan) {
            this.updatePrioritized(context, dt);
            return;
        }
        for (const behavior of this.behaviors.values()) {
            if (!behavior.enabled)
                continue;
            this.vehicle.applyForce(behavior.apply(context), behavior.weight);
        }
        this.vehicle.update(dt);
    }
    updatePrioritized(context, dt) {
        const plan = context.steeringPlan;
        // Craig Reynolds style, but with priority arbitration so behaviours do not
        // fight each other: wall/bank guard and obstacle avoidance dominate;
        // collect/center arrival only guide the raft when safe enough.
        const bankForce = this.vehicle.bankGuard();
        if (bankForce.lengthSquared() > 0.0001) {
            this.vehicle.applyForce(bankForce, 1.9);
        }
        if (plan.activeBehavior === "avoid") {
            this.vehicle.applyForce(this.vehicle.avoidObstacles(context.obstacles), 2.35);
            this.vehicle.applyForce(this.vehicle.laneArrive(plan.targetX), 0.75);
        }
        else if (plan.activeBehavior === "collect") {
            this.vehicle.applyForce(this.vehicle.laneArrive(plan.targetX), 1.15);
        }
        else {
            this.vehicle.applyForce(this.vehicle.laneArrive(plan.targetX), 0.48);
        }
        this.vehicle.update(dt);
    }
}
