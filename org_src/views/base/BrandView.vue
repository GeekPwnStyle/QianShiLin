<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue"
import { message } from "ant-design-vue"
import { DownloadOutlined, PlusOutlined, QuestionCircleFilled, UploadOutlined } from "@ant-design/icons-vue"
import ColumnSetting from "@/components/ColumnSetting.vue"
import { tablePageSizeOptions, tableShowTotal } from "@/components/tablePagination"
import { useColumnSetting } from "@/components/columnSetting"
import {
  brandsToCsv,
  addSystemBrandsAPI,
  deleteBrandAPI,
  getBrandPageAPI,
  getSystemBrandsAPI,
  importBrandsAPI,
  parseBrandCsv,
  saveBrandAPI,
  type Brand,
  type BrandKind,
  type BrandNature,
  type SystemBrand
} from "@/api/brand"

const kinds: BrandKind[] = ["自营品牌", "代理品牌"]
const natures: BrandNature[] = ["镜架", "镜片", "成镜", "配件", "综合"]
const natureColors: Record<BrandNature, string> = {
  镜架: "blue",
  镜片: "green",
  成镜: "purple",
  配件: "orange",
  综合: "cyan"
}
const seriesPresets = [
  "经典系列",
  "商务系列",
  "智锐系列",
  "钻立方系列",
  "万里路系列",
  "爱赞系列",
  "飞行员系列",
  "俱乐部大师",
  "轻盈系列",
  "儿童系列",
  "青少年系列",
  "新乐学系列",
  "丽视系列",
  "复古系列",
  "钛架系列",
  "护理系列",
  "PMC 超亮系列",
  "镜架系列",
  "镜片系列"
]

const currentId = ref("")
const loading = ref(false)
const dataSource = ref<Brand[]>([])
const total = ref(0)
const query = reactive({ name: "", enabled: "" as "" | "1" | "0", page: 1, pageSize: 50 })

const loadData = async (silent = false) => {
  if (!silent) loading.value = true
  try {
    const res = await getBrandPageAPI({ ...query })
    dataSource.value = res.data.list
    total.value = res.data.total
  } finally {
    if (!silent) loading.value = false
  }
}

const onSearch = () => {
  query.page = 1
  loadData()
}

const onReset = () => {
  query.name = ""
  query.enabled = ""
  onSearch()
}

const { columns, tableColumns, scrollX, storageKey } = useColumnSetting("zyb_cols_brand", [
  { key: "name", title: "品牌名称", width: 160 },
  { key: "alias", title: "品牌别名", width: 160 },
  { key: "kind", title: "品牌性质", width: 110 },
  { key: "nature", dataIndex: "natures", title: "售卖品类", width: 160 },
  { key: "series", title: "系列", width: 180, ellipsis: true },
  { key: "remark", title: "品牌备注", width: 180, ellipsis: true },
  { key: "pinned", title: "是否置顶", width: 100 },
  { key: "enabled", title: "是否启用", width: 110 },
  { key: "action", title: "操作", width: 140, fixed: "right" }
])

const seriesTags = computed({
  get: () =>
    form.series
      .split(/[、,，]/)
      .map((item) => item.trim())
      .filter(Boolean),
  set: (value: string[]) => {
    const next = [...new Set(value.map((item) => item.trim()).filter(Boolean))].join("、")
    if (next.length > 60) {
      message.warning("系列最多 60 个字")
      return
    }
    form.series = next
  }
})

const modalOpen = ref(false)
const saving = ref(false)
const editingId = ref<string>()
const form = reactive({
  name: "",
  alias: "",
  isSystem: false,
  kind: "代理品牌" as BrandKind,
  natures: [] as BrandNature[],
  series: "",
  remark: "",
  pinned: false,
  enabled: true
})

const openEdit = (record: Brand) => {
  batchMode.value = false
  editingId.value = record.id
  Object.assign(form, {
    name: record.name,
    alias: record.alias,
    isSystem: record.isSystem,
    kind: record.kind || "代理品牌",
    natures: [...record.natures],
    series: record.series,
    remark: record.remark,
    pinned: record.pinned,
    enabled: record.enabled
  })
  modalOpen.value = true
}

const openCreate = () => {
  batchMode.value = false
  editingId.value = undefined
  Object.assign(form, {
    name: "",
    alias: "",
    isSystem: false,
    kind: "代理品牌",
    natures: [],
    series: "",
    remark: "",
    pinned: false,
    enabled: true
  })
  modalOpen.value = true
}

