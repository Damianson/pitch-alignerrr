import type { ComparisonResult, WordTiming } from '../types'

interface PlainLanguageFeedbackProps {
  data: ComparisonResult
}

interface CoachingTip {
  action: string
  explanation: string
  evidence: string
}

interface PitchProfile {
  start: number
  end: number
  peak: number
  span: number
}

function getPitchProfile(samples: (number | null)[]): PitchProfile | null {
  const voiced = samples.filter((sample): sample is number => sample !== null && Number.isFinite(sample))
  if (voiced.length < 2) return null

  return {
    start: voiced[0],
    end: voiced[voiced.length - 1],
    peak: Math.max(...voiced),
    span: Math.max(...voiced) - Math.min(...voiced),
  }
}

function formatMs(value: number): string {
  return `${Math.round(value).toLocaleString()} ms`
}

function getPacingTip(data: ComparisonResult): CoachingTip {
  const referenceMs = data.reference_duration_ms
  const learnerMs = data.learner_duration_ms
  const ratio = referenceMs > 0 ? learnerMs / referenceMs : 1
  const difference = learnerMs - referenceMs
  const evidence = `${formatMs(learnerMs)} vs. ${formatMs(referenceMs)}; ${difference > 0 ? '+' : ''}${formatMs(difference)}`

  if (referenceMs > 0 && Math.abs(difference) / referenceMs <= 0.15) {
    return {
      action: 'Keep this steady overall pace.',
      explanation: 'Your timing is close to the native recording, so focus your practice on the individual words and melody.',
      evidence,
    }
  }

  if (ratio > 1) {
    return {
      action: 'Try a slightly brisker overall pace.',
      explanation: `Your take took ${(learnerMs / 1000).toFixed(1)}s compared with ${(referenceMs / 1000).toFixed(1)}s for the native speaker (about ${ratio.toFixed(1)}x as long).`,
      evidence,
    }
  }

  return {
    action: 'Give the sentence a little more time.',
    explanation: `Your take finished sooner than the native speaker (${(learnerMs / 1000).toFixed(1)}s compared with ${(referenceMs / 1000).toFixed(1)}s).`,
    evidence,
  }
}

function getWordRhythmTip(words: WordTiming[]): CoachingTip {
  const longerWords = words
    .filter((word) => word.duration_difference_ms !== null
      && word.duration_difference_ms > 80
      && word.reference_duration_ms !== null
      && word.reference_duration_ms > 0
      && word.learner_duration_ms !== null)
    .sort((first, second) => (second.duration_difference_ms ?? 0) - (first.duration_difference_ms ?? 0))
    .slice(0, 2)

  if (longerWords.length === 0) {
    const largestPositiveDifference = Math.max(
      0,
      ...words.map((word) => word.duration_difference_ms ?? 0),
    )
    return {
      action: 'Keep your word rhythm balanced.',
      explanation: 'No word stood out as more than 80 ms longer than its reference, so there is no single long word to target.',
      evidence: `largest positive word difference: ${formatMs(largestPositiveDifference)}`,
    }
  }

  const wordDescriptions = longerWords.map((word) => {
    const ratio = (word.learner_duration_ms ?? 0) / (word.reference_duration_ms ?? 1)
    return `“${word.text}” about ${ratio.toFixed(1)}x as long`
  })
  const names = longerWords.map((word) => `“${word.text}”`).join(' and ')
  const comparisons = longerWords.map((word) =>
    `“${word.text}”: ${formatMs(word.learner_duration_ms ?? 0)} vs. ${formatMs(word.reference_duration_ms ?? 0)} (+${formatMs(word.duration_difference_ms ?? 0)})`,
  )

  return {
    action: `Move more quickly through ${names}.`,
    explanation: `You held ${wordDescriptions.join(' and ')}. Shortening these words can help later words arrive closer to their reference timing.`,
    evidence: comparisons.join('; '),
  }
}

function getIntonationTips(data: ComparisonResult): CoachingTip[] {
  const risingWords: { word: WordTiming; rise: number; learnerRange: number }[] = []

  data.words.forEach((word, index) => {
    const firstSample = index * 10
    const reference = getPitchProfile(data.pitch.reference.slice(firstSample, firstSample + 10))
    const learner = getPitchProfile(data.pitch.learner.slice(firstSample, firstSample + 10))
    if (!reference || !learner || learner.span >= 2.0) return

    const rise = Math.max(reference.end - reference.start, reference.peak - reference.start)
    if ((reference.end > reference.start + 2.0 || reference.peak - reference.start > 3.0)) {
      risingWords.push({ word, rise, learnerRange: learner.span })
    }

  })

  const tips: CoachingTip[] = []
  const strongestRise = risingWords.sort((first, second) => second.rise - first.rise)[0]
  if (strongestRise) {
    tips.push({
      action: `Let your pitch rise more on “${strongestRise.word.text}”.`,
      explanation: 'The native speaker lifts their voice noticeably here, while your tone stays fairly level.',
      evidence: `reference rise: +${strongestRise.rise.toFixed(3)} semitones; your range: ${strongestRise.learnerRange.toFixed(3)} semitones`,
    })
  }

  const finalWordIndex = data.words.length - 1
  const finalWord = data.words[finalWordIndex]
  const finalReference = getPitchProfile(data.pitch.reference.slice(finalWordIndex * 10, finalWordIndex * 10 + 10))
  const finalLearner = getPitchProfile(data.pitch.learner.slice(finalWordIndex * 10, finalWordIndex * 10 + 10))
  const finalFall = finalReference && finalLearner
    && finalReference.end - finalReference.start < -2.5
    && finalLearner.span < 2.0

  if (finalWord && finalReference && finalLearner && finalFall) {
    tips.push({
      action: `Drop your voice more on the final word “${finalWord.text}”.`,
      explanation: 'A clearer downward movement can give the sentence a more natural closing sound.',
      evidence: `reference ending change: ${(finalReference.end - finalReference.start).toFixed(3)} semitones; your range: ${finalLearner.span.toFixed(3)} semitones`,
    })
  }

  if (tips.length === 0) {
    tips.push({
      action: 'Keep following the speaker’s melody.',
      explanation: 'These samples do not show a strong rise or final fall that your recording missed.',
      evidence: 'no unmatched rise or closing fall detected',
    })
  }

  return tips
}

function getCoachingTips(data: ComparisonResult): CoachingTip[] {
  return [
    getPacingTip(data),
    getWordRhythmTip(data.words),
    ...getIntonationTips(data),
  ].slice(0, 4)
}

export function PlainLanguageFeedback({ data }: PlainLanguageFeedbackProps) {
  const tips = getCoachingTips(data)

  return (
    <section className="feedback-section" aria-labelledby="feedback-title">
      <h2 id="feedback-title">How to improve your next take</h2>
      <p className="feedback-subtitle">Actionable tips based on your rhythm and pitch contour.</p>
      <ul>
        {tips.map((tip, index) => (
          <li className="coaching-tip" key={`${index}-${tip.action}`}>
            <strong>{tip.action}</strong>
            <span>{tip.explanation}</span>
            <span className="feedback-evidence">({tip.evidence})</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
