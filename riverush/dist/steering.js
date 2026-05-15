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
        const force = BABYLON.Vector3.Zero();
        for (const obstacle of obstaclesToAvoid) {
            if (obstacle.type === OBSTACLE_TYPES.STAR || obstacle.scored)
                continue;
            if (obstacle.z < this.config.raftZ || obstacle.z > this.config.raftZ + this.config.sensorRange)
                continue;
            const progress = (obstacle.z - this.config.raftZ) / this.config.sensorRange;
            const width = obstacle.type === OBSTACLE_TYPES.JUMP_GATE ? this.config.riverHalfWidth : obstacle.radius + this.config.playerRadius;
            const lateralDistance = obstacle.x - this.position.x;
            if (Math.abs(lateralDistance) > width + 1.1)
                continue;
            const urgency = 1 - progress;
            const dodgeDirection = lateralDistance >= 0 ? -1 : 1;
            force.x += dodgeDirection * urgency * this.maxForce;
        }
        return this.limit(force, this.maxForce);
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
export class BehaviorManager {
    vehicle;
    behaviors = new Map();
    constructor(vehicle) {
        this.vehicle = vehicle;
        this.add("seekForward", 0.15, () => this.vehicle.seek(new BABYLON.Vector3(0, 0, this.vehicle.config.raftZ + 8)));
        this.add("bankGuard", 1.4, () => this.vehicle.bankGuard());
        this.add("avoidObstacles", 1.25, (context) => this.vehicle.avoidObstacles(context.obstacles));
        this.add("laneArrive", 0.92, (context) => {
            const lane = context.hasThreat ? context.targetLane : 0;
            const force = this.vehicle.laneArrive(lane);
            return context.hasThreat ? force : force.scale(0.42);
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
        for (const behavior of this.behaviors.values()) {
            if (!behavior.enabled)
                continue;
            this.vehicle.applyForce(behavior.apply(context), behavior.weight);
        }
        this.vehicle.update(dt);
    }
}
