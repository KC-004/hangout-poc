export function touchControls(attack: () => void) {
  const pad = document.getElementById("joystick")!;
  const knob = document.getElementById("stick")!;
  const run = document.getElementById("run")!;
  const state = { x: 0, forward: 0, run: false };
  let pointer: number | undefined;
  function reset() {
    pointer = undefined;
    state.x = state.forward = 0;
    state.run = false;
    knob.style.transform = "";
    run.setAttribute("aria-pressed", "false");
  }
  function update(e: PointerEvent) {
    const rect = pad.getBoundingClientRect();
    const dx = e.clientX - rect.left - rect.width / 2;
    const dy = e.clientY - rect.top - rect.height / 2;
    const radius = rect.width * 0.32;
    const length = Math.hypot(dx, dy);
    const scale = length > radius ? radius / length : 1;
    state.x = length < 6 ? 0 : (dx * scale) / radius;
    state.forward = length < 6 ? 0 : (-dy * scale) / radius;
    knob.style.transform = `translate(${dx * scale}px, ${dy * scale}px)`;
  }
  pad.addEventListener("pointerdown", (e) => {
    if (pointer !== undefined) return;
    e.preventDefault();
    pointer = e.pointerId;
    pad.setPointerCapture(pointer);
    update(e);
  });
  pad.addEventListener("pointermove", (e) => {
    if (e.pointerId === pointer) update(e);
  });
  for (const event of ["pointerup", "pointercancel", "lostpointercapture"]) {
    pad.addEventListener(event, (e) => {
      if ((e as PointerEvent).pointerId !== pointer) return;
      pointer = undefined;
      state.x = state.forward = 0;
      knob.style.transform = "";
    });
  }
  run.onclick = () => {
    state.run = !state.run;
    run.setAttribute("aria-pressed", String(state.run));
  };
  document.getElementById("punch")!.onclick = attack;
  window.addEventListener("blur", reset);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) reset();
  });
  window.addEventListener("resize", reset);
  return { state, reset };
}
