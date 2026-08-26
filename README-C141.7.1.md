# C141.7.1 Runtime Context Boundary — 完整覆盖版

覆盖文件：

- `components/chat/ChatPanel.tsx`
- `lib/conversation/builder.ts`

新增文档：

- `docs/C141.7.1-runtime-context-boundary.md`

## 手机 GitHub 上传方式

1. 打开 `Vivi9max/AIOS-Alpha`
2. `Add file` → `Upload files`
3. 上传本包内两个代码文件到对应路径并覆盖原文件
4. `docs` 文件可一起上传
5. Commit message：

`fix(C141.7.1): enforce runtime context boundary on refresh`

6. Commit directly to `main`
7. 等待 Vercel Production Build

## 验证顺序

Build Passed
→ Production Ready
→ Runtime 请求
→ 刷新
→ 检查历史
→ 发送普通问题
→ 再刷新
→ 再次发送普通问题

## 成功标准

刷新后：

- 不出现“你是 AIOS Runtime 的执行引擎”
- 不出现“内部执行步骤”
- 不出现“最终回答规则”
- 不把旧 Runtime wrapper 当成用户输入
- 普通历史对话仍然保留
- 新请求只使用当前请求 + 受信任 Runtime Policy + 正常参考数据
