(function () {
  "use strict";

  const game = window.game;
  if (!game) return;

  const touchDevice =
    navigator.maxTouchPoints > 0 ||
    window.matchMedia?.("(pointer: coarse)").matches ||
    "ontouchstart" in window;

  const pixelRatio = () => Math.min(3, Math.max(1, window.devicePixelRatio || 1));

  if (touchDevice) {
    game.device.input.touch = true;
    const input = game.input;
    if (input.addPointer && input.pointers.length < 4) {
      input.addPointer(4 - input.pointers.length);
    }
  }

  function addGuide(scene) {
    if (scene.__responsiveGuide?.items?.every(({ plate }) => plate.active)) {
      return scene.__responsiveGuide;
    }

    const definitions = [
      ["← →", "ИДТИ"],
      ["↑", "ПРЫЖОК"],
      ["⚡", "ПОРЫВ"],
    ];
    const items = definitions.map(([icon, label]) => {
      const plate = scene.add.rectangle(0, 0, 100, 58, 0x123f39, 0.94)
        .setOrigin(0.5)
        .setStrokeStyle(1, 0x88b58a, 0.8)
        .setDepth(20);
      const symbol = scene.add.text(0, -8, icon, {
        fontFamily: "Arial, sans-serif",
        fontSize: "23px",
        fontStyle: "bold",
        color: "#f4c95d",
        align: "center",
      }).setOrigin(0.5).setDepth(21);
      const caption = scene.add.text(0, 18, label, {
        fontFamily: "Arial, sans-serif",
        fontSize: "10px",
        fontStyle: "bold",
        color: "#fff2d0",
        align: "center",
      }).setOrigin(0.5).setDepth(21);
      return { plate, symbol, caption };
    });

    scene.__responsiveGuide = { items };
    return scene.__responsiveGuide;
  }

  function layoutGuide(scene, width, height, y, visible = true) {
    const guide = addGuide(scene);
    const margin = width < 360 ? 14 : 20;
    const gap = 7;
    const cardWidth = Math.min(180, (width - margin * 2 - gap * 2) / 3);
    const left = (width - (cardWidth * 3 + gap * 2)) / 2;
    const ratio = pixelRatio();
    guide.items.forEach(({ plate, symbol, caption }, index) => {
      const x = left + cardWidth / 2 + index * (cardWidth + gap);
      plate.setPosition(x, y).setSize(cardWidth, 58).setVisible(visible);
      symbol.setPosition(x, y - 8).setFontSize(`${Math.min(24, width * 0.06)}px`)
        .setResolution(ratio).setVisible(visible);
      caption.setPosition(x, y + 18).setFontSize(width < 360 ? "9px" : "10px")
        .setResolution(ratio).setVisible(visible);
    });
  }

  function fitCompactScreens(scene) {
    const width = scene.scale.width;
    const height = scene.scale.height;
    const compact = height < 480 || (width < 430 && height < 760);
    const texts = scene.children.list.filter((item) => item.type === "Text");

    if (scene.scene.key === "MenuScene") {
      const title = texts.find((item) => item.text === "Садовник Оранжереи");
      const intro = texts.find((item) =>
        item.text.startsWith("Ты — крошечный садовник-дух") ||
        item.text === "Собирай семена и найди Солнечный цветок."
      );
      const sound = scene.children.list.find((item) =>
        item.type === "Container" && item.getData("buttonCaption")?.text.startsWith("Звук")
      );
      const buttons = scene.children.list.filter((item) =>
        item.type === "Container" && item.getData("buttonCaption") &&
        !item.getData("buttonCaption").text.startsWith("Звук")
      );

      sound?.setVisible(!(width < 430 && height < 480));
      if (intro) {
        intro.setText("Собирай семена и найди Солнечный цветок.")
          .setPosition(width / 2, height * 0.22)
          .setStyle({ fontSize: compact ? "16px" : "19px", align: "center" })
          .setWordWrapWidth(Math.max(220, width - 48));
      }

      if (title) {
        title.setPosition(width / 2, height * (compact ? 0.14 : 0.15))
          .setStyle({ fontSize: width < 360 ? "23px" : width < 760 ? "26px" : "40px", align: "center" })
          .setWordWrapWidth(width - 40);
      }

      const guideY = Math.min(height * 0.355, (buttons[0]?.y ?? height * 0.48) - 60);
      layoutGuide(scene, width, height, guideY, height >= 600 && width >= 320);
    }

    if (scene.scene.key === "IntroScene") {
      const title = texts.find((item) => item.text === "Пробуждение оранжереи");
      const story = texts.find((item) =>
        item.text.length > 70 ||
        item.text === "Собери семена, перепрыгни шипы и найди Солнечный цветок."
      );
      const buttons = scene.children.list.filter((item) =>
        item.type === "Container" && item.getData("buttonCaption")
      );

      title?.setPosition(width / 2, height * 0.14)
        .setStyle({ fontSize: width < 430 ? "24px" : "32px", align: "center" })
        .setWordWrapWidth(width - 40);
      story?.setText("Собери семена, перепрыгни шипы и найди Солнечный цветок.")
        .setPosition(width / 2, height * (height < 560 ? 0.4 : 0.32))
        .setStyle({ fontSize: width < 430 ? "16px" : "19px", align: "center" })
        .setWordWrapWidth(width - 48);

      if (height >= 560 && width >= 320) {
        layoutGuide(scene, width, height, height * 0.47, true);
        buttons[0]?.setPosition(width / 2, height * 0.7);
        buttons[1]?.setPosition(width / 2, height * 0.8);
      } else {
        layoutGuide(scene, width, height, height * 0.47, false);
      }
    }

    if (scene.scene.key === "AboutScene") {
      const title = texts.find((item) => item.text === "Садовник Оранжереи");
      const controls = texts.find((item) =>
        item.text.startsWith("A / D или ← / →") || item.text.startsWith("◀  ▶")
      );
      const hook = texts.find((item) => item.text.startsWith("Крошечный садовник прыгает"));
      title?.setPosition(width / 2, height * 0.14)
        .setStyle({ fontSize: width < 430 ? "24px" : "32px", align: "center" })
        .setWordWrapWidth(width - 40);
      if (controls) {
        controls.setText("◀  ▶   ИДТИ\n▲   ПРЫЖОК\n⚡   СВЕТОВОЙ ПОРЫВ\n\nСобери семена и найди Солнечный цветок.")
          .setPosition(width / 2, height * 0.46)
          .setStyle({ fontSize: width < 430 ? "16px" : "19px", align: "center" })
          .setWordWrapWidth(Math.min(620, width - 48));
      }
      hook?.setVisible(false);
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
      if (text.setResolution && text.style.resolution !== pixelRatio()) {
        text.setResolution(pixelRatio());
      }

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

  function patchHud(hud) {
    if (!hud || hud.__responsiveFixesInstalled) return;
    hud.__responsiveFixesInstalled = true;

    const scene = hud.scene;
    const labels = ["ВЛЕВО", "ВПРАВО", "ПРЫЖОК", "ПОРЫВ"];
    const decorateButton = (button, controlIndex) => {
      if (button.hint) return;
      button.hint = scene.add.text(0, 0, labels[controlIndex], {
        fontFamily: "Arial, sans-serif",
        fontSize: "10px",
        fontStyle: "bold",
        color: "#fff2d0",
        align: "center",
      }).setOrigin(0.5).setScrollFactor(0).setDepth(706);

      if (controlIndex === 3) button.caption.setText("⚡");
      button.plate.on("pointerdown", () => button.plate.setFillStyle(0x477d62, 1));
      ["pointerup", "pointerupoutside", "pointerout"].forEach((event) => {
        button.plate.on(event, () => button.plate.setFillStyle(0x173f3b, 0.94));
      });
    };

    const addTouchControls = hud.addTouchControls;
    hud.addTouchControls = function (width, height) {
      const firstNewButton = this.touchButtons.length;
      addTouchControls.call(this, width, height);
      this.touchButtons.slice(firstNewButton).forEach((button, index) => {
        decorateButton(button, firstNewButton + index);
      });
    };

    hud.touchButtons.forEach(decorateButton);

    const update = hud.update;
    hud.update = function (...args) {
      const result = update.apply(this, args);
      const dash = this.touchButtons[3];
      if (dash?.hint) {
        const ready = this.scene.dashReady;
        dash.hint.setText(ready ? "ПОРЫВ" : "ЗАРЯД")
          .setColor(ready ? "#fff2d0" : "#a9b9ad");
        dash.plate.setFillStyle(ready ? 0x173f3b : 0x344b45, ready ? 0.94 : 0.86);
      }
      return result;
    };

    const resize = hud.resize;
    hud.resize = function (width, height) {
      const previousButtons = this.touchButtons.slice();
      resize.call(this, width, height);

      const touchControls = touchDevice || width < 760;
      if (!touchControls) previousButtons.forEach(({ hint }) => hint?.destroy());
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
        const x = [radius + 12, radius * 3 + 20, width * 0.62, width - radius - 14];
        const y = Math.max(radius + 12, height - 68);

        this.touchButtons.forEach(({ plate, caption, hint }, index) => {
          plate.setRadius(radius).setPosition(x[index], y);
          caption.setPosition(x[index], y).setStyle({ fontSize: `${radius * 0.7}px` });
          hint?.setPosition(x[index], Math.min(height - 18, y + radius + 7))
            .setStyle({ fontSize: width < 360 ? "9px" : "10px" });
        });
      }

      scheduleFit(this.scene);
    };

    const relayout = () => {
      if (scene.sys.isActive() && scene.hud === hud) {
        hud.resize(scene.scale.width, scene.scale.height);
      }
    };
    relayout();
    requestAnimationFrame(relayout);
    setTimeout(relayout, 100);
  }

  function syncSceneResolution(scene) {
    if (!scene?.children?.list || !scene.sys?.isActive()) return;
    const ratio = pixelRatio();
    for (const item of scene.children.list) {
      if (item.type === "Text" && item.setResolution) item.setResolution(ratio);
    }
  }

  let activeSceneSignature = "";

  function applyActiveScenes() {
    const activeScenes = game.scene.getScenes(true);
    const signature = activeScenes.map((scene) => scene.scene.key).join("|");
    if (signature === activeSceneSignature) return;
    activeSceneSignature = signature;

    for (const scene of activeScenes) {
      syncSceneResolution(scene);
      fitCompactScreens(scene);
      fitText(scene);
      if (scene.scene.key === "GameScene") patchHud(scene.hud);
    }
  }

  function hookScenes() {
    for (const scene of game.scene.getScenes(false)) {
      if (scene.__responsiveFixesHooksInstalled) continue;
      scene.__responsiveFixesHooksInstalled = true;
      scene.events.on("create", () => { activeSceneSignature = ""; });
      scene.scale.on("resize", () => { activeSceneSignature = ""; });
    }
    applyActiveScenes();
  }

  function setupGameScene() {
    const gameScene = game.scene.getScene("GameScene");
    if (!gameScene) {
      setTimeout(setupGameScene, 30);
      return;
    }

    hookScenes();
    game.scale.on("resize", () => {
      requestAnimationFrame(() => {
        setTimeout(() => {
          activeSceneSignature = "";
          hookScenes();
        }, 0);
      });
    });
    game.events.on(Phaser.Core.Events.READY, () => requestAnimationFrame(hookScenes));
    game.events.on(Phaser.Core.Events.POST_STEP, applyActiveScenes);

    if (!gameScene.__responsiveDashInstalled) {
      gameScene.__responsiveDashInstalled = true;
      const createLevel = gameScene.createLevel;
      gameScene.createLevel = function (...args) {
        const result = createLevel.apply(this, args);
        patchHud(this.hud);
        scheduleFit(this);
        return result;
      };

      const startDash = gameScene.startDash;
      if (startDash) {
        gameScene.startDash = function (...args) {
          const wasReady = this.dashReady;
          const result = startDash.apply(this, args);
          if (wasReady) this.hud?.announce("СВЕТОВОЙ ПОРЫВ!");
          return result;
        };
      }
    }

    patchHud(gameScene.hud);
  }

  setupGameScene();
})();
