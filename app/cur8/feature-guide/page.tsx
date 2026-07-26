'use client'

// ─── Tiny static widget mockups ───────────────────────────────────────────────

function TimerMockup() {
  const circumference = 2 * Math.PI * 36
  const progress = 0.38 // frozen at 38% for the illustration
  return (
    <div style={{ backgroundColor: 'rgba(13,36,32,0.85)', borderRadius: 18, padding: '18px 20px', border: '1px solid rgba(245,240,232,0.12)', width: 220, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <p style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(245,240,232,0.4)', margin: 0 }}>Focus</p>
        <p style={{ fontFamily: 'Georgia, serif', fontSize: 14, fontWeight: 600, color: '#f5f0e8', margin: 0 }}>Flow Timer</p>
      </div>

      {/* Preset row */}
      <div style={{ display: 'flex', gap: 4 }}>
        {[{ l: '5 min', c: '#8ec8b4' }, { l: '15 min', c: '#5a9e84' }, { l: '25 min', c: '#c9a84c', active: true }, { l: '45 min', c: '#c85a40' }].map((p, i) => (
          <div key={i} style={{ flex: 1, padding: '4px 0', borderRadius: 7, fontSize: 8, fontWeight: 700, textAlign: 'center', backgroundColor: p.active ? `${p.c}33` : 'rgba(245,240,232,0.06)', color: p.active ? p.c : 'rgba(245,240,232,0.35)' }}>
            {p.l}
          </div>
        ))}
      </div>

      {/* Ring */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <div style={{ position: 'relative', width: 84, height: 84 }}>
          <svg width="84" height="84" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
            <circle cx="42" cy="42" r="34" fill="none" stroke="rgba(245,240,232,0.07)" strokeWidth="3" />
            <circle cx="42" cy="42" r="34" fill="none" stroke="#c9a84c" strokeWidth="3" strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 34}
              strokeDashoffset={2 * Math.PI * 34 * (1 - progress)} />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ fontFamily: 'Georgia, serif', fontSize: 17, fontWeight: 700, color: '#f5f0e8', margin: 0 }}>15:22</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 7 }}>
          <div style={{ padding: '5px 16px', borderRadius: 50, fontSize: 9, fontWeight: 700, backgroundColor: '#c9a84c', color: '#0d2420' }}>Pause</div>
          <div style={{ padding: '5px 13px', borderRadius: 50, fontSize: 9, fontWeight: 700, backgroundColor: 'rgba(245,240,232,0.07)', color: 'rgba(245,240,232,0.45)' }}>Reset</div>
        </div>
      </div>
    </div>
  )
}