const onSave = async () => {
  if (!form.name.trim()) {
    message.warning("请填写品牌名称")
    return
  }
  saving.value = true
  try {
    await saveBrandAPI({
      id: editingId.value,
      ...form,
      name: form.name.trim(),
      kind: form.kind || "",
      natures: [...form.natures]
    })
    message.success(editingId.value ? "已保存" : "已新增")
    modalOpen.value = false
    loadData()
  } finally {
    saving.value = false
  }
}

const onTogglePinned = async (record: Brand, pinned: boolean) => {
  const previous = record.pinned
  dataSource.value = dataSource.value.map((item) => (item.id === record.id ? { ...item, pinned } : item))
  try {
    await saveBrandAPI({ ...record, pinned })
    message.success(pinned ? `已置顶「${record.name}」` : `已取消置顶「${record.name}」`)
    await loadData(true)
  } catch {
    dataSource.value = dataSource.value.map((item) =>
      item.id === record.id ? { ...item, pinned: previous } : item
    )
    message.error("置顶切换失败")
  }
}

const onToggleEnabled = async (record: Brand, enabled: boolean) => {
  const previous = record.enabled
  // 表格单元格不会因为改原对象的字段而重绘，换成新行才会刷新开关
  dataSource.value = dataSource.value.map((item) => (item.id === record.id ? { ...item, enabled } : item))
  try {
    await saveBrandAPI({ ...record, enabled })
    message.success(enabled ? `已启用「${record.name}」` : `已禁用「${record.name}」`)
  } catch {
    dataSource.value = dataSource.value.map((item) =>
      item.id === record.id ? { ...item, enabled: previous } : item
    )
    message.error("状态切换失败")
  }
}

const exporting = ref(false)
const fileRef = ref<HTMLInputElement>()

const onExport = async () => {
  exporting.value = true
  try {
    const res = await getBrandPageAPI({ ...query, page: 1, pageSize: 100000 })
    const blob = new Blob([brandsToCsv(res.data.list)], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "品牌资料.csv"
    link.click()
    URL.revokeObjectURL(url)
    message.success(`已导出 ${res.data.list.length} 条品牌资料`)
  } finally {
    exporting.value = false
  }
}

const onImportPick = () => fileRef.value?.click()

const onImportFile = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ""
  if (!file) return
  const parsed = parseBrandCsv(await file.text())
  if (parsed.error) {
    message.error(parsed.error)
    return
  }
  const count = await importBrandsAPI(parsed.rows)
  message.success(`已导入 ${count.data} 条品牌资料`)
  loadData()
}

const batchMode = ref(false)
const batching = ref(false)
const batchLoading = ref(false)
const batchOptions = ref<SystemBrand[]>([])
const batchSelected = ref<string[]>([])

const openBatch = async () => {
  batchMode.value = true
  batchSelected.value = []
  batchLoading.value = true
  try {
    const res = await getSystemBrandsAPI()
    batchOptions.value = res.data
  } finally {
    batchLoading.value = false
  }
}

const backToForm = () => {
  batchMode.value = false
}

const onModalOk = () => {
  if (batchMode.value) return onBatchAdd()
  return onSave()
}

const onBatchAdd = async () => {
  if (!batchSelected.value.length) {
    message.warning("请选择要添加的品牌")
    return
  }
  batching.value = true
  try {
    const res = await addSystemBrandsAPI(batchSelected.value)
    message.success(`已添加 ${res.data} 个品牌`)
    modalOpen.value = false
    batchMode.value = false
    loadData()
  } finally {
    batching.value = false
  }
}

const onDelete = async (record: Brand) => {
  if (record.isSystem) {
    message.warning("品牌已存在商品资料中，无法删除")
    return
  }
  await deleteBrandAPI(record.id)
  message.success("已删除")
  if (dataSource.value.length === 1 && query.page > 1) query.page -= 1
  loadData()
}

