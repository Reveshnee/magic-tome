'use client'

import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  opacity: number
  rotation: number
  rotationSpeed: number
  type: 'leaf' | 'drop' | 'spark'
  color: string
  life: number
  maxLife: number
}

const COLORS = ['#5a9e84', '#8ec8b4', '#c9a84c', '#c85a40', '#f5f0e8']

function randBetween(a: number, b: number) {
  return a + Math.random() * (b - a)
}

export default function FloatingParticles({ disabled = false }: { disabled?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (disabled) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let W = 0, H = 0
    const particles: Particle[] = []

    function resize() {
      W = canvas!.width = window.innerWidth
      H = canvas!.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    function spawnParticle(): Particle {
      const type = Math.random() < 0.5 ? 'leaf' : Math.random() < 0.7 ? 'drop' : 'spark'
      const maxLife = randBetween(120, 280)
      return {
        x: randBetween(0, W),
        y: randBetween(-40, H * 0.3),
        vx: randBetween(-0.3, 0.3),
        vy: randBetween(0.15, 0.55),
        size: type === 'leaf' ? randBetween(5, 14) : type === 'drop' ? randBetween(2, 5) : randBetween(1.5, 3),
        opacity: 0,
        rotation: randBetween(0, Math.PI * 2),
        rotationSpeed: randBetween(-0.012, 0.012),
        type,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        life: 0,
        maxLife,
      }
    }

    // Seed initial particles
    for (let i = 0; i < 28; i++) {
      const p = spawnParticle()
      p.y = randBetween(0, H)
      p.life = randBetween(0, p.maxLife * 0.6)
      particles.push(p)
    }

    function drawLeaf(ctx: CanvasRenderingContext2D, p: Particle) {
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rotation)
      ctx.globalAlpha = p.opacity
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.moveTo(0, -p.size)
      ctx.bezierCurveTo(p.size * 0.8, -p.size * 0.5, p.size * 0.8, p.size * 0.5, 0, p.size)
      ctx.bezierCurveTo(-p.size * 0.8, p.size * 0.5, -p.size * 0.8, -p.size * 0.5, 0, -p.size)
      ctx.fill()
      // vein
      ctx.strokeStyle = `rgba(255,255,255,0.25)`
      ctx.lineWidth = 0.5
      ctx.beginPath()
      ctx.moveTo(0, -p.size)
      ctx.lineTo(0, p.size)
      ctx.stroke()
      ctx.restore()
    }

    function drawDrop(ctx: CanvasRenderingContext2D, p: Particle) {
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rotation)
      ctx.globalAlpha = p.opacity
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(0, 0, p.size, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    function drawSpark(ctx: CanvasRenderingContext2D, p: Particle) {
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.globalAlpha = p.opacity
      ctx.fillStyle = p.color
      ctx.shadowColor = p.color
      ctx.shadowBlur = 6
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size)
      ctx.restore()
    }

    function tick() {
      ctx!.clearRect(0, 0, W, H)

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.life++
        p.x += p.vx + Math.sin(p.life * 0.02) * 0.25
        p.y += p.vy
        p.rotation += p.rotationSpeed

        // Fade in / out
        const fadeIn = 30
        const fadeOut = 40
        if (p.life < fadeIn) {
          p.opacity = (p.life / fadeIn) * 0.55
        } else if (p.life > p.maxLife - fadeOut) {
          p.opacity = ((p.maxLife - p.life) / fadeOut) * 0.55
        } else {
          p.opacity = 0.55
        }

        if (p.type === 'leaf') drawLeaf(ctx!, p)
        else if (p.type === 'drop') drawDrop(ctx!, p)
        else drawSpark(ctx!, p)

        // Recycle
        if (p.life >= p.maxLife || p.y > H + 30) {
          particles[i] = spawnParticle()
        }
      }

      animId = requestAnimationFrame(tick)
    }

    tick()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [disabled])

  if (disabled) return null

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 2,
      }}
      aria-hidden
    />
  )
}
