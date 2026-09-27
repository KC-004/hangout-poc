import { touchControls } from "./touch";
import "./style.css";
import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { Client, Room as GameRoom } from "@colyseus/sdk";
import {
  Room as VoiceRoom,
  RoomEvent,
  Track,
  RemoteAudioTrack,
} from "livekit-client";
import { obstacles, SIZE } from "../shared/world";
const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const canvas = $<HTMLCanvasElement>("world"),
  engine = new Engine(canvas, true),
  scene = new Scene(engine);
scene.clearColor = new Color4(0.64, 0.81, 0.8, 1);
scene.fogMode = Scene.FOGMODE_EXP;
scene.fogDensity = 0.004;
scene.fogColor = new Color3(0.64, 0.81, 0.8);
const camera = new ArcRotateCamera(
  "camera",
  -Math.PI / 2,
  1.02,
  15,
  new Vector3(0, 1, 0),
  scene,
);
camera.attachControl(canvas, true);
camera.lowerRadiusLimit = 7;
camera.upperRadiusLimit = 28;
camera.upperBetaLimit = 1.4;
camera.lowerBetaLimit = 0.35;
camera.inputs.removeByType("ArcRotateCameraKeyboardMoveInput");
new HemisphericLight("sky", new Vector3(0, 1, 0), scene).intensity = 0.65;
new DirectionalLight("sun", new Vector3(-0.6, -1, 0.4), scene).intensity = 0.65;
function mat(name: string, hex: string) {
  const m = new StandardMaterial(name, scene);
  m.diffuseColor = Color3.FromHexString(hex);
  m.specularColor = Color3.Black();
  return m;
}
const grass = mat("meadow", "#78A56C"),
  stone = mat("stone", "#90A5A1"),
  trunk = mat("bark", "#785A43"),
  leaf = mat("canopy", "#38775A"),
  path = mat("sand", "#D7C599"),
  skin = mat("skin", "#D9A57D"),
  blue = mat("male", "#447A9A"),
  coral = mat("female", "#D67A63"),
  dark = mat("boots", "#263C42");
