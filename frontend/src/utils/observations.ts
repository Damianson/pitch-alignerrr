import type { ComparisonResult } from '../types';

export interface ObservationNote {
  category: 'Pacing' | 'Elongation' | 'Compression' | 'Drift' | 'Pitch Dynamics' | 'Voicing Continuity';
  title: string;
  detail: string;
  metric?: string;
  status: 'neutral' | 'alert' | 'good';
}

export function generateObservations(data: ComparisonResult): ObservationNote[] {
  const notes: ObservationNote[] = [];
  const words = data.words || [];

  // 1. Overall Speaking Rate / Pacing
  if (data.reference_duration_ms > 0 && data.learner_duration_ms > 0) {
    const paceRatio = data.learner_duration_ms / data.reference_duration_ms;
    const diff = data.duration_difference_ms;
    const sign = diff >= 0 ? '+' : '';
    const paceDesc =
      paceRatio > 1.15
        ? `${paceRatio.toFixed(2)}× slower overall cadence`
        : paceRatio < 0.88
        ? `${paceRatio.toFixed(2)}× faster overall cadence`
        : 'closely aligned speaking cadence';

    notes.push({
      category: 'Pacing',
      title: 'Overall Phrase Cadence',
      detail: `Learner duration was ${data.learner_duration_ms.toLocaleString()} ms vs. ${data.reference_duration_ms.toLocaleString()} ms reference (${sign}${diff.toLocaleString()} ms, ${paceDesc}).`,
      metric: `${sign}${diff} ms`,
      status: Math.abs(diff) > 500 ? 'alert' : 'neutral',
    });
  }

  // 2. Greatest Word Elongation
  const validDurationDiffs = words.filter(
    (w) => w.duration_difference_ms !== null && w.reference_duration_ms !== null && w.learner_duration_ms !== null
  );

  if (validDurationDiffs.length > 0) {
    const maxStretched = [...validDurationDiffs].sort(
      (a, b) => (b.duration_difference_ms ?? 0) - (a.duration_difference_ms ?? 0)
    )[0];

    if (maxStretched && (maxStretched.duration_difference_ms ?? 0) > 0) {
      const pct = maxStretched.reference_duration_ms
        ? Math.round(((maxStretched.duration_difference_ms ?? 0) / maxStretched.reference_duration_ms) * 100)
        : 0;
      notes.push({
        category: 'Elongation',
        title: `Max Word Elongation: "${maxStretched.text}"`,
        detail: `The learner spent +${maxStretched.duration_difference_ms} ms longer on "${maxStretched.text}" (${maxStretched.learner_duration_ms} ms vs. ${maxStretched.reference_duration_ms} ms reference, +${pct}% duration).`,
        metric: `+${maxStretched.duration_difference_ms} ms`,
        status: (maxStretched.duration_difference_ms ?? 0) > 100 ? 'alert' : 'neutral',
      });
    }

    // 3. Greatest Word Compression (rushed)
    const maxCompressed = [...validDurationDiffs].sort(
      (a, b) => (a.duration_difference_ms ?? 0) - (b.duration_difference_ms ?? 0)
    )[0];

    if (maxCompressed && (maxCompressed.duration_difference_ms ?? 0) < 0) {
      notes.push({
        category: 'Compression',
        title: `Max Word Compression: "${maxCompressed.text}"`,
        detail: `The learner articulated "${maxCompressed.text}" ${maxCompressed.duration_difference_ms} ms faster than the reference (${maxCompressed.learner_duration_ms} ms vs. ${maxCompressed.reference_duration_ms} ms reference).`,
        metric: `${maxCompressed.duration_difference_ms} ms`,
        status: (maxCompressed.duration_difference_ms ?? 0) < -80 ? 'alert' : 'neutral',
      });
    }
  }

  // 4. Cumulative Drift and 200ms Threshold
  const validDrifts = words.filter((w) => w.start_difference_ms !== null);
  if (validDrifts.length > 0) {
    const threshold = 200;
    const firstExceedIdx = validDrifts.findIndex((w) => Math.abs(w.start_difference_ms ?? 0) > threshold);
    const finalWord = validDrifts[validDrifts.length - 1];

    if (firstExceedIdx !== -1) {
      const firstExceedWord = validDrifts[firstExceedIdx];
      const sign = (firstExceedWord.start_difference_ms ?? 0) >= 0 ? '+' : '';
      const finalSign = (finalWord.start_difference_ms ?? 0) >= 0 ? '+' : '';
      notes.push({
        category: 'Drift',
        title: `Onset of Timing Drift (> 200 ms)`,
        detail: `Cumulative latency exceeded the 200 ms threshold at word ${firstExceedIdx + 1} ("${firstExceedWord.text}", ${sign}${firstExceedWord.start_difference_ms} ms drift), accumulating to ${finalSign}${finalWord.start_difference_ms} ms by the terminal word ("${finalWord.text}").`,
        metric: `${sign}${firstExceedWord.start_difference_ms} ms`,
        status: 'alert',
      });
    } else {
      const maxDrift = Math.max(...validDrifts.map((w) => Math.abs(w.start_difference_ms ?? 0)));
      notes.push({
        category: 'Drift',
        title: 'Rhythmic Alignment Stability',
        detail: `Cumulative latency remained below the 200 ms threshold throughout the sentence (peak absolute drift was ${maxDrift} ms).`,
        metric: `≤ ${maxDrift} ms`,
        status: 'good',
      });
    }
  }

  // 5. Pitch Dynamics & Semitone Range
  const refPitches = data.pitch?.reference?.filter((p): p is number => p !== null && !isNaN(p)) || [];
  const lrnPitches = data.pitch?.learner?.filter((p): p is number => p !== null && !isNaN(p)) || [];

  if (refPitches.length > 0 && lrnPitches.length > 0) {
    const refMin = Math.min(...refPitches);
    const refMax = Math.max(...refPitches);
    const refRange = refMax - refMin;

    const lrnMin = Math.min(...lrnPitches);
    const lrnMax = Math.max(...lrnPitches);
    const lrnRange = lrnMax - lrnMin;

    const rangeDiff = lrnRange - refRange;
    const modulationDesc =
      rangeDiff < -2.0
        ? 'narrower pitch range (flatter intonation)'
        : rangeDiff > 2.0
        ? 'wider pitch span than native baseline'
        : 'comparable pitch modulation span';

    notes.push({
      category: 'Pitch Dynamics',
      title: 'Prosodic Semitone Range',
      detail: `Learner pitch span was ${lrnRange.toFixed(2)} st [${lrnMin.toFixed(2)} to ${lrnMax.toFixed(2)} st] vs. reference ${refRange.toFixed(2)} st [${refMin.toFixed(2)} to ${refMax.toFixed(2)} st] (${modulationDesc}).`,
      metric: `${lrnRange.toFixed(1)} st vs ${refRange.toFixed(1)} st`,
      status: rangeDiff < -3.0 ? 'alert' : 'neutral',
    });
  }

  // 6. Voicing Continuity (Unvoiced frame gaps)
  if (data.pitch?.reference?.length && data.pitch?.learner?.length) {
    const totalFrames = data.pitch.reference.length;
    const refUnvoiced = data.pitch.reference.filter((v) => v === null).length;
    const lrnUnvoiced = data.pitch.learner.filter((v) => v === null).length;

    const refPct = Math.round((refUnvoiced / totalFrames) * 100);
    const lrnPct = Math.round((lrnUnvoiced / totalFrames) * 100);

    notes.push({
      category: 'Voicing Continuity',
      title: 'Acoustic Stop & Unvoiced Pauses',
      detail: `Learner unvoiced acoustic intervals occupied ${lrnPct}% of normalized frames (${lrnUnvoiced}/${totalFrames}) compared to ${refPct}% (${refUnvoiced}/${totalFrames}) for the reference speaker.`,
      metric: `${lrnPct}% unvoiced`,
      status: Math.abs(lrnPct - refPct) > 15 ? 'alert' : 'neutral',
    });
  }

  return notes;
}
