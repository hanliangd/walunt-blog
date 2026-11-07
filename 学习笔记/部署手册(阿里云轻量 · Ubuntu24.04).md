# 部署手册(阿里云轻量 · Ubuntu24.04)

> 目标：把 E:/测试/FastAPItest部署到公网
>
> 实测日期：2026-11-06



## 0.前置信息

- 服务器：阿里云轻量 2核2G / 40G / 上海 / Ubuntu 24.04

- 公网IP：139.224.251.149

- 代码位置：`/opt/walunt`

- 日志：`/var/log/walunt.log, /var/log/walunt.err.log`



## 1.服务器防火墙

**放行 TCP 22 / 80（给 ssh 和网站）**



## 2.服务器创建目录

这两条命令用于创建并检查一个目录：  

1. `mkdir -p /opt/walunt`  

   - `mkdir`：创建目录。
   - `-p`：递归创建父目录；如果目录已存在也不报错。
   - `/opt/walunt`：要创建的目录路径，即在 /opt 下创建 walunt 目录。
   - 作用：确保 /opt/walunt 目录存在。

2. `ls -ld /opt/walunt`  

   - `ls`：列出文件或目录信息。
   - `-l`：以长格式显示详细信息，包括权限、链接数、所有者、所属组、大小、修改时间等。
   - `-d`：显示目录本身的信息，而不是列出目录里面的内容。
   - `/opt/walunt`：要查看的目录。
   - 作用：查看 /opt/walunt 这个目录本身的属性信息。

整体含义：先创建 `/opt/walunt` 目录（如果不存在），然后查看该目录本身的详细属性。

## 3.传代码

本地（先打包成压缩包，再把代码包、数据库文件、环境变量文件和 `.chroma` 目录上传到远方服务器）：

```powershell
git archive --format=tar.gz -o E:\walunt.tar.gz HEAD
```

- 把当前 Git 仓库 `HEAD` 指向的提交内容打包
- 格式为 `tar.gz`
- 输出文件为 `E:\walunt.tar.gz`
- 只包含 Git 跟踪的文件，不包含未提交或未跟踪文件

scp E:\walunt.tar.gz root@IP:/opt/walunt/

```powershell
scp E:\walunt.tar.gz root@IP:/opt/walunt/
```

- 使用 `scp` 把本地 `E:\walunt.tar.gz` 上传到远程服务器
- 远程用户为 `root`
- `IP` 是服务器 IP 占位符，需要替换为真实地址
- 目标目录为 `/opt/walunt/`

```powershell
scp blog.db .env root@IP:/opt/walunt/
```

- 把本地的 `blog.db` 和 `.env` 两个文件上传到远程 `/opt/walunt/`
- `blog.db` 通常是 SQLite 数据库文件
- `.env` 通常保存环境变量和敏感配置，例如密钥、数据库连接信息等

```powershell
Compress-Archive -Path ".chroma" -DestinationPath E:\chroma.zip -Force
```

这条命令用于将当前目录下的 `.chroma` 文件夹压缩成一个 ZIP 压缩包，并保存到 `E:\chroma.zip`

- `Compress-Archive`：PowerShell 中用于创建 ZIP 压缩包的命令
- `-Path ".chroma"`：指定要压缩的源路径，即当前工作目录下的 `.chroma` 文件夹
- `-DestinationPath E:\chroma.zip`：指定压缩包输出路径和文件名，即保存为 `E:\chroma.zip`
- `-Force`：如果目标位置已经存在 `chroma.zip`，则强制覆盖

执行后，`.chroma` 文件夹及其内容会被打包到 `E:\chroma.zip` 中

```powershell
scp E:\chroma.zip root@IP:/opt/walunt/
```

同上，这条命令用于通过 SCP 将本地文件复制到远程服务器



服务器(准备运行环境、解压应用包并保护环境变量文件)：

```bash
apt update && apt install -y python3-venv unzip
```

这条命令用于在基于 Debian/Ubuntu 的系统中更新软件包信息，并自动安装两个软件包

