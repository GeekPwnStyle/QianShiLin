<script setup lang="ts">
import { onMounted } from "vue"
import zhCN from "ant-design-vue/es/locale/zh_CN"
import dayjs from "dayjs"
import "dayjs/locale/zh-cn"
import { theme } from "@/styles/theme"
import { installTableJumper } from "@/components/tableJumper"

dayjs.locale("zh-cn")

onMounted(installTableJumper)
</script>

<template>
  <a-config-provider :locale="zhCN" :theme="theme" :auto-insert-space-in-button="false">
    <router-view />
  </a-config-provider>
</template>
