import { expect, test } from '@playwright/test'

test('search, bookmark, practice, and persist a problem', async ({ page }, testInfo) => {
  await page.goto('/')
  await page.getByPlaceholder('搜索题号、标题或正文').fill('704 二分查找')
  const row = page.locator('.problem-row').filter({ has: page.getByRole('link', { name: '704. 二分查找' }) })
  await row.getByRole('button', { name: '收藏' }).click()
  await expect(row.locator('.bookmark')).toHaveClass(/selected/)
  await row.getByRole('link').click()
  await expect(page.locator('.primary-pane h1').first()).toHaveText('704. 二分查找')
  if (testInfo.project.name === 'mobile') await page.locator('.mobile-study-tools').getByRole('button', { name: '练习' }).click()
  else await page.getByRole('tab', { name: '练习' }).click()
  await page.locator('.cm-content').fill('left = 0\nright = n - 1\n返回答案')
  await page.waitForTimeout(900)
  await page.reload()
  if (testInfo.project.name === 'mobile') await page.locator('.mobile-study-tools').getByRole('button', { name: '练习' }).click()
  else await page.getByRole('tab', { name: '练习' }).click()
  await expect(page.locator('.cm-content')).toContainText('left = 0')
})

test('the default expanded roadmap category can be collapsed and reopened', async ({ page }) => {
  await page.goto('/')
  const topic = page.locator('.topic.open').first()
  await expect(topic).toBeVisible()
  await topic.locator('header').click()
  await expect(topic).toHaveClass(/collapsed/)
  await topic.locator('header').click()
  await expect(topic).toHaveClass(/open/)
})

test('mobile layout exposes the bound AI sheet without horizontal overflow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile')
  await page.goto('/')
  await page.getByPlaceholder('搜索题号、标题或正文').fill('704')
  await page.getByRole('link', { name: '704. 二分查找' }).click()
  await page.locator('.mobile-study-tools').getByRole('button', { name: '练习' }).click()
  await page.locator('.panel-tabs').getByRole('tab', { name: 'AI' }).click()
  await expect(page.locator('.learning-panel')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('notes, status, evaluation history, bound chat, and JSON restore', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  let evaluationNumber = 0
  let failNextChat = false
  let lastChatModel = ''
  let lastChatEffort = ''
  await page.route('**/api/codex/status', (route) => route.fulfill({ json: { connected: true, authMode: 'chatgpt', modelCount: 1 } }))
  await page.route('**/api/codex/models', (route) => route.fulfill({ json: { models: [
    { id: 'gpt-default', model: 'gpt-default', displayName: '默认模型', isDefault: true, defaultReasoningEffort: 'medium', supportedReasoningEfforts: [{ reasoningEffort: 'low', description: '快速' }, { reasoningEffort: 'medium', description: '平衡' }] },
    { id: 'gpt-6-astra', model: 'gpt-6-astra', displayName: 'GPT-6 Astra', hidden: true, isDefault: false, defaultReasoningEffort: 'medium', supportedReasoningEfforts: [{ reasoningEffort: 'low', description: '快速' }, { reasoningEffort: 'max', description: '最强' }] },
  ] } }))
  await page.route('**/evaluate', (route) => {
    evaluationNumber += 1
    return route.fulfill({ json: { threadId: 'thread-704', evaluation: { verdict: 'needs_revision', summary: `评估 ${evaluationNumber}`, findings: [], counterexamples: [], timeComplexity: 'O(log n)', spaceComplexity: 'O(1)', nextStep: '检查边界' } } })
  })
  await page.route('**/chat', (route) => {
    lastChatModel = route.request().postDataJSON().model
    lastChatEffort = route.request().postDataJSON().effort
    const body = failNextChat
      ? '{"type":"meta","threadId":"thread-704"}\n{"type":"error","error":"模拟失败"}\n'
      : '{"type":"meta","threadId":"thread-704"}\n{"type":"delta","delta":"只属于 704 的回答"}\n{"type":"done"}\n'
    failNextChat = false
    return route.fulfill({ status: 200, contentType: 'application/x-ndjson', body })
  })

  await page.goto('/')
  await page.getByPlaceholder('搜索题号、标题或正文').fill('704 二分查找')
  await page.getByRole('link', { name: '704. 二分查找' }).click()
  await page.getByRole('tab', { name: '笔记' }).click()
  await page.getByPlaceholder('记录关键点、错误、边界条件和复盘…').fill('边界：空数组与单元素')
  await page.getByRole('button', { name: '标记完成' }).click()
  await page.waitForTimeout(900)
  await page.reload()
  await expect(page.getByRole('button', { name: '标记为学习中' })).toBeVisible()
  await page.getByRole('tab', { name: '笔记' }).click()
  await expect(page.getByPlaceholder('记录关键点、错误、边界条件和复盘…')).toHaveValue('边界：空数组与单元素')

  await page.getByRole('tab', { name: '练习' }).click()
  await page.locator('.cm-content').fill('while left <= right\n  mid = left + (right-left)/2')
  await page.getByRole('button', { name: /AI 评估/ }).click()
  await expect(page.getByText('评估 1')).toBeVisible()
  await page.getByRole('button', { name: /AI 评估/ }).click()
  await expect(page.getByLabel('评估历史')).toBeVisible()
  await expect(page.getByText('评估 2')).toBeVisible()

  await page.getByRole('tab', { name: 'AI' }).click()
  await expect(page.getByLabel('AI 模型')).toContainText('跟随 Codex 默认 · 默认模型')
  await expect(page.getByLabel('AI 模型')).toContainText('GPT-6 Astra')
  await page.getByLabel('AI 模型').selectOption('gpt-6-astra')
  await page.getByLabel('推理强度').selectOption('max')
  await page.getByRole('button', { name: '我知道了' }).click()
  await page.locator('.chat-panel textarea').fill('我的循环条件对吗？')
  await page.getByRole('button', { name: '发送' }).click()
  await expect(page.getByText('只属于 704 的回答')).toBeVisible()
  expect(lastChatModel).toBe('gpt-6-astra')
  expect(lastChatEffort).toBe('max')
  await page.getByRole('button', { name: '同步默认' }).click()
  await expect(page.getByLabel('AI 模型')).toHaveValue('')
  await expect(page.getByLabel('推理强度')).toHaveValue('')
  await page.getByRole('link', { name: /下一篇/ }).click()
  await expect(page.getByText('只属于 704 的回答')).toHaveCount(0)

  await page.goto('/')
  await page.getByRole('button', { name: '设置', exact: true }).click()
  await expect(page.getByText('Codex 已连接')).toBeVisible()
  await expect(page.getByText(/ChatGPT.*1 个模型/)).toBeVisible()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出数据' }).click()
  const download = await downloadPromise
  const backupPath = testInfo.outputPath('backup.json')
  await download.saveAs(backupPath)
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: '清空数据' }).click()
  await page.getByRole('button', { name: '设置', exact: true }).click()
  await page.locator('input[type=file]').setInputFiles(backupPath)
  await expect(page.getByText(/导入预览/)).toBeVisible()
  await page.getByRole('button', { name: '确认合并' }).click()
  await page.getByPlaceholder('搜索题号、标题或正文').fill('704 二分查找')
  await page.getByRole('link', { name: '704. 二分查找' }).click()
  await expect(page.getByRole('button', { name: '标记为学习中' })).toBeVisible()
})

