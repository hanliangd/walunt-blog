# Git 速查（只管我自己的项目）

> **用法：按 `Ctrl+F` 搜你要做的事或报错原文。**
>
> 场景固定：一个人、一个分支（`main`）、一个远程（GitHub）。
> 所有例子都是我在 `E:\测试\FastAPItest` 里真敲过的。

---

## 🥇 日常 5 条（一天到晚就这 5 个）

| 命令 | 例子 | 干什么 |
|---|---|---|
| `git status -sb` | `git status -sb` | **第一行就够看**：`## main...origin/main` = 完全同步 |
| `git add` | `git add static/index.html` | 暂存（**精确列文件，别用 `-A`**） |
| `git commit -m` | `git commit -m "feat: 首页加 AI 对话入口"` | 提交 |
| `git push` | `git push` | 推到 GitHub |
| `git log --oneline` | `git log --oneline -3` | 最近 3 条提交 |

**日常循环**：`status` → `add` → `commit` → `push` → 再 `status` 一眼 ✓

---

## 📊 看状态 / 看改了什么

| 命令 | 例子 | 干什么 |
|---|---|---|
| `git status -sb` | `git status -sb` | 简洁版状态（**最常用**）|
| `git status --short` | `git status --short` | 两列缩写：`M` 改动 / `??` 未跟踪 / `D` 删除 |
| `git diff` | `git diff static/post.css` | 改了什么（**还没 add 的**）|
| `git diff --stat` | `git diff --stat` | 只看改了几个文件、几行 |
| `git diff --cached` | `git diff --cached` | **已经 add 但还没 commit 的**差别 |
| `git show --stat HEAD` | `git show --stat HEAD` | 最后一次提交动了哪些文件 |
| `git log -p -1` | `git log -p -1` | 最后一次提交的完整 diff |
| `git log --stat -3` | `git log --stat -3` | 最近 3 次提交各动了什么 |

> **`git diff` vs `git diff --cached`**：前者看"工作区 vs 暂存区"，后者看"暂存区 vs 上次提交"。**add 之后 `git diff` 就空了** —— 这是最常见的困惑 ✓

---

## ✍️ 提交

| 命令 | 例子 | 干什么 |
|---|---|---|
| `git add`（精确） | `git add README.md static/post.css` | 只加这两个 |
| `git add -u` | `git add -u` | 只加**已跟踪文件**的改动（不会带进新的未跟踪文件 ✓）|
| `git add -A` | `git add -A` | 全加（**含未跟踪** → 小心大文件 ✗）|
| `git commit -m` | `git commit -m "docs: 部署手册 + Linux 速查"` | 提交 |
| `git commit --amend --no-edit` | `git commit --amend --no-edit` | **把刚 add 的东西并进上一次提交**（不产生新提交）|
| `git commit --amend -m` | `git commit --amend -m "新信息"` | 改上次的提交信息 |

**提交信息前缀（我一直用这套）**：

```
feat:     新功能
fix:      修 bug
docs:     文档 / 笔记
style:    只改样式，不动逻辑
refactor: 重构，功能不变
chore:    杂活（依赖、配置、gitignore）
deps:     依赖版本
```

⚠️ **JBSD：`--amend` 只能用在 "还没 push" 的提交上** ✓ push 过的改了要 `--force` ✗

---

## 🚀 推送（含 GitHub 的坑）

| 命令 | 例子 | 干什么 |
|---|---|---|
| `git push` | `git push` | 推到已设置的上游 |
| `git push -u origin main` | `git push -u origin main` | **第一次推**，顺便设上游 |
| `git remote -v` | `git remote -v` | 远程地址是什么 |
| `git remote set-url` | `git remote set-url origin https://github.com/hanliangd/walunt-blog.git` | 改远程地址 |
| `git branch -M main` | `git branch -M main` | 本地分支改名成 `main` |
| `git ls-remote` | `git ls-remote origin refs/heads/main` | **直接问服务器**远程 HEAD（不开网页）✓ |
| `git rev-parse HEAD` | `git rev-parse HEAD` | 本地 HEAD 的完整哈希 |

**判断推成功没有（三档）**：

