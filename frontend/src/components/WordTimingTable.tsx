import type { WordTiming } from '../types'

interface WordTimingTableProps {
  words: WordTiming[]
  focusedWordIndex: number | null
  onWordSelect: (word: WordTiming, index: number) => void
}

type WordDisplayFields = {
  confidence?: number | null
  alignment_confidence?: number | null
}

const signed = (value: number) => `${value > 0 ? '+' : ''}${value.toLocaleString()}`

export function WordTimingTable({ words, focusedWordIndex, onWordSelect }: WordTimingTableProps) {
  return (
    <section className="timing-section" aria-labelledby="timing-title">
      <div className="section-heading timing-heading">
        <h2 id="timing-title">Word timing</h2>
      </div>
      <div className="table-scroll">
        <table className="timing-table">
          <thead>
            <tr>
                <th scope="col" className="word-column">Word</th>
                <th scope="col">Reference duration (ms)</th>
                <th scope="col">Learner duration (ms)</th>
                <th scope="col">Duration difference (ms)</th>
                <th scope="col">Starts later by (ms)</th>
            </tr>
          </thead>
          <tbody>
            {words.map((word, index) => {
              const displayWord = word as WordTiming & WordDisplayFields
              const confidence = displayWord.alignment_confidence ?? displayWord.confidence ?? displayWord.score
              const uncertain = confidence !== null && confidence !== undefined && confidence < 0.5
              const previousStartDifference = index > 0 ? words[index - 1].start_difference_ms : null
              const largeDriftIncrease = word.start_difference_ms !== null
                && previousStartDifference !== null
                && word.start_difference_ms - previousStartDifference > 150

              return (
              <tr
                key={`${word.text}-${index}`}
                className={`${uncertain ? 'uncertain-row ' : ''}${focusedWordIndex === index ? 'selected-row' : ''}`}
                aria-label={uncertain ? `${word.text}, alignment confidence below 0.5` : undefined}
              >
                <td className="word-column french-word">
                  <button
                    className="word-focus-button"
                    type="button"
                    onClick={() => onWordSelect(word, index)}
                    aria-label={`Cue both recordings to ${word.text}`}
                  >
                    {word.text}
                  </button>
                </td>
                <td>{word.reference_duration_ms === null ? '—' : word.reference_duration_ms}</td>
                <td>{word.learner_duration_ms === null ? '—' : word.learner_duration_ms}</td>
                <td className={word.duration_difference_ms === null ? 'missing-value' : word.duration_difference_ms > 0 ? 'duration-longer' : 'duration-shorter'}>
                  {word.duration_difference_ms === null ? '—' : signed(word.duration_difference_ms)}
                </td>
                <td className={word.start_difference_ms === null ? 'missing-value' : largeDriftIncrease ? 'drift-alert' : 'delta-value'}>
                  {word.start_difference_ms === null ? '—' : signed(word.start_difference_ms)}
                </td>
              </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}