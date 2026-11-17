<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue"
import { Modal, message } from "ant-design-vue"
import {
  DeleteOutlined,
  EditOutlined,
  EllipsisOutlined,
  HolderOutlined,
} from "@ant-design/icons-vue"
import ColumnSetting from "@/components/ColumnSetting.vue"
import { useColumnSetting, type SettingColumn } from "@/components/columnSetting"
import {
  deleteWarehouseAPI,
  getWarehousePageAPI,
  reorderWarehousesAPI,
  saveWarehouseAPI,
  warehouseTypes,
  type Warehouse,
  type WarehouseType
} from "@/api/warehouse"

const loading = ref(false)
const dataSource = ref<Warehouse[]>([])
const currentId = ref("")
const query = reactive({ keyword: "" })

const loadData = async (silent = false) => {
  if (!silent) loading.value = true
  try {
    const res = await getWarehousePageAPI({ ...query })
    dataSource.value = res.data.list
    if (currentId.value && !dataSource.value.some((item) => item.id === currentId.value)) {
      currentId.value = ""
    }
  } finally {
    if (!silent) loading.value = false
  }
}

const onSearch = () => {
  loadData()
}

const SEQ_COL = { title: "#", key: "seq", width: 48, align: "center" as const }
const DRAG_COL = { title: "", key: "drag", dataIndex: "drag", width: 36, align: "center" as const }
const ACTION_COL = {
  title: "",
  key: "action",
  dataIndex: "action",
  width: 56,
  align: "center" as const
}

const columnDefaults: SettingColumn[] = [
  { key: "code", title: "仓库代号", width: 88 },
  { key: "name", title: "仓库名称", width: 120 },
  { key: "contactPhone", title: "仓库联系人", width: 150 },
  { key: "remark", title: "仓库备注", width: 140, ellipsis: true },
  { key: "warehouseType", title: "仓库类型", width: 180 }
]

const {
  columns,
  tableColumns: baseTableColumns,
  scrollX: baseScrollX,
  storageKey,
  columnDefaults: settingDefaults
} = useColumnSetting("zyb_cols_warehouse_info_v9", columnDefaults)

const tableColumns = computed(() => [DRAG_COL, SEQ_COL, ...baseTableColumns.value, ACTION_COL])
const scrollX = computed(
  () =>
    Number(baseScrollX.value || 0) +
    Number(DRAG_COL.width || 0) +
    Number(SEQ_COL.width || 0) +
    Number(ACTION_COL.width || 0)
)

/** ~1440 视口下内容区约 1180px；列宽合计更小时不强制横向滚动 */
const tableScroll = computed(() => (scrollX.value > 1180 ? { x: scrollX.value } : undefined))

const dragId = ref("")
const overId = ref("")

const onDragStart = (record: Warehouse, event: DragEvent) => {
  dragId.value = record.id
  event.dataTransfer?.setData("text/plain", record.id)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = "move"
}

const onDragEnd = () => {
  dragId.value = ""
  overId.value = ""
}

const onDropRow = async (targetId: string) => {
  const fromId = dragId.value
  onDragEnd()
  if (!fromId || fromId === targetId) return
  const ids = dataSource.value.map((item) => item.id)
  const from = ids.indexOf(fromId)
  const to = ids.indexOf(targetId)
  if (from < 0 || to < 0) return
  const nextIds = [...ids]
  const [moved] = nextIds.splice(from, 1)
  nextIds.splice(to, 0, moved)
  const byId = new Map(dataSource.value.map((item) => [item.id, item]))
  dataSource.value = nextIds
    .map((id) => byId.get(id))
    .filter((item): item is Warehouse => Boolean(item))
  await reorderWarehousesAPI(nextIds)
  await loadData(true)
}

const customRow = (record: Warehouse) => ({
  class: [
    currentId.value === record.id ? "row-current" : "",
    dragId.value === record.id ? "row-dragging" : "",
    overId.value === record.id && dragId.value && dragId.value !== record.id ? "row-drag-over" : ""
  ]
    .filter(Boolean)
    .join(" "),
  onClick: () => {
    currentId.value = record.id
  },
  onDragover: (event: DragEvent) => {
    if (!dragId.value) return
    event.preventDefault()
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move"
    overId.value = record.id
  },
  onDrop: (event: DragEvent) => {
    event.preventDefault()
    onDropRow(record.id)
  }
})

const modalOpen = ref(false)
const saving = ref(false)
const editingId = ref<string>()
const form = reactive({
  code: "",
  name: "",
  contact: "",
  phone: "",
  remark: "",
  warehouseType: "" as WarehouseType
})

