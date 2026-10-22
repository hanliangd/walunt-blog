/* =========================================================
   atlas-map.js · 文章地图卡片的交互层
   ---------------------------------------------------------
   原站把这段写在 series 页的内联 <script> 里（第 3 段），
   这里按本项目约定拆成独立文件，只做两件事：

   1) 坐标 → 路线：读每个 .atlas-pin 的 --x / --y，拼成
        "M x y L x y L x y ..."
      写回三份 path 的 d。以后加一个分类，只要在 HTML 里加一个
        <a class="atlas-pin" style="--x:..; --y:..">
      线就自动连上，不用再手改 SVG 的 d。
      （DOM 顺序 = 走线顺序，所以针脚的书写顺序要跟路线一致）

   2) 指针视差：把 --px / --py 写在 .hero-atlas 上。
      路线层吃 ×0.4、针脚层吃 ×1（见 CSS），两层就有了前后景错位；
      指针离开后用同一个 rAF 缓动回 0，不会「啪」地跳回去。

   触屏设备 / 系统开了「减少动态效果」→ 整段跳过，只保留静态地图。
   ========================================================= */
(function () {
  'use strict'

  var atlas = document.querySelector('[data-atlas]')
  if (!atlas) return

  /* ---------- 1. 用针脚坐标同步出路线 d ---------- */
  var pins = Array.prototype.slice.call(atlas.querySelectorAll('.atlas-pin'))
  var paths = Array.prototype.slice.call(atlas.querySelectorAll('[data-atlas-path]'))

  if (pins.length > 1 && paths.length) {
    var points = pins.map(function (pin) {
      return {
        x: pin.style.getPropertyValue('--x').trim(),
        y: pin.style.getPropertyValue('--y').trim()
      }
    }).filter(function (point) {
      // 没写坐标的针脚跳过，免得拼出 "M  L 16" 这种坏 d
      return point.x !== '' && point.y !== ''
    })

    if (points.length > 1) {
      var d = points.map(function (point, index) {
        return (index === 0 ? 'M ' : 'L ') + point.x + ' ' + point.y
      }).join(' ')

      paths.forEach(function (path) {
        path.setAttribute('d', d)
      })
    }
  }

  /* ---------- 2. 指针视差 ---------- */
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  var canHover = window.matchMedia('(hover: hover)').matches
  if (reduceMotion || !canHover) return

  var frame = 0
  var targetX = 0
  var targetY = 0
  var currentX = 0
  var currentY = 0

  function render() {
    frame = 0
    // 0.16 是缓动系数：越小越「拖」，越大越跟手
    currentX += (targetX - currentX) * 0.16
    currentY += (targetY - currentY) * 0.16
    atlas.style.setProperty('--px', currentX.toFixed(2))
    atlas.style.setProperty('--py', currentY.toFixed(2))

    if (Math.abs(targetX - currentX) > 0.04 || Math.abs(targetY - currentY) > 0.04) {
      frame = window.requestAnimationFrame(render)
    }
  }

  function queue() {
    if (!frame) frame = window.requestAnimationFrame(render)
  }

  function onMove(event) {
    var rect = atlas.getBoundingClientRect()
    if (!rect.width || !rect.height) return

    // -0.5 ~ 0.5：指针在画布内的相对位置，再放大成 ±9px / ±7px
    var relX = (event.clientX - rect.left) / rect.width - 0.5
    var relY = (event.clientY - rect.top) / rect.height - 0.5
    targetX = Math.max(-0.5, Math.min(0.5, relX)) * 18
    targetY = Math.max(-0.5, Math.min(0.5, relY)) * 14
    queue()
  }

  function onLeave() {
    targetX = 0
    targetY = 0
    queue()
  }

  atlas.addEventListener('pointermove', onMove)
  atlas.addEventListener('pointerleave', onLeave)
})()
