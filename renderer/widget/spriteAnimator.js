'use strict';

class SpriteAnimator {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {number} frameDuration - ms per frame (default 120)
   */
  constructor(canvas, frameDuration = 120) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.animations = {};      // { stateName: { image, frameCount, frameWidth, frameHeight } }
    this.currentAnim = null;
    this.currentFrame = 0;
    this.frameDuration = frameDuration;
    this.frameTimer = 0;
    this.facingRight = true;
    this.onAnimComplete = null; // 1회 애니메이션 완료 콜백
    this._loopAnim = true;
  }

  /**
   * 스프라이트시트 등록
   * @param {string} stateName - 상태 이름 (idle/walk/react 등)
   * @param {string} imagePath - 이미지 경로
   * @param {number} frameCount - 총 프레임 수
   * @param {number} frameWidth - 프레임 너비 (px)
   * @param {number} frameHeight - 프레임 높이 (px)
   */
  /**
   * @param {boolean} flipEnabled - 이동 방향에 따른 좌우반전 허용 여부 (기본값: true)
   */
  register(stateName, imagePath, frameCount, frameWidth, frameHeight, flipEnabled = true) {
    const img = new Image();
    img.src = imagePath;
    img.onerror = () => {
      // 이미지 로드 실패 시 더미 캔버스 생성 (개발용)
      const dummy = document.createElement('canvas');
      dummy.width = frameWidth * frameCount;
      dummy.height = frameHeight;
      const dctx = dummy.getContext('2d');
      for (let i = 0; i < frameCount; i++) {
        dctx.fillStyle = `hsl(${(i / frameCount) * 360}, 70%, 60%)`;
        dctx.fillRect(i * frameWidth + 2, 2, frameWidth - 4, frameHeight - 4);
        dctx.fillStyle = '#fff';
        dctx.font = `${frameWidth * 0.5}px sans-serif`;
        dctx.textAlign = 'center';
        dctx.fillText(stateName[0].toUpperCase(), i * frameWidth + frameWidth / 2, frameHeight / 2 + frameWidth * 0.15);
      }
      this.animations[stateName].image = dummy;
    };
    this.animations[stateName] = { image: img, frameCount, frameWidth, frameHeight, flipEnabled };
  }

  /**
   * 애니메이션 전환
   * @param {string} stateName
   * @param {boolean} loop - 루프 여부 (false면 1회 재생 후 onAnimComplete 호출)
   */
  setAnimation(stateName, loop = true) {
    if (this.currentAnim === stateName && loop === this._loopAnim) return;
    this.currentAnim = stateName;
    this.currentFrame = 0;
    this.frameTimer = 0;
    this._loopAnim = loop;

    const anim = this.animations[stateName];
    if (anim) {
      this.canvas.width = anim.frameWidth;
      this.canvas.height = anim.frameHeight;
    }
  }

  getFrameCount(stateName) {
    return this.animations[stateName]?.frameCount ?? 1;
  }

  getTotalDuration(stateName) {
    return (this.animations[stateName]?.frameCount ?? 1) * this.frameDuration;
  }

  /**
   * 매 프레임 호출 (게임 루프에서)
   * @param {number} dt - delta time (ms)
   */
  update(dt) {
    const anim = this.animations[this.currentAnim];
    if (!anim || !anim.image) return;

    this.frameTimer += dt;
    if (this.frameTimer >= this.frameDuration) {
      this.frameTimer = 0;
      this.currentFrame++;

      if (this.currentFrame >= anim.frameCount) {
        if (this._loopAnim) {
          this.currentFrame = 0;
        } else {
          this.currentFrame = anim.frameCount - 1; // 마지막 프레임 유지
          if (this.onAnimComplete) {
            const cb = this.onAnimComplete;
            this.onAnimComplete = null;
            cb();
          }
          return;
        }
      }
    }

    this._draw(anim);
  }

  _draw(anim) {
    const { ctx, canvas, currentFrame, facingRight } = this;
    const { image, frameCount, frameWidth, frameHeight, flipEnabled } = anim;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    // flipEnabled=false(idle 정면 등)는 방향 무관하게 반전 안 함
    // flipEnabled=true(walk)는 오른쪽으로 이동할 때 반전 (스프라이트 기본이 왼쪽)
    if (flipEnabled && facingRight) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    // 실제 이미지 크기에서 프레임 너비 자동 계산 (소스 이미지 해상도에 무관하게 동작)
    const srcW = image instanceof HTMLCanvasElement
      ? image.width / frameCount
      : (image.naturalWidth || frameWidth * frameCount) / frameCount;
    const srcH = image instanceof HTMLCanvasElement
      ? image.height
      : (image.naturalHeight || frameHeight);

    ctx.drawImage(
      image,
      currentFrame * srcW, 0,   // 소스: 현재 프레임 위치
      srcW, srcH,                // 소스: 프레임 크기 (실제 이미지 기준)
      0, 0,                      // 출력: 캔버스 원점
      frameWidth, frameHeight    // 출력: 표시 크기 (config 기준)
    );

    ctx.restore();
  }
}