function BreathworkMockup() {
  return (
    <div style={{ backgroundColor: 'rgba(13,36,32,0.85)', borderRadius: 18, padding: '18px 20px', border: '1px solid rgba(245,240,232,0.12)', width: 260, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(245,240,232,0.4)', margin: 0 }}>Nervous system</p>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: 14, fontWeight: 600, color: '#f5f0e8', margin: 0 }}>Breathwork</p>
        </div>
        <div style={{ fontSize: 9, fontWeight: 700, padding: '3px 9px', borderRadius: 50, backgroundColor: 'rgba(90,158,132,0.2)', color: '#8ec8b4' }}>3 cycles</div>
      </div>

      {/* Pattern cards */}
      <div style={{ display: 'flex', gap: 5 }}>
        {[
          { n: '1', l: '4-4-4-4', d: 'Calms & resets', active: true },
          { n: '2', l: '4-7-8', d: 'Deep calm', active: false },
          { n: '3', l: '4-0-6', d: 'Fast regulation', active: false },
        ].map((p, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '7px 4px 8px', borderRadius: 9, border: `1px solid ${p.active ? 'rgba(90,158,132,0.55)' : 'rgba(245,240,232,0.08)'}`, backgroundColor: p.active ? 'rgba(90,158,132,0.18)' : 'rgba(245,240,232,0.04)', textAlign: 'center' }}>
            <div style={{ width: 16, height: 16, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 800, backgroundColor: p.active ? '#5a9e84' : 'rgba(245,240,232,0.1)', color: p.active ? '#f5f0e8' : 'rgba(245,240,232,0.4)' }}>{p.n}</div>
            <span style={{ fontSize: 8, fontWeight: 700, color: p.active ? '#8ec8b4' : 'rgba(245,240,232,0.4)' }}>{p.l}</span>
            <span style={{ fontSize: 7, color: p.active ? 'rgba(245,240,232,0.65)' : 'rgba(245,240,232,0.25)', lineHeight: 1.3 }}>{p.d}</span>
          </div>
        ))}
      </div>

      {/* Circle */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <div style={{ position: 'relative', width: 84, height: 84 }}>
          <div style={{ position: 'absolute', inset: -8, borderRadius: '50%', backgroundColor: '#5a9e84', filter: 'blur(14px)', opacity: 0.3 }} />
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', backgroundColor: 'rgba(13,36,32,0.9)', border: '2px solid #5a9e84', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
            <p style={{ fontSize: 7, fontWeight: 700, color: 'rgba(245,240,232,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>breathe in</p>
            <p style={{ fontFamily: 'Georgia, serif', fontSize: 22, fontWeight: 700, color: '#f5f0e8', margin: 0, lineHeight: 1 }}>3</p>
          </div>
        </div>
        <p style={{ fontSize: 9, color: 'rgba(245,240,232,0.4)', margin: 0 }}>Box Breath · Calms &amp; resets</p>
      </div>
    </div>
  )
}

function ReflectionMockup() {
  return (
    <div style={{ backgroundColor: 'rgba(13,36,32,0.85)', borderRadius: 18, padding: '20px', border: '1px solid rgba(245,240,232,0.12)', width: 300, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontFamily: 'Georgia, serif', fontSize: 15, fontWeight: 600, color: '#f5f0e8', margin: 0 }}>Reflect · The Grove</p>
        <div style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: 'rgba(245,240,232,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 10, color: 'rgba(245,240,232,0.5)' }}>×</span>
        </div>
      </div>

      {/* Prompt hint */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', borderRadius: 10, backgroundColor: 'rgba(245,240,232,0.04)', border: '1px solid rgba(245,240,232,0.07)' }}>
        <div style={{ width: 16, height: 16, flexShrink: 0, marginTop: 1, borderRadius: '50%', backgroundColor: 'rgba(201,168,76,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 8, color: '#c9a84c' }}>✦</span>
        </div>
        <p style={{ fontSize: 10, color: 'rgba(245,240,232,0.5)', margin: 0, lineHeight: 1.5 }}>What theme keeps showing up in this garden?</p>
      </div>

      {/* Composer */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ minHeight: 70, padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(245,240,232,0.12)', backgroundColor: 'rgba(245,240,232,0.04)', fontSize: 11, color: '#f5f0e8', lineHeight: 1.6 }}>
          The importance of slowing down keeps coming up — everything I&apos;ve saved lately links back to presence.
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: 'rgba(245,240,232,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 9, color: 'rgba(245,240,232,0.4)' }}>🎙</span>
            </div>
            <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: 'rgba(245,240,232,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 9, color: 'rgba(245,240,232,0.4)' }}>📎</span>
            </div>
          </div>
          <div style={{ padding: '6px 14px', borderRadius: 50, fontSize: 9, fontWeight: 700, backgroundColor: '#c9a84c', color: '#0d2420' }}>Save reflection</div>
        </div>
      </div>

      {/* A saved note */}
      <div style={{ padding: '12px', borderRadius: 10, backgroundColor: 'rgba(245,240,232,0.04)', border: '1px solid rgba(245,240,232,0.07)' }}>
        <p style={{ fontSize: 10, color: 'rgba(245,240,232,0.65)', margin: '0 0 6px', lineHeight: 1.55 }}>
          Listening to the Presence-Based Coaching talk — the idea that most people are waiting to feel ready before they begin. That hit.
        </p>
        <p style={{ fontSize: 9, color: 'rgba(245,240,232,0.3)', margin: 0 }}>2 days ago</p>
      </div>
    </div>
  )
}

// ─── Callout chip ─────────────────────────────────────────────────────────────

function Chip({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 50, fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', backgroundColor: `${color}22`, color: color, border: `1px solid ${color}44` }}>
      {label}
    </span>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ number, title, accent, children }: { number: string; title: string; accent: string; children: React.ReactNode }) {
  return (
    <section style={{ breakInside: 'avoid', pageBreakInside: 'avoid', marginBottom: 56 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24, paddingBottom: 14, borderBottom: `2px solid ${accent}44` }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: `${accent}22`, border: `2px solid ${accent}66`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontFamily: 'Georgia, serif', fontSize: 15, fontWeight: 700, color: accent }}>{number}</span>
        </div>
        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 22, fontWeight: 700, color: '#1a1a2e', margin: 0 }}>{title}</h2>
      </div>
      {children}
    </section>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FeatureGuidePage() {
  return (
    <div style={{ fontFamily: '"Helvetica Neue", Arial, sans-serif', backgroundColor: '#f7f4ef', minHeight: '100vh', padding: '0 0 80px' }}>

      {/* Print styles */}
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          @page { margin: 20mm 18mm; size: A4; }
        }
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&display=swap');
      `}</style>

      {/* Cover */}
      <div style={{ background: 'linear-gradient(160deg, #0d2420 0%, #152e28 60%, #1a3a30 100%)', padding: '60px 64px 52px', marginBottom: 0 }}>
        <div style={{ maxWidth: 740, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(245,240,232,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: 'Georgia, serif', fontSize: 18, fontWeight: 700, color: '#c9a84c' }}>c8</span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(245,240,232,0.5)' }}>cur8</span>
          </div>

          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#c9a84c', margin: '0 0 12px' }}>Feature Guide</p>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 38, fontWeight: 700, color: '#f5f0e8', margin: '0 0 16px', lineHeight: 1.2 }}>
            Tools for focus,<br />calm &amp; reflection.
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(245,240,232,0.6)', maxWidth: 480, lineHeight: 1.7, margin: 0 }}>
            Cur8 is more than a content library. These three built-in features support the mindset needed to actually engage with what you save — not just accumulate it.
          </p>

          <div style={{ display: 'flex', gap: 10, marginTop: 32, flexWrap: 'wrap' }}>
            <Chip label="Breathwork" color="#5a9e84" />
            <Chip label="Focus Timer" color="#c9a84c" />
            <Chip label="Reflections" color="#8ec8b4" />
          </div>
        </div>
      </div>

      {/* Thin gold rule */}
      <div style={{ height: 4, background: 'linear-gradient(90deg, #c9a84c, #e6c97a, #c9a84c)' }} />

      {/* Body */}
      <div style={{ maxWidth: 740, margin: '0 auto', padding: '56px 32px 0' }}>

        {/* ── Section 1: Breathwork ── */}
        <Section number="01" title="Breathwork" accent="#5a9e84">
          <div style={{ display: 'flex', gap: 36, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* Widget mockup */}
            <div style={{ flexShrink: 0 }}>
              <BreathworkMockup />
              <p style={{ fontSize: 9, color: '#888', textAlign: 'center', marginTop: 8, fontStyle: 'italic' }}>Widget as it appears in Cur8</p>
            </div>

            {/* Copy */}
            <div style={{ flex: 1, minWidth: 220 }}>
              <p style={{ fontSize: 14, lineHeight: 1.75, color: '#2c2c2c', margin: '0 0 16px' }}>
                The Breathwork widget gives you a guided breathing exercise you can run from anywhere inside Cur8 — no app-switching, no setup. It lives inside the Focus panel, accessible from any haven.
              </p>
              <p style={{ fontSize: 14, lineHeight: 1.75, color: '#2c2c2c', margin: '0 0 20px' }}>
                Research consistently shows that controlled breathing activates the parasympathetic nervous system — slowing heart rate and reducing cortisol — within just a few cycles. Using it before a study session or after a stressful meeting primes your mind to absorb and retain information.
              </p>

              <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 14, fontWeight: 700, color: '#1a1a2e', margin: '0 0 12px' }}>Three breathing patterns</h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { name: 'Box Breath', timing: '4 – 4 – 4 – 4', note: 'Inhale, hold, exhale, hold — equal counts create a steady, balanced rhythm. Best before presentations, client calls, or any moment requiring calm clarity.' },
                  { name: '4-7-8', timing: '4 – 7 – 8', note: 'The extended exhale activates the vagus nerve. Best when you\'re running on stress, wired but tired, or need to wind down after an intense period.' },
                  { name: 'Quick Reset', timing: '4 – 0 – 6', note: 'No holds — just a slightly longer exhale than inhale. Best in the middle of a busy moment when you can\'t stop but need an immediate reset.' },
                ].map((p) => (
                  <div key={p.name} style={{ padding: '12px 14px', borderRadius: 10, backgroundColor: 'rgba(90,158,132,0.07)', border: '1px solid rgba(90,158,132,0.18)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontFamily: 'Georgia, serif', fontSize: 13, fontWeight: 700, color: '#1a1a2e' }}>{p.name}</span>
                      <code style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 4, backgroundColor: 'rgba(90,158,132,0.15)', color: '#3a8a6a' }}>{p.timing}</code>
                    </div>
                    <p style={{ fontSize: 12, color: '#555', margin: 0, lineHeight: 1.6 }}>{p.note}</p>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 18, padding: '12px 14px', borderRadius: 10, borderLeft: '3px solid #5a9e84', backgroundColor: '#f0f7f4' }}>
                <p style={{ fontSize: 12, color: '#3a5a4a', margin: 0, lineHeight: 1.65, fontStyle: 'italic' }}>
                  "Tap the circle to start. A visual animation expands and contracts with each phase. Voice guidance and a soft chime mark each completed cycle. You can mute both from the top-right of the widget."
                </p>
              </div>
            </div>
          </div>
        </Section>

        {/* ── Section 2: Focus Timer ── */}
        <Section number="02" title="Focus Timer" accent="#c9a84c">
          <div style={{ display: 'flex', gap: 36, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* Widget mockup */}
            <div style={{ flexShrink: 0 }}>
              <TimerMockup />
              <p style={{ fontSize: 9, color: '#888', textAlign: 'center', marginTop: 8, fontStyle: 'italic' }}>Widget as it appears in Cur8</p>
            </div>

            {/* Copy */}
            <div style={{ flex: 1, minWidth: 220 }}>
              <p style={{ fontSize: 14, lineHeight: 1.75, color: '#2c2c2c', margin: '0 0 16px' }}>
                The Flow Timer is a distraction-free countdown timer that lives alongside your saved content. Open a haven, start a focus session, and work through your material without needing a separate timer app.
              </p>
              <p style={{ fontSize: 14, lineHeight: 1.75, color: '#2c2c2c', margin: '0 0 20px' }}>
                The visual ring shows progress at a glance — you always know how much time remains without interrupting your flow. A soft singing-bowl chime signals the end of the session.
              </p>

              <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 14, fontWeight: 700, color: '#1a1a2e', margin: '0 0 12px' }}>Four focus lengths</h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { time: '5 min', use: 'Quick review or a single article. Good for when you only have a short window but still want intentional focus.' },
                  { time: '15 min', use: 'One video, one chapter, one task. A meaningful block without the pressure of a full session.' },
                  { time: '25 min', use: 'The classic Pomodoro length. Ideal for deep reading, notes, or working through a course module.' },
                  { time: '45 min', use: 'A full deep-work block. Best when you want to finish something substantial without stopping.' },
                ].map((p) => (
                  <div key={p.time} style={{ padding: '12px 14px', borderRadius: 10, backgroundColor: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.18)' }}>
                    <div style={{ fontFamily: 'Georgia, serif', fontSize: 15, fontWeight: 700, color: '#c9a84c', marginBottom: 5 }}>{p.time}</div>
                    <p style={{ fontSize: 11, color: '#555', margin: 0, lineHeight: 1.6 }}>{p.use}</p>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 18, padding: '12px 14px', borderRadius: 10, borderLeft: '3px solid #c9a84c', backgroundColor: '#fdf8ec' }}>
                <p style={{ fontSize: 12, color: '#6b5a2a', margin: 0, lineHeight: 1.65, fontStyle: 'italic' }}>
                  "Select your duration, press Start, and stay in the haven. The ring fills as time passes. Pause or reset at any point. When the timer reaches zero, a three-tone chime plays to mark the moment."
                </p>
              </div>
            </div>
          </div>
        </Section>

        {/* ── Section 3: Reflections ── */}
        <Section number="03" title="Reflections" accent="#8ec8b4">
          <div style={{ display: 'flex', gap: 36, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* Widget mockup */}
            <div style={{ flexShrink: 0 }}>
              <ReflectionMockup />
              <p style={{ fontSize: 9, color: '#888', textAlign: 'center', marginTop: 8, fontStyle: 'italic' }}>Widget as it appears in Cur8</p>
            </div>

            {/* Copy */}
            <div style={{ flex: 1, minWidth: 220 }}>
              <p style={{ fontSize: 14, lineHeight: 1.75, color: '#2c2c2c', margin: '0 0 16px' }}>
                Reflections are personal notes tied to a specific haven. They are separate from item notes — they are garden-level observations: patterns you notice, questions that keep surfacing, ideas you want to carry forward.
              </p>
              <p style={{ fontSize: 14, lineHeight: 1.75, color: '#2c2c2c', margin: '0 0 20px' }}>
                Writing briefly about what you are learning — even a single sentence — significantly improves retention and synthesis. Reflections in Cur8 make that habit frictionless: they are always one tap away from the content you just engaged with.
              </p>

              <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 14, fontWeight: 700, color: '#1a1a2e', margin: '0 0 12px' }}>What you can do</h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: 'Write or dictate', desc: 'Type your thought or tap the mic button to speak it. Voice-to-text transcribes your words in real time.' },
                  { label: 'Attach files or recordings', desc: 'Pin a voice note, an image, or a document to any reflection so context stays together.' },
                  { label: 'Save to mem.ai', desc: 'One tap emails your reflection to mem.ai (or any address you choose), filing it with your wider knowledge base.' },
                  { label: 'Share via WhatsApp', desc: 'Send any reflection — with attachments — directly to a WhatsApp chat for instant sharing or further discussion.' },
                  { label: 'Edit & revisit', desc: 'All reflections are saved and editable. Revisit them as your thinking evolves.' },
                ].map((f) => (
                  <div key={f.label} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 10, backgroundColor: 'rgba(142,200,180,0.07)', border: '1px solid rgba(142,200,180,0.18)' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#8ec8b4', flexShrink: 0, marginTop: 5 }} />
                    <div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#1a1a2e' }}>{f.label} — </span>
                      <span style={{ fontSize: 12, color: '#555', lineHeight: 1.6 }}>{f.desc}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 18, padding: '12px 14px', borderRadius: 10, borderLeft: '3px solid #8ec8b4', backgroundColor: '#f0f7f5' }}>
                <p style={{ fontSize: 12, color: '#3a5a50', margin: 0, lineHeight: 1.65, fontStyle: 'italic' }}>
                  "Open any haven and tap Reflect in the toolbar. A rotating prompt helps when you are not sure where to start — but you can ignore it and write whatever is on your mind."
                </p>
              </div>
            </div>
          </div>
        </Section>

        {/* ── How they work together ── */}
        <section style={{ breakInside: 'avoid', pageBreakInside: 'avoid', marginBottom: 56 }}>
          <div style={{ padding: '28px 32px', borderRadius: 16, background: 'linear-gradient(135deg, #0d2420 0%, #152e28 100%)', border: '1px solid rgba(245,240,232,0.1)' }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#c9a84c', margin: '0 0 8px' }}>How they fit together</p>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 20, fontWeight: 700, color: '#f5f0e8', margin: '0 0 18px' }}>A simple rhythm for any session</h2>
            <div style={{ display: 'flex', gap: 0, flexWrap: 'wrap' }}>
              {[
                { step: '1', icon: '🌬', label: 'Arrive', color: '#5a9e84', desc: 'Run a 2–4 minute breathwork session before you begin. Clear the noise from the previous task.' },
                { step: '2', icon: '⏱', label: 'Focus', color: '#c9a84c', desc: 'Set the timer for your session length. Work through your saved content with a defined end point.' },
                { step: '3', icon: '✦', label: 'Reflect', color: '#8ec8b4', desc: 'Write one sentence about what you noticed. Save it. That is your session captured.' },
              ].map((s, i) => (
                <div key={s.step} style={{ flex: 1, minWidth: 160, display: 'flex', gap: 12, padding: '0 20px 0 0', borderRight: i < 2 ? '1px solid rgba(245,240,232,0.1)' : 'none', marginRight: i < 2 ? 20 : 0 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: `${s.color}22`, border: `1px solid ${s.color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: s.color }}>{s.step}</span>
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: s.color, margin: '0 0 5px' }}>{s.label}</p>
                    <p style={{ fontSize: 11, color: 'rgba(245,240,232,0.55)', margin: 0, lineHeight: 1.6 }}>{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <div style={{ borderTop: '1px solid rgba(0,0,0,0.1)', paddingTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: 11, color: '#999', margin: 0 }}>cur8 · Feature Guide</p>
          <p style={{ fontSize: 11, color: '#999', margin: 0 }}>Internal use · Not for distribution</p>
        </div>

        {/* Print button — hidden when printing */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'center', marginTop: 40 }}>
          <button
            onClick={() => window.print()}
            style={{ padding: '12px 32px', borderRadius: 50, fontSize: 13, fontWeight: 700, backgroundColor: '#0d2420', color: '#f5f0e8', border: 'none', cursor: 'pointer', letterSpacing: '0.04em' }}>
            Print / Save as PDF
          </button>
        </div>

      </div>
    </div>
  )
}
