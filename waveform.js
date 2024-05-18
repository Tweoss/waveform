class WaveformProcessor extends AudioWorkletProcessor {
   constructor(...args) {
    super(...args);
    this.buffer = new Float32Array(44100 / 220);
    this.duration = 1 / 220;
    this.index = 0;
    this.port.onmessage = (e) => {
      if (e.data.msg == "set-duration") {
        this.duration = e.data.duration;
      } else if (e.data.msg == "set-buffer") {
        this.buffer = e.data.buffer;
      }
    };
  }

  process(_inputs, outputs, _parameters) {
    const output = outputs[0];
    const channel = output[0];
    for (let i = 0; i < channel.length; i++) {
      const index = (i + this.index) * this.buffer.length / this.duration / 44100;
      const [lower, upper] = [Math.floor(index) % this.buffer.length, Math.ceil(index) % this.buffer.length];
      const upper_ratio = (index % this.buffer.length) - lower;
      channel[i] = this.buffer[lower] * (1 - upper_ratio) + this.buffer[upper] * upper_ratio;
    }
    this.index += channel.length;
    return true;
  }
}

registerProcessor("waveform-processor", WaveformProcessor);
// class WaveformProcessor extends AudioWorkletProcessor {
//    constructor(...args) {
//     super(...args);
//     this.buffer = new Float32Array(44100 / 220);
//     this.index = 0;
//     this.port.onmessage = (e) => {
//       if (e.data.msg == "set-duration") {
//         this.buffer = new Float32Array(44100 * e.data.duration)
//         console.log(this.buffer.length)
//       } else if (e.data.msg == "set-buffer") {
//         const buffer = e.data.buffer;
//         // Linearly interpolate the input to get new buffer.
//         for (let i = 0; i < this.buffer.length; i++) {
//           const index = (i / this.buffer.length) * buffer.length;
//           const [lower, upper] = [Math.floor(index), Math.min(Math.ceil(index), buffer.length - 1)];
//           const upper_ratio = index - lower;
//           this.buffer[i] = buffer[lower] * (1 - upper_ratio) + buffer[upper] * upper_ratio;
//         }
//       }
//     };
//   }

//   process(_inputs, outputs, _parameters) {
//     const output = outputs[0];
//     let length = 0;
//     output.forEach((channel) => {
//       for (let i = 0; i < channel.length; i++) {
//         channel[i] = this.buffer[(this.index + i) % this.buffer.length];
//       }
//       length = channel.length;
//     });
//     this.index = (this.index + length) % this.buffer.length;
//     return true;
//   }
// }

// registerProcessor("waveform-processor", WaveformProcessor);