const resetForm = () => {
  Object.assign(form, {
    code: "",
    name: "",
    contact: "",
    phone: "",
    remark: "",
    warehouseType: "" as WarehouseType
  })
}

const openCreate = () => {
  editingId.value = undefined
  resetForm()
  modalOpen.value = true
}

const openEdit = (record?: Warehouse) => {
  const target = record ?? dataSource.value.find((item) => item.id === currentId.value)
  if (!target) {
    message.warning("请先选择一条仓库资料")
    return
  }
  editingId.value = target.id
  Object.assign(form, {
    code: target.code,
    name: target.name,
    contact: target.contact,
    phone: target.phone,
    remark: target.remark,
    warehouseType: target.warehouseType
  })
  modalOpen.value = true
}

const onSave = async () => {
  if (!form.code.trim()) {
    message.warning("请填写仓库代号")
    return
  }
  if (!form.name.trim()) {
    message.warning("请填写仓库名称")
    return
  }
  saving.value = true
  try {
    const res = await saveWarehouseAPI({
      id: editingId.value,
      code: form.code,
      name: form.name,
      contact: form.contact,
      phone: form.phone,
      remark: form.remark,
      warehouseType: form.warehouseType
    })
    if (!res.data.ok) {
      message.warning(res.data.message)
      return
    }
    message.success(editingId.value ? "已保存" : "已新增")
    modalOpen.value = false
    await loadData()
  } finally {
    saving.value = false
  }
}

const onDelete = async (record: Warehouse) => {
  await deleteWarehouseAPI(record.id)
  message.success("已删除")
  if (currentId.value === record.id) currentId.value = ""
  loadData()
}

const confirmDelete = (record: Warehouse) => {
  Modal.confirm({
    title: `确认删除仓库「${record.name}」？`,
    content: "删除后不可恢复",
    okText: "删除",
    okType: "danger",
    cancelText: "取消",
    onOk: () => onDelete(record)
  })
}

const onRowMenuClick = (info: { key: string | number }, record: Warehouse) => {
  currentId.value = record.id
  const key = String(info.key)
  if (key === "edit") openEdit(record)
  else if (key === "delete") confirmDelete(record)
}

