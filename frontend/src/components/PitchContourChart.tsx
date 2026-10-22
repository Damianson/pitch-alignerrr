import { useMemo, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ComparisonResult } from '../types'

interface PitchContourChartProps {
  data: ComparisonResult
}

type WordConfidence = {
  score?: number | null
  confidence?: number | null
  alignment_confidence?: number | null
}

export function PitchContourChart({ data }: PitchContourChartProps) {
  const [showReference, setShowReference] = useState(true)
  const [showLearner, setShowLearner] = useState(true)
  const confidenceByWord = useMemo(
    () => data.words.map((word) => {
      const confidenceWord = word as typeof word & WordConfidence
      return confidenceWord.alignment_confidence ?? confidenceWord.confidence ?? confidenceWord.score ?? null
    }),
    [data.words],
  )
  const chartData = useMemo(
    () => data.pitch.axis.map((wordProgress, index) => {
      const uncertain = (confidenceByWord[Math.floor(wordProgress)] ?? 1) < 0.5
      const reference = data.pitch.reference[index]
      const learner = data.pitch.learner[index]
      return {
        wordProgress,
        reference: uncertain ? null : reference,
        learner: uncertain ? null : learner,
        referenceUncertain: uncertain ? reference : null,
        learnerUncertain: uncertain ? learner : null,
      }
    }),
    [data.pitch, confidenceByWord],
  )
  const wordBoundaries = data.words.map((word, index) => ({
    position: index,
    text: word.text,
  }))
  const wordLabelTicks = wordBoundaries.map(({ position }) => position + 0.5)

  return (
    <section className="chart-section" aria-labelledby="contour-title">
      <div className="section-heading chart-heading">
        <div>
          <h2 id="contour-title">Pitch contour</h2>
          <p className="chart-description">Pitch relative to each speaker's median, in semitones.</p>
        </div>
        <div className="channel-controls" aria-label="Visible pitch contours">
          <button
            className={`channel-toggle reference-toggle${showReference ? ' active' : ''}`}
            type="button"
            aria-pressed={showReference}
            onClick={() => setShowReference((visible) => !visible)}
          >
            <span className="channel-line" /> Reference
          </button>
          <button
            className={`channel-toggle learner-toggle${showLearner ? ' active' : ''}`}
            type="button"
            aria-pressed={showLearner}
            onClick={() => setShowLearner((visible) => !visible)}
          >
            <span className="channel-line" /> Learner
          </button>
        </div>
      </div>

      <div className="chart-frame">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 14, right: 18, bottom: 8, left: 4 }}
          >
            <CartesianGrid stroke="#B9C1E6" strokeOpacity={0.15} vertical={false} />
            <ReferenceLine y={0} stroke="#B9C1E6" strokeOpacity={0.3} />
            <XAxis
              dataKey="wordProgress"
              type="number"
              domain={[0, Math.max(1, data.words.length)]}
              ticks={wordLabelTicks}
              interval={0}
              tickFormatter={(position: number) => wordBoundaries[Math.floor(position)]?.text ?? ''}
              tickLine={{ stroke: '#B9C1E6', strokeOpacity: 0.45 }}
              tickSize={5}
              axisLine={{ stroke: '#B9C1E6', strokeOpacity: 0.45 }}
              tick={{ fill: '#2B2B2B', fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 15 }}
              height={36}
            />
            <YAxis
              width={48}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => `${value > 0 ? '+' : ''}${value}`}
              tick={{ fill: '#555555', fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 15 }}
              domain={['auto', 'auto']}
            />
            <Tooltip
              cursor={{ stroke: '#B9C1E6', strokeOpacity: 0.25 }}
              contentStyle={{ background: '#FBFBF9', border: '1px solid #D8D8D2', borderRadius: 0, color: '#2B2B2B', fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 15 }}
              labelStyle={{ color: '#2B2B2B' }}
              labelFormatter={(value) => {
                const wordIndex = Math.floor(Number(value))
                const progress = Math.round((Number(value) - wordIndex) * 100)
                return `${wordBoundaries[wordIndex]?.text ?? 'Phrase'}, ${progress}%`
              }}
              formatter={(value, name) => [
                value === null || value === undefined ? 'Unvoiced' : `${Number(value).toFixed(2)} st`,
                String(name).startsWith('reference') ? 'Reference' : 'Learner',
              ]}
            />
            {showReference && (
              <Line
                type="monotone"
                dataKey="reference"
                name="reference"
                stroke="#2B2B2B"
                strokeWidth={2.5}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            )}
            {showReference && (
              <Line
                type="monotone"
                dataKey="referenceUncertain"
                name="referenceUncertain"
                stroke="#2B2B2B"
                strokeWidth={2.5}
                strokeDasharray="5 4"
                strokeOpacity={0.6}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            )}
            {showLearner && (
              <Line
                type="monotone"
                dataKey="learner"
                name="learner"
                stroke="#23358A"
                strokeWidth={2.5}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            )}
            {showLearner && (
              <Line
                type="monotone"
                dataKey="learnerUncertain"
                name="learnerUncertain"
                stroke="#23358A"
                strokeWidth={2.5}
                strokeDasharray="5 4"
                strokeOpacity={0.6}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="chart-note">Dashed lines indicate confidence below 0.5</p>
    </section>
  )
}