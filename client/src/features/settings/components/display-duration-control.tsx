import { useCallback, useEffect, useRef, useState } from 'react'

import {
  DISPLAY_DURATION_RANGE_MESSAGE,
  isDisplayDurationMsValid,
  msToDisplayParts,
  partsToRawMs,
  type DisplayDurationUnit,
} from '../lib/timing'

import './display-duration-control.css'

const UNIT_LABELS: Record<DisplayDurationUnit, string> = {
  seconds: 'Seconds',
  minutes: 'Minutes',
  hours: 'Hours',
}

type DisplayDurationControlProps = {
  displayDurationMs: number
  onDurationChange: (ms: number) => void
}

function partsToInputText(ms: number): string {
  return String(msToDisplayParts(ms).value)
}

export function DisplayDurationControl({
  displayDurationMs,
  onDurationChange,
}: DisplayDurationControlProps) {
  const [inputText, setInputText] = useState(() => partsToInputText(displayDurationMs))
  const [unit, setUnit] = useState<DisplayDurationUnit>(
    () => msToDisplayParts(displayDurationMs).unit,
  )
  const [error, setError] = useState<string | null>(null)

  const revertToSaved = useCallback(() => {
    const parts = msToDisplayParts(displayDurationMs)
    setInputText(String(parts.value))
    setUnit(parts.unit)
  }, [displayDurationMs])

  useEffect(() => {
    revertToSaved()
    setError(null)
  }, [displayDurationMs, revertToSaved])

  const tryCommit = useCallback(
    (nextValue: number, nextUnit: DisplayDurationUnit): boolean => {
      const ms = partsToRawMs(nextValue, nextUnit)
      if (!isDisplayDurationMsValid(ms)) {
        setError(DISPLAY_DURATION_RANGE_MESSAGE)
        revertToSaved()
        return false
      }
      setError(null)
      setInputText(String(nextValue))
      onDurationChange(ms)
      return true
    },
    [onDurationChange, revertToSaved],
  )

  const commitFromInput = useCallback(() => {
    if (inputText === '') {
      setError(null)
      revertToSaved()
      return
    }
    const parsed = Number.parseInt(inputText, 10)
    if (Number.isNaN(parsed)) {
      setError(null)
      revertToSaved()
      return
    }
    tryCommit(parsed, unit)
  }, [inputText, unit, tryCommit, revertToSaved])

  const handleValueChange = (raw: string) => {
    setError(null)
    if (raw === '' || /^\d+$/.test(raw)) {
      setInputText(raw)
    }
  }

  const handleValueBlur = () => {
    commitFromInput()
  }

  const handleUnitChange = (nextUnit: DisplayDurationUnit) => {
    setUnit(nextUnit)
    if (inputText === '') {
      return
    }
    const parsed = Number.parseInt(inputText, 10)
    if (!Number.isNaN(parsed)) {
      tryCommit(parsed, nextUnit)
    }
  }

  const latestRef = useRef({ inputText, unit })
  latestRef.current = { inputText, unit }

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        const { inputText: text, unit: u } = latestRef.current
        if (text === '') {
          revertToSaved()
          return
        }
        const parsed = Number.parseInt(text, 10)
        if (!Number.isNaN(parsed)) {
          tryCommit(parsed, u)
        }
      }
    }
    window.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('visibilitychange', onVisibility)
    }
  }, [tryCommit, revertToSaved])

  useEffect(() => {
    return () => {
      const { inputText: text, unit: u } = latestRef.current
      if (text === '') {
        return
      }
      const parsed = Number.parseInt(text, 10)
      if (!Number.isNaN(parsed)) {
        tryCommit(parsed, u)
      }
    }
  }, [tryCommit])

  return (
    <div className="display-duration-control">
      <label className="display-duration-control__label" htmlFor="display-duration-value">
        Display duration
      </label>
      <div className="display-duration-control__row">
        <input
          id="display-duration-value"
          className="display-duration-control__input"
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          value={inputText}
          aria-invalid={error != null}
          aria-describedby={error != null ? 'display-duration-error' : undefined}
          onChange={(e) => handleValueChange(e.target.value)}
          onBlur={handleValueBlur}
        />
        <select
          className="display-duration-control__unit"
          aria-label="Display duration unit"
          value={unit}
          onChange={(e) => handleUnitChange(e.target.value as DisplayDurationUnit)}
        >
          {(Object.keys(UNIT_LABELS) as DisplayDurationUnit[]).map((key) => (
            <option key={key} value={key}>
              {UNIT_LABELS[key]}
            </option>
          ))}
        </select>
      </div>
      {error != null && (
        <p id="display-duration-error" className="display-duration-control__error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