const ground = MeshBuilder.CreateGround(
  "ground",
  { width: SIZE * 2, height: SIZE * 2 },
  scene,
);
ground.material = grass;
const plaza = MeshBuilder.CreateCylinder(
  "plaza",
  { diameter: 25, height: 0.06, tessellation: 64 },
  scene,
);
plaza.material = path;
for (const o of obstacles) {
  if (o.rock) {
    const m = MeshBuilder.CreateIcoSphere(
      "rock",
      { radius: o.r, subdivisions: 1, flat: true },
      scene,
    );
    m.position.set(o.x, 0.7, o.z);
    m.scaling.y = 0.7;
    m.material = stone;
  } else {
    const t = MeshBuilder.CreateCylinder(
      "trunk",
      { height: 3, diameter: 0.7, tessellation: 6 },
      scene,
    );
    t.position.set(o.x, 1.5, o.z);
    t.material = trunk;
    const l = MeshBuilder.CreateCylinder(
      "tree",
      { height: 6, diameterBottom: 5, diameterTop: 0, tessellation: 7 },
      scene,
    );
    l.position.set(o.x, 5, o.z);
    l.material = leaf;
  }
}
for (const x of [-SIZE, SIZE]) {
  const m = MeshBuilder.CreateBox(
    "edge",
    { width: 0.5, height: 2, depth: SIZE * 2 },
    scene,
  );
  m.position.set(x, 1, 0);
  m.material = stone;
}
for (const z of [-SIZE, SIZE]) {
  const m = MeshBuilder.CreateBox(
    "edge",
    { width: SIZE * 2, height: 2, depth: 0.5 },
    scene,
  );
  m.position.set(0, 1, z);
  m.material = stone;
}
type Figure = {
  root: TransformNode;
  arms: TransformNode[];
  legs: TransformNode[];
  label: DynamicTexture;
  attack: number;
  pulse: number;
};
function figure(name: string, avatar: string): Figure {
  const root = new TransformNode("explorer", scene);
  const outfit = avatar === "female" ? coral : blue;
  const box = (
    n: string,
    w: number,
    h: number,
    d: number,
    y: number,
    m: StandardMaterial,
    x = 0,
  ) => {
    const b = MeshBuilder.CreateBox(
      n,
      { width: w, height: h, depth: d },
      scene,
    );
    b.parent = root;
    b.position.set(x, y, 0);
    b.material = m;
    return b;
  };
  box("torso", 0.75, 0.85, 0.42, 1.25, outfit);
  const head = MeshBuilder.CreateSphere(
    "head",
    { diameter: 0.54, segments: 8 },
    scene,
  );
  head.parent = root;
  head.position.y = 1.96;
  head.material = skin;
  const hair = box(
    "hair",
    0.57,
    avatar === "female" ? 0.45 : 0.18,
    0.55,
    avatar === "female" ? 2.04 : 2.17,
    dark,
  );
  hair.position.z = -0.08;
  const arms = [
    box("arm", 0.23, 0.75, 0.26, 1.25, skin, -0.52),
    box("arm", 0.23, 0.75, 0.26, 1.25, skin, 0.52),
  ];
  const legs = [
    box("leg", 0.28, 0.75, 0.32, 0.43, dark, -0.22),
    box("leg", 0.28, 0.75, 0.32, 0.43, dark, 0.22),
  ];
  const label = new DynamicTexture(
    "name",
    { width: 512, height: 96 },
    scene,
    false,
  );
  label.hasAlpha = true;
  label.drawText(name, null, 65, "bold 42px Arial", "white", "#183b35", true);
  const lm = new StandardMaterial("label", scene);
  lm.diffuseTexture = label;
  lm.emissiveColor = Color3.White();
  lm.disableLighting = true;
  lm.useAlphaFromDiffuseTexture = true;
  const plane = MeshBuilder.CreatePlane(
    "nameplate",
    { width: 3, height: 0.56 },
    scene,
  );
  plane.parent = root;
  plane.position.y = 2.65;
  plane.billboardMode = 7;
  plane.material = lm;
  return { root, arms, legs, label, attack: 0, pulse: 0 };
}
const preview = figure("Your next adventure", "male");
preview.root.position.set(5, 0, 0);
camera.target.set(3, 1, 0);
let room: GameRoom<any> | undefined,
  voice: VoiceRoom | undefined,
  voicePending = false,
  voiceMuted = false;
const figures = new Map<string, Figure>(),
  keys = new Set<string>();
