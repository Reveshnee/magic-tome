import { get } from '@vercel/blob'
import { generateText } from 'ai'

/**
 * Extract plain-text content from an uploaded Cur8 document so the AI can read it.
 *
 * - Word (.docx/.doc): mammoth (fast, free). NOTE: mammoth needs a Node Buffer,
 *   NOT a raw ArrayBuffer — passing ArrayBuffer throws "Could not find file in options".
 * - Text (.txt/.md/.csv): decoded directly.
 * - PDF: sent to Gemini (multimodal). Many of Reveshnee's PDFs are image-based
 *   exports (no embedded font/text layer) so a plain text parser returns nothing.
 *   Gemini reads both real-text and image/scanned PDFs via its own vision/OCR.
 *
 * Returns the extracted text (capped) or null when nothing could be read.
 */
export async function extractDocText(blobPathname: string): Promise<string | null> {
  const lower = blobPathname.toLowerCase()

  // Download the private blob bytes
  const res = await get(blobPathname, { access: 'private' })
  if (!res) return null
  const arrayBuffer = await new Response(res.stream).arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  let text: string | null = null

  if (lower.endsWith('.docx') || lower.endsWith('.doc')) {
    const mammoth = (await import('mammoth')).default ?? (await import('mammoth'))
    const result = await mammoth.extractRawText({ buffer })
    text = result.value?.trim() || null
  } else if (lower.endsWith('.txt') || lower.endsWith('.md') || lower.endsWith('.csv')) {
    text = buffer.toString('utf-8').trim() || null
  } else if (lower.endsWith('.pdf')) {
    text = await readPdfWithGemini(buffer)
  }

  if (!text) return null
  // Cap stored text so the DB row + AI context stay reasonable
  return text.slice(0, 20000)
}

/** Use Gemini's multimodal vision to transcribe a PDF (works for image/scanned PDFs). */
async function readPdfWithGemini(buffer: Buffer): Promise<string | null> {
  // Gemini inline file limit is ~20MB; base64 inflates ~33%, so guard well under that.
  if (buffer.length > 14 * 1024 * 1024) {
    // Too large to send inline — still try, but many will fit; if it throws, caller catches.
  }
  try {
    const { text } = await generateText({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Transcribe the meaningful text content of this document in plain text. Preserve headings and key ideas in reading order. Do not add commentary, notes, or "here is the content" — output only the document content itself.',
            },
            { type: 'file', data: buffer, mediaType: 'application/pdf' },
          ],
        },
      ],
    })
    return text?.trim() || null
  } catch {
    return null
  }
}

/** Pull the blob pathname out of a Cur8 file URL like /api/cur8/file?pathname=cur8%2FX.pdf */
export function blobPathnameFromUrl(url: string): string | null {
  try {
    const u = new URL(url, 'http://x')
    const p = u.searchParams.get('pathname')
    return p ? decodeURIComponent(p) : null
  } catch {
    return null
  }
}
