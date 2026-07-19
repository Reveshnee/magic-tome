'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Text-to-speech (read aloud) ──
export function useReadAloud() {
  const [speaking, setSpeaking] = useState(false)
  const [supported, setSupported] = useState(false)
  // Cache the preferred voice so it's ready when speak() is called.
  // Chrome/Android loads voices asynchronously — getVoices() returns [] on first
  // call, which is why the fix worked in testing but not on real devices: the
  // fallback default voice still has the watchdog duplication bug.
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    setSupported(true)

    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices()
      if (!voices.length) return
      voiceRef.current =
        voices.find((v) => /en(-|_)?(GB|US|ZA)/i.test(v.lang) && /female|samantha|karen|natural|google/i.test(v.name)) ||
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

  const speak = useCallback((text: string, rate = 1) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const clean = text.replace(/\s+/g, ' ').trim()
    if (!clean) return

    // Chrome/Android watchdog bug: a single long utterance gets paused and
    // partially re-read after ~15s, duplicating words. Fix: split into short
    // sentence-sized chunks (<160 chars) so each utterance finishes fast.
    const chunks = clean.match(/[^.!?;:]+[.!?;:]*/g)?.reduce<string[]>((acc, part) => {
      const piece = part.trim()
      if (!piece) return acc
      const last = acc[acc.length - 1]
      if (last && (last.length + piece.length) < 160) acc[acc.length - 1] = `${last} ${piece}`
      else acc.push(piece)
      return acc
    }, []) ?? [clean]

    chunks.forEach((chunk, i) => {
      const u = new SpeechSynthesisUtterance(chunk)
      u.rate = rate
      u.pitch = 1
      // Use the pre-loaded voice — don't call getVoices() here or it may be empty.
      if (voiceRef.current) u.voice = voiceRef.current
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
//
// The callback receives the FULL dictated text for the current mic session and
// callers replace the tail of their draft with it (see the composers). Mobile
// Android is the tricky part: the engine ends and silently re-runs recognition
// mid-session, and on each internal (re)start the `results` list resets to a
// fresh batch. Walking only `e.results` therefore LOSES earlier speech; the old
// "append baseRef + text" approach then re-added stale text and produced the
// "test test" duplication.
//
// Fix: keep a session accumulator of finalized segments INSIDE the hook. Each
// event we take the finalized results from the current batch plus the live
// interim, and emit committed + interim exactly once. When Android auto-ends
// while the user still wants to listen, we transparently restart WITHOUT
// clearing the accumulator, so nothing is lost or repeated.
export function useDictation(onResult: (text: string) => void) {
  const [listening, setListening] = useState(false)
  const [supported, setSupported] = useState(false)
  const recRef = useRef<any>(null)
  const onResultRef = useRef(onResult)
  onResultRef.current = onResult

  // Text finalized in PREVIOUS recognition batches this session.
  const committedRef = useRef('')
  // Whether the user still wants to listen (drives transparent auto-restart).
  const wantListeningRef = useRef(false)
  // Highest final result index we've already folded into committedRef for the
  // CURRENT batch, so we never add the same final segment twice.
  const foldedCountRef = useRef(0)

  const emit = useCallback((interim: string) => {
    const full = `${committedRef.current} ${interim}`.replace(/\s+/g, ' ').trim()
    onResultRef.current(full)
  }, [])

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
      let interim = ''
      // Fold any newly-final results in THIS batch into the committed text once.
      for (let i = 0; i < e.results.length; i++) {
        const seg = e.results[i][0].transcript
        if (e.results[i].isFinal) {
          if (i >= foldedCountRef.current) {
            committedRef.current = `${committedRef.current} ${seg}`.replace(/\s+/g, ' ').trim()
            foldedCountRef.current = i + 1
          }
        } else {
          interim += seg
        }
      }
      emit(interim)
    }

    rec.onend = () => {
      // Android ends recognition periodically. If the user is still dictating,
      // restart seamlessly: reset the per-batch counter but KEEP committed text.
      if (wantListeningRef.current) {
        foldedCountRef.current = 0
        try { rec.start() } catch { /* will settle on next tick */ }
      } else {
        setListening(false)
      }
    }
    rec.onerror = (ev: any) => {
      // "no-speech"/"aborted" are transient on mobile — let onend auto-restart.
      if (ev?.error === 'not-allowed' || ev?.error === 'service-not-allowed') {
        wantListeningRef.current = false
        setListening(false)
      }
    }
    recRef.current = rec
    return () => {
      wantListeningRef.current = false
      try { rec.stop() } catch { /* noop */ }
    }
  }, [emit])

  const start = useCallback(() => {
    if (!recRef.current) return
    // Fresh session: clear the accumulator so we don't prepend last session.
    committedRef.current = ''
    foldedCountRef.current = 0
    wantListeningRef.current = true
    try {
      recRef.current.start()
      setListening(true)
    } catch { /* already started */ }
  }, [])

  const stop = useCallback(() => {
    if (!recRef.current) return
    wantListeningRef.current = false
    try { recRef.current.stop() } catch { /* noop */ }
    setListening(false)
  }, [])

  return { start, stop, listening, supported }
}
