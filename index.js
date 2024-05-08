var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Pane } from "./pane.js";
export const TRACK_COUNT = 10;
export const SVG_WINDOW = { x_min: -100, x_max: 100, y_min: -100, y_max: 100 };
let audio_context, output_node, sample_buffer;
const panes_container = document.querySelector(".panes");
let panes = [];
// Controls: add new pane, remove selected.
// Pane: draw / update array. later, changing pane duration, volume
// maybe output pane, allowing sum waveforms, changing pane duration
function initialize() {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        let uninitialized = true;
        let output_pane = null;
        const update_output = () => {
            panes = panes.filter((e) => !e.is_dead());
            if (output_pane != null) {
                let output_buffer = new Array(10).fill(0);
                for (const pane of panes) {
                    const pane_buffer = pane.get_samples();
                    if (pane_buffer.length > output_buffer.length) {
                        output_buffer = output_buffer.concat(new Array(pane_buffer.length - output_buffer.length).fill(0));
                    }
                    for (let i = 0; i < pane_buffer.length; i++) {
                        output_buffer[i] += pane_buffer[i];
                    }
                }
                const max = (a) => a.reduce((a, e) => Math.max(a, Math.abs(e)), 0);
                const max_value = max(output_buffer);
                if (max_value > 0) {
                    for (let i = 0; i < output_buffer.length; i++) {
                        output_buffer[i] *= 1 / max_value;
                    }
                }
                output_pane.set_samples(output_buffer);
            }
        };
        (_a = document.querySelector("#add-pane")) === null || _a === void 0 ? void 0 : _a.addEventListener("click", () => __awaiter(this, void 0, void 0, function* () {
            if (uninitialized) {
                uninitialized = false;
                audio_context = new AudioContext();
                const compressor_node = new DynamicsCompressorNode(audio_context, {});
                output_node = new GainNode(audio_context, { gain: 0.1 });
                compressor_node.connect(output_node);
                output_node.connect(audio_context.destination);
                yield audio_context.audioWorklet.addModule("waveform.js");
                const output_div = document.querySelector("#output-pane");
                output_pane = new Pane(audio_context, null, output_div, () => { });
            }
            const new_div = document.createElement("div");
            new_div.className = "pane";
            panes = panes.concat([
                new Pane(audio_context, output_node, new_div, update_output),
            ]);
            update_output();
            panes_container === null || panes_container === void 0 ? void 0 : panes_container.appendChild(new_div);
        }));
    });
}
initialize();
