class WaveformProcessor extends AudioWorkletProcessor {
   constructor(...args) {
    super(...args);
    this.buffer = new Float32Array(44100);
    this.index = 0;
    this.port.onmessage = (e) => {
      this.buffer = e.data;
      this.index = this.index % this.buffer.length;
    };
  }

  process(_inputs, outputs, _parameters) {
    const output = outputs[0];
    let length = 0;
    output.forEach((channel) => {
      for (let i = 0; i < channel.length; i++) {
        channel[i] = this.buffer[(this.index + i) % this.buffer.length];
      }
      length = channel.length;
    });
    this.index = (this.index + length) % this.buffer.length;
    return true;
  }
}

registerProcessor("waveform-processor", WaveformProcessor);
