<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { message } from "ant-design-vue"
import { HolderOutlined, SettingOutlined } from "@ant-design/icons-vue"
import { cloneColumns, saveColumnSetting, type SettingColumn } from "./columnSetting"

const columns = defineModel<SettingColumn[]>({ required: true })

const props = withDefaults(
  defineProps<{
    storageKey?: string
    /** 操作列表头用：仅齿轮图标 */
    iconOnly?: boolean
    /** 重置时恢复到的默认列；不传则用首次绑定的列 */
    defaults?: SettingColumn[]
  }>(),
  { iconOnly: false }
)

const open = ref(false)
const dragFrom = ref<number | null>(null)
const draft = ref<SettingColumn[]>([])
const fallbackDefaults = ref<SettingColumn[]>([])

watch(
  () => columns.value,
  (list) => {
    if (!fallbackDefaults.value.length && list?.length) {
      fallbackDefaults.value = cloneColumns(list)
    }
  },
  { immediate: true, deep: true }
)

const resetSource = computed(() =>
  props.defaults?.length ? props.defaults : fallbackDefaults.value
)

const allChecked = computed(
  () => draft.value.length > 0 && draft.value.every((col) => col.visible !== false)
)
const allIndeterminate = computed(
  () => !allChecked.value && draft.value.some((col) => col.visible !== false)
)

watch(open, (v) => {
  if (v) draft.value = cloneColumns(columns.value)
})

watch(
  columns,
  () => {
    if (props.storageKey) saveColumnSetting(props.storageKey, columns.value)
  },
  { deep: true }
)

const onToggle = (item: SettingColumn, checked: boolean) => {
  const visibleCount = draft.value.filter((col) => col.visible !== false).length
  if (!checked && visibleCount <= 1) {
    message.warning("请至少保留一列")
    return
  }
  item.visible = checked
}

const onToggleAll = (checked: boolean) => {
  if (!checked) {
    message.warning("请至少保留一列")
    return
  }
  draft.value.forEach((col) => {
    col.visible = true
  })
}

const onConfirm = () => {
  const visibleCount = draft.value.filter((col) => col.visible !== false).length
  if (visibleCount < 1) {
    message.warning("请至少保留一列")
    return
  }
  columns.value = cloneColumns(draft.value)
  open.value = false
}

const onReset = () => {
  const src = resetSource.value
  if (!src.length) return
  draft.value = cloneColumns(src)
}

const onDragStart = (index: number, event: DragEvent) => {
  dragFrom.value = index
  event.dataTransfer?.setData("text/plain", String(index))
  if (event.dataTransfer) event.dataTransfer.effectAllowed = "move"
}

const onDragOver = (index: number) => {
  const from = dragFrom.value
  if (from === null || from === index) return
  const list = draft.value
  const [item] = list.splice(from, 1)
  if (!item) return
  list.splice(index, 0, item)
  dragFrom.value = index
}

const onDragEnd = () => {
  dragFrom.value = null
}
</script>

<template>
  <a-popover
    v-model:open="open"
    trigger="click"
    placement="bottomRight"
    :arrow="false"
    overlay-class-name="column-setting-popover"
  >
    <a-button
      v-if="iconOnly"
      type="default"
      size="small"
      class="column-setting-icon-btn"
      title="设置列"
    >
      <SettingOutlined />
    </a-button>
    <a-button v-else>
      <SettingOutlined />
      设置列
    </a-button>
    <template #content>
      <div class="panel">
        <div class="panel-actions">
          <button type="button" class="act-btn" @click="onToggleAll(true)">
            <span class="act-check" :class="{ on: allChecked, half: allIndeterminate }" />
            全选
          </button>
          <button type="button" class="act-btn act-ok" @click="onConfirm">确定</button>
          <button type="button" class="act-btn" @click="onReset">重置</button>
        </div>
        <div class="panel-list">
          <div
            v-for="(item, index) in draft"
            :key="item.key"
            class="col-row"
            :class="{ dragging: dragFrom === index }"
            @dragover.prevent="onDragOver(index)"
          >
            <span
              class="handle"
              draggable="true"
              title="拖动排序"
              @dragstart="onDragStart(index, $event)"
              @dragend="onDragEnd"
            >
              <HolderOutlined />
            </span>
            <a-input-number
              v-model:value="item.width"
              size="small"
              :min="60"
              :max="600"
              :controls="false"
              class="width-input"
            />
            <a-checkbox :checked="item.visible !== false" @change="onToggle(item, $event.target.checked)">
              {{ item.title }}
            </a-checkbox>
          </div>
        </div>
      </div>
    </template>
  </a-popover>
</template>

<style scoped>
.panel {
  width: 248px;
}

.panel-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px 6px;
  border-bottom: 1px solid #eef2f1;
}

.act-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 28px;
  padding: 0 10px;
  border: 1px solid #02bfa1;
  border-radius: 999px;
  background: #fff;
  color: #02bfa1;
  font-size: 13px;
  cursor: pointer;
  line-height: 1;
}

.act-btn:hover {
  background: #e8f8f5;
}

.act-ok {
  background: #02bfa1;
  color: #fff;
}

.act-ok:hover {
  background: #018a74;
  border-color: #018a74;
  color: #fff;
}

.act-check {
  width: 14px;
  height: 14px;
  border: 1px solid #02bfa1;
  border-radius: 2px;
  box-sizing: border-box;
  position: relative;
  flex: none;
}

.act-check.on {
  background: #02bfa1;
}

.act-check.on::after {
  content: "";
  position: absolute;
  left: 3px;
  top: 0;
  width: 4px;
  height: 8px;
  border: solid #fff;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.act-check.half {
  background: #02bfa1;
}

.act-check.half::after {
  content: "";
  position: absolute;
  left: 2px;
  top: 5px;
  width: 8px;
  height: 2px;
  background: #fff;
}

.panel-list {
  max-height: 360px;
  padding: 8px 0;
  overflow: auto;
}

.col-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
}

.col-row.dragging {
  background: #e8f8f5;
}

.handle {
  display: inline-flex;
  color: #8aa19d;
  cursor: grab;
}

.handle:active {
  cursor: grabbing;
}

.width-input {
  width: 64px;
  flex: none;
}

.col-row :deep(.ant-checkbox-wrapper) {
  flex: 1;
  min-width: 0;
}

.col-row :deep(.ant-checkbox + span) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.column-setting-icon-btn {
  width: 28px;
  height: 28px;
  padding: 0;
  border-radius: 6px;
  border-color: #d9e5e2;
  color: #02bfa1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.column-setting-icon-btn:hover {
  color: #018a74 !important;
  border-color: #02bfa1 !important;
}
</style>

<style>
.column-setting-popover .ant-popover-inner {
  padding: 0;
}
</style>
