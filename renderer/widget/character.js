'use strict';

const STATE = {
  IDLE: 'idle',
  WALK: 'walk',
};

class Character {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {SpriteAnimator} animator
   * @param {{ width: number, height: number }} bounds - stage 이동 가능 영역
   */
  constructor(canvas, animator, bounds) {
    this.canvas = canvas;
    this.animator = animator;
    this.bounds = bounds;

    // 바닥 고정 Y
    this.y = bounds.height - 4;
    this.x = bounds.width / 2;

    this.vx = 0;
    this.targetX = this.x;
    this.state = STATE.IDLE;
    this.idleTimer = 0;
    this.idleDuration = this._randomIdleDuration();

    this._updateCanvasPosition();
  }

  _randomIdleDuration() {
    return 2000 + Math.random() * 4000; // 2~6초
  }

  _pickNewTarget() {
    const hw = this.canvas.width / 2 + 5;
    const minX = hw;
    const maxX = this.bounds.width - hw;
    this.targetX = minX + Math.random() * (maxX - minX);

    // 0.06~0.12 px/ms → 약 60fps 기준 1~2px/frame
    const speed = 0.06 + Math.random() * 0.06;
    this.vx = this.targetX > this.x ? speed : -speed;
    this.animator.facingRight = this.vx > 0;
    this._setState(STATE.WALK);
  }

  _setState(newState) {
    if (this.state === newState) return;
    this.state = newState;
    this.animator.setAnimation(newState, true);
  }

  update(dt) {
    if (this.state === STATE.IDLE) {
      this.idleTimer += dt;
      if (this.idleTimer >= this.idleDuration) {
        this.idleTimer = 0;
        this.idleDuration = this._randomIdleDuration();
        if (Math.random() < 0.7) this._pickNewTarget();
      }
    }

    if (this.state === STATE.WALK) {
      this.x += this.vx * dt;

      const arrived = this.vx > 0
        ? this.x >= this.targetX
        : this.x <= this.targetX;

      if (arrived) {
        this.x = this.targetX;
        this.vx = 0;
        this._setState(STATE.IDLE);
      }
    }

    this.animator.update(dt);
    this._updateCanvasPosition();
  }

  _updateCanvasPosition() {
    this.canvas.style.left = `${Math.round(this.x - this.canvas.width / 2)}px`;
    this.canvas.style.top  = `${Math.round(this.y - this.canvas.height)}px`;
  }
}
