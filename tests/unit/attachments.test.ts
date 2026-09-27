import { access } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { attachmentContext, materializeImageAttachments, parseChatAttachments } from '@/lib/ai/attachments'

describe('chat attachments', () => {
  it('accepts validated images and text files', () => {
    const parsed = parseChatAttachments([
      { kind: 'image', name: 'tree.png', type: 'image/png', size: 3, data: 'data:image/png;base64,YWJj' },
      { kind: 'text', name: 'solve.py', type: 'text/x-python', size: 8, content: 'print(1)' },
    ])
    expect(parsed).toHaveLength(2)
    expect(attachmentContext(parsed)).toContain('solve.py')
    expect(attachmentContext(parsed)).toContain('print(1)')
  })

  it('rejects unsupported or excessive attachments', () => {
    expect(() => parseChatAttachments([{ kind: 'image', name: 'bad.svg', data: 'data:image/svg+xml;base64,YQ==' }])).toThrow()
    expect(() => parseChatAttachments(Array.from({ length: 5 }, (_, index) => ({ kind: 'text', name: `${index}.txt`, content: '' })))).toThrow('最多')
  })

  it('materializes images as temporary local files and removes them', async () => {
    const attachments = parseChatAttachments([
      { kind: 'image', name: 'tree.png', type: 'image/png', size: 3, data: 'data:image/png;base64,YWJj' },
    ])
    const temporary = await materializeImageAttachments(attachments)
    await expect(access(temporary.paths[0])).resolves.toBeUndefined()
    await temporary.dispose()
    await expect(access(temporary.paths[0])).rejects.toThrow()
  })
})
