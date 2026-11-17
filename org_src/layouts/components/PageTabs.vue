<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { CloseOutlined, HomeOutlined, PushpinFilled, PushpinOutlined, ReloadOutlined } from "@ant-design/icons-vue"
import { useTabsStore, type CloseResult, type PageTab } from "@/stores/tabs"
import { dropPage, dropPages } from "../pageCache"

const route = useRoute()
const router = useRouter()
const tabsStore = useTabsStore()

const barRef = ref<HTMLElement>()
const tabEls = new Map<string, HTMLElement>()

const setTabRef = (path: string, el: unknown) => {
  if (el instanceof HTMLElement) tabEls.set(path, el)
  else tabEls.delete(path)
}

const reveal = (path: string) => {
  const bar = barRef.value
  const el = tabEls.get(path)
  if (!bar || !el) return
  const left = el.getBoundingClientRect().left - bar.getBoundingClientRect().left + bar.scrollLeft
  const right = left + el.offsetWidth
  if (left < bar.scrollLeft) bar.scrollLeft = Math.max(left - 12, 0)
  else if (right > bar.scrollLeft + bar.clientWidth) bar.scrollLeft = right - bar.clientWidth + 12
}

watch(
  () => route.path,
  async (path) => {
    await nextTick()
    reveal(path)
  }
)

const open = (path: string) => {
  if (path !== route.path) router.push(path)
}

const applyClose = (result: CloseResult) => {
  if (!result.removed.length) return
  dropPages(result.removed)
  if (result.removed.includes(route.path)) router.push(result.next)
}

const close = (path: string) => {
  applyClose(tabsStore.close(path))
}

const refresh = async (path: string) => {
  dropPage(path)
  tabsStore.uncache(path)
  await nextTick()
  router.replace(`/redirect${path}`)
}

const onMenu = (path: string, key: string) => {
  if (key === "refresh") refresh(path)
  else if (key === "affix") tabsStore.toggleAffix(path)
  else if (key === "close") close(path)
  else if (key === "others") applyClose(tabsStore.closeOthers(path, route.path))
  else if (key === "left") applyClose(tabsStore.closeLeft(path, route.path))
  else if (key === "right") applyClose(tabsStore.closeRight(path, route.path))
  else if (key === "all") applyClose(tabsStore.closeAll(route.path))
}

const canCloseLeft = (path: string) => {
  const index = tabsStore.sorted.findIndex((tab) => tab.path === path)
  return tabsStore.sorted.slice(0, index).some((tab) => !tab.affix)
}

const canCloseRight = (path: string) => {
  const index = tabsStore.sorted.findIndex((tab) => tab.path === path)
  return tabsStore.sorted.slice(index + 1).some((tab) => !tab.affix)
}

const canCloseOthers = (path: string) => tabsStore.sorted.some((tab) => !tab.affix && tab.path !== path)

const showSplit = (index: number) => {
  const list = tabsStore.sorted
  return index > 0 && list[index - 1]?.affix && !list[index]?.affix
}

const onWheel = (event: WheelEvent) => {
  const bar = barRef.value
  if (!bar || bar.scrollWidth <= bar.clientWidth) return
  bar.scrollLeft += event.deltaY || event.deltaX
  event.preventDefault()
}

const onMiddle = (tab: PageTab) => {
  if (!tab.affix) close(tab.path)
}

onMounted(() => {
  barRef.value?.addEventListener("wheel", onWheel, { passive: false })
})

onBeforeUnmount(() => {
  barRef.value?.removeEventListener("wheel", onWheel)
})
</script>

<template>
  <div ref="barRef" class="page-tabs">
    <template v-for="(tab, index) in tabsStore.sorted" :key="tab.path">
      <i v-if="showSplit(index)" class="tab-split" />
      <a-dropdown :trigger="['contextmenu']">
        <div
          :ref="(el) => setTabRef(tab.path, el)"
          class="tab"
          :class="{ active: tab.path === route.path, affix: tab.affix }"
          @click="open(tab.path)"
          @auxclick.prevent="onMiddle(tab)"
          @mousedown.middle.prevent
        >
          <HomeOutlined v-if="tab.path === '/home'" class="home-icon" />
          <span class="tab-title">{{ tab.title }}</span>
          <button
            v-if="!tab.affix"
            class="icon-btn close-btn"
            title="关闭"
            @click.stop="close(tab.path)"
          >
            <CloseOutlined />
          </button>
        </div>
        <template #overlay>
          <a-menu @click="({ key }) => onMenu(tab.path, String(key))">
            <a-menu-item key="refresh">
              <ReloadOutlined />
              刷新
            </a-menu-item>
            <a-menu-item v-if="tab.path !== '/home'" key="affix">
              <PushpinOutlined />
              {{ tab.affix ? "取消固定" : "固定" }}
            </a-menu-item>
            <a-menu-item v-else key="affix-home" disabled>
              <PushpinFilled />
              已固定
            </a-menu-item>
            <a-menu-divider />
            <a-menu-item key="close" :disabled="tab.affix">关闭</a-menu-item>
            <a-menu-item key="others" :disabled="!canCloseOthers(tab.path)">关闭其他</a-menu-item>
            <a-menu-item key="left" :disabled="!canCloseLeft(tab.path)">关闭左侧</a-menu-item>
            <a-menu-item key="right" :disabled="!canCloseRight(tab.path)">关闭右侧</a-menu-item>
            <a-menu-item key="all" :disabled="!tabsStore.sorted.some((item) => !item.affix)">关闭全部</a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>
    </template>
  </div>
</template>

<style scoped>
.page-tabs {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 2px;
  height: 40px;
  padding: 0 8px;
  background: #333;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.28) transparent;
}

.page-tabs::-webkit-scrollbar {
  height: 4px;
}

.page-tabs::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.28);
  border-radius: 4px;
}

.page-tabs :deep(.ant-dropdown-trigger) {
  flex: none;
  display: inline-flex;
}

.tab-split {
  width: 1px;
  height: 14px;
  background: rgba(255, 255, 255, 0.18);
  flex: none;
}

.tab {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 8px;
  border: 0;
  border-radius: 2px;
  color: #e8e8e8;
  font-size: 13px;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
}

.tab:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
}

.tab.active {
  color: #02bfa1;
  background: transparent;
  font-weight: 600;
}

.home-icon {
  font-size: 14px;
}

.tab-title {
  max-width: 148px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  padding: 0;
  border: 0;
  border-radius: 2px;
  background: transparent;
  color: rgba(255, 255, 255, 0.45);
  font-size: 10px;
  cursor: pointer;
}

.tab.active .close-btn {
  color: #02bfa1;
}

.close-btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.16);
}
</style>
