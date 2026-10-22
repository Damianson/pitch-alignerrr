import type { ComparisonResult } from './types';

export const SAMPLE_RESULT: ComparisonResult = {
  duration_difference_ms: 743,
  learner_duration_ms: 3539,
  reference_duration_ms: 2796,
  sentence: "Vont jouer là, vers l'heure où le soleil se montre",
  warnings: [
    "Reference: Low alignment confidence (0.26) for word 'Vont'.",
    "Learner: Filtered 15 implausible pitch outlier frame(s).",
    "Learner: Low alignment confidence (0.40) for word 'montre'."
  ],
  words: [
    {
      text: "Vont",
      score: 0.26,
      reference_start_ms: 141,
      reference_duration_ms: 221,
      learner_start_ms: 281,
      learner_duration_ms: 282,
      duration_difference_ms: 61,
      start_difference_ms: 140
    },
    {
      text: "jouer",
      reference_start_ms: 402,
      reference_duration_ms: 242,
      learner_start_ms: 643,
      learner_duration_ms: 262,
      duration_difference_ms: 20,
      start_difference_ms: 241
    },
    {
      text: "là,",
      reference_start_ms: 684,
      reference_duration_ms: 442,
      learner_start_ms: 965,
      learner_duration_ms: 523,
      duration_difference_ms: 81,
      start_difference_ms: 281
    },
    {
      text: "vers",
      reference_start_ms: 1166,
      reference_duration_ms: 222,
      learner_start_ms: 1528,
      learner_duration_ms: 282,
      duration_difference_ms: 60,
      start_difference_ms: 362
    },
    {
      text: "l'heure",
      reference_start_ms: 1428,
      reference_duration_ms: 241,
      learner_start_ms: 1830,
      learner_duration_ms: 382,
      duration_difference_ms: 141,
      start_difference_ms: 402
    },
    {
      text: "où",
      reference_start_ms: 1709,
      reference_duration_ms: 81,
      learner_start_ms: 2292,
      learner_duration_ms: 81,
      duration_difference_ms: 0,
      start_difference_ms: 583
    },
    {
      text: "le",
      reference_start_ms: 1830,
      reference_duration_ms: 60,
      learner_start_ms: 2393,
      learner_duration_ms: 120,
      duration_difference_ms: 60,
      start_difference_ms: 563
    },
    {
      text: "soleil",
      reference_start_ms: 1911,
      reference_duration_ms: 341,
      learner_start_ms: 2553,
      learner_duration_ms: 463,
      duration_difference_ms: 122,
      start_difference_ms: 642
    },
    {
      text: "se",
      reference_start_ms: 2273,
      reference_duration_ms: 120,
      learner_start_ms: 3036,
      learner_duration_ms: 181,
      duration_difference_ms: 61,
      start_difference_ms: 763
    },
    {
      text: "montre",
      score: 0.4,
      reference_start_ms: 2433,
      reference_duration_ms: 282,
      learner_start_ms: 3257,
      learner_duration_ms: 221,
      duration_difference_ms: -61,
      start_difference_ms: 824
    }
  ],
  pitch: {
    axis: [
      0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9,
      1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9,
      2.0, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9,
      3.0, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9,
      4.0, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9,
      5.0, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9,
      6.0, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9,
      7.0, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9,
      8.0, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9,
      9.0, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9
    ],
    learner: [
      2.45, 2.797, 3.186, 3.426, 3.584, 3.904, 4.088, 4.188, 3.829, 2.959,
      -0.018, 0.232, 0.886, 1.101, 1.079, 1.161, 1.243, 1.134, 0.491, 0.271,
      -1.563, null, null, null, null, null, null, null, null, null,
      -0.507, 0.082, 0.358, 0.187, 0.303, 0.367, 0.339, 0.012, -0.112, -0.202,
      -0.863, 0.24, -0.408, -0.454, -0.611, -0.692, -0.571, -0.657, -0.493, -0.181,
      1.249, 1.3, 1.3, 1.284, 1.234, 0.217, 0.362, 0.362, -0.125, -0.109,
      -0.301, -0.274, -0.31, -0.441, -0.747, null, null, null, null, null,
      null, null, -2.211, -1.594, -1.894, -1.385, -1.267, -0.99, null, null,
      null, null, null, null, null, null, -3.204, -2.566, -2.396, -2.328,
      -2.417, -2.385, -2.372, -2.316, -2.552, -2.819, -2.159, -2.157, null, null
    ],
    reference: [
      3.545, 4.894, 6.125, 6.709, 7.485, 7.513, 7.505, 7.34, 6.838, null,
      null, 2.77, 2.714, 2.986, 2.401, 1.869, 1.232, 0.539, 0.195, -0.316,
      -2.715, -2.137, -0.369, 4.091, null, null, null, null, -0.39, -0.726,
      -1.222, -0.347, -0.132, -0.098, -0.078, -0.393, 0.061, 1.095, -0.855, -0.758,
      -0.585, -0.32, 0.711, 1.777, 2.57, 4.167, 4.626, 4.593, 4.168, 4.134,
      0.151, 0.151, -0.295, -0.554, -0.817, -1.176, -1.176, -1.293, -1.238, -1.271,
      -1.727, -1.727, -2.601, -2.647, -2.647, null, null, null, null, null,
      null, null, 0.364, 0.558, 0.458, 0.813, 2.035, 1.887, null, null,
      1.263, 1.263, 1.109, 1.179, 1.188, 0.982, 0.809, 0.472, -0.346, -0.575,
      -3.635, -4.123, -4.614, -5.019, -4.866, -4.892, -5.166, -4.213, null, null
    ]
  }
};