onMounted(loadData)
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <div class="toolbar-left">
        <a-button @click="openCreate">新增</a-button>
        <a-input
          v-model:value="query.keyword"
          allow-clear
          placeholder="仓库代号/仓库名称"
          class="search-input"
          @press-enter="onSearch"
        />
        <a-button type="primary" @click="onSearch">查询</a-button>
      </div>
    </div>

    <div class="wh-tip">仅客户有下单小程序的时候 才会出现商城下单仓库</div>

    <a-table
      class="warehouse-table"
      row-key="id"
      size="small"
      :columns="tableColumns"
      :data-source="dataSource"
      :loading="loading"
      :custom-row="customRow"
      :scroll="tableScroll"
      :pagination="false"
    >
      <template #headerCell="{ column }">
        <template v-if="column.key === 'action'">
          <ColumnSetting
            v-model="columns"
            :storage-key="storageKey"
            :defaults="settingDefaults"
            icon-only
          />
        </template>
      </template>
      <template #bodyCell="{ column, record, index }">
        <template v-if="column.dataIndex === 'drag'">
          <span
            class="drag-handle"
            draggable="true"
            role="button"
            aria-label="拖动排序"
            title="拖动排序"
            @dragstart="onDragStart(record as Warehouse, $event)"
            @dragend="onDragEnd"
          >
            <HolderOutlined />
          </span>
        </template>
        <template v-else-if="column.key === 'seq'">
          {{ index + 1 }}
        </template>
        <template v-else-if="column.dataIndex === 'contactPhone'">
          <span v-if="record.contact || record.phone" class="wh-contact-phone">
            <span v-if="record.contact">{{ record.contact }}</span>
            <span v-if="record.contact && record.phone" class="wh-contact-sep"> </span>
            <span v-if="record.phone" class="wh-phone">{{ record.phone }}</span>
          </span>
          <span v-else>-</span>
        </template>
        <template v-else-if="column.dataIndex === 'remark'">
          {{ record.remark || "-" }}
        </template>
        <template v-else-if="column.dataIndex === 'warehouseType'">
          {{ record.warehouseType || "-" }}
        </template>
        <template v-else-if="column.dataIndex === 'action'">
          <a-dropdown
            placement="bottomRight"
            overlay-class-name="sg-row-more-overlay"
            :trigger="['hover', 'click']"
          >
            <button
              type="button"
              class="sg-row-more"
              title="更多操作"
              @click.stop="currentId = record.id"
            >
              <EllipsisOutlined />
            </button>
            <template #overlay>
              <a-menu
                @click="(info: { key: string | number }) => onRowMenuClick(info, record as Warehouse)"
              >
                <a-menu-item key="edit">
                  <EditOutlined /> 编辑
                </a-menu-item>
                <a-menu-item key="delete" danger>
                  <DeleteOutlined /> 删除
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </template>
      </template>
    </a-table>

    <a-modal
      v-model:open="modalOpen"
      :title="editingId ? '编辑仓库资料' : '新增仓库资料'"
      :confirm-loading="saving"
      :width="560"
      ok-text="确定"
      cancel-text="取消(ESC)"
      destroy-on-close
      @ok="onSave"
    >
      <a-form
        layout="horizontal"
        :label-col="{ style: { width: '120px' } }"
        :wrapper-col="{ style: { maxWidth: 'calc(100% - 120px)' } }"
        class="wh-form"
      >
        <a-form-item label="仓库代号" required>
          <a-input v-model:value="form.code" :maxlength="30" placeholder="请输入仓库代号" />
        </a-form-item>
        <a-form-item label="仓库名称" required>
          <a-input v-model:value="form.name" :maxlength="50" placeholder="请输入仓库名称" />
        </a-form-item>
        <a-form-item label="仓库联系人">
          <a-input v-model:value="form.contact" :maxlength="30" placeholder="请输入仓库联系人" />
        </a-form-item>
        <a-form-item label="电话">
          <a-input v-model:value="form.phone" :maxlength="20" placeholder="请输入电话" />
        </a-form-item>
        <a-form-item label="仓库类型" class="wh-type-item">
          <a-radio-group v-model:value="form.warehouseType" class="wh-type-group">
            <a-radio v-for="item in warehouseTypes" :key="item" :value="item" class="wh-type-radio">{{ item }}</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="仓库备注">
          <a-textarea v-model:value="form.remark" :maxlength="200" :rows="2" placeholder="请输入仓库备注" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.wh-tip {
  margin: -8px 0 12px;
  color: #f04438;
  font-size: 13px;
  line-height: 1.5;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.toolbar-left {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.search-input {
  flex: 1;
  max-width: 360px;
  min-width: 160px;
}

.wh-contact-phone {
  display: inline;
}

.wh-phone {
  color: rgba(0, 0, 0, 0.65);
}

.sg-row-more {
  width: 28px;
  height: 28px;
  padding: 0;
  border-radius: 6px;
  border: 1px solid #13c2c2;
  background: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #13c2c2;
  line-height: 1;
  transition: background 0.15s, color 0.15s;
}

.sg-row-more:hover,
.sg-row-more.ant-dropdown-open,
:deep(.ant-dropdown-open > .sg-row-more) {
  background: #13c2c2;
  border-color: #13c2c2;
  color: #fff;
}

.drag-handle {
  display: inline-flex;
  color: #8aa19d;
  cursor: grab;
}

.drag-handle:active {
  cursor: grabbing;
}

.warehouse-table :deep(tr.row-dragging) {
  opacity: 0.45;
}

.warehouse-table :deep(tr.row-drag-over > td) {
  background: #e7f6f2 !important;
}

.wh-form {
  margin-top: 8px;
}

.wh-form :deep(.ant-form-item-row) {
  display: flex;
  flex-flow: row nowrap;
  align-items: flex-start;
}

.wh-form :deep(.ant-form-item-label) {
  flex: none;
  width: 120px;
  max-width: 120px;
  padding-top: 0;
  text-align: right;
}

.wh-form :deep(.ant-form-item-label > label) {
  height: 32px;
  line-height: 32px;
}

.wh-form :deep(.ant-form-item-control) {
  flex: 1 1 auto;
  min-width: 0;
  max-width: calc(100% - 120px);
}

.wh-type-item :deep(.ant-form-item-control-input-content) {
  display: block;
}

.wh-type-group {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  column-gap: 12px;
  row-gap: 4px;
  width: 100%;
  margin: 0;
  padding: 0;
  line-height: 32px;
}

.wh-type-group :deep(.ant-radio-wrapper),
.wh-type-radio {
  margin-inline-end: 0 !important;
  align-items: center;
  line-height: 32px;
  white-space: normal;
}
</style>
