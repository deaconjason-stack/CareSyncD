function cloneEvent(event) {
  return event && typeof event === 'object' ? { ...event } : event;
}

export function buildReplayFrames(timeline = []) {
  if (!Array.isArray(timeline)) throw new Error('Timeline must be an array');
  return timeline.map((event, sequence) => Object.freeze({ ...cloneEvent(event), sequence }));
}

export function frameAtMinute(frames = [], minute) {
  if (!Number.isFinite(minute)) throw new Error('Replay minute must be finite');
  let selected = null;
  for (const frame of frames) {
    if (!Number.isFinite(frame?.minute)) continue;
    if (frame.minute <= minute) selected = frame;
    else break;
  }
  return selected;
}