test('reading mask reveals five-line bands and persists per problem', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  await page.goto('/problems/509-0509-%E6%96%90%E6%B3%A2%E9%82%A3%E5%A5%91%E6%95%B0-e6b3f9')
  const toggle = page.getByRole('button', { name: '使用遮罩' })
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.mask-band.revealed')).toHaveCount(1)
  await page.getByRole('button', { name: '查看第 6 到 10 行' }).click()
  await expect(page.locator('.mask-band.revealed')).toHaveCount(2)
  await page.reload()
  await expect(page.getByRole('button', { name: '使用遮罩' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: '蒙上第 6 到 10 行' })).toHaveCount(1)
})

test('markdown code stays readable in light theme and receives syntax highlighting', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  await page.goto('/problems/509-0509-%E6%96%90%E6%B3%A2%E9%82%A3%E5%A5%91%E6%95%B0-e6b3f9')
  await page.getByRole('button', { name: '设置', exact: true }).click()
  await page.getByRole('button', { name: /深色主题|浅色主题/ }).click()
  await page.getByRole('button', { name: '×' }).click()
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  const block = page.locator('.primary-pane .markdown-body pre').first()
  await expect(block).toBeVisible()
  await expect(page.locator('.primary-pane .hljs-keyword, .primary-pane .hljs-number, .primary-pane .hljs-title').first()).toBeVisible()
  const colors = await block.evaluate((element) => {
    const style = getComputedStyle(element)
    return { background: style.backgroundColor, foreground: style.color }
  })
  expect(colors.background).not.toBe(colors.foreground)
})

test('route and tool transitions are lightweight and respect reduced motion', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  await page.goto('/')
  await expect(page.locator('.route-transition')).toHaveCSS('animation-name', 'route-enter')
  await page.getByRole('link', { name: /继续/ }).click()
  await page.getByRole('tab', { name: '笔记' }).click()
  await expect(page.locator('.notes-pane')).toHaveCSS('animation-name', 'tool-panel-enter')

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.reload()
  await expect(page.locator('.route-transition')).toHaveCSS('animation-name', 'none')
})

test('contrast palettes are light-only, persistent, and keep action text readable', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  await page.goto('/')
  await page.getByRole('button', { name: '设置', exact: true }).click()
  await expect(page.getByRole('button', { name: '选择绯红海湾' })).toBeDisabled()
  await page.getByRole('button', { name: /深色主题/ }).click()

  for (const name of ['Linear 紫', '绯红海湾', '钴蓝柑橘', '番茄蓝调', '琥珀鼠尾草']) {
    await page.getByRole('button', { name: `选择${name}` }).click()
    await page.waitForTimeout(180)
    const contrast = await page.locator('.button.primary').evaluate((element) => {
      const parse = (color: string) => color.match(/[\d.]+/g)!.slice(0, 3).map(Number)
      const luminance = (color: string) => {
        const values = parse(color).map((value) => value / 255).map((value) => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
        return .2126 * values[0] + .7152 * values[1] + .0722 * values[2]
      }
      const style = getComputedStyle(element)
      const foreground = luminance(style.color)
      const background = luminance(style.backgroundColor)
      return (Math.max(foreground, background) + .05) / (Math.min(foreground, background) + .05)
    })
    expect(contrast).toBeGreaterThanOrEqual(4.5)
  }

  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'amber-sage')
})
