export class Pane {
  samples: number[];
  duration: number;
  pane_node: AudioNode | null;
  on_change: () => void | null;
  context: BaseAudioContext;
  container: Element;
  output_node: AudioNode | null;
  dragging: boolean;
  svg: SVGElement;
  path: SVGPathElement;
  last_pos: [number, number] | null;
  waveform_node: AudioWorkletNode;
  toggled_on: boolean;
  removed: boolean;

  constructor(
    context: BaseAudioContext,
    output_node: AudioNode | null,
    container: Element,
    on_change: () => void | null,
  ) {
    this.container = container;
    this.toggled_on = output_node != null;
    this.on_change = on_change;
    this.duration = 1.0 / 110.0;
    this.output_node = output_node;
    this.context = context;
    this.removed = false;
    this.samples = new Array(
      Math.floor(this.duration * this.context.sampleRate),
    ).fill(0.0);
    const frequency_ratio = Math.ceil(Math.random() * 3);
    for (let i = 0; i < this.samples.length; i++) {
      this.samples[i] = Math.sin(
        (2 * Math.PI * frequency_ratio * i) / this.samples.length,
      );
    }

    if (this.output_node != null) {
      this.waveform_node = new AudioWorkletNode(context, "waveform-processor");
      this.waveform_node.connect(this.output_node);
      this.update_samples(this.samples);

      const add_button = (name, callback) => {
        const button = document.createElement("button");
        button.textContent = name;
        button.addEventListener("click", callback);
        container.appendChild(button);
      };

      add_button("Smooth", this.smooth.bind(this));
      add_button("Remove", this.remove.bind(this));
      add_button("Toggle Sound", this.toggle.bind(this));
    }

    const svg_container = document.createElement("div");
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "-100 -100 200 100");
    svg.setAttributeNS(
      "http://www.w3.org/2000/xmlns/",
      "xmlns:xlink",
      "http://www.w3.org/1999/xlink",
    );
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    this.path = path;
    this.update_line();
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "black");
    svg.appendChild(path);
    if (this.output_node != null) {
      svg.addEventListener("mousedown", (e) => {
        this.dragging = true;
        this.handle_mouse(e);
      });
      svg.addEventListener("mouseup", () => {
        this.dragging = false;
        this.last_pos = null;
      });
      svg.addEventListener("mousemove", (e) => {
        if (this.dragging) {
          this.handle_mouse(e);
        }
      });
      document.body.addEventListener("mouseup", (_) => {
        this.dragging = false;
        this.last_pos = null;
      });
      document.body.addEventListener(
        "mousedown",
        (_) => (this.dragging = true),
      );
    }

    this.svg = svg;
    svg_container.appendChild(svg);
    container.appendChild(svg_container);
  }

  get_samples(): number[] {
    if (!this.toggled_on) {
      return new Array(this.samples.length).fill(0);
    }
    return this.samples;
  }

  set_samples(data: number[]) {
    this.samples = data;
    this.update_line();
    if (this.output_node != null) {
      this.update_samples(this.samples);
    }
  }

  update_line() {
    let path_data = "M -100 0 ";
    const to_line = (s: number, i: number) => {
      const [x, y] = this.to_svg(i, s);
      return `L ${x} ${y}`;
    };
    path_data += this.samples.map(to_line).join(" ");
    this.path.setAttribute("d", path_data);
    this.on_change();
  }

  update_samples(data: number[]) {
    this.waveform_node.port.postMessage(new Float32Array(data));
  }

  to_svg(x: number, y: number): [number, number] {
    return [(200 * x) / this.samples.length - 100, -y * 50 - 50];
  }

  smooth() {
    const get_with_offset = (start_i: number) => (offset: number) =>
      this.samples[
        (start_i + offset + this.samples.length) % this.samples.length
      ];
    const offsets = [-1, 0, 1];
    const sum = (a: number[]) => a.reduce((a, e) => a + e, 0);
    const max = (a: number[]) =>
      a.reduce((a, e) => Math.max(a, Math.abs(e)), 0);
    const max_before = Math.min(max(this.samples), 1);
    for (let i = 0; i < this.samples.length; i++) {
      this.samples[i] = sum(offsets.map(get_with_offset(i))) / offsets.length;
    }
    const max_after = max(this.samples);
    const ratio = max_after == 0 ? 1 : max_before / max_after;
    for (let i = 0; i < this.samples.length; i++) {
      this.samples[i] *= ratio;
    }

    this.update_line();
    this.update_samples(this.samples);
  }

  remove() {
    this.container.remove();
    this.waveform_node.disconnect();
    this.removed = true;
  }

  is_dead() {
    return this.removed;
  }

  toggle() {
    this.toggled_on = !this.toggled_on;
    if (this.toggled_on && this.output_node != null) {
      this.waveform_node.connect(this.output_node);
    } else {
      this.waveform_node.disconnect();
    }
    this.on_change();
  }

  from_svg(clientX: number, clientY: number): [number, number] {
    const rect = this.svg.getBoundingClientRect();
    return [
      Math.max(
        0,
        Math.min(
          Math.round(
            ((clientX - rect.left) / rect.width) * this.samples.length,
          ),
          this.samples.length - 1,
        ),
      ),
      -(((clientY - rect.top) / rect.height) * 2 - 1),
    ];
  }

  handle_mouse(e: MouseEvent) {
    if (this.last_pos == null) {
      this.last_pos = [e.clientX, e.clientY];
    }
    const [new_i, new_y] = this.from_svg(e.clientX, e.clientY);
    const [old_i, old_y] = this.from_svg(this.last_pos[0], this.last_pos[1]);
    let [[start_i, start_y], [end_i, end_y]] = [
      [old_i, old_y],
      [new_i, new_y],
    ];
    if (end_i < start_i) {
      [start_i, end_i] = [end_i, start_i];
      [start_y, end_y] = [end_y, start_y];
    }
    if (start_i == end_i) {
      this.samples[end_i] = end_y;
    } else {
      for (let i = start_i; i <= end_i; i++) {
        const ratio = (i - start_i) / (end_i - start_i);
        this.samples[i] = start_y * (1 - ratio) + end_y * ratio;
      }
    }
    this.update_line();
    this.update_samples(this.samples);
    this.last_pos = [e.clientX, e.clientY];
  }
}
