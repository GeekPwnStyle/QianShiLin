<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { LogoutOutlined, MenuFoldOutlined, MenuUnfoldOutlined, SearchOutlined, ShopOutlined, UserOutlined } from "@ant-design/icons-vue"
import { useUserStore } from "@/stores/user"
import { useTabsStore } from "@/stores/tabs"
import { menuLeafMap, menuTree, type MenuNode } from "@/config/menu"
import SideMenuNodes from "./components/SideMenuNodes.vue"
import PageTabs from "./components/PageTabs.vue"
import { dropAllPages, wrapPage } from "./pageCache"

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const tabsStore = useTabsStore()

const storeName = computed(() => userStore.userInfo?.storeName || "未选择门店")

const onLogout = () => {
  tabsStore.reset()
  dropAllPages()
  userStore.logout()
  router.replace("/login")
}

watch(
  () => route.path,
  (path) => {
    if (route.meta.hiddenTab) return
    const title = menuLeafMap.get(path)?.title ?? String(route.meta.title ?? "未命名")
    tabsStore.ensure(path, title)
  },
  { immediate: true }
)

const collapsed = ref(false)
const keyword = ref("")
const selectedKeys = ref<string[]>([])
const openKeys = ref<string[]>([])

/** 仅侧栏根级菜单做手风琴；/product 这类二级分组不当成一级 */
const topMenuKeys = new Set(menuTree.map((n) => n.key))
const isTopKey = (key: string) => topMenuKeys.has(key)
const topOf = (key: string) => {
  if (topMenuKeys.has(key)) return key
  const hit = menuTree.find((n) => key === n.key || key.startsWith(n.key + "/"))
  return hit?.key ?? ("/" + key.split("/")[1])
}

/** 按关键字过滤：标题命中则保留整棵子树，否则只保留命中的后代 */
const filterTree = (nodes: MenuNode[], kw: string): MenuNode[] =>
  nodes.flatMap((n) => {
    if (n.title.toLowerCase().includes(kw)) return [n]
    if (!n.children?.length) return []
    const children = filterTree(n.children, kw)
    return children.length ? [{ ...n, children }] : []
  })

const collectParentKeys = (nodes: MenuNode[]): string[] =>
  nodes.flatMap((n) => (n.children?.length ? [n.key, ...collectParentKeys(n.children)] : []))

const kw = computed(() => keyword.value.trim().toLowerCase())
const visibleMenu = computed(() => (kw.value ? filterTree(menuTree, kw.value) : menuTree))

// 当前路由所在的菜单路径，用来同步侧边栏展开
const currentLeaf = computed(() => menuLeafMap.get(route.path))

const syncWithRoute = () => {
  selectedKeys.value = [route.path]
  if (!collapsed.value && !kw.value) openKeys.value = [...(currentLeaf.value?.parentKeys ?? [])]
}
watch(() => route.path, syncWithRoute, { immediate: true })

// 搜索时展开全部命中分支，清空时恢复到当前页面所在分支
watch(kw, (val) => {
  if (val) openKeys.value = collectParentKeys(visibleMenu.value)
  else syncWithRoute()
})

// 收起侧边栏时清空展开项（弹出模式），展开时恢复当前页面所在分支
watch(collapsed, (val) => {
  if (val) openKeys.value = []
  else syncWithRoute()
})

// 一级菜单手风琴：展开新的一级菜单时收起其它一级菜单
const onOpenChange = (keys: (string | number)[]) => {
  const next = keys.map(String)
  if (kw.value) {
    openKeys.value = next
    return
  }
  const added = next.find((k) => !openKeys.value.includes(k))
  if (added && isTopKey(added)) {
    openKeys.value = next.filter((k) => topOf(k) === added)
  } else {
    openKeys.value = next
  }
}

const onMenuClick = ({ key }: { key: string | number }) => {
  const path = String(key)
  if (path !== route.path) router.push(path)
}
</script>

