/**
 * Attack choreography. Each SQL concept has its own spell; each boss has its
 * own counter-attack. `onImpact(i, n)` fires on every hit so the stage can
 * sync knockback, shake and damage numbers to the exact frame of contact.
 */
import { Container, Graphics, Sprite, Text } from "pixi.js";
import type { AttackKind } from "@/lib/dialect/concepts";
import type { BossAttackStyle } from "./characters/bosses";
import { isHydra } from "./characters/bosses";
import type { Character } from "./characters/rig";
import { FxContext, Pt, beam, fxSpriteOf, glowSprite, lightning, loopFrame, projectile, ring, setFxFrame, slash } from "./fx";
import { ease } from "./tween";

type Impact = (i: number, n: number) => void;

const lerp = (a: Pt, b: Pt, k: number): Pt => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });

export async function performAttack(c: FxContext, kind: AttackKind, caster: Character, target: Character, color: number, onImpact: Impact) {
  await caster.castMotion();
  const from = caster.castPoint();
  const to = target.hitPoint();
  const { tw, fx } = c;

  switch (kind) {
    case "bolt": {
      const b = beam(c, from, to, { color, width: 16, dur: 0.42 });
      await tw.wait(0.07);
      onImpact(0, 1);
      ring(c, to, { color, radius: 110 });
      fx.burst(to.x, to.y, { color, count: 40, speed: 520, spark: true });
      await b;
      break;
    }

    case "chain": {
      const g = new Container();
      c.pix.addChild(g);
      const links = 14;
      const angle = Math.atan2(to.y - from.y, to.x - from.x);
      const chain = Array.from({ length: links }, (_, i) => {
        const s = fxSpriteOf(c, "link", color, from, 3, g);
        s.rotation = angle;
        if (i % 2) s.scale.y *= 0.5; // every other link is turned edge-on
        s.visible = false;
        return s;
      });
      let time = 0;
      const draw = (k: number) => {
        time += 1 / 60;
        chain.forEach((s, i) => {
          const u = i / links;
          const p = lerp(from, to, u);
          const sag = Math.sin(u * Math.PI) * 30 * (1 - k * 0.6);
          s.visible = i < links * k;
          s.position.set(Math.round(p.x), Math.round(p.y + sag));
          loopFrame(s, "link", color, time + i * 0.1);
        });
      };
      await tw.run(0.3, (k) => draw(k), ease.outCubic);
      onImpact(0, 2);
      fx.burst(to.x, to.y, { color, count: 25, speed: 300 });
      const tx = target.body.x;
      await tw.to(target.body, { x: tx + 70 * -target.facing }, 0.2, ease.inCubic);
      onImpact(1, 2);
      ring(c, to, { color, radius: 130 });
      tw.to(target.body, { x: tx }, 0.4, ease.outCubic);
      await tw.run(0.25, (k) => {
        g.alpha = 1 - k;
      });
      g.destroy({ children: true });
      break;
    }

    case "slam": {
      const top = { x: to.x - 300 * caster.facing, y: Math.max(170, to.y - 330) }; // stay on screen above a far-off foe
      const ball = glowSprite(color, 40, 0.7);
      ball.position.set(top.x, top.y);
      c.layer.addChild(ball);
      const core = fxSpriteOf(c, "meteor", color, top, 2);
      core.rotation = Math.atan2(to.y - top.y, to.x - top.x) - Math.PI / 4; // the flame trails behind the falling rock
      let time = 0;
      // rows of data compress into a meteor
      await tw.run(0.55, (k) => {
        for (let i = 0; i < 3 * fx.scale; i++) {
          const a = Math.random() * Math.PI * 2;
          fx.emit({ x: top.x + Math.cos(a) * 220, y: top.y + Math.sin(a) * 120, toX: top.x, toY: top.y, pull: 30, drag: 0.8, size: 9, life: 0.4, color });
        }
        ball.scale.set((40 + k * 160) / 32);
        core.scale.set(2 + Math.floor(k * 4.99));
        time += 1 / 60;
        loopFrame(core, "meteor", color, time);
      });
      await tw.run(
        0.16,
        (k) => {
          const p = lerp(top, to, k);
          ball.position.set(p.x, p.y);
          core.position.set(Math.round(p.x), Math.round(p.y));
          time += 1 / 60;
          loopFrame(core, "meteor", color, time);
        },
        ease.inQuad,
      );
      ball.destroy();
      core.destroy();
      onImpact(0, 1);
      ring(c, { x: to.x, y: to.y + 110 }, { color, radius: 260, squash: 0.3, width: 16 });
      ring(c, to, { color: 0xffffff, radius: 150 });
      fx.burst(to.x, to.y + 60, { color, count: 70, speed: 700, gravity: 900, life: 0.9 });
      break;
    }

    case "mirror": {
      const portals = [0.3, 0.55, 0.8].map((u) => {
        const p = lerp(from, to, u);
        const g = new Graphics();
        g.position.set(p.x, p.y);
        g.ellipse(0, 0, 26, 70).stroke({ width: 5, color, alpha: 0.9 });
        g.ellipse(0, 0, 16, 50).stroke({ width: 3, color: 0xffffff, alpha: 0.6 });
        g.scale.set(0);
        c.layer.addChild(g);
        return g;
      });
      await Promise.all(portals.map((g, i) => tw.wait(i * 0.07).then(() => tw.to(g.scale, { x: 1, y: 1 }, 0.22, ease.outBack))));
      const flight = projectile(c, from, to, { color, size: 22, dur: 0.4, arc: 0 });
      for (let i = 0; i < 3; i++) {
        await tw.wait(0.4 * (i === 0 ? 0.3 : 0.25));
        tw.to(portals[i].scale, { x: 1.5, y: 1.5 }, 0.1).then(() => tw.to(portals[i], { alpha: 0 }, 0.3));
      }
      await flight;
      onImpact(0, 1);
      ring(c, to, { color, radius: 120 });
      fx.burst(to.x, to.y, { color, count: 45, speed: 480 });
      await tw.wait(0.2);
      portals.forEach((p) => p.destroy());
      break;
    }

    case "summon": {
      const minions: Container[] = [];
      for (let i = 0; i < 4; i++) {
        const m = new Container();
        m.addChild(glowSprite(color, 70, 0.5));
        fxSpriteOf(c, "minion", color, { x: 0, y: 0 }, 3, m);
        const a = -Math.PI / 2 + (i - 1.5) * 0.7;
        m.position.set(from.x + Math.cos(a) * 110, from.y + Math.sin(a) * 90 + 40);
        m.scale.set(0);
        c.pix.addChild(m);
        minions.push(m);
        tw.wait(i * 0.08).then(() => tw.to(m.scale, { x: 1, y: 1 }, 0.25, ease.outBack));
      }
      let flap = 0;
      await tw.run(0.45, () => {
        flap += 1 / 60;
        minions.forEach((m, i) => loopFrame(m.children[1] as Sprite, "minion", color, flap + i * 0.08));
      });
      for (let i = 0; i < minions.length; i++) {
        const m = minions[i];
        const start = { x: m.x, y: m.y };
        await tw.run(
          0.2,
          (k) => {
            const p = lerp(start, to, k);
            m.position.set(p.x, p.y - Math.sin(k * Math.PI) * 60);
            flap += 1 / 60;
            loopFrame(m.children[1] as Sprite, "minion", color, flap);
            fx.emit({ x: m.x, y: m.y, size: 14, life: 0.25, color });
          },
          ease.inQuad,
        );
        onImpact(i, minions.length);
        fx.burst(to.x, to.y, { color, count: 18, speed: 380 });
        m.destroy({ children: true });
      }
      ring(c, to, { color, radius: 140 });
      break;
    }

    case "blade": {
      const frame = new Graphics();
      frame.rect(-60, -90, 120, 180).stroke({ width: 5, color });
      frame.moveTo(0, -90).lineTo(0, 90).moveTo(-60, 0).lineTo(60, 0).stroke({ width: 2, color, alpha: 0.6 });
      frame.position.set(to.x - 260 * target.facing, to.y);
      frame.alpha = 0;
      c.layer.addChild(frame);
      await tw.to(frame, { alpha: 1, x: to.x }, 0.25, ease.outCubic);
      const angles = [-0.7, 0.9, 0];
      for (let i = 0; i < 3; i++) {
        slash(c, to, { color, angle: angles[i], size: 120 + i * 10 });
        await tw.wait(0.06);
        onImpact(i, 3);
        fx.burst(to.x, to.y, { color, count: 20, speed: 520, spark: true });
        await tw.wait(0.1);
      }
      await tw.to(frame, { alpha: 0, x: to.x + 160 * target.facing }, 0.25);
      frame.destroy();
      break;
    }

    case "fusion": {
      const a = projectile(c, from, to, { color, size: 26, dur: 0.5, arc: -160 });
      const b = projectile(c, from, to, { color: 0xffffff, size: 20, dur: 0.5, arc: 160 });
      await Promise.all([a, b]);
      onImpact(0, 1);
      ring(c, to, { color, radius: 200, width: 18 });
      ring(c, to, { color: 0xffffff, radius: 120 });
      fx.burst(to.x, to.y, { color, count: 70, speed: 650 });
      break;
    }

    case "shield": {
      const center = caster.hitPoint();
      const dome = fxSpriteOf(c, "dome", color, center, 6);
      const fill = glowSprite(color, 300, 0.25);
      fill.position.set(center.x, center.y);
      c.layer.addChild(fill);
      dome.alpha = 0.9;
      dome.scale.set(0);
      let time = 0;
      const shimmer = () => {
        time += 1 / 60;
        loopFrame(dome, "dome", color, time);
      };
      await tw.run(0.25, (k) => {
        dome.scale.set(Math.max(1, Math.round(ease.outBack(k) * 6)));
        shimmer();
      });
      await tw.run(0.15, shimmer);
      const b = beam(c, from, to, { color, width: 22, dur: 0.45, jitter: 2 });
      await tw.wait(0.08);
      onImpact(0, 1);
      fx.burst(to.x, to.y, { color, count: 40, speed: 500 });
      tw.run(0.4, (k) => {
        dome.alpha = 0.9 * (1 - k);
        fill.alpha = 0.25 * (1 - k);
        shimmer();
      }).then(() => {
        dome.destroy();
        fill.destroy();
      });
      await b;
      break;
    }

    case "haste": {
      const startX = caster.body.x;
      const dist = (to.x - from.x) * 0.72;
      await tw.run(
        0.14,
        (k) => {
          caster.body.x = startX + dist * k;
          for (let i = 0; i < 3 * fx.scale; i++) fx.emit({ x: from.x + dist * k, y: from.y + 120 + (Math.random() - 0.5) * 200, vx: -900 * caster.facing, life: 0.25, size: 6, color, spark: true });
        },
        ease.inCubic,
      );
      for (let i = 0; i < 3; i++) {
        slash(c, to, { color, angle: -0.8 + i * 0.8, size: 100 });
        onImpact(i, 3);
        fx.burst(to.x, to.y, { color, count: 15, speed: 400, spark: true });
        await tw.wait(0.11);
      }
      await tw.to(caster.body, { x: startX }, 0.25, ease.outCubic);
      break;
    }

    case "forge": {
      const bricks: Sprite[] = [];
      for (let i = 0; i < 4; i++) {
        bricks.push(fxSpriteOf(c, "brick", color, { x: to.x + (i - 1.5) * 50 * (i === 3 ? 0 : 1), y: to.y - 420 }, i === 3 ? 5 : 3));
      }
      for (let i = 0; i < bricks.length; i++) {
        const g = bricks[i];
        const y0 = g.y;
        const y1 = to.y - (i === 3 ? 20 : 60);
        await tw.run(
          i === 3 ? 0.22 : 0.14,
          (k) => {
            g.y = Math.round(y0 + (y1 - y0) * k);
            setFxFrame(g, "brick", color, k * 0.99);
          },
          ease.inQuad,
        );
        onImpact(i, bricks.length);
        fx.burst(g.x, g.y + 20, { color, count: i === 3 ? 50 : 15, speed: 400, gravity: 800, spark: true });
        if (i === 3) ring(c, { x: to.x, y: to.y + 110 }, { color, radius: 220, squash: 0.3 });
      }
      await tw.wait(0.15);
      await Promise.all(bricks.map((b) => tw.to(b, { alpha: 0 }, 0.3)));
      bricks.forEach((b) => b.destroy());
      break;
    }

    case "surge": {
      const g = new Graphics();
      c.layer.addChild(g);
      const floorY = to.y + 120;
      await tw.run(
        0.55,
        (k) => {
          g.clear();
          const x = from.x + (to.x - from.x) * k;
          for (let i = 0; i < 4; i++) {
            g.moveTo(from.x, floorY - i * 30);
            for (let s = 0; s <= 20; s++) {
              const xx = from.x + ((x - from.x) * s) / 20;
              g.lineTo(xx, floorY - i * 30 - Math.max(0, Math.sin((s / 20) * Math.PI)) * 60 * (1 - i * 0.2) - Math.sin(s + k * 20) * 6);
            }
            g.stroke({ width: 6 - i, color, alpha: 0.8 - i * 0.15 });
          }
          fx.emit({ x, y: floorY - Math.random() * 120, vx: 300 * caster.facing, vy: -100, life: 0.4, size: 12, color });
        },
        ease.inCubic,
      );
      onImpact(0, 1);
      fx.burst(to.x, to.y + 40, { color, count: 60, speed: 600, gravity: 700 });
      await tw.to(g, { alpha: 0 }, 0.25);
      g.destroy();
      break;
    }

    case "storm": {
      c.camera.flash(0.35, 0x1e1b4b);
      for (let i = 0; i < 5; i++) {
        const x = to.x + (Math.random() - 0.5) * (i === 4 ? 0 : 200);
        lightning(c, { x, y: -40 }, { x, y: to.y + (i === 4 ? 0 : 60) }, color, i === 4 ? 9 : 5);
        c.camera.flash(0.25, color);
        onImpact(i, 5);
        fx.burst(x, to.y, { color, count: 20, speed: 400, spark: true });
        await tw.wait(i === 3 ? 0.18 : 0.09);
      }
      ring(c, to, { color, radius: 180 });
      break;
    }

    case "vortex": {
      const g = new Graphics();
      g.position.set(to.x, to.y);
      c.layer.addChild(g);
      await tw.run(0.75, (k) => {
        g.clear();
        for (let arm = 0; arm < 4; arm++) {
          g.moveTo(0, 0);
          for (let s = 0; s < 30; s++) {
            const a = s * 0.25 + arm * (Math.PI / 2) + k * 12;
            const r = s * 7 * (1 - k * 0.6);
            g.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.8);
          }
          g.stroke({ width: 4, color, alpha: 0.8 });
        }
        for (let i = 0; i < 2 * fx.scale; i++) {
          const a = Math.random() * Math.PI * 2;
          fx.emit({ x: to.x + Math.cos(a) * 240, y: to.y + Math.sin(a) * 200, toX: to.x, toY: to.y, pull: 25, drag: 0.85, size: 10, life: 0.5, color });
        }
      });
      g.destroy();
      onImpact(0, 1);
      c.camera.flash(0.5, color);
      ring(c, to, { color, radius: 220, width: 20 });
      fx.burst(to.x, to.y, { color, count: 80, speed: 700 });
      break;
    }

    case "lance": {
      const spear = new Container();
      spear.addChild(glowSprite(color, 160, 0.5));
      const head = fxSpriteOf(c, "lance", color, { x: -20, y: 0 }, 3, spear);
      const label = new Text({ text: "{ }", style: { fontFamily: "monospace", fontSize: 26, fill: color, fontWeight: "900" } });
      label.anchor.set(0.5);
      label.position.set(-90, -26);
      spear.addChild(label);
      spear.position.set(from.x, from.y);
      spear.rotation = Math.atan2(to.y - from.y, to.x - from.x);
      c.pix.addChild(spear);
      await tw.run(
        0.22,
        (k) => {
          const p = lerp(from, to, k);
          spear.position.set(p.x, p.y);
          setFxFrame(head, "lance", color, k * 0.99);
          fx.emit({ x: p.x, y: p.y, vx: (Math.random() - 0.5) * 60, vy: (Math.random() - 0.5) * 60, life: 0.35, size: 10, color, spark: true });
        },
        ease.inCubic,
      );
      onImpact(0, 1);
      fx.burst(to.x, to.y, { color, count: 50, speed: 700, spark: true, angle: Math.atan2(to.y - from.y, to.x - from.x), spread: 0.9 });
      ring(c, to, { color, radius: 130 });
      await tw.to(spear, { alpha: 0 }, 0.2);
      spear.destroy({ children: true });
      break;
    }
  }
}