| 输出 | 含义 |
|---|---|
| `旧哈希..新哈希  main -> main` | ✅ 成功 |
| `Everything up-to-date` | ✅ 已经是最新 |
| `! [rejected]` / `error:` | ❌ 失败 |

---

## ↩️ 撤销（**最重要的一节**）

### 先判断"我错到哪一步了"

```
① 只是改了文件，还没 add
    → git restore 文件

② 已经 add，还没 commit
    → git restore --staged 文件
    → （再 git restore 文件）

③ 已经 commit，还没 push
    → git reset --soft HEAD~1      （保保留改动，只取消提交）
    → 或 git commit --amend         （改内容 / 改信息）

④ 已经 push 了
    → git revert HEAD               （安全：新建一个"反向提交"）
    → 【不要】git reset + push --force ✗（别人拉过的东西会乱）
```

### 命令表

| 命令 | 例子 | 干什么 | 危险 |
|---|---|---|---|
| `git restore` | `git restore static/post.css` | 丢弃这个文件的改动 | ⚠️ 改了的内容没了 |
| `git restore .` | `git restore .` | **丢弃所有未 add 的改动** | ⚠️⚠️ 很危险 |
| `git restore --staged` | `git restore --staged static/post.css` | 从暂存区撤出（文件内容不动）| 安全 |
| `git reset --soft HEAD~1` | `git reset --soft HEAD~1` | 撤销最后一次提交，改动留在暂存区 | 安全 |
| `git reset --hard HEAD` | `git reset --hard HEAD` | **回到上次提交，丢掉一切改动** | ⚠️⚠️⚠️ 极危险 |
| `git revert HEAD` | `git revert HEAD` | 新建一次"反向提交"（**已 push 时用这个**）| 安全 |
| `git checkout -- .` | `git checkout -- .` | 老写法，等于 `git restore .` | ⚠️⚠️ |
| `git clean -fd` | `git clean -fd` | 删掉所有**未跟踪**文件 | ⚠️⚠️⚠️ 删了就没了 |
| `git clean -nd` | `git clean -nd` | **先看看会删哪些**（不真删）| 安全 ✓ **永远先跑这个** |

> **铁律：跑 `git clean -fd` 或 `reset --hard` 之前，先跑 `-n`（dry run）看清单** ✓

---

## 📦 stash（临时存起来）

| 命令 | 例子 | 干什么 |
|---|---|---|
| `git stash push -m` | `git stash push -m "试一下主题"` | 存起来（**只存已跟踪的**）|
| `git stash push -u -m` | `git stash push -u -m "spa 实验"` | 连**未跟踪文件**一起存 |
| `git stash push -u -m x -- 路径` | `git stash push -u -m "spa" -- static/router.js static/index.html` | **只存这几个文件**（★ 我该早点学会的）|
| `git stash list` | `git stash list` | 存了几份 |
| `git stash show -p` | `git stash show -p stash@{0}` | 看存了什么改动 |
| `git stash pop` | `git stash pop` | 取回并删掉存档 |
| `git stash apply` | `git stash apply stash@{0}` | 取回但**保留存档** |
| `git stash drop` | `git stash drop stash@{0}` | 删掉一份存档 |
| `git checkout stash@{0} -- 文件` | `git checkout 'stash@{0}' -- static/notes/note.css` | **只从存档里取一个文件** |
| `git checkout stash@{0}^3 -- 文件` | `git checkout 'stash@{0}^3' -- static/theme-toggle.js` | 取回**未跟踪**文件（在第三父提交里）|

> ⚠️ **`git stash` 默认收【全部】未提交改动** ✗
> 我当时想存"SPA 实验"，结果把已经做好的 `note.css` 样式也一起收走了 ✓
> → **想只弃一部分，必须用 `-- <路径>` 限定** ✓

---

## 💾 存档 / 找回

