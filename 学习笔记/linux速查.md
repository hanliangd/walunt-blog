# Linux 速查（只管我这台服务器）

> **用法：不要从头读。按 `Ctrl+F` 搜你要做的事。**
>
> 场景固定：一台阿里云 Ubuntu 24.04，只跑一个服务（`walunt.service`），代码在 `/opt/walunt`。
> 所有例子都是我真用过的路径和名字。

---

## 🥇 最常用的 5 个（80% 的时间只用到这 5 个）

| 命令 | 例子 | 干什么 |
|---|---|---|
| `systemctl status` | `systemctl status walunt` | 服务活着吗、最近几条日志 |
| `systemctl restart` | `systemctl restart walunt` | **改完 `.py` 就敲这个** |
| `tail -f` | `tail -f /var/log/walunt.log` | 实时看日志（`Ctrl+C` 退出看） |
| `journalctl -u` | `journalctl -u walunt -n 50 --no-pager` | 服务为什么起不来 |
| `curl -o /dev/null -w` | `curl -o /dev/null -w "%{http_code}\n" http://127.0.0.1/` | 服务能响应吗（只要状态码） |

---

## 📁 文件和目录

| 命令 | 例子 | 干什么 |
|---|---|---|
| `ls` | `ls /opt/walunt` | 目录里有什么 |
| `ls -l` | `ls -l /opt/walunt` | 带权限/大小/时间 |
| `ls -lh` | `ls -lh /opt/walunt/static/img` | 大小用人看得懂的单位（M/G） |
| `ls -ld` | `ls -ld /opt/walunt` | 看**目录本身**，不列内容 |
| `cd` | `cd /opt/walunt` | 进目录 |
| `pwd` | `pwd` | 我现在在哪个目录 |
| `cat` | `cat /opt/walunt/.env` | 看小文件全部内容 |
| `tail -n 50` | `tail -n 50 /var/log/walunt.log` | 看最后 50 行 |
| `tail -f` | `tail -f /var/log/walunt.err.log` | 实时跟（`Ctrl+C` 只退出看，不影响服务） |
| `head -n 20` | `head -n 20 /opt/walunt/requirements.txt` | 看前 20 行 |
| `grep` | `grep -i error /var/log/walunt.log` | 在文件里搜关键字 |
| `mkdir -p` | `mkdir -p /opt/walunt` | 建目录（已存在也不报错） |
| `cp` | `cp /opt/walunt/.env /opt/walunt/.env.bak` | 复制（**改配置前先备份**） |
| `mv` | `mv /opt/walunt/a.txt /opt/walunt/b.txt` | 改名 / 移动 |
| `rm -rf` | `rm -rf /opt/walunt/testvenv` | 删目录（**先 `ls` 确认路径**） |
| `du -sh` | `du -sh /opt/walunt` | 这个目录占多大 |
| `df -h` | `df -h /` | 磁盘还剩多少 |

---

## 🔐 权限

| 命令 | 例子 | 干什么 |
|---|---|---|
| `chmod 600` | `chmod 600 /opt/walunt/.env` | **密钥文件**：只有属主能读写 |
| `chmod 644` | `chmod 644 /opt/walunt/static/index.html` | 普通文件：谁都能读 |
| `chmod 755` | `chmod 755 /opt/walunt/scripts` | 目录 / 可执行 |
| `ls -l`（验证） | `ls -l /opt/walunt/.env` | 应显示 `-rw-------` |

**三位数字怎么读**：`4=读 2=写 1=执行`

```
 6 0 0
 │ │ └─ 其他人: 0 = 无权限
 │ └─── 同组  : 0 = 无权限
 └───── 属主  : 6 = 读写
```

---

## 📦 装软件

| 命令 | 例子 | 干什么 |
|---|---|---|
| `apt update` | `apt update` | 更新软件源索引（装东西前先跑） |
| `apt install -y` | `apt install -y python3-venv unzip` | 装包，`-y` 自动确认 |
| `apt list --installed` | `apt list --installed \| grep unzip` | 装了吗 |
| `pip install -r` | `/opt/walunt/.venv/bin/pip install -r /opt/walunt/requirements.txt -i https://mirrors.aliyun.com/pypi/simple` | 装 Python 依赖（用虚拟环境的 pip + 阿里云镜像） |

---

## ⚙️ 后台服务（systemctl）

> `systemctl` = Linux 版的「Windows 服务管理器」。**一个词 + 几个动作。**

| 命令 | 例子 | 干什么 |
|---|---|---|
| `status` | `systemctl status walunt --no-pager -l` | 活着吗 + 最近日志（**排查第一站**） |
| `start` | `systemctl start walunt` | 启动 |
| `stop` | `systemctl stop walunt` | 停止 |
| `restart` | `systemctl restart walunt` | 重启（**改完 `.py` 必须做**） |
| `enable` | `systemctl enable walunt` | 开机自启（本质：建一个符号链接） |
| `disable` | `systemctl disable walunt` | 取消自启 |
| `is-active` | `systemctl is-active walunt` | 只输出 `active` / `inactive` |
| `is-enabled` | `systemctl is-enabled walunt` | 只输出 `enabled` / `disabled` |
| `daemon-reload` | `systemctl daemon-reload` | **改过 `.service` 文件必须跑** |
| `list-units` | `systemctl list-units --type=service --state=running` | 现在都在跑什么服务 |

