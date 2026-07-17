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
    if (!text.trim()) return
    const u = new SpeechSynthesisUtterance(text)
    u.rate = rate
    u.pitch = 1
    // Prefer a calm English voice if available
    const voices = window.speechSynthesis.getVoices()
    const preferred = voices.find((v) => /en(-|_)?(GB|US|ZA)/i.test(v.lang) && /female|samantha|karen|natural|google/i.test(v.name))
    if (preferred) u.voice = preferred
    u.onstart = () => setSpeaking(true)
    u.onend = () => setSpeaking(false)
    u.onerror = () => setSpeaking(false)
    window.speechSynthesis.speak(u)
  }, [])

  const stop = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    setSpeaking(false)
  }, [])

  return { speak, stop, speaking, supported }
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
    let finalText = ''
    rec.onresult = (e: any) => {
      let interim = ''
      finalText = ''
      for (let i = 0; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) finalText += t
        else interim += t
      }
      onResultRef.current((finalText + interim).trim())
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