| 命令 | 例子 | 干什么 |
|---|---|---|
| `git archive` | `git archive --format=tar.gz -o E:\walunt.tar.gz HEAD` | 把**已提交**的内容打成包（部署用）|
| `git ls-files` | `git ls-files static/img` | 列出 git 跟踪的文件 |
| `git ls-files --others --exclude-standard` | `git ls-files --others --exclude-standard` | 列出**未跟踪**的文件 |
| `git reflog` | `git reflog -10` | **后悔药**：所有 HEAD 变动记录（reset 错了能找回来）|
| `git show HEAD:文件` | `git show HEAD:static/post.css \| head -20` | 看**某个提交里**的文件内容 |
| `git show 提交:文件` | `git show bb9a72f:README.md \| head` | 看**历史版本**的文件 |
| `git rev-list --count HEAD` | `git rev-list --count HEAD` | 一共提交了多少次 |

> **`git archive` 只打包已提交文件** ✗ —— 本地有、git 没有的东西，包里就没有 ✓
> 部署丢了 2 张图就是这个原因 ✓

---

## 🔍 查忽略 / 查配置

| 命令 | 例子 | 干什么 |
|---|---|---|
| `git check-ignore -v` | `git check-ignore -v .venv/` | **这条规则是谁拦的**（显示 `.gitignore:5:.venv/`）|
| `git check-ignore -v` | `git check-ignore -v blog.db` | 文件会不会被忽略 |
| `git config --get` | `git config --get http.proxy` | 当前值的来源 |
| `git config --show-origin` | `git config --show-origin --get-all credential.helper` | **这个配置是哪来的**（system / global / local）|
| `git config --global --unset` | `git config --global --unset http.proxy` | 删掉某个全局配置 |

---

## ⚙️ 我这台机器上配过的（要重装时照抄）

| 配置 | 命令 | 为什么 |
|---|---|---|
| **代理**（GitHub 连不上）| `git config --global http.proxy http://127.0.0.1:7897`<br>`git config --global https.proxy http://127.0.0.1:7897` | git 不读系统代理 |
| **凭据助手**（不用每次输 token）| `git config --global credential.helper '"C:/Program Files/Git/mingw64/bin/git-credential-manager.exe"'` | 弹浏览器登录 |
| **中文文件名别转义** | `git config --global core.quotepath false` | 否则 `git status` 显示 `\345\260\217...` |
| **行尾**（Windows 默认）| `git config --get core.autocrlf` → `true` | LF/CRLF 转换 |

---

## 🚨 报错速查（我真撞过的）

| 报错原文 | 原因 | 怎么办 |
|---|---|---|
| `! [rejected] ... (non-fast-forward)` | 远程有你本地没有的提交 | `git pull --rebase` 后再推 |
| `remote: Internal Server Error` | **GitHub 自己挂了** ✗ | 查 [status.github.com](https://www.githubstatus.com)，等，重试 |
| `Recv failure: Connection was reset` | 网络 / 没走代理 | 配 `http.proxy` |
| `Authentication failed` / `invalid username or token` | 密码不行（GitHub 不支持密码）| 配 `credential.helper`，或用 PAT |
| `pathspec 'xxx' did not match any files` | 路径不存在 → **整条 `add` 失败** ✗ | 修路径；`add` 后先 `git status` 看一眼 |
| `error: remote origin already exists` | 已经加过 remote | `git remote set-url origin <地址>` |
| `warning: LF will be replaced by CRLF` | 只是行尾提示 | 可忽略 ✓ |
| `fatal: not a git repository` | 当前目录不是仓库 | `cd` 到项目根 |
| `Your branch is ahead of 'origin/main' by N commits` | 有 N 个提交没推 | `git push` |
| `no changes added to commit` | `add` 没成功 | 重看上面那条 `pathspec` |
| `Everything up-to-date` | 没有新东西可推 | 正常 ✓ |

---

## 📝 五条心法

1. **`status -sb` 一天看十次** ✓ 它告诉你下一步该敲什么 ✓
2. **`git add` 要精确** ✓ `-A` 会把你不想提交的东西（大文件 / 临时文件）一起带走 ✓
3. **push 之前一切都能改** ✓ push 之后就别改写历史了 ✓
4. **`reflog` 是后悔药** ✓ 只要 commit 过，就算 reset 错了也能找回来 ✓
5. **改 `git` 配置前先看来源** ✓ `--show-origin` 告诉你这配置是 system / global / local 哪来的 ✓
