import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const sampleRate = 22050;
const outputDir = path.join(process.cwd(), "public", "sounds", "food-chest");

function envelope(t, duration) {
  const attack = Math.min(0.012, duration * 0.15);
  const release = Math.min(0.08, duration * 0.35);
  if (t < attack) return t / attack;
  if (t > duration - release) return (duration - t) / release;
  return 1;
}

function tone(duration, startFrequency, endFrequency, volume = 0.3) {
  const count = Math.floor(duration * sampleRate);
  const samples = new Float32Array(count);
  let phase = 0;
  for (let i = 0; i < count; i++) {
    const t = i / sampleRate;
    const progress = t / duration;
    const frequency =
      startFrequency + (endFrequency - startFrequency) * progress;
    phase += (Math.PI * 2 * frequency) / sampleRate;
    samples[i] =
      Math.sin(phase) * volume * envelope(t, duration) +
      Math.sin(phase * 2.01) * volume * 0.08 * envelope(t, duration);
  }
  return samples;
}

function sequence(duration, notes) {
  const samples = new Float32Array(Math.floor(duration * sampleRate));
  for (const note of notes) {
    const part = tone(note.duration, note.start, note.end, note.volume);
    const offset = Math.floor(note.at * sampleRate);
    for (let i = 0; i < part.length && offset + i < samples.length; i++) {
      samples[offset + i] += part[i];
    }
  }
  return samples;
}

function writeWav(fileName, samples) {
  const buffer = Buffer.alloc(44 + samples.length * 2);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + samples.length * 2, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(sample * 32767), 44 + i * 2);
  }
  writeFileSync(path.join(outputDir, fileName), buffer);
}

mkdirSync(outputDir, { recursive: true });

writeWav("chest-click.wav", tone(0.12, 980, 420, 0.42));
writeWav("reel-tick.wav", tone(0.045, 1550, 900, 0.32));
writeWav(
  "chest-open.wav",
  sequence(0.62, [
    { at: 0, duration: 0.18, start: 260, end: 520, volume: 0.3 },
    { at: 0.13, duration: 0.2, start: 520, end: 880, volume: 0.28 },
    { at: 0.28, duration: 0.3, start: 880, end: 1320, volume: 0.24 },
  ])
);
writeWav(
  "reward-sting.wav",
  sequence(0.9, [
    { at: 0, duration: 0.18, start: 523, end: 523, volume: 0.25 },
    { at: 0.14, duration: 0.18, start: 659, end: 659, volume: 0.25 },
    { at: 0.28, duration: 0.2, start: 784, end: 784, volume: 0.27 },
    { at: 0.46, duration: 0.38, start: 1047, end: 1175, volume: 0.24 },
  ])
);
