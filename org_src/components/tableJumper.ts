const jump = (pager: Element, page: number) => {
  const link = pager.querySelector<HTMLElement>(`.ant-pagination-item-${page} a`)
  link?.click()
}

const ensure = (pager: Element) => {
  const builtin = pager.querySelector(".ant-pagination-options-quick-jumper")
  const extra = pager.querySelector<HTMLElement>(".app-quick-jumper")
  if (builtin) {
    extra?.remove()
    return
  }
  if (extra) return
  const label = document.createElement("label")
  label.className = "app-quick-jumper"
  label.innerHTML = `跳至<input class="app-quick-jumper-input" inputmode="numeric" />页`
  pager.appendChild(label)
  const input = label.querySelector("input")
  input?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return
    const page = Number((event.target as HTMLInputElement).value)
    if (!Number.isInteger(page) || page < 1) return
    jump(pager, page)
  })
}

export const installTableJumper = () => {
  const flag = "__appTableJumper"
  if (Reflect.get(window, flag)) return
  Reflect.set(window, flag, true)
  const sync = () => {
    document.querySelectorAll(".ant-table-wrapper .ant-pagination").forEach(ensure)
  }
  const observer = new MutationObserver(sync)
  observer.observe(document.body, { childList: true, subtree: true })
  sync()
}
