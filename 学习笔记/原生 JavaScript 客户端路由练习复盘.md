# 原生 JavaScript 客户端路由练习复盘

> 这份复盘记录一次学习实验。相关改动后来已回退；下面的代码是概念示例，不代表当前项目仍包含这些实现。

## 练习目标

尝试用原生 JavaScript 做一个小型客户端路由：保留首页顶部导航，只替换下面的页面内容，并理解地址栏、浏览器前进后退和页面 DOM 之间的关系。

本地页面的路径是 `/static/index.html` 和 `/static/post.html`。顶部 `.nav` 是由 `render.js` 动态生成的；首页统计卡片里也有文章链接，但它们属于另一组入口，不能把它们误当成顶部导航。

## 这次做了什么

### 1. 读取地址并判断视图

```js
function renderRoute() {
  const path = window.location.pathname;

  if (path === "/static/index.html") {
    // 显示首页视图
  } else if (path === "/static/post.html") {
    // 显示文章列表视图
  }
}
```

路由的基本工作是：读取当前 URL，再根据路径决定显示什么。早期练习先用 `console.log()` 确认路径识别正确。

### 2. 拦截动态导航链接

因为导航链接是在 `render.js` 运行后才插入 `.nav` 的，直接在页面加载时查找某个 `<a>` 可能找不到它。事件委托把监听器放在先存在的 `.nav` 容器上：

```js
document.querySelector(".nav").addEventListener("click", (event) => {
  // 从实际点击的文字或子元素向上找到文章链接
  const link = event.target.closest('.nav a[href="./post.html"]');
  if (!link) return;

  // 阻止浏览器整页加载，但不取消导航本身
  event.preventDefault();

  // 改地址栏；pushState 不会自动重绘页面
  history.pushState({}, "", link.href);

  // 点击导航后要手动按新地址渲染
  renderRoute();
});
```

`preventDefault()` 阻止的是默认的整页跳转。之后由 `pushState()` 更新地址、由 `renderRoute()` 更新内容，所以客户端导航仍然发生。

### 3. 处理浏览器前进和后退

```js
// 浏览器前进/后退改变当前历史记录时，重新按路径渲染
window.addEventListener("popstate", renderRoute);
```

点击站内链接时，代码主动调用 `renderRoute()`；按浏览器前进或后退时，浏览器触发 `popstate`，监听器再调用同一个函数。

### 4. 划分固定外壳和路由出口

首页增加了一个 `#app-view`，把顶部动态导航留在外面，把搜索栏和首页主体放进里面。路由只替换 `#app-view`，导航栏可以留在原地。

模板阶段曾用过：

```js
const template = document.querySelector("#post-view");

// 深拷贝模板中的 DOM 节点，再放进页面容器
appView.replaceChildren(template.content.cloneNode(true));
```

这验证了 HTML 模板可以由 JS 选择并插入。之后为避免复制整个文章主体，改为从现有 `post.html` 中提取 `.post-main`。

### 5. 从现有页面提取文章主体

```js
async function fetchPostView() {
  // 请求现有文章页面
  const response = await fetch("/static/post.html");

  // fetch 遇到 404 时通常仍会返回 Response，所以要检查状态
  if (!response.ok) {
    throw new Error(`读取文章页失败：HTTP ${response.status}`);
  }

  // 将 HTML 字符串解析成 DOM，方便查询目标节点
  const html = await response.text();
  const doc = new DOMParser().parseFromString(html, "text/html");

  // 只取主体，避免把文章页自己的导航重复塞进首页
  const postMain = doc.querySelector(".post-main");
  if (!postMain) {
    throw new Error("post.html 中没有找到 .post-main");
  }

  return postMain;
}
```

路由取到节点后，再用 `appView.replaceChildren(postMain)` 替换视图。失败处理放在路由调用处，通过 `try/catch` 记录或显示错误。

### 6. 手动初始化动态页面功能

文章列表脚本原本会在文件加载时立即调用 `loadRealArticles()`。为配合路由实验，把它暴露成可调用的入口：

```js
// 让客户端路由在文章主体插入后调用
window.initPostView = loadRealArticles;

// 独立打开 post.html 时，列表节点已经存在，仍自动加载
if (document.getElementById("article-list")) {
  loadRealArticles();
}
```