/** Boss counter-attack on the player. */
export async function bossAttack(c: FxContext, boss: Character & { style: BossAttackStyle }, target: Character, onImpact: Impact) {
  const { tw, fx } = c;
  const color = boss.color;
  await boss.windup();
  const from = boss.castPoint();
  const to = target.hitPoint();

  switch (boss.style) {
    case "orbs":
      for (let i = 0; i < 3; i++) {
        await projectile(c, from, { x: to.x, y: to.y + (i - 1) * 30 }, { color, size: 20 + i * 4, dur: 0.3, arc: -60 - i * 30 });
        onImpact(i, 3);
        fx.burst(to.x, to.y, { color, count: 15, speed: 300 });
      }
      break;
    case "chain":
      return performAttack(c, "chain", boss, target, color, onImpact);
    case "blocks":
      return performAttack(c, "forge", boss, target, color, onImpact);
    case "shards":
      for (let i = 0; i < 5; i++) {
        projectile(c, { x: from.x, y: from.y + (i - 2) * 30 }, { x: to.x, y: to.y + (i - 2) * 20 }, { color: 0xe0f2fe, size: 12, dur: 0.25, arc: 0, spark: true }).then(() => {
          onImpact(i, 5);
          fx.burst(to.x, to.y, { color: 0xe0f2fe, count: 10, speed: 300, spark: true });
        });
        await tw.wait(0.07);
      }
      await tw.wait(0.3);
      break;
    case "scythe": {
      const hx = boss.body.x;
      await tw.to(boss.body, { x: hx + (to.x - from.x) * 0.55 }, 0.16, ease.inCubic);
      slash(c, to, { color, angle: 0.4, size: 170 });
      onImpact(0, 1);
      fx.burst(to.x, to.y, { color, count: 40, speed: 500, spark: true });
      await tw.wait(0.12);
      await tw.to(boss.body, { x: hx }, 0.4, ease.outCubic);
      break;
    }
    case "gear": {
      const gear = new Graphics();
      const pts: number[] = [];
      for (let i = 0; i < 20; i++) pts.push(Math.cos((i / 20) * Math.PI * 2) * (i % 2 ? 30 : 40), Math.sin((i / 20) * Math.PI * 2) * (i % 2 ? 30 : 40));
      gear.poly(pts).fill({ color }).stroke({ width: 3, color: 0xffffff });
      gear.position.set(from.x, from.y);
      c.layer.addChild(gear);
      await tw.run(
        0.45,
        (k) => {
          const p = lerp(from, to, k);
          gear.position.set(p.x, p.y - Math.sin(k * Math.PI) * 120);
          gear.rotation -= 0.5;
          fx.emit({ x: gear.x, y: gear.y, size: 10, life: 0.3, color, spark: true, vx: (Math.random() - 0.5) * 200, vy: (Math.random() - 0.5) * 200 });
        },
        ease.inQuad,
      );
      onImpact(0, 1);
      ring(c, to, { color, radius: 120 });
      gear.destroy();
      break;
    }
    case "quake": {
      const ground = { x: from.x, y: to.y + 120 };
      c.camera.shake(10, 3);
      await tw.run(0.45, (k) => {
        const x = ground.x + (to.x - ground.x) * k;
        fx.emit({ x, y: ground.y, vx: (Math.random() - 0.5) * 100, vy: -300 - Math.random() * 300, gravity: 900, life: 0.6, size: 12, color });
        fx.emit({ x, y: ground.y, vx: (Math.random() - 0.5) * 100, vy: -200, gravity: 900, life: 0.5, size: 8, color: 0x78716c });
      });
      onImpact(0, 1);
      ring(c, { x: to.x, y: ground.y }, { color, radius: 200, squash: 0.3, width: 16 });
      break;
    }
    case "wind":
      for (let i = 0; i < 3; i++) {
        const blade = new Graphics();
        blade.arc(0, 0, 60, -1.2, 1.2).stroke({ width: 10, color, alpha: 0.9 });
        blade.arc(0, 0, 60, -1.2, 1.2).stroke({ width: 3, color: 0xffffff });
        blade.position.set(from.x, from.y + (i - 1) * 50);
        blade.scale.x = -1;
        c.layer.addChild(blade);
        tw.run(0.35, (k) => {
          const p = lerp({ x: from.x, y: from.y + (i - 1) * 50 }, to, k);
          blade.position.set(p.x, p.y);
        }).then(() => {
          onImpact(i, 3);
          fx.burst(to.x, to.y, { color, count: 15, speed: 350, spark: true });
          blade.destroy();
        });
        await tw.wait(0.12);
      }
      await tw.wait(0.3);
      break;
    case "breath": {
      const mouths = isHydra(boss) ? boss.mouths() : [from];
      await tw.run(0.7, () => {
        for (const m of mouths) {
          for (let i = 0; i < 2 * c.fx.scale; i++) {
            const dx = to.x - m.x;
            const dy = to.y - m.y;
            const d = Math.hypot(dx, dy);
            fx.emit({ x: m.x, y: m.y, vx: (dx / d) * 900 + (Math.random() - 0.5) * 120, vy: (dy / d) * 900 + (Math.random() - 0.5) * 120, drag: 0.97, life: 0.5, size: 20, sizeEnd: 40, color: Math.random() < 0.5 ? color : 0xfde047, alpha: 0.8 });
          }
        }
      });
      onImpact(0, 1);
      break;
    }
    case "laser": {
      const glow = glowSprite(color, 20, 1);
      glow.position.set(from.x, from.y);
      c.layer.addChild(glow);
      await tw.to(glow.scale, { x: 5, y: 5 }, 0.45, ease.inCubic);
      glow.destroy();
      const b = beam(c, from, to, { color, width: 30, dur: 0.55, jitter: 3 });
      await tw.wait(0.08);
      onImpact(0, 1);
      c.camera.flash(0.4, color);
      await b;
      break;
    }
  }
}
