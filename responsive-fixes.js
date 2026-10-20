(function () {
  "use strict";

  const game = window.game;
  if (!game) return;

  const touchDevice =
    navigator.maxTouchPoints > 0 ||
    window.matchMedia?.("(pointer: coarse)").matches ||
    "ontouchstart" in window;
  const touchControlsEnabled =
    window.matchMedia?.("(pointer: coarse)").matches ?? touchDevice;

  const pixelRatio = () => Math.min(3, Math.max(1, window.devicePixelRatio || 1));
  const tutorialKey = "sadovnik-first-level-tutorial-v1";

  if (touchDevice) {
    game.device.input.touch = true;
    const input = game.input;
    if (input.addPointer && input.pointers.length < 4) {
      input.addPointer(4 - input.pointers.length);
    }
  }

  function showFirstRunTutorial(scene) {
    if (scene.__firstRunTutorialChecked || scene.macroIndex !== 0 || scene.microIndex !== 0) return;
    scene.__firstRunTutorialChecked = true;

    try {
      if (localStorage.getItem(tutorialKey)) return;
    } catch {}

    const keys = touchControlsEnabled
      ? ["◀ ▶", "↑", "✦"]
      : ["A / D", "SPACE", "SHIFT / X"];
    const labels = ["ДВИЖЕНИЕ", "ПРЫЖОК", "ПОРЫВ"];
    const icons = touchControlsEnabled ? ["◀ ▶", "↑", "✦"] : ["↔", "↑", "✦"];
    const root = document.createElement("div");
    root.className = "first-run-tutorial";
    if (touchControlsEnabled) root.classList.add("first-run-tutorial--touch");
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-label", "Управление в игре");
    root.innerHTML = `
      <section class="first-run-tutorial__panel">
        <h2>В ПУТЬ</h2>
        <div class="first-run-tutorial__cards">
          ${labels.map((label, index) => `
            <div class="first-run-tutorial__card">
              <span class="first-run-tutorial__icon" aria-hidden="true">${icons[index]}</span>
              <span class="first-run-tutorial__label">${label}</span>
              <kbd>${keys[index]}</kbd>
            </div>
          `).join("")}
        </div>
        <button class="first-run-tutorial__start" type="button">ПОНЯТНО</button>
      </section>`;

    if (!document.getElementById("first-run-tutorial-styles")) {
      const style = document.createElement("style");
      style.id = "first-run-tutorial-styles";
      style.textContent = `
        .first-run-tutorial{position:fixed;inset:0;z-index:10000;display:grid;place-items:center;padding:16px;background:rgba(7,23,20,.82);font-family:Arial,sans-serif;color:#fff2d0}
        .first-run-tutorial__panel{width:min(100%,460px);max-height:calc(100dvh - 32px);overflow:auto;padding:28px 24px 22px;border:1px solid rgba(213,228,188,.35);border-radius:22px;background:linear-gradient(150deg,#21584b,#123b36 72%);box-shadow:0 22px 70px #061613aa;text-align:center}
        .first-run-tutorial__panel h2{margin:0 0 22px;color:#f4c95d;font-size:clamp(24px,7vw,34px);letter-spacing:.1em}
        .first-run-tutorial__cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}
        .first-run-tutorial__card{display:flex;min-width:0;min-height:126px;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:10px 5px;border:1px solid #88b58a66;border-radius:15px;background:#0c302b99}
        .first-run-tutorial__icon{display:grid;width:58px;height:48px;place-items:center;color:#f4c95d;font-size:30px;font-weight:700;white-space:nowrap}
        .first-run-tutorial__label{font-size:10px;font-weight:700;letter-spacing:.07em}
        .first-run-tutorial__card kbd{max-width:100%;color:#e7e8d4;font:700 11px Arial,sans-serif;white-space:nowrap}
        .first-run-tutorial--touch .first-run-tutorial__card kbd{display:none}
        .first-run-tutorial__start{width:100%;min-height:48px;margin-top:18px;border:0;border-radius:12px;background:#f4c95d;color:#173f3b;font-size:15px;font-weight:800;letter-spacing:.06em;cursor:pointer}
        .first-run-tutorial__start:focus-visible{outline:3px solid #fff2d0;outline-offset:3px}
        @media(max-width:360px){.first-run-tutorial__panel{padding:22px 14px 16px}.first-run-tutorial__cards{gap:6px}.first-run-tutorial__card{min-height:106px}.first-run-tutorial__icon{width:58px;height:40px;font-size:26px}.first-run-tutorial__label{font-size:9px}.first-run-tutorial__card kbd{font-size:10px}}
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(root);
    try {
      localStorage.setItem(tutorialKey, "1");
    } catch {}
    game.scene.pause("GameScene");

    const close = () => {
      root.remove();
      game.scene.resume("GameScene");
    };
    root.querySelector("button").addEventListener("click", close, { once: true });
    root.addEventListener("pointerdown", (event) => event.stopPropagation());
    requestAnimationFrame(() => root.querySelector("button")?.focus());
  }

  function fitCompactScreens(scene) {
    const width = scene.scale.width;
    const height = scene.scale.height;
    const compact = height < 480 || (width < 430 && height < 760);
    const texts = scene.children.list.filter((item) => item.type === "Text");

    if (scene.scene.key === "MenuScene") {
      const title = texts.find((item) => item.text === "Садовник Оранжереи");
      const sound = scene.children.list.find((item) =>
        item.type === "Container" && item.getData("buttonCaption")?.text.startsWith("Звук")
      );
      sound?.setVisible(!(width < 430 && height < 480));
      texts.forEach((item) => {
        if (item !== title) item.setVisible(false);
      });

      if (title) {
        title.setPosition(width / 2, height * (compact ? 0.14 : 0.15))
          .setStyle({ fontSize: width < 360 ? "23px" : width < 760 ? "26px" : "40px", align: "center" })
          .setWordWrapWidth(width - 40);
      }
    }

    if (scene.scene.key === "IntroScene") {
      const title = texts.find((item) => item.text === "Пробуждение оранжереи");
      const buttons = scene.children.list.filter((item) =>
        item.type === "Container" && item.getData("buttonCaption")
      );

      title?.setPosition(width / 2, height * 0.14)
        .setStyle({ fontSize: width < 430 ? "24px" : "32px", align: "center" })
        .setWordWrapWidth(width - 40);
      texts.forEach((item) => {
        if (item !== title) item.setVisible(false);
      });

      if (height >= 560 && width >= 320) {
        buttons[0]?.setPosition(width / 2, height * 0.7);
        buttons[1]?.setPosition(width / 2, height * 0.8);
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

      const touchControls = touchControlsEnabled;
      this.pauseButton?.setVisible(touchControls);
      if (!touchControls) {
        new Set([...previousButtons, ...this.touchButtons]).forEach(({ plate, caption, hint }) => {
          hint?.destroy();
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
        showFirstRunTutorial(this);
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