<template>
  <a-layout class="layout">
    <a-layout-sider v-model:collapsed="collapsed" collapsible :trigger="null" :width="208" :collapsed-width="64" class="sider">
      <div class="sider-brand" :title="storeName">
        <span class="brand-mark" aria-hidden="true"><ShopOutlined /></span>
        <span v-if="!collapsed" class="brand-name">{{ storeName }}</span>
      </div>
      <div class="sider-head">
        <a-input v-if="!collapsed" v-model:value="keyword" allow-clear placeholder="搜索系统菜单" size="small">
          <template #prefix><SearchOutlined /></template>
        </a-input>
        <button type="button" class="sider-fold" :aria-label="collapsed ? '展开菜单' : '收起菜单'" @click="collapsed = !collapsed">
          <MenuUnfoldOutlined v-if="collapsed" />
          <MenuFoldOutlined v-else />
        </button>
      </div>
      <div class="menu-scroll">
        <a-menu
          :selected-keys="selectedKeys"
          :open-keys="openKeys"
          theme="light"
          mode="inline"
          @open-change="onOpenChange"
          @click="onMenuClick"
        >
          <SideMenuNodes :nodes="visibleMenu" :keyword="kw" />
        </a-menu>
        <a-empty
          v-if="!visibleMenu.length"
          class="menu-empty"
          description="没有匹配的菜单"
        />
      </div>
    </a-layout-sider>

    <a-layout class="main">
      <a-layout-header class="header">
        <PageTabs />
        <a-dropdown>
          <span class="user">
            <a-avatar size="small">
              <template #icon><UserOutlined /></template>
            </a-avatar>
            <span>{{ userStore.userInfo?.userName }}</span>
            <a-tag color="blue" style="margin: 0">{{ userStore.userInfo?.role }}</a-tag>
            <span class="store">{{ userStore.userInfo?.storeName }}</span>
          </span>
          <template #overlay>
            <a-menu>
              <a-menu-item key="logout" @click="onLogout">
                <LogoutOutlined /> 退出登录
              </a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
      </a-layout-header>
      <a-layout-content class="content">
        <router-view v-slot="{ Component, route: childRoute }">
          <keep-alive :include="tabsStore.include">
            <component
              :is="childRoute.meta.hiddenTab || !Component ? Component : wrapPage(Component, childRoute.path)"
              :key="childRoute.path"
            />
          </keep-alive>
        </router-view>
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<style scoped>
.layout {
  height: 100vh;
}

.sider {
  height: 100vh;
  background: #fff;
}

.sider :deep(.ant-layout-sider-children) {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: #fff;
}

.sider-brand {
  flex: none;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 14px;
  background: #333;
  color: #fff;
}

.sider.ant-layout-sider-collapsed .sider-brand {
  justify-content: center;
  padding: 0;
}

.brand-mark {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #22c55e;
  color: #fff;
  font-size: 12px;
}

.brand-name {
  min-width: 0;
  overflow: hidden;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  line-height: 22px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sider-head {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: none;
  padding: 10px 10px 6px;
}

.sider-head :deep(.ant-input-affix-wrapper) {
  flex: 1;
  min-width: 0;
  background: #fff;
  border-color: #e5e6eb;
  border-radius: 6px;
}

.sider-head :deep(.ant-input) {
  background: transparent;
  color: #333;
  font-size: 13px;
}

.sider-head :deep(.ant-input::placeholder) {
  color: #b0b3b8;
}

.sider-head :deep(.ant-input-prefix),
.sider-head :deep(.ant-input-clear-icon) {
  color: #b0b3b8;
}

.sider-fold {
  flex: none;
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #8c8c8c;
  cursor: pointer;
}

.sider-fold:hover {
  background: #f5f5f5;
  color: #333;
}

.sider :deep(.ant-menu) {
  background: transparent;
  border-inline-end: 0 !important;
  font-size: 13px;
}

.sider :deep(.ant-menu-item),
.sider :deep(.ant-menu-submenu-title) {
  height: 36px;
  line-height: 36px;
  margin-block: 2px;
  width: calc(100% - 16px);
  margin-inline: 8px;
  border-radius: 6px;
}

.sider :deep(.ant-menu-sub.ant-menu-inline) {
  background: transparent !important;
}

.sider :deep(.ant-menu-submenu-selected > .ant-menu-submenu-title) {
  color: #02bfa1;
  background: transparent !important;
}

.sider :deep(.ant-menu-submenu-selected > .ant-menu-submenu-title .anticon) {
  color: #02bfa1;
}

.sider :deep(.ant-menu-sub .ant-menu-item)::before {
  content: "";
  flex: none;
  width: 6px;
  height: 6px;
  margin-right: 8px;
  border-radius: 50%;
  background: #c8c8c8;
}

.sider :deep(.ant-menu-item-selected) {
  color: #02bfa1 !important;
  background: #e7f7f1 !important;
}

.sider :deep(.ant-menu-sub .ant-menu-item-selected)::before {
  background: #02bfa1;
}

.menu-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.15) transparent;
}

.menu-empty {
  margin-top: 40px;
}

.menu-empty :deep(.ant-empty-description) {
  color: #999;
}

.main {
  min-width: 0;
  height: 100vh;
  overflow: hidden;
}

.header {
  flex: none;
  display: flex;
  align-items: center;
  height: 40px;
  line-height: 40px;
  padding: 0 12px 0 0;
  background: #333;
  gap: 8px;
}

.header :deep(.page-tabs) {
  flex: 1;
  min-width: 0;
}

.user {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: #f0f0f0;
  font-size: 13px;
}

.store {
  color: #b5b5b5;
  font-size: 13px;
}

.content {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: auto;
  background: #fff;
  border: 1px solid #eee;
  padding: 16px;
}
</style>
