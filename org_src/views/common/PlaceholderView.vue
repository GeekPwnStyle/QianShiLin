<script setup lang="ts">
import { computed } from "vue"
import { useRoute } from "vue-router"
import { menuLeafMap } from "@/config/menu"

const route = useRoute()
const leaf = computed(() => menuLeafMap.get(route.path))
</script>

<template>
  <div class="placeholder">
    <h2 class="title">{{ leaf?.title ?? route.meta.title }}</h2>
    <a-result status="info" :title="`「${leaf?.title ?? route.meta.title}」页面开发中`">
      <template #subTitle>
        <div>菜单位置：{{ leaf?.breadcrumb.join(" / ") }}</div>
        <div>路由地址：{{ route.path }}</div>
      </template>
    </a-result>
  </div>
</template>

<style scoped>
.title {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 600;
}
</style>
