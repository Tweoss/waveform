import { Pane } from "./pane.js";

export const TRACK_COUNT = 10;
export const SVG_WINDOW = { x_min: -100, x_max: 100, y_min: -100, y_max: 100 };

let audio_context: AudioContext,
  output_node: AudioNode,
  sample_buffer: Float32Array;
const panes_container = document.querySelector(".panes");
let panes: Pane[] = [];

// Controls: add new pane, remove selected.
// Pane: draw / update array. later, changing pane duration, volume

// maybe output pane, allowing sum waveforms, changing pane duration

async function initialize() {
  let uninitialized = true;
  let output_pane: Pane | null = null;

  const update_output = () => {
    panes = panes.filter((e) => !e.is_dead());
    if (output_pane != null) {
      let output_buffer = new Array(10).fill(0);
      for (const pane of panes) {
        const pane_buffer = pane.get_samples();
        if (pane_buffer.length > output_buffer.length) {
          output_buffer = output_buffer.concat(
            new Array(pane_buffer.length - output_buffer.length).fill(0),
          );
        }
        for (let i = 0; i < pane_buffer.length; i++) {
          output_buffer[i] += pane_buffer[i];
        }
      }

      const max = (a: number[]) =>
        a.reduce((a, e) => Math.max(a, Math.abs(e)), 0);
      const max_value = max(output_buffer);

      if (max_value > 0) {
        for (let i = 0; i < output_buffer.length; i++) {
          output_buffer[i] *= 1 / max_value;
        }
      }

      output_pane.set_samples(output_buffer);
    }
  };

  document.querySelector("#add-pane")?.addEventListener("click", async () => {
    if (uninitialized) {
      uninitialized = false;
      audio_context = new AudioContext();
      const compressor_node = new DynamicsCompressorNode(audio_context, {});
      output_node = new GainNode(audio_context, { gain: 0.1 });
      compressor_node.connect(output_node);
      output_node.connect(audio_context.destination);
      await audio_context.audioWorklet.addModule("waveform.js");
      const output_div = document.querySelector("#output-pane") as Element;
      output_pane = new Pane(audio_context, null, output_div, () => {});
    }
    const new_div = document.createElement("div");
    new_div.className = "pane";
    panes = panes.concat([
      new Pane(audio_context, output_node, new_div, update_output),
    ]);
    update_output();
    panes_container?.appendChild(new_div);
  });
}

initialize();