- `apt update`：更新本地软件包索引，让系统获取最新的可用软件包信息
- `&&`：表示前一条命令执行成功后，才继续执行后一条命令
- `apt install -y`：安装软件包，`-y` 表示自动回答“是”，无需手动确认
- `python3-venv`：提供 Python 3 虚拟环境功能，可用于创建隔离的 Python 运行环境
- `unzip`：用于解压 `.zip` 压缩文件

整体含义是：先更新软件源索引，然后自动安装 `python3-venv` 和 `unzip` 这两个软件包

> `python3-venv` 是 Debian/Ubuntu 等 Linux 发行版中的软件包名称，用来提供 Python 3 的 `venv` 虚拟环境功能。
>
> 主要作用：
>
> - 创建独立的 Python 虚拟环境，避免不同项目之间的依赖冲突。
> - 安装后可以使用 `python3 -m venv` 命令创建虚拟环境。

```bash
tar -xzf /opt/walunt/walunt.tar.gz -C /opt/walunt
```

这条命令用于**解压一个 `.tar.gz` 压缩包，并把内容释放到指定目录**。

各参数含义：

- `tar`：归档/解包工具
- `-x`：解压（extract）
- `-z`：使用 gzip 解压缩，适用于 `.tar.gz` / `.tgz` 文件
- `-f`：指定要操作的压缩包文件
- `/opt/walunt/walunt.tar.gz`：要解压的压缩包路径
- `-C /opt/walunt`：解压前切换到 `/opt/walunt` 目录，也就是把压缩包内容解压到这个目录中

整体效果：

把 `/opt/walunt/walunt.tar.gz` 解压到 `/opt/walunt` 目录下

注意：如果目标目录中已有同名文件，可能会被覆盖；执行前建议确认压缩包内容和目标目录情况

修改文件 `/opt/walunt/.env` 的权限：

```bash
chmod 600 /opt/walunt/.env
```

- `600` 表示：
  - 文件所有者：可读、可写（`rw-`）
  - 所属用户组：无权限（`---`）
  - 其他用户：无权限（`---`）
- 即只有文件所有者可以读取和修改该文件，其他用户无法读取或写入
- `.env` 通常存放环境变量、密钥、数据库密码等敏感配置，设置为 `600` 可降低泄露风险
- 执行后建议确认文件所有者是否正确，例如使用 `ls -l /opt/walunt/.env` 查看权限

解压chroma.zip文件：

```bash
unzip -o /opt/walunt/chroma.zip -d /opt/walunt
ls -d /opt/walunt/.chroma      # 确认目录存在
```

- 解压 `/opt/walunt/chroma.zip` 压缩包
- `-o` 表示覆盖已存在的文件，不询问
- `-d /` 表示解压到根目录 `/`
- 如果压缩包内部包含 `opt/walunt/...` 路径，文件最终会释放到 `/opt/walunt/...` 下
- `ls`：列出文件或目录
- `-d`：只显示目录本身，不展开显示目录里面的内容。
- `/opt/walunt/.chroma`：要检查的目录路径，通常可能是 Chroma 向量数据库的持久化目录

整体含义：把 `chroma.zip` 解压到系统根目录，覆盖同名文件，然后确认 `/opt/walunt/.chroma` 目录是否已经生成或存在。该操作可能需要 root 权限，并且覆盖根目录下文件时需确认压缩包内容，避免覆盖系统文件。

## 4.装依赖

- `python3 -m venv /opt/walunt/.venv`：使用 Python 3 的 `venv` 模块，在 `/opt/walunt/.venv` 目录创建一个独立的 Python 虚拟环境。该环境拥有自己的 Python 解释器和 `pip`，可避免项目依赖影响系统全局 Python。

- `/opt/walunt/.venv/bin/pip install -r requirements.txt -i https://mirrors.aliyun.com/pypi/simple`：调用刚创建的虚拟环境中的 `pip`，根据当前目录下 `requirements.txt` 文件列出的依赖包及版本进行安装；`-i` 指定使用阿里云 PyPI 镜像源，以加快国内下载速度。

