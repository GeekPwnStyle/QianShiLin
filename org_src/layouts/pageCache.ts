import { defineComponent, h, markRaw, type Component } from "vue"

const wrappers = new Map<string, Component>()

/** keep-alive 只认组件名，路径里的符号换成稳定名字 */
export function tabCacheName(path: string) {
  return "page" + path.replace(/[^\w-]/g, "_")
}

/**
 * 每个路由包一层具名组件，才能按页面分别缓存。
 * 关掉或刷新页签时删掉包装，下次进入会重新挂载。
 */
export function wrapPage(component: Component, path: string) {
  const name = tabCacheName(path)
  const cached = wrappers.get(name)
  if (cached) return cached
  const wrapped = markRaw(
    defineComponent({
      name,
      render() {
        return h(component)
      }
    })
  )
  wrappers.set(name, wrapped)
  return wrapped
}

export function dropPage(path: string) {
  wrappers.delete(tabCacheName(path))
}

export function dropPages(paths: string[]) {
  paths.forEach((path) => wrappers.delete(tabCacheName(path)))
}

export function dropAllPages() {
  wrappers.clear()
}
