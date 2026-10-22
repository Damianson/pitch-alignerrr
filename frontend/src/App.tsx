import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, LoaderCircle, Pause, Play, Upload } from 'lucide-react'
import type { RefObject } from 'react'
import { PlainLanguageFeedback } from './components/PlainLanguageFeedback'
import { PitchContourChart } from './components/PitchContourChart'
import { WordTimingTable } from './components/WordTimingTable'
import { SAMPLE_RESULT } from './sampleData'
import type { ComparisonResult } from './types'

type BackendState = 'checking' | 'online' | 'offline'

const API_URL = 'http://127.0.0.1:5000'

export default function App() {
  const [transcript, setTranscript] = useState(SAMPLE_RESULT.sentence)
  const [referenceFile, setReferenceFile] = useState<File | null>(null)
  const [learnerFile, setLearnerFile] = useState<File | null>(null)
  const [referenceUrl, setReferenceUrl] = useState<string | null>(null)
  const [learnerUrl, setLearnerUrl] = useState<string | null>(null)
  const [focusedWordIndex, setFocusedWordIndex] = useState<number | null>(null)
  const [focusMessage, setFocusMessage] = useState<string | null>(null)
  const [result, setResult] = useState<ComparisonResult>(SAMPLE_RESULT)
  const [backendState, setBackendState] = useState<BackendState>('checking')
  const [isLoading, setIsLoading] = useState(false)
  const [isExampleLoading, setIsExampleLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const referenceAudioRef = useRef<HTMLAudioElement>(null)
  const learnerAudioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    if (!referenceFile) {
      setReferenceUrl(null)
      return
    }
    const url = URL.createObjectURL(referenceFile)
    setReferenceUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [referenceFile])

  useEffect(() => {
    if (!learnerFile) {
      setLearnerUrl(null)
      return
    }
    const url = URL.createObjectURL(learnerFile)
    setLearnerUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [learnerFile])

  useEffect(() => {
    let active = true

    const checkBackend = async () => {
      try {
        const response = await fetch(`${API_URL}/api/health`)
        if (active) setBackendState(response.ok ? 'online' : 'offline')
      } catch {
        if (active) setBackendState('offline')
      }
    }

    void checkBackend()
    const intervalId = window.setInterval(checkBackend, 15000)
    return () => {
      active = false
      window.clearInterval(intervalId)
    }
  }, [])

  const runComparison = async () => {
    setErrorMessage(null)
    if (!transcript.trim()) {
      setErrorMessage('Enter the French transcript before comparing.')
      return
    }
    if (!referenceFile || !learnerFile) {
      setErrorMessage('Choose both audio recordings to run a comparison.')
      return
    }

    const body = new FormData()
    body.append('transcript', transcript.trim())
    body.append('reference_audio', referenceFile)
    body.append('learner_audio', learnerFile)

    setIsLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/compare`, {
        method: 'POST',
        body,
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error ?? `Comparison failed (${response.status}).`)
      }
      setResult(payload as ComparisonResult)
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to reach the comparison service.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  const loadBenchmark = async () => {
    setErrorMessage(null)
    setIsExampleLoading(true)
    try {
      const [referenceResponse, learnerResponse] = await Promise.all([
        fetch('/examples/reference.wav'),
        fetch('/examples/learner.wav'),
      ])
      if (!referenceResponse.ok || !learnerResponse.ok) {
        throw new Error('Could not load the example recordings.')
      }
      const [referenceBlob, learnerBlob] = await Promise.all([
        referenceResponse.blob(),
        learnerResponse.blob(),
      ])
      setReferenceFile(new File([referenceBlob], 'reference.wav', { type: 'audio/wav' }))
      setLearnerFile(new File([learnerBlob], 'learner.wav', { type: 'audio/wav' }))
      setResult(SAMPLE_RESULT)
      setTranscript(SAMPLE_RESULT.sentence)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not load the example recordings.')
    } finally {
      setIsExampleLoading(false)
    }
  }

  useEffect(() => {
    void loadBenchmark()
  }, [])

  const focusWord = (word: ComparisonResult['words'][number], index: number) => {
    const referenceStart = word.reference_start_ms
    const learnerStart = word.learner_start_ms

    if (referenceStart !== null && referenceAudioRef.current) {
      referenceAudioRef.current.currentTime = referenceStart / 1000
    }
    if (learnerStart !== null && learnerAudioRef.current) {
      learnerAudioRef.current.currentTime = learnerStart / 1000
    }

    setFocusedWordIndex(index)
    const referenceCued = Boolean(referenceUrl && referenceStart !== null && referenceAudioRef.current)
    const learnerCued = Boolean(learnerUrl && learnerStart !== null && learnerAudioRef.current)
    if (referenceCued && learnerCued) {
      setFocusMessage(`Both players cued to "${word.text}". Playback remains paused.`)
    } else if (referenceCued) {
      setFocusMessage(`Reference cued to "${word.text}". Learner timestamp or recording is unavailable.`)
    } else if (learnerCued) {
      setFocusMessage(`My recording cued to "${word.text}". Reference timestamp or recording is unavailable.`)
    } else if (!referenceUrl && !learnerUrl) {
      setFocusMessage(`Upload recordings to cue "${word.text}" in both players.`)
    } else {
      setFocusMessage(`No usable alignment timestamp is available for "${word.text}".`)
    }
  }

  const summary = (result as ComparisonResult & { summary?: string[] }).summary

  return (
    <div className="app-shell" data-service-state={backendState}>
      <header className="masthead">
        <div className="brand-name">PitchAlignerrr</div>
      </header>

      <main>
        {!!summary?.length && (
          <section className="summary-section" aria-labelledby="summary-title">
            <h1 id="summary-title">Summary</h1>
            <ul>
              {summary.map((sentence, index) => <li key={`${index}-${sentence}`}>{sentence}</li>)}
            </ul>
          </section>
        )}

        <section className="source-strip" aria-label="Comparison inputs">
          <h1 className="section-title">Input</h1>
          <label className="transcript-field">
            <span className="field-label">Transcript</span>
            <textarea
              value={transcript}
              onChange={(event) => setTranscript(event.target.value)}
              rows={2}
              placeholder="Enter the French transcript"
            />
          </label>

          <FileField
            kind="reference"
            file={referenceFile}
            onChange={setReferenceFile}
            audioUrl={referenceUrl}
            audioRef={referenceAudioRef}
          />
          <FileField
            kind="learner"
            file={learnerFile}
            onChange={setLearnerFile}
            audioUrl={learnerUrl}
            audioRef={learnerAudioRef}
          />

          <div className="action-field">
            <button
              className="compare-button"
              type="button"
              onClick={runComparison}
              disabled={isLoading || isExampleLoading}
            >
              {isLoading ? <LoaderCircle size={15} className="spin" /> : <ArrowUpRight size={15} />}
              <span>{isLoading ? 'Comparing' : isExampleLoading ? 'Loading example' : 'Compare'}</span>
            </button>
            <button className="benchmark-button" type="button" onClick={() => void loadBenchmark()} disabled={isExampleLoading}>
              {isExampleLoading ? 'Loading example' : 'Load example'}
            </button>
          </div>
        </section>

        <PlainLanguageFeedback data={result} />
        {errorMessage && <p className="error-message" role="alert">{errorMessage}</p>}

        <PitchContourChart data={result} />
        <WordTimingTable
          words={result.words}
          focusedWordIndex={focusedWordIndex}
          onWordSelect={focusWord}
        />
        {focusMessage && <p className="focus-message" aria-live="polite">{focusMessage}</p>}
      </main>
    </div>
  )
}

interface FileFieldProps {
  kind: 'reference' | 'learner'
  file: File | null
  onChange: (file: File | null) => void
  audioUrl: string | null
  audioRef: RefObject<HTMLAudioElement | null>
}

function FileField({ kind, file, onChange, audioUrl, audioRef }: FileFieldProps) {
  const isReference = kind === 'reference'
  const label = isReference ? 'Native reference' : 'My recording'
  const inputId = isReference ? 'native-reference-file' : 'my-recording-file'
  const [isPlaying, setIsPlaying] = useState(false)

  const togglePlayback = () => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) {
      void audio.play().catch(() => setIsPlaying(false))
    } else {
      audio.pause()
    }
  }

  return (
    <div className={`file-field ${kind}-field`}>
      <label className="field-label" htmlFor={inputId}>{label}</label>
      <div className="file-control-row">
        <label className="file-picker" htmlFor={inputId}>
          <Upload size={15} aria-hidden="true" />
          <span className="file-name">{file?.name ?? 'Choose audio'}</span>
        </label>
        <button
          className="inline-play-button"
          type="button"
          onClick={togglePlayback}
          disabled={!audioUrl}
          aria-label={`${isPlaying ? 'Pause' : 'Play'} ${label.toLowerCase()}`}
        >
          {isPlaying ? <Pause size={17} /> : <Play size={17} />}
        </button>
      </div>
      <input
        id={inputId}
        type="file"
        accept=".wav,.mp3,.m4a,.ogg,.flac,.webm,audio/*"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
      />
      {audioUrl && (
        <audio
          ref={audioRef}
          className="inline-audio"
          preload="metadata"
          src={audioUrl}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
        />
      )}
    </div>
  )
}