- 验证：

```bash
/opt/walunt/.venv/bin/python -c "import main, rag, models; print('OK')"
```



## 5.systemd

```bash
cat >/etc/systemd/system/walunt.service <<'EOF'
[Unit]
Description=Walunt Blog
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/walunt
EnvironmentFile=/opt/walunt/.env
ExecStart=/opt/walunt/.venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port 80
Restart=always
RestartSec=3
StandardOutput=append:/var/log/walunt.log
StandardError=append:/var/log/walunt.err.log

[Install]
WantedBy=multi-user.target
EOF

pkill -f "uvicorn main:app"
systemctl daemon-reload
systemctl enable --now walunt
systemctl is-active walunt


```

创建 `walunt.service`，以 root 身份在 `/opt/walunt` 目录下加载 `.env`，通过虚拟环境启动 Uvicorn 应用，监听 `0.0.0.0:80`，并设置自动重启与日志追加；随后停止旧 Uvicorn 进程、重载 systemd、开机自启并立即启动服务，最后检查运行状态。

## 6.验收

```bash
systemctl is-enabled walunt
```

检查名为**walunt**的指定单元是否启用，即是否设置为随系统启动自动运行。

```bash
systemctl is-active walunt
```

用于检查名为 `walunt` 的 systemd 单元当前是否处于活动状态。

> **systemd 单元**是 systemd 用来管理系统资源和服务的基本配置单位。systemd 是大多数现代 Linux 发行版使用的初始化系统和服务管理器，它通过“单元”来描述需要启动、停止、监控或管理的对象。

```powershell
curl -o /dev/null -w "%{http_code}\n" http://127.0.0.1/
```

这条命令用于向本机 HTTP 服务发起请求，并只输出返回的 HTTP 状态码。

- `curl`：命令行 HTTP 客户端工具。
- `-o /dev/null`：把响应正文丢弃到 `/dev/null`，即不保存、不显示响应内容。
- `-w "%{http_code}\n"`：请求完成后，按指定格式输出 HTTP 状态码，`\n` 表示换行。
- `http://127.0.0.1/`：请求目标是本机回环地址的根路径，通常用于检测本机 80 端口上的 HTTP 服务是否可访问。

整体作用：访问 `http://127.0.0.1/`，不显示响应正文，只打印类似 `200`、`404`、`000` 的 HTTP 状态码。



## 7.更新代码的流程

- 改 .py   → scp + systemctl restart walunt

- 改 static → scp + 浏览器 Ctrl+Shift+R（不用重启）

## 8.如果出问题，按这个顺序排查

```bash
systemctl status walunt --no-pager -l
journalctl -u walunt -n 50 --no-pager
tail -50 /var/log/walunt.err.log
ss -lntp | grep :80
```

1. `systemctl status walunt --no-pager -l`  
   查看 `walunt` 服务的状态，包括是否运行、启动失败原因、主进程信息等

   - `--no-pager`：不分页显示，直接输出全部内容
   - `-l`：显示完整信息，不截断过长的行

2. `journalctl -u walunt -n 50 --no-pager`  
   查看 `walunt` 服务最近 50 条 systemd 日志

   - `-u walunt`：指定服务单元为 `walunt`
   - `-n 50`：显示最近 50 行
   - `--no-pager`：不使用分页器

3. `tail -50 /var/log/walunt.err.log`  
   查看 `/var/log/walunt.err.log` 错误日志文件的最后 50 行，用于定位最近报错。

4. `ss -lntp | grep :80`  
   查看当前系统中处于监听状态的 TCP 端口，并筛选包含 `:80` 的行，用于确认 80 端口是否被监听以及对应进程

   - `-l`：仅显示监听状态
   - `-n`：以数字形式显示端口
   - `-t`：仅显示 TCP
   - `-p`：显示对应进程
   - `grep :80`：过滤出包含 `:80` 的内容；注意它也可能匹配 `:8080` 等端口，精确检查 80 端口可结合 `ss -lntp 'sport = :80'`


