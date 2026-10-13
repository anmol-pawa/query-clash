/**
 * Attack choreography. Each SQL concept has its own spell; each boss has its
 * own counter-attack. `onImpact(i, n)` fires on every hit so the stage can
 * sync knockback, shake and damage numbers to the exact frame of contact.
 */
import { Container, Sprite, Text } from "pixi.js";
import type { AttackKind } from "@/lib/dialect/concepts";
import type { BossAttackStyle } from "./characters/bosses";
import { isHydra } from "./characters/bosses";
import type { Character } from "./characters/rig";
import { FxContext, Pt, beam, fxSpriteOf, glowSprite, impactSpark, lightning, loopFrame, projectile, ring, setFxFrame, slash } from "./fx";
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
        const s = fxSpriteOf(c, "portal", color, p, 3);
        s.scale.x = 0; // opens from a slit
        return s;
      });
      let open = true;
      let time = 0;
      const spin = async () => {
        while (open)
          await tw.run(0.1, () => {
            if (!open) return; // the portals are gone
            time += 1 / 60;
            portals.forEach((s, i) => loopFrame(s, "portal", color, time + i * 0.1));
          });
      };
      spin();
      await Promise.all(portals.map((s, i) => tw.wait(i * 0.07).then(() => tw.run(0.22, (k) => (s.scale.x = 3 * ease.outBack(k))))));
      const flight = projectile(c, from, to, { color, size: 22, dur: 0.4, arc: 0 });
      const closing: Promise<void>[] = [];
      for (let i = 0; i < 3; i++) {
        await tw.wait(0.4 * (i === 0 ? 0.3 : 0.25));
        const s = portals[i];
        closing.push(tw.run(0.1, (k) => s.scale.set(3 + k, 3 + k)).then(() => tw.run(0.25, (k) => (s.scale.x = 4 * (1 - k))))); // flares, then closes to a slit
      }
      await flight;
      onImpact(0, 1);
      ring(c, to, { color, radius: 120 });
      fx.burst(to.x, to.y, { color, count: 45, speed: 480 });
      await Promise.all([tw.wait(0.2), ...closing]);
      open = false;
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
      const frame = fxSpriteOf(c, "grid", color, { x: to.x - 260 * target.facing, y: to.y }, 3);
      frame.alpha = 0;
      let time = 0;
      const glint = () => {
        time += 1 / 60;
        loopFrame(frame, "grid", color, time);
      };
      const x0 = frame.x;
      await tw.run(
        0.25,
        (k) => {
          frame.alpha = k;
          frame.x = Math.round(x0 + (to.x - x0) * k);
          glint();
        },
        ease.outCubic,
      );
      const angles = [-0.7, 0.9, 0];
      for (let i = 0; i < 3; i++) {
        slash(c, to, { color, angle: angles[i], size: 120 + i * 10 });
        await tw.run(0.06, glint);
        onImpact(i, 3);
        fx.burst(to.x, to.y, { color, count: 20, speed: 520, spark: true });
        await tw.run(0.1, glint);
      }
      await tw.run(0.25, (k) => {
        frame.alpha = 1 - k;
        frame.x = Math.round(to.x + 160 * target.facing * k);
        glint();
      });
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
      const floorY = to.y + 120;
      const startY = from.y + 80;
      const dir = Math.sign(to.x - from.x) || 1;
      // a big breaker with two smaller swells chasing it, rolling along the floor
      const waves = [5, 3, 3].map((sc, i) => {
        const w = fxSpriteOf(c, "wave", color, from, sc);
        w.anchor.set(0.5, 1);
        w.scale.x *= dir;
        w.alpha = i ? 0.75 : 1;
        return w;
      });
      let time = 0;
      await tw.run(
        0.55,
        (k) => {
          time += 1 / 60;
          waves.forEach((w, i) => {
            const lag = i * 0.18;
            const kk = Math.max(0, (k - lag) / (1 - lag));
            w.position.set(Math.round(from.x + (to.x - from.x) * kk - dir * i * 70), Math.round(startY + (floorY - startY) * kk + i * 10)); // rolls up from the caster's ground toward the foe's
            w.visible = k >= lag;
            loopFrame(w, "wave", color, time + i * 0.13);
          });
          fx.emit({ x: waves[0].x, y: waves[0].y - 120 - Math.random() * 60, vx: 300 * dir, vy: -100, life: 0.4, size: 10, color });
        },
        ease.inCubic,
      );
      onImpact(0, 1);
      impactSpark(c, { x: to.x, y: to.y + 40 }, color, 5);
      fx.burst(to.x, to.y + 40, { color, count: 60, speed: 600, gravity: 700 });
      await tw.run(0.25, (k) => waves.forEach((w, i) => (w.alpha = (i ? 0.75 : 1) * (1 - k))));
      waves.forEach((w) => w.destroy());
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
      const v = fxSpriteOf(c, "vortex", color, to, 2);
      const glow = glowSprite(color, 260, 0.35);
      glow.position.set(to.x, to.y);
      c.layer.addChild(glow);
      let time = 0;
      await tw.run(0.75, (k) => {
        time += 1 / 60;
        loopFrame(v, "vortex", color, time);
        const sc = Math.max(2, Math.round(2 + 4 * Math.sin(Math.min(1, k * 1.4) * Math.PI * 0.5) - (k > 0.8 ? (k - 0.8) * 15 : 0)));
        v.scale.set(sc, sc * 0.8); // whole-pixel steps, tilted onto the ground plane
        v.rotation = -k * 2;
        for (let i = 0; i < 2 * fx.scale; i++) {
          const a = Math.random() * Math.PI * 2;
          fx.emit({ x: to.x + Math.cos(a) * 240, y: to.y + Math.sin(a) * 200, toX: to.x, toY: to.y, pull: 25, drag: 0.85, size: 10, life: 0.5, color });
        }
      });
      v.destroy();
      glow.destroy();
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
    case "shards": {
      const ice = 0x7dd3fc;
      const angle = Math.atan2(to.y - from.y, to.x - from.x);
      for (let i = 0; i < 5; i++) {
        const start = { x: from.x, y: from.y + (i - 2) * 30 };
        const end = { x: to.x, y: to.y + (i - 2) * 20 };
        const shard = fxSpriteOf(c, "shard", ice, start, 3);
        shard.rotation = angle;
        let time = i * 0.1;
        tw.run(
          0.25,
          (k) => {
            const p = lerp(start, end, k);
            shard.position.set(Math.round(p.x), Math.round(p.y));
            time += 1 / 60;
            loopFrame(shard, "shard", ice, time);
            if (Math.random() < 0.4) fx.emit({ x: p.x, y: p.y, vx: (Math.random() - 0.5) * 60, vy: (Math.random() - 0.5) * 60, life: 0.3, size: 7, color: 0xe0f2fe, spark: true });
          },
          ease.inQuad,
        ).then(() => {
          shard.destroy();
          onImpact(i, 5);
          impactSpark(c, end, ice, 3);
          fx.burst(end.x, end.y, { color: 0xe0f2fe, count: 10, speed: 300, spark: true });
        });
        await tw.wait(0.07);
      }
      await tw.wait(0.35);
      break;
    }
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
      const halo = glowSprite(color, 120, 0.35);
      c.layer.addChild(halo);
      const gear = fxSpriteOf(c, "gear", color, from, 3);
      let time = 0;
      await tw.run(
        0.45,
        (k) => {
          const p = lerp(from, to, k);
          const y = p.y - Math.sin(k * Math.PI) * 120;
          gear.position.set(Math.round(p.x), Math.round(y));
          halo.position.set(p.x, y);
          time += 1 / 60;
          loopFrame(gear, "gear", color, time * 2); // spins fast as it flies
          if (Math.random() < 0.6) fx.emit({ x: p.x, y, size: 8, life: 0.3, color, spark: true, vx: (Math.random() - 0.5) * 200, vy: (Math.random() - 0.5) * 200 });
        },
        ease.inQuad,
      );
      onImpact(0, 1);
      impactSpark(c, to, color, 5);
      ring(c, to, { color, radius: 120 });
      // it grinds against the target for a moment, then drops away
      await tw.run(0.18, (k) => {
        time += 1 / 60;
        loopFrame(gear, "gear", color, time * 3);
        gear.position.set(Math.round(to.x + (Math.random() - 0.5) * 6), Math.round(to.y));
        if (Math.random() < 0.8) fx.emit({ x: to.x, y: to.y + 30, vx: (Math.random() - 0.5) * 400, vy: -200 - Math.random() * 200, gravity: 900, life: 0.4, size: 7, color: 0xfde68a, spark: true });
        halo.alpha = 0.35 * (1 - k);
      });
      await tw.run(0.2, (k) => {
        gear.position.y = Math.round(to.y + k * k * 80);
        gear.alpha = 1 - k;
      });
      halo.destroy();
      gear.destroy();
      break;
    }
    case "quake": {
      const ground = { x: from.x, y: to.y + 120 };
      const stone = 0xa8a29e;
      c.camera.shake(10, 3);
      // a line of boulders bursts out of the ground toward the target
      for (let i = 0; i < 6; i++) {
        const k0 = (i + 0.5) / 6;
        const start = { x: ground.x + (to.x - ground.x) * k0, y: ground.y };
        const rock = fxSpriteOf(c, "rock", stone, start, i % 2 ? 4 : 5);
        const vx = (Math.random() - 0.5) * 120;
        const vy = -420 - Math.random() * 180;
        let time = Math.random();
        tw.run(0.6, (k) => {
          const t = k * 0.6;
          rock.position.set(Math.round(start.x + vx * t), Math.round(start.y + vy * t + 450 * t * t * 2));
          time += 1 / 60;
          loopFrame(rock, "rock", stone, time);
          rock.alpha = k < 0.75 ? 1 : (1 - k) / 0.25;
        }).then(() => rock.destroy());
        fx.emit({ x: start.x, y: ground.y, vx: (Math.random() - 0.5) * 100, vy: -300 - Math.random() * 300, gravity: 900, life: 0.6, size: 12, color });
        fx.burst(start.x, ground.y, { color: 0x78716c, count: 6, speed: 200, gravity: 900 });
        c.camera.shake(6, 4);
        await tw.wait(0.07);
      }
      // stone spires erupt on either side of the target
      const spires = [-1, 1].map((side) => {
        const sp = fxSpriteOf(c, "spike", stone, { x: to.x + side * 110, y: ground.y }, 5);
        sp.anchor.set(0.5, 1);
        if (side < 0) sp.scale.x *= -1; // mirrored, so both lean their lit face inward
        return sp;
      });
      await tw.run(0.2, (k) => spires.forEach((sp) => setFxFrame(sp, "spike", stone, k * 0.75)));
      onImpact(0, 1);
      impactSpark(c, to, color, 5);
      ring(c, { x: to.x, y: ground.y }, { color, radius: 200, squash: 0.3, width: 16 });
      await tw.wait(0.25);
      spires.forEach((sp) => setFxFrame(sp, "spike", stone, 0.99));
      await tw.run(0.25, (k) =>
        spires.forEach((sp) => {
          sp.alpha = 1 - k;
          sp.position.y = Math.round(ground.y + k * 30);
        }),
      );
      spires.forEach((sp) => sp.destroy());
      break;
    }
    case "wind": {
      const flip = to.x < from.x; // the blade sprite flies right by default
      for (let i = 0; i < 3; i++) {
        const start = { x: from.x, y: from.y + (i - 1) * 50 };
        const blade = fxSpriteOf(c, "gust", color, start, 3);
        if (flip) blade.scale.x *= -1;
        let time = i * 0.12;
        tw.run(0.35, (k) => {
          const p = lerp(start, to, k);
          blade.position.set(Math.round(p.x), Math.round(p.y + Math.sin(k * Math.PI) * (i - 1) * 30));
          time += 1 / 60;
          loopFrame(blade, "gust", color, time);
        }).then(() => {
          blade.destroy();
          onImpact(i, 3);
          slash(c, to, { color, angle: (i - 1) * 0.5, size: 110, dur: 0.2 });
          fx.burst(to.x, to.y, { color, count: 15, speed: 350, spark: true });
        });
        await tw.wait(0.12);
      }
      await tw.wait(0.35);
      break;
    }
    case "breath": {
      const mouths = isHydra(boss) ? boss.mouths() : [from];
      let n = 0;
      await tw.run(0.7, () => {
        for (const m of mouths) {
          const dx = to.x - m.x;
          const dy = to.y - m.y;
          const d = Math.hypot(dx, dy);
          if (n++ % 2 === 0) {
            // a pixel fireball that swells as it flies
            const puff = fxSpriteOf(c, "flame", color, m, 3);
            puff.rotation = Math.atan2(dy, dx);
            const jitter = (Math.random() - 0.5) * 50;
            let time = Math.random();
            tw.run(0.32, (k) => {
              puff.position.set(Math.round(m.x + dx * k - (dy / d) * jitter * k), Math.round(m.y + dy * k + (dx / d) * jitter * k));
              puff.scale.set(Math.round(3 + k * 4));
              time += 1 / 60;
              loopFrame(puff, "flame", color, time);
            }).then(() => puff.destroy());
          }
          for (let i = 0; i < c.fx.scale; i++)
            fx.emit({ x: m.x, y: m.y, vx: (dx / d) * 900 + (Math.random() - 0.5) * 120, vy: (dy / d) * 900 + (Math.random() - 0.5) * 120, drag: 0.97, life: 0.5, size: 14, sizeEnd: 28, color: Math.random() < 0.5 ? color : 0xfde047, alpha: 0.6 });
        }
      });
      await tw.wait(0.25);
      onImpact(0, 1);
      impactSpark(c, to, color, 5);
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
