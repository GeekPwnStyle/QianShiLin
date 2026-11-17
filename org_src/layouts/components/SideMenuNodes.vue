<script setup lang="ts">
import type { MenuNode } from "@/config/menu"

defineOptions({ name: "SideMenuNodes" })

const props = defineProps<{
  nodes: MenuNode[]
  /** 搜索关键字，用于高亮 */
  keyword?: string
}>()

const splitTitle = (title: string) => {
  const kw = props.keyword?.trim()
  if (!kw) return [{ text: title, hit: false }]
  const i = title.toLowerCase().indexOf(kw.toLowerCase())
  if (i < 0) return [{ text: title, hit: false }]
  return [
    { text: title.slice(0, i), hit: false },
    { text: title.slice(i, i + kw.length), hit: true },
    { text: title.slice(i + kw.length), hit: false }
  ].filter((p) => p.text)
}
</script>

<template>
  <template v-for="node in nodes" :key="node.key">
    <a-sub-menu v-if="node.children?.length" :key="node.key">
      <template v-if="node.icon" #icon><component :is="node.icon" /></template>
      <template #title>
        <span :title="node.title">
          <span v-for="(p, i) in splitTitle(node.title)" :key="i" :class="{ hit: p.hit }">{{ p.text }}</span>
        </span>
      </template>
      <SideMenuNodes :nodes="node.children" :keyword="keyword" />
    </a-sub-menu>
    <a-menu-item v-else :key="node.key" :title="node.title">
      <template v-if="node.icon" #icon><component :is="node.icon" /></template>
      <span>
        <span v-for="(p, i) in splitTitle(node.title)" :key="i" :class="{ hit: p.hit }">{{ p.text }}</span>
      </span>
    </a-menu-item>
  </template>
</template>

<style scoped>
.hit {
  color: #02bfa1;
  font-weight: 600;
}
</style>
