import Link from 'next/link'
import type { Metadata } from 'next'
import {
  ArrowLeft, Home, Layers, PlusCircle, Search, Sparkles, Brain, Leaf,
  Headphones, Wind, Smartphone, FolderOpen, Share2, Pencil, Bookmark,
  ClipboardPaste, Shuffle, Target, Paperclip, CheckSquare, HelpCircle,
  ShieldCheck, GitBranch, Download, Database, Cloud, Lock,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'How to use Cur8 — your simple guide',
  description: 'A plain-language walkthrough of everything Cur8 can do, step by step.',
}

// The 8 havens exactly as they appear in the app (display name + life area + what belongs there).
const HAVENS = [
  { name: 'The Koi Pond', area: 'SACAP', holds: 'Lectures, modules & research reads' },
  { name: 'The Current', area: 'Work', holds: 'Client research, saves & work tools' },
  { name: 'The Greenhouse', area: 'Fashion & Style', holds: 'Looks, lookbooks & style inspiration' },
  { name: 'Sanctuary', area: 'Wellness', holds: 'Meditation, nervous system & health' },
  { name: 'The Grove', area: 'Psychology', holds: "Research, talks & books you're studying" },
  { name: 'Ember', area: 'Inspiration', holds: 'Mood, quotes & things that spark' },
  { name: 'Bloom', area: 'Entertainment', holds: 'Music, shows & pure fun' },
  { name: 'The Tide', area: 'Document Hub', holds: 'SOPs, docs & everything else' },
]

// The services Cur8 is connected to, in plain language.
const POWERS = [
  { label: 'Neon database', role: 'Your vault. Holds every saved item, brain-dump note, reflection and folder. This is where your content actually lives.' },
  { label: 'Vercel Blob', role: 'Safe storage for pictures, thumbnails and any files you upload, so previews keep working over time.' },
  { label: 'Sign-in (Better Auth)', role: 'Keeps your haven private — only you, signed in, can see your things.' },
  { label: 'AI helper', role: 'Powers the Summary, Listen and AI insight features that make sense of what you save.' },
  { label: 'YouTube key', role: 'Lets you import a whole YouTube playlist at once.' },
  { label: 'Email to your tools', role: 'Brain-dump thoughts can be emailed to yourself or mem.ai from your own email app.' },
]

const GOLD = '#c9a04a'
const CORAL = '#d97a56'
const SAGE = '#5a9e84'
const CREAM = '#f5f0e8'
const CARD_BG = '#0a1e1b'
const BORDER = 'rgba(245,240,232,0.1)'
const MUTED = 'rgba(245,240,232,0.62)'

function iconWrap(color: string) {
  return {
    width: 40, height: 40, borderRadius: 11, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    backgroundColor: `${color}22`, color, border: `1px solid ${color}44`,
  } as const
}

// A titled card holding a set of steps.
function Section({
  icon, tint, kicker, title, children,
}: {
  icon: React.ReactNode; tint: string; kicker: string; title: string; children: React.ReactNode
}) {
  return (
    <section
      style={{
        backgroundColor: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 20,
        padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: 14,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
        <div style={iconWrap(tint)}>{icon}</div>
        <div>
          <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: tint, margin: '0 0 3px' }}>{kicker}</p>
          <h2 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 21, fontWeight: 700, color: CREAM, margin: 0, lineHeight: 1.15 }}>{title}</h2>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>
    </section>
  )
}

// A single numbered step.
function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <span
        style={{
          width: 24, height: 24, borderRadius: '50%', flexShrink: 0, marginTop: 1,
          backgroundColor: 'rgba(245,240,232,0.08)', color: GOLD, border: `1px solid ${GOLD}55`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800,
        }}
      >
        {n}
      </span>
      <p style={{ fontSize: 14, lineHeight: 1.6, color: CREAM, margin: 0 }}>{children}</p>
    </div>
  )
}

// A tip / note line.
function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', backgroundColor: 'rgba(90,158,132,0.1)', border: `1px solid ${SAGE}33`, borderRadius: 12, padding: '10px 12px' }}>
      <Sparkles size={15} style={{ color: SAGE, flexShrink: 0, marginTop: 2 }} />
      <p style={{ fontSize: 13, lineHeight: 1.55, color: MUTED, margin: 0 }}>{children}</p>
    </div>
  )
}

function Term({ children }: { children: React.ReactNode }) {
  return <strong style={{ color: CREAM, fontWeight: 700 }}>{children}</strong>
}

