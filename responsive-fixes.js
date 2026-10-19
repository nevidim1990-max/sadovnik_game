(function () {
  "use strict";

  const game = window.game;
  if (!game) return;

  const touchDevice =
    navigator.maxTouchPoints > 0 ||
    window.matchMedia?.("(pointer: coarse)").matches ||
    "ontouchstart" in window;

  if (touchDevice) {
    game.device.input.touch = true;
    const input = game.input;
    if (input.addPointer && input.pointers.length < 4) {
      input.addPointer(4 - input.pointers.length);
    }
  }

  function fitCompactScreens(scene) {
    const width = scene.scale.width;
    const height = scene.scale.height;
    const compact = height < 480 || (width < 430 && height < 760);
    const texts = scene.children.list.filter((item) => item.type === "Text");

    if (scene.scene.key === "MenuScene") {
      const title = texts.find((item) => item.text === "Садовник Оранжереи");
      const intro = texts.find((item) => item.text.startsWith("Ты — крошечный садовник-дух"));
      const sound = scene.children.list.find((item) =>
        item.type === "Container" && item.getData("buttonCaption")?.text.startsWith("Звук")
      );
      sound?.setVisible(!(width < 430 && height < 480));
      if (intro) {
        intro.__fullText ??= intro.text;
        if (compact) {
          intro.setText("Ты — садовник-дух. Собирай семечки, пробуждай родники, перепрыгивай препятствия и доберись до Солнечного цветка.");
          intro.setPosition(width / 2, height * 0.29)
            .setStyle({ fontSize: width < 360 ? "15px" : "16px" })
            .setWordWrapWidth(width - 48);
        } else if (intro.text !== intro.__fullText) {
          intro.setText(intro.__fullText);
        }
      }

      if (compact && title) {
        title.setPosition(width / 2, height * 0.14)
          .setStyle({ fontSize: width < 360 ? "23px" : "26px" })
          .setWordWrapWidth(width - 48);
      }
    }

    if (scene.scene.key === "AboutScene") {
      const compactAbout = height < 480 || (width < 760 && height < 900);
      const controls = texts.find((item) => item.text.startsWith("A / D или ← / →"));
      const hook = texts.find((item) => item.text.startsWith("Крошечный садовник прыгает"));
      if (compactAbout && controls) {
        controls.setPosition(width / 2, height * 0.48)
          .setStyle({ fontSize: width < 360 ? "16px" : "17px" })
          .setWordWrapWidth(Math.min(620, width - 54));
      }
      hook?.setVisible(!compactAbout);
    }
  }

  function fitText(scene) {
    if (!scene?.sys?.isActive()) return;

    const width = scene.scale.width;
    const height = scene.scale.height;
    const margin = 12;
    const maxWidth = Math.max(96, width - margin * 2);
    const maxHeight = Math.max(64, height - margin * 2);
    const texts = [];

    function collect(items) {
      for (const item of items) {
        if (!item?.active || item.visible === false) continue;
        if (item.type === "Text") texts.push(item);
        if (Array.isArray(item.list)) collect(item.list);
      }
    }

    collect(scene.children.list);
    const moved = new Set();

    for (const text of texts) {
      if (!text.text) continue;

      const frame = text.parentContainer;
      const frameWidth = frame?.width > 0 ? frame.width - 16 : maxWidth;
      const frameHeight = frame?.height > 0 ? frame.height - 8 : maxHeight;
      const allowedWidth = Math.max(48, Math.min(maxWidth, frameWidth));
      const allowedHeight = Math.max(36, Math.min(maxHeight, frameHeight));
      let bounds = text.getBounds();
      const wrapWidth = text.style.wordWrapWidth;
      if (bounds.width > allowedWidth) {
        text.setWordWrapWidth(wrapWidth ? Math.min(wrapWidth, allowedWidth) : allowedWidth);
        bounds = text.getBounds();
      }

      const fontSize = Number.parseFloat(text.style.fontSize) || 16;
      if (bounds.height > allowedHeight && fontSize > 12) {
        const scale = Math.max(12 / fontSize, allowedHeight / bounds.height * 0.94);
        text.setFontSize(`${Math.max(12, fontSize * scale)}px`);
        bounds = text.getBounds();
      }

      const owner = text.parentContainer || text;
      if (moved.has(owner)) continue;

      const dx = bounds.left < margin
        ? margin - bounds.left
        : bounds.right > width - margin
          ? width - margin - bounds.right
          : 0;
      const dy = bounds.top < margin
        ? margin - bounds.top
        : bounds.bottom > height - margin
          ? height - margin - bounds.bottom
          : 0;

      if (dx || dy) {
        owner.x += dx;
        owner.y += dy;
        moved.add(owner);
      }
    }
  }

  function scheduleFit(scene) {
    requestAnimationFrame(() => {
      if (!scene?.sys?.isActive()) return;
      fitCompactScreens(scene);
      fitText(scene);
    });
  }

  for (const scene of game.scene.getScenes(false)) {
    scene.events.on("create", () => scheduleFit(scene));
    scene.scale.on("resize", () => scheduleFit(scene));
  }

  const gameScene = game.scene.getScene("GameScene");
  if (!gameScene) return;

  function patchHud(hud) {
    if (!hud || hud.__responsiveFixesInstalled) return;
    hud.__responsiveFixesInstalled = true;

    const resize = hud.resize;
    hud.resize = function (width, height) {
      resize.call(this, width, height);

      const touchControls = touchDevice || width < 760;
      if (!touchControls && this.touchButtons.length) {
        this.touchButtons.forEach(({ plate, caption }) => {
          plate.destroy();
          caption.destroy();
        });
        this.touchButtons = [];
      }

      if (touchControls && !this.touchButtons.length) {
        this.addTouchControls(width, height);
      }

      if (touchControls) {
        const radius = width < 370 ? 29 : 34;
        const inner = radius * 3 + 20;
        const x = [radius + 12, inner, width - inner, width - radius - 12];
        const y = Math.max(radius + 12, height - 68);

        this.touchButtons.forEach(({ plate, caption }, index) => {
          plate.setRadius(radius).setPosition(x[index], y);
          caption.setPosition(x[index], y).setStyle({ fontSize: `${radius * 0.7}px` });
        });
      }

      scheduleFit(this.scene);
    };

    const scene = hud.scene;
    const relayout = () => {
      if (scene.sys.isActive() && scene.hud === hud) {
        hud.resize(scene.scale.width, scene.scale.height);
      }
    };
    relayout();
    requestAnimationFrame(relayout);
    setTimeout(relayout, 100);
  }

  const createLevel = gameScene.createLevel;
  gameScene.createLevel = function (...args) {
    const result = createLevel.apply(this, args);
    patchHud(this.hud);
    scheduleFit(this);
    return result;
  };

  patchHud(gameScene.hud);
})();
