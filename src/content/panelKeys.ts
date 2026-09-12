const PANEL_KEY_EVENTS = ["keydown", "keypress", "keyup"] as const;

/**
 * 面板里的按键不再冒泡回页面。GitHub 这类站点把快捷键挂在 document 的冒泡阶段，
 * 而 Shadow DOM 会把事件目标重定向成宿主元素——页面看不出用户正在面板输入框里打字，
 * 于是照常执行快捷键（通常还 preventDefault），表现为有些字母打不进去、焦点被页面抢走。
 * 宿主元素是事件离开面板前的最后一站，在这里截断即可：面板内部的处理（React 挂在
 * shadow 内的容器上）此时已经执行完。
 *
 * 注意：页面若在 document / window 的捕获阶段监听，仍会先于宿主收到按键，
 * 从页面 DOM 内部无法拦截，这一层不在防护范围内。
 */
export function isolatePanelKeys(host: HTMLElement): void {
  for (const type of PANEL_KEY_EVENTS) {
    host.addEventListener(type, stopPropagation);
  }
}

function stopPropagation(event: Event): void {
  event.stopPropagation();
}
