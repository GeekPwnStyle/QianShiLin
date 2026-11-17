<script setup lang="ts">
import { message } from "ant-design-vue"
import { storeToRefs } from "pinia"
import { useCounterStore } from "@/stores/counter"

const counter = useCounterStore()
const { count, doubleCount } = storeToRefs(counter)

const onIncrement = () => {
  counter.increment()
  message.success(`当前计数：${count.value}`)
}
</script>

<template>
  <a-space direction="vertical" :size="16" style="width: 100%">
    <a-typography-title :level="3">Vue 3 + TypeScript + Ant Design Vue + Pinia</a-typography-title>

    <a-card title="Pinia 示例">
      <a-space>
        <a-statistic title="count" :value="count" />
        <a-statistic title="doubleCount" :value="doubleCount" />
      </a-space>
      <div style="margin-top: 16px">
        <a-space>
          <a-button type="primary" @click="onIncrement">+1</a-button>
          <a-button @click="counter.reset()">重置</a-button>
        </a-space>
      </div>
    </a-card>

    <a-card title="组件示例">
      <a-space wrap>
        <a-date-picker />
        <a-select style="width: 160px" placeholder="请选择" :options="[{ value: 'a', label: '选项 A' }, { value: 'b', label: '选项 B' }]" />
        <a-input style="width: 200px" placeholder="请输入" />
      </a-space>
    </a-card>
  </a-space>
</template>