const touch = touchControls(() => room?.send("attack"));
for (const action of ["jump", "wave", "dance"]) {
  $(action).onclick = () => {
    if (action === "jump") room?.send("jump");
    else room?.send("emote", action);
  };
}
let sent = 0;
window.addEventListener("keydown", (e) => {
  if (!room || document.activeElement?.tagName === "INPUT") return;
  if (
    [
      "KeyW",
      "KeyA",
      "KeyS",
      "KeyD",
      "ShiftLeft",
      "KeyF",
      "Space",
      "KeyG",
      "KeyH",
    ].includes(e.code)
  )
    e.preventDefault();
  keys.add(e.code);
  if (e.code === "KeyF" && !e.repeat) room.send("attack");
  if (e.code === "Space" && !e.repeat) room.send("jump");
  if (e.code === "KeyG" && !e.repeat) room.send("emote", "wave");
  if (e.code === "KeyH" && !e.repeat) room.send("emote", "dance");
});
window.addEventListener("keyup", (e) => keys.delete(e.code));
window.addEventListener("blur", () => keys.clear());
$<HTMLSelectElement>("avatar").onchange = () => {
  preview.root.getChildMeshes().find((m) => m.name === "torso")!.material =
    $<HTMLSelectElement>("avatar").value === "female" ? coral : blue;
};
function shutdown(message = "") {
  keys.clear();
  touch.reset();
  room = undefined;
  void voice?.disconnect();
  voice = undefined;
  voicePending = false;
  voiceMuted = false;
  $("voice").textContent = "Mic off";
  $("voiceStatus").textContent = "Voice off";
  for (const f of figures.values()) {
    f.root.dispose(false, false);
    f.label.dispose();
  }
  figures.clear();
  preview.root.setEnabled(true);
  $("hud").hidden = true;
  $("lobby").hidden = false;
  $("joinStatus").textContent = message;
}
$<HTMLFormElement>("join").onsubmit = async (e) => {
  e.preventDefault();
  const button = $("join").querySelector("button")!;
  button.disabled = true;
  $("joinStatus").textContent = "Connecting to the world…";
  try {
    const url =
      import.meta.env.VITE_SERVER_URL ||
      `${location.protocol === "https:" ? "wss" : "ws"}://${location.hostname}:2567`;
    room = await new Client(url).joinOrCreate("arena", {
      name: $<HTMLInputElement>("name").value,
      avatar: $<HTMLSelectElement>("avatar").value,
    });
    room.onMessage("voiceToken", async (data) => {
      voicePending = false;
      if (data.error) {
        $("voiceStatus").textContent = data.error;
        return;
      }
      try {
        const v = new VoiceRoom({ adaptiveStream: true });
        voice = v;
        v.on(RoomEvent.TrackSubscribed, (track) => {
          if (track.kind === Track.Kind.Audio) {
            (track as RemoteAudioTrack).setVolume(0);
            const el = track.attach();
            el.dataset.voice = "true";
            document.body.appendChild(el);
          }
        });
        v.on(RoomEvent.TrackUnsubscribed, (track) =>
          track.detach().forEach((el) => el.remove()),
        );
        await v.connect(data.url, data.token, { autoSubscribe: true });
        await v.startAudio();
        await v.localParticipant.setMicrophoneEnabled(true);
        $("voice").textContent = "Mic on";
        $("voiceStatus").textContent = "Voice on · within 25 m";
      } catch {
        await voice?.disconnect();
        voice = undefined;
        $("voiceStatus").textContent =
          "Voice failed. Allow microphone access and retry.";
      }
    });
    room.onLeave(() =>
      shutdown("You left the world. Join again whenever you like."),
    );
    room.onError((_code, message) => {
      $("status").textContent = message || "Connection error";
    });
    $("playerName").textContent = $<HTMLInputElement>("name").value;
    $("lobby").hidden = true;
    $("hud").hidden = false;
    preview.root.setEnabled(false);
    (document.activeElement as HTMLElement)?.blur();
    canvas.focus();
  } catch (err) {
    $("joinStatus").textContent =
      `Could not join. Make sure the game server is running. ${err instanceof Error ? err.message : ""}`;
  } finally {
    button.disabled = false;
  }
};
$("leave").onclick = () => {
  void room?.leave();
};
$("voice").onclick = async () => {
  if (!room) return;
  if (voice) {
    try {
      voiceMuted = !voiceMuted;
      await voice.localParticipant.setMicrophoneEnabled(!voiceMuted);
      $("voice").textContent = voiceMuted ? "Muted" : "Mic on";
      $("voiceStatus").textContent = voiceMuted
        ? "Mic muted · still listening"
        : "Voice on · within 25 m";
    } catch {
      $("voiceStatus").textContent = "Microphone change failed.";
    }
    return;
  }
  if (voicePending) return;
  voicePending = true;
  $("voiceStatus").textContent = "Connecting voice…";
  room.send("voiceToken");
};
engine.runRenderLoop(() => {
  const dt = Math.min(engine.getDeltaTime() / 1000, 0.1),
    now = performance.now();
  const players = room?.state?.players;
  if (players) {
    const mine = players.get(room!.sessionId);
    if (mine) {
      if (now - sent > 50) {
        let f =
            (keys.has("KeyW") ? 1 : 0) -
            (keys.has("KeyS") ? 1 : 0) +
            touch.state.forward,
          s =
            (keys.has("KeyD") ? 1 : 0) -
            (keys.has("KeyA") ? 1 : 0) +
            touch.state.x;
        const a = camera.alpha;
        room!.send("input", {
          x: -Math.cos(a) * f - Math.sin(a) * s,
          z: -Math.sin(a) * f + Math.cos(a) * s,
          run:
            touch.state.run || keys.has("ShiftLeft") || keys.has("ShiftRight"),
        });
        sent = now;
      }
      const local = figures.get(room!.sessionId);
      if (local)
        camera.target = Vector3.Lerp(
          camera.target,
          local.root.position.add(new Vector3(0, 1, 0)),
          1 - Math.exp(-10 * dt),
        );
      $<HTMLProgressElement>("health").value = mine.health;
      $("stats").textContent = `${mine.health} HP · ${mine.score} knockouts`;
      $("status").textContent =
        mine.health <= 0
          ? "Knocked out — respawning in 3 seconds…"
          : "Friendly arena · 25 damage per punch";
    }
    const near: string[] = [];
    players.forEach((p: any, id: string) => {
      let f = figures.get(id);
      if (!f) {
        f = figure(p.name, p.avatar);
        f.root.position.set(p.x, 0, p.z);
        figures.set(id, f);
      }
      const distance = Math.hypot(
        f.root.position.x - p.x,
        f.root.position.z - p.z,
      );
      f.root.position = Vector3.Lerp(
        f.root.position,
        new Vector3(p.x, p.y || 0, p.z),
        distance > 15 ? 1 : 1 - Math.exp(-15 * dt),
      );
      f.root.rotation.y = p.yaw;
      f.root.scaling.y = p.health <= 0 ? 0.25 : 1;
      const step = distance > 0.04 ? Math.sin(now * 0.014) * 0.5 : 0;
      f.legs[0].rotation.x = step;
      f.legs[1].rotation.x = -step;
      if (f.attack !== p.attack) {
        f.attack = p.attack;
        f.pulse = now + 200;
      }
      f.arms[0].rotation.x = now < f.pulse ? -1.5 : -step;
      f.arms[1].rotation.x = step;
      f.arms[0].rotation.z = 0;
      f.root.rotation.z = 0;
      if (p.emote === "wave") {
        f.arms[0].rotation.z = 2.5 + Math.sin(now * 0.014) * 0.35;
      } else if (p.emote === "dance") {
        f.root.rotation.z = Math.sin(now * 0.008) * 0.12;
        f.arms[0].rotation.z = 1.3 + Math.sin(now * 0.01) * 0.4;
        f.arms[1].rotation.x = Math.sin(now * 0.01) * 1.2;
        f.legs[0].rotation.x = Math.sin(now * 0.01) * 0.5;
        f.legs[1].rotation.x = -f.legs[0].rotation.x;
      }
      if (mine && id !== room!.sessionId) {
        const d = Math.hypot(p.x - mine.x, p.z - mine.z);
        if (d < 25) near.push(p.name);
        voice?.remoteParticipants
          .get(id)
          ?.audioTrackPublications.forEach((pub) => {
            (pub.audioTrack as RemoteAudioTrack | undefined)?.setVolume(
              Math.pow(Math.max(0, 1 - d / 25), 2),
            );
          });
      }
    });
    for (const [id, f] of figures) {
      if (!players.has(id)) {
        f.root.dispose(false, false);
        f.label.dispose();
        figures.delete(id);
      }
    }
    $("population").textContent = `${players.size} / 10 explorers`;
    $("nearby").textContent = near.length
      ? `Within earshot: ${near.join(", ")}`
      : "No explorers within earshot";
  } else {
    preview.root.rotation.y += dt * 0.2;
  }
  scene.render();
});
window.addEventListener("resize", () => engine.resize());