export default function GuidePage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundColor: '#081c19',
        color: CREAM,
        fontFamily: 'var(--font-inter), ui-sans-serif, system-ui, sans-serif',
      }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px 72px' }}>
        {/* Back link */}
        <Link
          href="/cur8"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: MUTED, textDecoration: 'none', fontSize: 13, fontWeight: 600, marginBottom: 22 }}
        >
          <ArrowLeft size={15} /> Back to your haven
        </Link>

        {/* Hero */}
        <header style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: GOLD, margin: '0 0 10px' }}>
            Your simple guide
          </p>
          <h1 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 'clamp(34px, 7vw, 52px)', fontWeight: 700, lineHeight: 1.05, margin: '0 0 14px', letterSpacing: '-0.01em' }}>
            How to use <em style={{ fontStyle: 'italic', color: GOLD }}>Cur8</em>
          </h1>
          <p style={{ fontSize: 15, lineHeight: 1.65, color: MUTED, margin: 0, maxWidth: 560 }}>
            Cur8 is one calm home for everything you save — videos, links, images and documents. Instead of losing
            things across a dozen apps, you keep them here, sorted into eight gentle spaces. No jargon ahead — just
            what each button does and how to do the things you&apos;ll do most.
          </p>
        </header>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 1. The havens */}
          <Section icon={<Layers size={19} />} tint={GOLD} kicker="The basics" title="Your 8 havens">
            <p style={{ fontSize: 14, lineHeight: 1.6, color: MUTED, margin: 0 }}>
              Everything you save lives in one of eight havens. Each one is just a themed shelf for a part of your life.
              Tap any haven tile on the home screen to open it.
            </p>
            <div style={{ display: 'grid', gap: 8 }}>
              {HAVENS.map((h) => (
                <div key={h.name} style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', padding: '9px 12px', backgroundColor: 'rgba(245,240,232,0.04)', border: `1px solid ${BORDER}`, borderRadius: 11 }}>
                  <span style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 15, fontWeight: 700, color: CREAM }}>{h.name}</span>
                  <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: GOLD }}>{h.area}</span>
                  <span style={{ fontSize: 12.5, color: MUTED, flexBasis: '100%' }}>{h.holds}</span>
                </div>
              ))}
            </div>
            <Tip>Don&apos;t overthink which haven something goes in — Cur8 makes a smart guess for you when you save, and you can move anything later in two taps.</Tip>
          </Section>

          {/* 2. Saving something */}
          <Section icon={<PlusCircle size={19} />} tint={CORAL} kicker="I want to…" title="Save something">
            <p style={{ fontSize: 14, lineHeight: 1.6, color: MUTED, margin: 0 }}>There are three easy ways, depending on where you are:</p>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: CREAM, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 7 }}><Bookmark size={15} style={{ color: CORAL }} /> The fastest way — Quick save</p>
              <Step n={1}>On the home screen, find the <Term>Quick save</Term> button in the &ldquo;Quick actions&rdquo; row.</Step>
              <Step n={2}>Paste a link (or tap <Term>Paste</Term> to grab whatever&apos;s on your clipboard).</Step>
              <Step n={3}>Tap <Term>Save &amp; file</Term>. Cur8 fetches the title and picture and files it into the right haven for you.</Step>
              <Step n={4}>If it guessed the wrong haven, tap any other haven under &ldquo;Wrong spot? Move it&rdquo; — done.</Step>
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: CREAM, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 7 }}><ClipboardPaste size={15} style={{ color: CORAL }} /> Inside a haven</p>
              <Step n={1}>Open the haven you want, then use its <Term>Add / Paste link</Term> option to drop something straight in.</Step>
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: CREAM, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 7 }}><Smartphone size={15} style={{ color: CORAL }} /> From another app on your phone</p>
              <Step n={1}>In YouTube, TikTok, Instagram, your browser — anywhere — tap that app&apos;s <Term>Share</Term> button.</Step>
              <Step n={2}>Pick <Term>Cur8</Term> from the share list. It opens, you choose a haven, and it&apos;s saved.</Step>
            </div>
            <Tip>The &ldquo;share from another app&rdquo; option appears once you&apos;ve added Cur8 to your phone&apos;s home screen (see &ldquo;Use it like a real app&rdquo; below).</Tip>
          </Section>

          {/* 3. Finding things */}
          <Section icon={<Search size={19} />} tint={SAGE} kicker="I want to…" title="Find something again">
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: CREAM, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 7 }}><Search size={15} style={{ color: SAGE }} /> Search everything at once</p>
              <Step n={1}>Tap <Term>Search</Term> at the top of the home screen.</Step>
              <Step n={2}>Start typing. Cur8 looks across all your saved items, your brain-dump notes, and your reflections at the same time.</Step>
              <Step n={3}>Tap any result to jump straight to it.</Step>
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: CREAM, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 7 }}><Shuffle size={15} style={{ color: SAGE }} /> Surprise me</p>
              <Step n={1}>On the home screen tap <Term>Surprise me</Term> to be shown one random thing you&apos;ve saved — lovely for rediscovering forgotten gems.</Step>
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: CREAM, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 7 }}><Target size={15} style={{ color: SAGE }} /> One thing (for overwhelm)</p>
              <Step n={1}>Tap <Term>One thing</Term> in the Quick actions row.</Step>
              <Step n={2}>Pick a haven, and Cur8 surfaces just <em>one</em> item to focus on — nothing else on screen to pull your attention.</Step>
              <Step n={3}>Tap <Term>Something else</Term> to shuffle, or <Term>Engage with this</Term> to open it.</Step>
            </div>
          </Section>

          {/* 4. Thinking space */}
          <Section icon={<Brain size={19} />} tint={GOLD} kicker="Your thinking space" title="Capture thoughts & notes">
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: CREAM, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 7 }}><Brain size={15} style={{ color: GOLD }} /> Brain dump</p>
              <Step n={1}>Tap the <Term>brain</Term> button (bottom-left on the home screen) any time a thought pops up.</Step>
              <Step n={2}>Type or tap the mic to <Term>speak</Term> it. It saves instantly so you can let it go.</Step>
              <Step n={3}>You can pin important thoughts, send one to your email, or share it to WhatsApp.</Step>
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: CREAM, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 7 }}><Leaf size={15} style={{ color: SAGE }} /> Reflections</p>
              <Step n={1}>Inside a haven, open <Term>Reflect</Term> to jot how something landed with you or what you learned.</Step>
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: CREAM, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 7 }}><Pencil size={15} style={{ color: GOLD }} /> &ldquo;Why I saved this&rdquo;</p>
              <Step n={1}>Open any saved item and tap <Term>Edit</Term>.</Step>
              <Step n={2}>Fill in <Term>Why I saved this</Term> — one line of context for future you (it shows in gold under the title).</Step>
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: CREAM, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 7 }}><Paperclip size={15} style={{ color: CORAL }} /> Attach things to a note</p>
              <Step n={1}>On any brain-dump note or reflection, tap the <Term>paperclip</Term> to attach a link or a file that belongs with it.</Step>
            </div>
          </Section>

          {/* 5. Calm */}
          <Section icon={<Wind size={19} />} tint={SAGE} kicker="Make it gentle" title="Focus & calm">
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: CREAM, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 7 }}><Headphones size={15} style={{ color: SAGE }} /> Focus sounds</p>
              <Step n={1}>Tap <Term>Focus sounds</Term> (bottom-right on the home screen) to play gentle background audio while you work.</Step>
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: CREAM, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 7 }}><Wind size={15} style={{ color: SAGE }} /> Calm mode</p>
              <Step n={1}>Tap <Term>Calm</Term> at the top to soften animations for a quieter, lower-stimulation screen.</Step>
            </div>
          </Section>

          {/* 6. Managing items */}
          <Section icon={<FolderOpen size={19} />} tint={CORAL} kicker="Keep it tidy" title="Organise & share">
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: CREAM, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 7 }}><FolderOpen size={15} style={{ color: CORAL }} /> Folders inside a haven</p>
              <Step n={1}>Inside a haven you can make <Term>folders</Term> to group things, then pin, rename or reorder them.</Step>
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: CREAM, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 7 }}><CheckSquare size={15} style={{ color: CORAL }} /> Tidy several at once</p>
              <Step n={1}>Tap <Term>Select</Term>, tick the items you want, then move, copy or delete them all together from the bar at the bottom.</Step>
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: CREAM, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 7 }}><Share2 size={15} style={{ color: CORAL }} /> Share or save an item</p>
              <Step n={1}>Open an item and tap <Term>Share</Term> (or the three-dot menu on its card).</Step>
              <Step n={2}>Send it by <Term>Email</Term> or <Term>WhatsApp</Term>, share to your device, copy the link, or download the file.</Step>
            </div>
          </Section>

          {/* 7. PWA */}
          <Section icon={<Smartphone size={19} />} tint={GOLD} kicker="On your phone" title="Use it like a real app">
            <Step n={1}>Open Cur8 in your phone&apos;s browser.</Step>
            <Step n={2}>On Android: tap the browser menu and choose <Term>Add to Home screen</Term>. On iPhone: tap Share, then <Term>Add to Home Screen</Term>.</Step>
            <Step n={3}>Now it opens full-screen from your home screen — with the red &amp; gold koi icon — and updates itself automatically.</Step>
            <Tip>Adding it to your home screen is also what unlocks the &ldquo;Share to Cur8&rdquo; option inside other apps.</Tip>
          </Section>

          {/* Backup & safety */}
          <Section icon={<ShieldCheck size={19} />} tint={GOLD} kicker="Peace of mind" title="Keeping Cur8 safe">
            <p style={{ fontSize: 14, lineHeight: 1.6, color: MUTED, margin: 0 }}>
              Cur8 is really three separate things, and it helps to know each one is safe on its own:
              the <Term>recipe</Term> (the code that builds the app), the <Term>live site</Term> (what you visit),
              and your <Term>content</Term> (docs, links, notes — kept in the Neon vault). Here&apos;s how to protect all three.
            </p>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: CREAM, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 7 }}><GitBranch size={15} style={{ color: GOLD }} /> Back up the recipe to GitHub (best — do once)</p>
              <Step n={1}>In the v0 editor, open <Term>Settings</Term> (top-right) and go to <Term>Git</Term>.</Step>
              <Step n={2}>Connect your <Term>GitHub</Term> account and let it create a repository for Cur8.</Step>
              <Step n={3}>From then on, every change is copied to GitHub automatically — a living backup of the whole recipe.</Step>
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: CREAM, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 7 }}><Download size={15} style={{ color: CORAL }} /> Or keep a copy on your computer</p>
              <Step n={1}>In the editor, open the <Term>three-dot menu</Term> (top-right of the code view) and choose <Term>Download ZIP</Term>.</Step>
              <Step n={2}>Save the ZIP somewhere safe, or email it to yourself so it&apos;s in your inbox. This is a snapshot frozen at that moment.</Step>
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: CREAM, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 7 }}><Database size={15} style={{ color: SAGE }} /> Your content is separate — and safe</p>
              <Step n={1}>Everything you save lives in the <Term>Neon</Term> vault, not inside the app itself.</Step>
              <Step n={2}>You can rebuild or re-publish the app and simply point it back at the same Neon vault — all your items reappear, nothing re-typed.</Step>
              <Step n={3}>The one thing to never do is delete the Neon database itself. Keep that, and your content stays.</Step>
            </div>
            <Tip>Rule of thumb: the app can always be rebuilt from the recipe (GitHub / ZIP). Your actual saved things live in Neon. Protect both and you can&apos;t truly lose Cur8.</Tip>
          </Section>

          {/* What powers Cur8 */}
          <Section icon={<Cloud size={19} />} tint={SAGE} kicker="Under the hood" title="What Cur8 is connected to">
            <p style={{ fontSize: 14, lineHeight: 1.6, color: MUTED, margin: 0 }}>
              You don&apos;t need to manage any of these day to day — but here&apos;s what&apos;s quietly powering things, in plain words.
            </p>
            <div style={{ display: 'grid', gap: 8 }}>
              {POWERS.map((p) => (
                <div key={p.label} style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', padding: '10px 12px', backgroundColor: 'rgba(245,240,232,0.04)', border: `1px solid ${BORDER}`, borderRadius: 11 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: CREAM }}>{p.label}</span>
                  <span style={{ fontSize: 12.5, lineHeight: 1.5, color: MUTED, flexBasis: '100%' }}>{p.role}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', backgroundColor: 'rgba(201,160,74,0.1)', border: `1px solid ${GOLD}33`, borderRadius: 12, padding: '10px 12px' }}>
              <Lock size={15} style={{ color: GOLD, flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontSize: 13, lineHeight: 1.55, color: MUTED, margin: 0 }}>
                Before Cur8 is ever opened up to other people, the sign-in security key should be strengthened — a quick, important step for a paid product.
              </p>
            </div>
          </Section>

          {/* Keep this guide */}
          <Section icon={<Bookmark size={19} />} tint={SAGE} kicker="Keep it handy" title="Save this guide">
            <p style={{ fontSize: 14, lineHeight: 1.6, color: MUTED, margin: 0 }}>
              Want it for later? Save this page into <Term>The Tide</Term> (your Document Hub) so it&apos;s always one tap away.
            </p>
            <Step n={1}>Copy this page&apos;s web address from your browser bar.</Step>
            <Step n={2}>On the home screen tap <Term>Quick save</Term>, paste the address, and tap <Term>Save &amp; file</Term>.</Step>
            <Step n={3}>Move it to <Term>The Tide</Term> if it doesn&apos;t land there — and it&apos;ll sit with your other SOPs.</Step>
          </Section>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 28, textAlign: 'center' }}>
          <Link href="/cur8" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: GOLD, textDecoration: 'none', fontSize: 14, fontWeight: 700 }}>
            <Home size={16} /> Back to your haven
          </Link>
          <p style={{ fontSize: 12, color: 'rgba(245,240,232,0.4)', marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <HelpCircle size={13} /> Cur8 is yours — there&apos;s no wrong way to use it.
          </p>
        </div>
      </div>
    </main>
  )
}
