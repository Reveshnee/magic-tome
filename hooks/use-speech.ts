'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Text-to-speech (read aloud) ──
export function useReadAloud() {
  const [speaking, setSpeaking] = useState(false)
  const [supported, setSupported] = useState(false)

  useEffect(() => {
    setSupported(typeof window !== 'undefined' && 'speechSynthesis' in window)
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  const speak = useCallback((text: string, rate = 1) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const clean = text.replace(/\s+/g, ' ').trim()
    if (!clean) return

    // Chrome (desktop + Android) has a long-standing bug: any single utterance
    // that plays for more than ~15s triggers an internal watchdog that pauses
    // then resumes the engine — and on resume it RE-READS part of the current
    // sentence, which is why words/phrases were being duplicated. The reliable
    // fix is to never hand it one long utterance: we split the text into short
    // sentence-sized chunks and queue them, so each utterance finishes well
    // under the watchdog window and nothing gets repeated.
    const chunks = clean.match(/[^.!?;:]+[.!?;:]*/g)?.reduce<string[]>((acc, part) => {
      const piece = part.trim()
      if (!piece) return acc
      const last = acc[acc.length - 1]
      // Merge tiny fragments into the previous chunk, but keep chunks short.
      if (last && (last.length + piece.length) < 160) acc[acc.length - 1] = `${last} ${piece}`
      else acc.push(piece)
      return acc
    }, []) ?? [clean]

    const voices = window.speechSynthesis.getVoices()
    const preferred = voices.find((v) => /en(-|_)?(GB|US|ZA)/i.test(v.lang) && /female|samantha|karen|natural|google/i.test(v.name))

    chunks.forEach((chunk, i) => {
      const u = new SpeechSynthesisUtterance(chunk)
      u.rate = rate
      u.pitch = 1
      if (preferred) u.voice = preferred
      if (i === 0) u.onstart = () => setSpeaking(true)
      if (i === chunks.length - 1) u.onend = () => setSpeaking(false)
      u.onerror = () => setSpeaking(false)
      window.speechSynthesis.speak(u)
    })
  }, [])

  const stop = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    setSpeaking(false)
  }, [])

  return { speak, stop, speaking, supported }
}

// ── Breathing voice cues ──
// A lightweight speaker tuned for short, calm guidance ("Breathe in", "Hold",
// "Breathe out"). Voices load asynchronously in most browsers, so we cache the
// chosen voice once they are ready. Volume is set to max so cues are clearly
// audible over the ambient animation.
export function useBreathVoice() {
  const [supported, setSupported] = useState(false)
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    setSupported(true)

    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices()
      if (!voices.length) return
      // Prefer a warm, natural English voice; fall back to any English voice
      voiceRef.current =
        voices.find((v) => /en(-|_)?(GB|US|ZA|AU)/i.test(v.lang) && /female|samantha|karen|natural|google|zira|aria/i.test(v.name)) ||
        voices.find((v) => /^en/i.test(v.lang)) ||
        voices[0]
    }
    pickVoice()
    window.speechSynthesis.onvoiceschanged = pickVoice

    return () => {
      window.speechSynthesis.onvoiceschanged = null
      window.speechSynthesis.cancel()
    }
  }, [])

  const cue = useCallback((text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.rate = 0.82   // slow and soothing
    u.pitch = 1
    u.volume = 1    // full volume — the old tones were nearly inaudible
    if (voiceRef.current) u.voice = voiceRef.current
    window.speechSynthesis.speak(u)
  }, [])

  const silence = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
  }, [])

  return { cue, silence, supported }
}

// ── Speech-to-text (dictation) ──
export function useDictation(onResult: (text: string) => void) {
  const [listening, setListening] = useState(false)
  const [supported, setSupported] = useState(false)
  const recRef = useRef<any>(null)
  const onResultRef = useRef(onResult)
  onResultRef.current = onResult

  useEffect(() => {
    if (typeof window === 'undefined') return
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    setSupported(true)
    const rec = new SR()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'en-US'
    rec.onresult = (e: any) => {
      // Rebuild the FULL transcript from scratch on every event. The engine
      // keeps the complete results list for the session, so we walk all of it
      // and concatenate each result exactly once. This is immune to the
      // re-reporting quirk that caused "this this is a test test" when we
      // previously used an accumulator + resultIndex.
      let finalText = ''
      let interim = ''
      for (let i = 0; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) finalText += t
        else interim += t
      }
      // Collapse any accidental double-spaces from joined chunks.
      onResultRef.current((finalText + interim).replace(/\s+/g, ' ').trim())
    }
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    recRef.current = rec
    return () => {
      try { rec.stop() } catch { /* noop */ }
    }
  }, [])

  const start = useCallback(() => {
    if (!recRef.current) return
    try {
      recRef.current.start()
      setListening(true)
    } catch { /* already started */ }
  }, [])

  const stop = useCallback(() => {
    if (!recRef.current) return
    try { recRef.current.stop() } catch { /* noop */ }
    setListening(false)
  }, [])

  return { start, stop, listening, supported }
}
