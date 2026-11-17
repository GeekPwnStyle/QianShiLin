import { computed, ref, watch } from "vue"
import { defineStore } from "pinia"
import { menuLeafMap } from "@/config/menu"
import { tabCacheName } from "@/layouts/pageCache"

export interface PageTab {
  path: string
  title: string
  /** 固定后不可关闭，并靠左排列 */
  affix: boolean
}

const STORAGE_KEY = "zyb_page_tabs"
const HOME_PATH = "/home"

const homeTab = (): PageTab => ({ path: HOME_PATH, title: "首页", affix: true })

const loadTabs = (): PageTab[] => {
  try {
    const raw = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null") as unknown
    if (!Array.isArray(raw)) return [homeTab()]
    const list: PageTab[] = []
    for (const item of raw) {
      if (!item || typeof item.path !== "string" || typeof item.title !== "string") continue
      if (item.path !== HOME_PATH && !menuLeafMap.has(item.path)) continue
      list.push({
        path: item.path,
        title: item.path === HOME_PATH ? "首页" : item.title,
        affix: item.path === HOME_PATH ? true : !!item.affix
      })
    }
    if (!list.some((tab) => tab.path === HOME_PATH)) list.unshift(homeTab())
    return list
  } catch {
    return [homeTab()]
  }
}

export interface CloseResult {
  removed: string[]
  /** 当前页被关掉时应该去的地址 */
  next: string
}

export const useTabsStore = defineStore("tabs", () => {
  const tabs = ref<PageTab[]>(loadTabs())
  const cached = ref<string[]>(tabs.value.map((tab) => tab.path))
  const include = computed(() => cached.value.map((path) => tabCacheName(path)))

  const sorted = computed(() => {
    const affix = tabs.value.filter((tab) => tab.affix)
    const rest = tabs.value.filter((tab) => !tab.affix)
    return [...affix, ...rest]
  })

  watch(
    tabs,
    (list) => {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(list))
    },
    { deep: true }
  )

  const ensure = (path: string, title: string) => {
    const found = tabs.value.find((tab) => tab.path === path)
    if (found) {
      if (title && found.title !== title) found.title = title
    } else {
      tabs.value.push({ path, title: title || path, affix: path === HOME_PATH })
    }
    if (!cached.value.includes(path)) cached.value = [...cached.value, path]
  }

  const uncache = (path: string) => {
    if (!cached.value.includes(path)) return
    cached.value = cached.value.filter((item) => item !== path)
  }

  const cache = (path: string) => {
    if (cached.value.includes(path)) return
    cached.value = [...cached.value, path]
  }

  const removePaths = (paths: string[]) => {
    if (!paths.length) return
    const set = new Set(paths)
    tabs.value = tabs.value.filter((tab) => !set.has(tab.path))
    cached.value = cached.value.filter((item) => !set.has(item))
  }

  const neighbor = (path: string) => {
    const order = sorted.value
    const index = order.findIndex((tab) => tab.path === path)
    return order[index + 1]?.path ?? order[index - 1]?.path ?? HOME_PATH
  }

  const close = (path: string): CloseResult => {
    const tab = tabs.value.find((item) => item.path === path)
    if (!tab || tab.affix) return { removed: [], next: path }
    const next = neighbor(path)
    removePaths([path])
    return { removed: [path], next }
  }

  const closeOthers = (path: string, current: string): CloseResult => {
    const removed = tabs.value.filter((tab) => !tab.affix && tab.path !== path).map((tab) => tab.path)
    removePaths(removed)
    return { removed, next: removed.includes(current) ? path : current }
  }

  const closeLeft = (path: string, current: string): CloseResult => {
    const order = sorted.value
    const index = order.findIndex((tab) => tab.path === path)
    const removed = order.slice(0, index).filter((tab) => !tab.affix).map((tab) => tab.path)
    removePaths(removed)
    return { removed, next: removed.includes(current) ? path : current }
  }

  const closeRight = (path: string, current: string): CloseResult => {
    const order = sorted.value
    const index = order.findIndex((tab) => tab.path === path)
    const removed = order.slice(index + 1).filter((tab) => !tab.affix).map((tab) => tab.path)
    removePaths(removed)
    return { removed, next: removed.includes(current) ? path : current }
  }

  const closeAll = (current: string): CloseResult => {
    const removed = tabs.value.filter((tab) => !tab.affix).map((tab) => tab.path)
    removePaths(removed)
    return { removed, next: removed.includes(current) ? HOME_PATH : current }
  }

  const toggleAffix = (path: string) => {
    if (path === HOME_PATH) return
    const tab = tabs.value.find((item) => item.path === path)
    if (!tab) return
    tab.affix = !tab.affix
  }

  const reset = () => {
    tabs.value = [homeTab()]
    cached.value = [HOME_PATH]
    sessionStorage.removeItem(STORAGE_KEY)
  }

  return {
    tabs,
    cached,
    include,
    sorted,
    ensure,
    uncache,
    cache,
    close,
    closeOthers,
    closeLeft,
    closeRight,
    closeAll,
    toggleAffix,
    reset
  }
})