onMounted(loadData)
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <a-form layout="inline">
        <a-form-item>
          <a-space>
            <a-button type="primary" @click="openCreate"><PlusOutlined /> 新增品牌</a-button>
            <a-divider type="vertical" />
            <a-popover placement="bottomLeft" :trigger="['hover', 'click']" overlay-class-name="brand-help-popover">
              <template #title>品牌说明</template>
              <template #content>
                <div class="brand-help-lines">
                  <p>1、品牌资料，总店和分店共享，总店和加盟店共享。</p>
                  <p>2、分店不能新增和修改品牌，加盟店可以。</p>
                  <p>3、加盟店创建的品牌，只有该加盟店可以查看。</p>
                </div>
              </template>
              <button type="button" class="brand-help-trigger">
                品牌说明
                <QuestionCircleFilled />
              </button>
            </a-popover>
          </a-space>
        </a-form-item>
        <input ref="fileRef" type="file" accept=".csv,text/csv" hidden @change="onImportFile" />
        <a-form-item label="品牌名称">
          <a-input
            v-model:value="query.name"
            allow-clear
            placeholder="名称或别名"
            style="width: 200px"
            @press-enter="onSearch"
          />
        </a-form-item>
        <a-form-item label="启用状态">
          <a-select v-model:value="query.enabled" style="width: 140px">
            <a-select-option value="">全部</a-select-option>
            <a-select-option value="1">启用</a-select-option>
            <a-select-option value="0">禁用</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-button type="primary" @click="onSearch">查询</a-button>
            <a-button @click="onReset">重置</a-button>
          </a-space>
        </a-form-item>
      </a-form>
      <div class="toolbar-right">
        <a-button @click="onImportPick"><DownloadOutlined />导入品牌资料</a-button>
        <a-button :loading="exporting" @click="onExport"> <UploadOutlined /> 导出品牌资料</a-button>
        <ColumnSetting v-model="columns" :storage-key="storageKey" />
      </div>
    </div>

    <a-table
      row-key="id"
      size="small"
      :columns="tableColumns"
      :data-source="dataSource"
      :loading="loading"
      :custom-row="(record: Brand) => ({
        class: currentId === record.id ? 'row-current' : '',
        onClick: () => { currentId = record.id }
      })"
      :scroll="{ x: scrollX }"
      :pagination="{
        current: query.page,
        pageSize: query.pageSize,
        total,
        showSizeChanger: true,
        showQuickJumper: true,
        pageSizeOptions: tablePageSizeOptions,
        showTotal: tableShowTotal,
        onChange: (page: number, pageSize: number) => {
          query.page = page
          query.pageSize = pageSize
          loadData()
        }
      }"
    >
      <template #bodyCell="{ column, record, text }">
        <template v-if="column.dataIndex === 'kind'">
          <a-tag v-if="record.kind" :color="record.kind === '自营品牌' ? 'blue' : 'orange'">{{ record.kind }}</a-tag>
          <span v-else>-</span>
        </template>
        <template v-else-if="column.dataIndex === 'natures'">
          <a-space v-if="record.natures.length" :size="4" wrap>
            <a-tag v-for="item in (record as Brand).natures" :key="item" :color="natureColors[item]">{{ item }}</a-tag>
          </a-space>
          <span v-else>-</span>
        </template>
        <template v-else-if="column.dataIndex === 'remark'">{{ text || "-" }}</template>
        <template v-else-if="column.dataIndex === 'pinned'">
          <a-switch
            :checked="record.pinned"
            checked-children="是"
            un-checked-children="否"
            @change="(checked: boolean | string | number) => onTogglePinned(record as Brand, checked === true)"
          />
        </template>
        <template v-else-if="column.dataIndex === 'enabled'">
          <a-switch
            :checked="record.enabled"
            checked-children="是"
            un-checked-children="否"
            @change="(checked: boolean | string | number) => onToggleEnabled(record as Brand, checked === true)"
          />
        </template>
        <template v-else-if="column.dataIndex === 'action'">
          <a-space>
            <a-button type="link" size="small" @click="openEdit(record as Brand)">编辑</a-button>
            <a-tooltip v-if="record.isSystem" title="品牌已存在商品资料中，无法删除">
              <span class="delete-disabled">
                <a-button type="link" size="small" danger disabled>删除</a-button>
              </span>
            </a-tooltip>
            <a-popconfirm
              v-else
              :title="`确认删除品牌「${record.name}」？`"
              description="删除后不可恢复"
              ok-text="删除"
              cancel-text="取消"
              ok-type="danger"
              placement="topRight"
              @confirm="onDelete(record as Brand)"
            >
              <a-button type="link" size="small" danger>删除</a-button>
            </a-popconfirm>
          </a-space>
        </template>
      </template>
    </a-table>

    <a-modal
      v-model:open="modalOpen"
      :confirm-loading="batchMode ? batching : saving"
      :width="editingId ? 520 : 680"
      :ok-text="batchMode ? '添加' : '保存'"
      cancel-text="取消"
      @ok="onModalOk"
    >
      <template #title>
        <div class="brand-modal-title">
          <span>{{ editingId ? "编辑品牌" : batchMode ? "批量添加品牌" : "新增品牌" }}</span>
          <span v-if="!editingId && !batchMode" class="batch-hint">
            逐个添加品牌太慢了，点击试试
            <a @click.stop="openBatch">批量添加GSS合作品牌</a>
            吧
          </span>
          <span v-else-if="batchMode" class="batch-hint">
            <a @click.stop="backToForm">返回单个添加</a>
          </span>
        </div>
      </template>
      <a-spin v-if="batchMode" :spinning="batchLoading">
        <a-checkbox-group v-model:value="batchSelected" class="batch-grid">
          <a-checkbox v-for="item in batchOptions" :key="item.name" :value="item.name" :disabled="item.added">
            {{ item.name }}
            <span v-if="item.added" class="batch-added">已添加</span>
          </a-checkbox>
        </a-checkbox-group>
      </a-spin>
      <a-form v-else :label-col="{ span: 6 }" :wrapper-col="{ span: 16 }" style="margin-top: 16px">
        <a-form-item label="品牌名称" required>
          <a-input v-model:value="form.name" :maxlength="30" placeholder="请输入品牌名称" />
        </a-form-item>
        <a-form-item label="品牌别名">
          <a-input v-model:value="form.alias" :maxlength="30" placeholder="请输入品牌别名" />
        </a-form-item>
        <a-form-item label="品牌性质">
          <a-radio-group v-model:value="form.kind">
            <a-radio v-for="item in kinds" :key="item" :value="item">{{ item }}</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="售卖品类">
          <a-select v-model:value="form.natures" mode="multiple" allow-clear placeholder="请选择">
            <a-select-option v-for="n in natures" :key="n" :value="n">{{ n }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="系列">
          <a-select
            v-model:value="seriesTags"
            mode="tags"
            allow-clear
            placeholder="请选择或输入系列"
            :options="seriesPresets.map((item) => ({ value: item, label: item }))"
            :token-separators="['、', ',', '，']"
            :default-active-first-option="false"
          />
        </a-form-item>
        <a-form-item label="是否置顶">
          <a-switch v-model:checked="form.pinned" checked-children="是" un-checked-children="否" />
        </a-form-item>
        <a-form-item label="是否启用">
          <a-switch v-model:checked="form.enabled" checked-children="是" un-checked-children="否" />
        </a-form-item>
        <a-form-item label="品牌备注">
          <a-textarea v-model:value="form.remark" :maxlength="100" :rows="3" placeholder="请输入备注" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.toolbar-right {
  display: flex;
  flex: none;
  align-items: center;
  gap: 8px;
}

.brand-help-trigger {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 32px;
  padding: 0;
  border: 0;
  background: transparent;
  color: rgba(0, 0, 0, 0.88);
  font-size: 14px;
  cursor: pointer;
}

.brand-help-trigger :deep(.anticon) {
  color: #faad14;
  font-size: 16px;
}

.brand-modal-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-right: 28px;
}

.batch-hint {
  color: rgba(0, 0, 0, 0.45);
  font-size: 13px;
  font-weight: 400;
  line-height: 22px;
  white-space: nowrap;
}

.batch-hint a {
  color: #02bfa1;
}

.batch-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px 12px;
  width: 100%;
  padding-top: 8px;
}

.batch-added {
  margin-left: 4px;
  color: rgba(0, 0, 0, 0.35);
  font-size: 12px;
}

.delete-disabled {
  display: inline-flex;
  cursor: not-allowed;
}

.delete-disabled :deep(.ant-btn) {
  pointer-events: none;
}
</style>

<style>
.brand-help-popover .ant-popover-inner {
  width: 500px;
}

.brand-help-popover .brand-help-lines p {
  margin: 0;
  color: rgba(0, 0, 0, 0.88);
  line-height: 1.8;
}
</style>