路由插入 `.post-main` 后调用 `await window.initPostView()`，再由原来的文章渲染逻辑请求 API、生成文章卡片。

地图交互脚本 `atlas-map.js` 也需要类似的可调用入口 `initAtlasMap()`。它读取地图节点、设置 SVG 路线并绑定视差事件。把节点插入 DOM 和初始化页面功能是两件事。

## 遇到的问题

### 页面和初始化逻辑没有自动绑定

用 `DOMParser` 解析 HTML，再提取 `.post-main`，不会自动执行被解析页面中的 `<script>`。地图脚本、文章列表脚本都必须由当前页面加载，并在对应 DOM 插入后调用初始化函数。

因此每增加一个视图，就要考虑它的脚本、初始化时机、重复进入时的行为和事件清理。框架通常通过组件生命周期组织这些工作。

### 文章详情仍然是独立页面

文章卡片的链接仍指向 `post_detail.html?id=...`，而详情页的返回链接又指向独立 `post.html`。这条路径没有进入首页 SPA 的路由，所以返回时不会自动恢复首页外壳里的文章列表视图。

完整实现需要把文章详情也纳入路由，并定义列表到详情、详情返回列表时的历史与状态规则。

### 抽取主体遗漏页面外壳资源

- 文章页的主题按钮在 `.post-main` 外，提取主体时不会带过来。
- 背景层属于页面外壳；如果首页和文章页共用一个外壳，背景也随之共用，除非显式为不同视图切换背景状态。
- SVG 地图依赖 `atlas-map.css` 和 `atlas-map.js`，只带入主体 HTML 不足以恢复它。

### 新增包装层改变了 CSS 布局

添加 `#app-view` 改变了 `.box` 的父级布局上下文。后代选择器如 `header .box` 仍能匹配，但 flex 父子关系和宽度约束发生了变化，卡片因此可能换行。

给 `#app-view` 补布局规则是对新容器职责的定义，不等同于选择器失效。调试 CSS 时要同时看 DOM 层级、可用宽度和父级布局。

### 顶部导航和主体间距不匹配

文章页的主体间距原本配合自己的导航栏；改用首页固定导航后，主体顶端需要额外空间。即使 CSS 规则已经修改，浏览器缓存旧 CSS 也会让视觉上看不出变化，需要更新资源查询版本或强制刷新。

### 自定义路由的范围很快扩大

练习最初只匹配 `/static/index.html` 和 `/static/post.html`，没有覆盖 `/`、详情页、笔记页、创建文章页等路径。自定义路由要逐步补齐路径、链接拦截、前进后退、错误处理、初始化和状态恢复，工作很快超出“小路由”的范围。

## 关于 DocumentFragment 的更正

`DocumentFragment` 插入 DOM 后会变空，因此同一个片段不能原样反复使用。但实验代码在恢复首页后把 `homeView` 设为 `null`，再次离开首页时会重新暂存节点，所以不能据此断言它必然第二次白屏。

用片段移动现有节点通常能保留节点上的事件监听和输入值；不过滚动位置等页面级状态仍需要单独考虑。`cloneNode(true)` 则会复制 DOM 子节点，但不会复制用 `addEventListener` 绑定的监听器。

## 对 Vue / React 学习的帮助

这次练习对应的概念主要是：

- **前端路由**：URL 与视图之间的映射。
- **共享布局 / 路由出口**：顶部导航留在外层，子页面在出口中切换。Vue Router 有 `RouterView`，React Router 有 `Outlet`。
- **组件生命周期**：视图创建后加载数据、初始化地图，卸载时清理监听器。
- **历史管理**：站内点击、浏览器前进后退都要同步地址和视图。
- **状态恢复**：返回列表时是否恢复搜索条件、滚动位置和筛选状态。

框架不会自动决定这些行为，但会把它们组织到路由、组件、布局和生命周期中，不必手工拼接所有环节。

## 最后的选择

这次 SPA 实验后来已回退。对于当前部署目标，保持首页、文章列表、文章详情等独立页面是合理选择；等开始学 Vue 或 React 时，再用“导航栏共享、列表进入详情、返回列表并恢复状态”作为真实项目练习。

原生 JavaScript 能实现这些效果，但在当前项目里，维护成本已经超过学习小路由本身的收益。暂停实验是范围管理，不是技术上做不到。