**服务文件在哪**：`/etc/systemd/system/walunt.service` ✓
**看它写了什么**：`cat /etc/systemd/system/walunt.service`

---

## 🔍 排查

| 命令 | 例子 | 干什么 |
|---|---|---|
| `journalctl -u` | `journalctl -u walunt -n 50 --no-pager` | 看服务日志（**起不来就看这个**） |
| `journalctl -f` | `journalctl -u walunt -f` | 实时跟服务日志 |
| `ss -lntp` | `ss -lntp \| grep :80` | 谁在监听 80 端口 |
| `ps aux` | `ps aux \| grep uvicorn` | 有没有 uvicorn 进程 |
| `pkill -f` | `pkill -f "uvicorn main:app"` | 杀掉匹配的进程 |
| `who` | `who` | 谁登录着 |
| `last` | `last -5` | 最近 5 次登录 |
| `uptime` | `uptime` | 开机多久 + 负载 |

**排查顺序（记住这个顺序就够）**：

```
① curl 127.0.0.1 → 应用活着吗
    ├─ 成功 → 问题在防火墙 / 外网 ✗
    └─ 失败 → ②
② ss -lntp | grep :80 → 有人听吗
    ├─ 没人 → 服务没起 → ③
    └─ 有人 → 应用内部报错 → ③
③ journalctl -u walunt -n 50 → 具体错误
```

---

## 🌐 测接口

| 命令 | 例子 | 干什么 |
|---|---|---|
| `curl -I` | `curl -I http://127.0.0.1/` | 只看响应头（含状态码） |
| `curl -o /dev/null -w` | `curl -o /dev/null -w "%{http_code}\n" http://127.0.0.1/` | 只要状态码（**最常用**） |
| `curl -s` | `curl -s http://127.0.0.1/api/post \| head -c 300` | 看返回内容前 300 字节 |
| `curl -x` | `curl -I -x http://127.0.0.1:7897 https://github.com` | 走代理测（本机调 GitHub 用） |

**状态码速记**：`200` 正常 ✓ `307` 重定向 ✓ `404` 路径不对 ✗ `401` 没登录 ✗ `500` 后端炸了 ✗ `000` **连不上**（服务没起 / 端口没开）

---

## 🗜️ 打包 / 解压

| 命令 | 例子 | 干什么 |
|---|---|---|
| `tar -xzf -C` | `tar -xzf /opt/walunt/walunt.tar.gz -C /opt/walunt` | 解 tar.gz（**大写 C** 是目标目录） |
| `tar -czf` | `tar -czf /tmp/img.tar.gz -C /opt/walunt/static img` | 打 tar.gz |
| `tar -tzf` | `tar -tzf /opt/walunt/walunt.tar.gz \| head -20` | 不解压，先看里面有什么 |
| `unzip -o -d` | `unzip -o /opt/walunt/chroma.zip -d /opt/walunt` | 解 zip（**小写 d** 是目标目录） |
| `unzip -l` | `unzip -l /opt/walunt/chroma.zip` | 不解压，看列表 |

> ⚠️ **`-C` 和 `-d` 别记混**：`tar` 用大写 `-C`，`unzip` 用小写 `-d`。

---

## ✏️ 改文件

| 命令 | 例子 | 干什么 |
|---|---|---|
| `nano` | `nano /etc/systemd/system/walunt.service` | 最简单编辑器（`Ctrl+O` 保存 → `Enter` → `Ctrl+X` 退出） |
| `nano` 搜索 | `nano` 里按 `Ctrl+W` 输入关键词 | 在文件里搜 |
| `echo >` | `echo "PORT=80" > /opt/walunt/.env.test` | 把一行写进文件（**会清空原文件** ✗） |
| `cat >>` | `cat >> /opt/walunt/.env <<'EOF'` … `EOF` | 追加内容到文件末尾 |

---

## 🧰 杂项

| 命令 | 例子 | 干什么 |
|---|---|---|
| `history` | `history \| grep tar` | 我以前敲过什么（**救命的**） |
| `Ctrl+R` | （在终端里直接按）| 反搜历史命令（**最实用**） |
| `date` | `date` | 服务器现在几点 |
| `free -h` | `free -h` | 内存还剩多少 |
| `top` | `top`（按 `q` 退出） | 哪个进程吃 CPU |
| `clear` | `clear` | 清屏 |
| `exit` | `exit` | 断开 ssh |

---

## 🚨 出事了按这个走

| 现象 | 先敲什么 |
|---|---|
| 手机打不开网站 | `systemctl status walunt --no-pager -l` |
| 服务 `failed` | `journalctl -u walunt -n 50 --no-pager` |
| 页面 500 | `tail -50 /var/log/walunt.err.log` |
| 反复重启 | `journalctl -u walunt -n 100 --no-pager` 找 `Scheduled restart` |
| 提示"服务配置错误" | `ls -l /opt/walunt/.env`（权限）+ 确认 `WorkingDirectory` |
| 磁盘满 | `df -h /` → `du -sh /var/log/*`（日志可能涨很大） |
| RAG 检索总是空 | `ls -d /opt/walunt/.chroma`（向量库目录在不在） |

---

## 📝 三条心法

1. **不背命令，记"我要干什么"** ✓ 想清楚意图，命令搜一下就有。
2. **手动改完 `.py` 一定 `systemctl restart`** ✓ 改 `static/` 不用重启。
3. **改任何配置文件之前先 `cp` 备份** ✓ `cp x x.bak` 比后悔便宜。
