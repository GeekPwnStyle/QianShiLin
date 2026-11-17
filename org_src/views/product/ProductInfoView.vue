<script setup lang="ts">
import { computed, defineComponent, h, inject, nextTick, onActivated, onMounted, onUnmounted, provide, ref, watch, type Ref } from "vue"
import {
  CopyOutlined,
  DeleteOutlined,
  DownOutlined,
  EllipsisOutlined,
  ExclamationCircleFilled,
  EditOutlined,
  FilterOutlined,
  EyeOutlined,
  FormOutlined,
  ImportOutlined
} from "@ant-design/icons-vue"
import { Modal, message } from "ant-design-vue"
import { deleteProductsAPI, setProductPriceAPI } from "@/api/product"
import ProductEditor from "./ProductEditor.vue"
import { useProductList } from "./useProductList"
import {
  DEGREE_SIGN_OPTIONS,
  EXPORT_FIELDS,
  PRODUCT_CAT_CHILDREN,
  catalogCellText,
  degreeStockGrid,
  formatDegree,
  formatExportCell,
  locOptions,
  supplierOptions,
  tagOptions,
  type CatalogTreeNode,
  type DegreeSignPair,
  type ProductColumn,
  type ProductRow
} from "./productUi"
import ColumnSetting from "@/components/ColumnSetting.vue"
import { tablePageSizeOptions, tableShowTotal } from "@/components/tablePagination"
import "./product.css"

const SG_VIRTUAL = Symbol("sg-virtual")
const currentRowKey = ref("")
const deletePopKey = ref("")
const rowMenuOpenKey = ref("")

type VirtualState = {
  padTop: Ref<number>
  padBottom: Ref<number>
  colSpan: Ref<number>
}

const SgVirtualBody = defineComponent({
  name: "SgVirtualBody",
  setup(_, { slots }) {
    const state = inject<VirtualState>(SG_VIRTUAL)
    const spacer = (height: number, colSpan: number) =>
      h("tr", { class: "sg-vpad", "aria-hidden": "true", style: { height: `${height}px` } }, [
        h("td", {
          colSpan,
          style: {
            height: `${height}px`,
            padding: "0",
            border: "0",
            lineHeight: "0"
          }
        })
      ])
    return () => {
      const padTop = state?.padTop.value ?? 0
      const padBottom = state?.padBottom.value ?? 0
      const colSpan = state?.colSpan.value ?? 1
      return h("tbody", null, [
        padTop > 0 ? spacer(padTop, colSpan) : null,
        slots.default?.(),
        padBottom > 0 ? spacer(padBottom, colSpan) : null
      ])
    }
  }
})

const tableComponents = { body: { wrapper: SgVirtualBody } }

const {
  q, activeCat, treeBrand, treeSeries, catalogTree, selectTree, page, pageSize, filteredTotal, onPageChange, columns, tableColumns, columnStorageKey, tableRows, loading, scrollX,
  draftColQueries, thFilterOpen, thKey, sortKey, sortOrder, toggleSort, applyThFilter, resetThFilter, isThFilterActive,
  search, reset, openCreate, closeCreate, submitSave, createOpen, editorViewOnly, creating, editSeed, editorKey, editingId, onThFilterOpen, openDetail,
  degreeOpen, degreeRecord, degreeList, closeDegree, exportOpen, exportForm,
  exportColKeys, exportAllChecked, exportIndeterminate, exportPreviewRows, exportFiltered, exportKw,
  hasAnyColFilter, filterOpenKey, filterQ, openExport, closeExport, exportList, isExportColOn,
  toggleExportCol, toggleAllExportCols, visibleFilterOptions, isColFilterActive, isColFilterAllChecked,
  isColFilterIndeterminate, isFilterValueOn, onFilterOpenChange, toggleFilterValue, toggleAllColFilter,
  clearColFilter, clearAllColFilters, openCopy, openEdit, reload
} = useProductList()

const checkedKeys = ref<string[]>([])
const openTreeKeys = ref<string[]>(["all"])
const priceOpen = ref(false)
const reqOpen = ref(false)
const editorRef = ref<{ requestClose: () => void } | null>(null)

function onCreateDrawerClose() {
  editorRef.value?.requestClose()
}
const batchPrice = ref<number | undefined>()
const priceSaving = ref(false)

const pageKeys = computed(() => tableRows.value.map((row) => row.rowKey))
const allPageChecked = computed(() => pageKeys.value.length > 0 && pageKeys.value.every((key) => checkedKeys.value.includes(key)))
const pageIndeterminate = computed(() => !allPageChecked.value && pageKeys.value.some((key) => checkedKeys.value.includes(key)))
const hasPicked = computed(() => checkedKeys.value.length > 0)

function toggleAllPage() {
  if (allPageChecked.value) {
    const drop = new Set(pageKeys.value)
    checkedKeys.value = checkedKeys.value.filter((key) => !drop.has(key))
    return
  }
  checkedKeys.value = [...new Set([...checkedKeys.value, ...pageKeys.value])]
}

function toggleCheck(record: ProductRow) {
  currentRowKey.value = record.rowKey
  if (checkedKeys.value.includes(record.rowKey)) {
    checkedKeys.value = checkedKeys.value.filter((key) => key !== record.rowKey)
    return
  }
  checkedKeys.value = [...checkedKeys.value, record.rowKey]
}

function pickedRows() {
  const set = new Set(checkedKeys.value)
  const checked = tableRows.value.filter((row) => set.has(row.rowKey))
  if (checked.length) return checked
  const current = tableRows.value.find((row) => row.rowKey === currentRowKey.value)
  return current ? [current] : []
}

function rowNo(record: ProductRow) {
  const index = tableRows.value.findIndex((row) => row.rowKey === record.rowKey)
  if (index < 0) return ""
  return (page.value - 1) * pageSize.value + index + 1
}

function onDelete() {
  const rows = pickedRows()
  if (!rows.length) {
    message.warning("请先选择商品")
    return
  }
  Modal.confirm({
    title: `删除选中的 ${rows.length} 条商品？`,
    okText: "删除",
    okType: "danger",
    cancelText: "取消",
    onOk: async () => {
      const res = await deleteProductsAPI(rows.map((row) => row.id))
      if (!res.success) return
      checkedKeys.value = []
      currentRowKey.value = ""
      message.success(`已删除 ${res.data} 条`)
      reload()
    }
  })
}

function onRowCopy(row: ProductRow) {
  currentRowKey.value = row.rowKey
  openCopy(row)
}

function onRowDelete(row: ProductRow) {
  currentRowKey.value = row.rowKey
  deletePopKey.value = row.rowKey
  rowMenuOpenKey.value = row.rowKey
}

function cancelRowDelete() {
  deletePopKey.value = ""
  rowMenuOpenKey.value = ""
}

async function confirmRowDelete(row: ProductRow) {
  const res = await deleteProductsAPI([row.id])
  if (!res.success) return
  checkedKeys.value = checkedKeys.value.filter((key) => key !== row.rowKey)
  if (currentRowKey.value === row.rowKey) currentRowKey.value = ""
  deletePopKey.value = ""
  rowMenuOpenKey.value = ""
  message.success("已删除")
  reload()
}

function onRowMenuOpen(row: ProductRow, open: boolean) {
  if (open) {
    if (deletePopKey.value && deletePopKey.value !== row.rowKey) deletePopKey.value = ""
    rowMenuOpenKey.value = row.rowKey
    return
  }
  if (deletePopKey.value === row.rowKey) {
    rowMenuOpenKey.value = row.rowKey
    return
  }
  rowMenuOpenKey.value = ""
}

function onRowMenuClick(info: { key: string | number }, row: ProductRow) {
  const key = String(info.key)
  currentRowKey.value = row.rowKey
  if (key === "delete") {
    onRowDelete(row)
    return
  }
  deletePopKey.value = ""
  rowMenuOpenKey.value = ""
  if (key === "view") openDetail(row)
  else if (key === "edit") openEdit(row)
  else if (key === "copy") onRowCopy(row)
}

function onBatchBindSupplier() {
  const rows = pickedRows()
  if (!rows.length) {
    message.warning("请先选择商品")
    return
  }
  message.info("批量绑定供应商功能待接入")
}

function onBatchPrice() {
  if (!pickedRows().length) {
    message.warning("请先选择商品")
    return
  }
  batchPrice.value = undefined
  priceOpen.value = true
}

async function submitBatchPrice() {
  const rows = pickedRows()
  if (batchPrice.value == null || Number.isNaN(Number(batchPrice.value))) {
    message.warning("请填写零售价")
    return
  }
  priceSaving.value = true
  try {
    const res = await setProductPriceAPI(rows.map((row) => row.id), Number(batchPrice.value))
    if (!res.success) return
    priceOpen.value = false
    message.success(`已修改 ${res.data} 条零售价`)
    reload()
  } finally {
    priceSaving.value = false
  }
}

const ROW_OVERSCAN = 8
const rowHeight = ref(39)
const host = ref<HTMLElement | null>(null)
const bodyHeight = ref(360)
const scrollTop = ref(0)
let bodyEl: HTMLElement | null = null
let resizeObserver: ResizeObserver | undefined

const virtualRange = computed(() => {
  const total = tableRows.value.length
  const height = rowHeight.value
  const start = Math.max(0, Math.floor(scrollTop.value / height) - ROW_OVERSCAN)
  const count = Math.ceil(bodyHeight.value / height) + ROW_OVERSCAN * 2
  const end = Math.min(total, start + count)
  return { start, end, total }
})

const windowRows = computed(() => {
  const { start, end } = virtualRange.value
  return tableRows.value.slice(start, end)
})

const padTop = computed(() => virtualRange.value.start * rowHeight.value)
const padBottom = computed(() => Math.max(0, virtualRange.value.total - virtualRange.value.end) * rowHeight.value)
const colSpan = computed(() => Math.max(1, tableColumns.value.length))

provide<VirtualState>(SG_VIRTUAL, { padTop, padBottom, colSpan })

function onBodyScroll() {
  if (!bodyEl) return
  const top = bodyEl.scrollTop
  const height = rowHeight.value
  const prev = Math.floor(scrollTop.value / height)
  const next = Math.floor(top / height)
  if (next !== prev) scrollTop.value = top
}

function bindBody() {
  const next = host.value?.querySelector(".ant-table-body") as HTMLElement | null
  if (next === bodyEl) return
  bodyEl?.removeEventListener("scroll", onBodyScroll)
  bodyEl = next
  bodyEl?.addEventListener("scroll", onBodyScroll, { passive: true })
}

function calibrateRowHeight() {
  const row = host.value?.querySelector(".ant-table-tbody tr.ant-table-row") as HTMLElement | null
  if (!row) return
  const height = Math.round(row.getBoundingClientRect().height)
  if (height > 20 && height !== rowHeight.value) rowHeight.value = height
}

function measureBody() {
  const el = host.value
  if (!el) return
  const header = el.querySelector(".ant-table-header") as HTMLElement | null
  const pager = el.querySelector(".ant-table-pagination") as HTMLElement | null
  const pagerH = pager ? pager.offsetHeight + 8 : 48
  const next = Math.max(120, el.clientHeight - (header?.offsetHeight ?? 0) - pagerH)
  if (Math.abs(next - bodyHeight.value) > 2) bodyHeight.value = next
  calibrateRowHeight()
  bindBody()
}

function resetTableScroll() {
  scrollTop.value = 0
  nextTick(() => {
    const body = host.value?.querySelector(".ant-table-body") as HTMLElement | null
    if (body) body.scrollTop = 0
    bindBody()
  })
}

onMounted(() => {
  measureBody()
  resizeObserver = new ResizeObserver(() => measureBody())
  if (host.value) resizeObserver.observe(host.value)
})

onActivated(() => measureBody())

onUnmounted(() => {
  resizeObserver?.disconnect()
  bodyEl?.removeEventListener("scroll", onBodyScroll)
})

watch(
  () => tableRows.value.map((row) => row.rowKey).join("\n"),
  () => resetTableScroll()
)

watch([bodyHeight, () => windowRows.value.length, loading], () => nextTick(measureBody))

const createTypeKey = computed(() => (PRODUCT_CAT_CHILDREN.some((item) => item.key === activeCat.value) ? activeCat.value : "frame"))


const sign = ref<DegreeSignPair>("-/-")
const hoverSph = ref("")
const hoverCyl = ref("")
const signOptions = DEGREE_SIGN_OPTIONS.map((o) => ({ value: o.value, label: o.label }))
const grid = computed(() => degreeStockGrid(degreeList.value, sign.value))

watch(degreeOpen, (open) => {
  if (!open) return
  sign.value = "-/-"
  hoverSph.value = ""
  hoverCyl.value = ""
})

function isTreeOpen(key: string) {
  return openTreeKeys.value.includes(key)
}

function toggleTree(key: string) {
  openTreeKeys.value = isTreeOpen(key)
    ? openTreeKeys.value.filter((item) => item !== key)
    : [...openTreeKeys.value, key]
}

function nodeSelected(node: Pick<CatalogTreeNode, "cat" | "brand" | "series">) {
  return activeCat.value === node.cat && treeBrand.value === node.brand && treeSeries.value === node.series
}

function pickTree(node: CatalogTreeNode) {
  if (node.brand) {
    const next = new Set(openTreeKeys.value)
    next.add(node.cat)
    if (node.series) next.add(`${node.cat}|${node.brand}`)
    openTreeKeys.value = [...next]
  }
  selectTree(node)
}

function signPopupParent(el: HTMLElement) {
  return (el.closest(".ant-modal-content") as HTMLElement) || document.body
}
</script>

<template>
  <div class="sg-page">
    <a-drawer
      :open="createOpen"
      placement="right"
      :width="1240"
      :closable="false"
      :keyboard="false"
      root-class-name="sg-product-drawer"
      destroy-on-close
      @close="onCreateDrawerClose"
    >
      <ProductEditor
        v-if="createOpen"
        ref="editorRef"
        :key="editorKey"
        :seed="editSeed"
        :editing="!!editingId"
        :view-only="editorViewOnly"
        :saving="creating"
        :default-type="createTypeKey"
        :default-brand="treeBrand"
        :default-series="treeSeries"
        @close="closeCreate"
        @save="submitSave"
      />
    </a-drawer>
    <div class="sg-catalog">
      <aside class="sg-cat-pane">
        <div class="sg-cat-tree">
          <div class="sg-cat-node">
            <div
              class="sg-cat-row"
              :class="{ on: activeCat === 'all' && !treeBrand && !treeSeries }"
              @click="selectTree({ cat: 'all' })"
            >
              <button type="button" class="sg-cat-switch" @click.stop="toggleTree('all')">{{ isTreeOpen('all') ? '−' : '+' }}</button>
              <span class="sg-cat-label">全部</span>
            </div>
            <div v-show="isTreeOpen('all')" class="sg-cat-kids">
              <div v-for="cat in catalogTree" :key="cat.key" class="sg-cat-node">
                <div
                  class="sg-cat-row"
                  :class="{ on: nodeSelected({ cat: cat.cat, brand: '', series: '' }) }"
                  @click="pickTree({ cat: cat.cat, brand: '', series: '', key: cat.key, title: cat.title, children: cat.children })"
                >
                  <button
                    type="button"
                    class="sg-cat-switch"
                    :class="{ blank: !cat.children?.length }"
                    @click.stop="cat.children?.length && toggleTree(cat.key)"
                  >{{ cat.children?.length ? (isTreeOpen(cat.key) ? '−' : '+') : '' }}</button>
                  <span class="sg-cat-label">{{ cat.title }}</span>
                </div>
                <div v-show="isTreeOpen(cat.key)" class="sg-cat-kids">
                  <div v-for="brand in cat.children" :key="brand.key" class="sg-cat-node">
                    <div
                      class="sg-cat-row"
                      :class="{ on: nodeSelected({ cat: brand.cat, brand: brand.brand, series: '' }) }"
                      @click="pickTree(brand)"
                    >
                      <button
                        type="button"
                        class="sg-cat-switch"
                        :class="{ blank: !brand.children?.length }"
                        @click.stop="brand.children?.length && toggleTree(brand.key)"
                      >{{ brand.children?.length ? (isTreeOpen(brand.key) ? '−' : '+') : '' }}</button>
                      <span class="sg-cat-label">{{ brand.title }}</span>
                    </div>
                    <div v-show="isTreeOpen(brand.key)" class="sg-cat-kids">
                      <div
                        v-for="series in brand.children"
                        :key="series.key"
                        class="sg-cat-row"
                        :class="{ on: nodeSelected(series) }"
                        @click="pickTree(series)"
                      >
                        <button type="button" class="sg-cat-switch blank"></button>
                        <span class="sg-cat-label">{{ series.title }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <section class="sg-catalog-main">
        <div class="sg-actbar">
          <div class="sg-actbar-left">
            <button type="button" class="sg-act" @click="openCreate()">新增</button>
            <span class="sg-act-sep"></span>
            <button type="button" class="sg-act" :disabled="!hasPicked" @click="onBatchPrice"><FormOutlined /> 批量修改</button>
            <button type="button" class="sg-act" :disabled="!hasPicked" @click="onDelete"><DeleteOutlined /> 批量删除</button>
            <button type="button" class="sg-act" :disabled="!hasPicked" @click="onBatchBindSupplier"><FormOutlined /> 批量绑定供应商</button>
            <button type="button" class="sg-act sg-req" @click="reqOpen = true">需求说明</button>
          </div>
          <div class="sg-actbar-right">
            <a-dropdown placement="bottomRight">
              <button type="button" class="sg-act sg-act-dd">导出 <DownOutlined /></button>
              <template #overlay>
                <a-menu>
                  <a-menu-item key="export" @click="openExport">导出数据</a-menu-item>
                </a-menu>
              </template>
            </a-dropdown>
            <a-dropdown placement="bottomRight">
              <button type="button" class="sg-act sg-act-dd"><ImportOutlined /> 导入 <DownOutlined /></button>
              <template #overlay>
                <a-menu>
                  <a-menu-item key="import" @click="message.info('演示环境请使用导出的表格，暂未接入导入')">导入数据</a-menu-item>
                </a-menu>
              </template>
            </a-dropdown>
          </div>
        </div>
        <div class="sg-querybar">
          <a-input
            v-model:value="q"
            allow-clear
            class="sg-query-input"
            placeholder="品类/品牌/折射率/系列/型号/色号/产品代号/产品名称/框镜类型"
            @press-enter="search"
          />
          <a-button type="primary" class="sg-query-solid" @click="search">查询</a-button>
          <a-dropdown placement="bottomRight">
            <a-button type="primary" class="sg-query-solid"><FilterOutlined /> 筛选</a-button>
            <template #overlay>
              <a-menu>
                <a-menu-item key="reset" @click="reset">重置查询</a-menu-item>
                <a-menu-item key="clear-cols" @click="clearAllColFilters">清除列筛选</a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
          <ColumnSetting v-model="columns" :storage-key="columnStorageKey" />
        </div>

      <div ref="host" class="sg-table-host">
      <a-table
        class="sg-catalog-table"
        size="small"
        :columns="tableColumns"
        :data-source="windowRows"
        :components="tableComponents"
        :loading="loading"
        :pagination="{
          current: page,
          pageSize,
          total: filteredTotal,
          showSizeChanger: true,
          showQuickJumper: true,
          pageSizeOptions: tablePageSizeOptions,
          showTotal: tableShowTotal,
          onChange: onPageChange
        }"
        row-key="rowKey"
        :custom-row="(record: ProductRow) => ({
          class: currentRowKey === record.rowKey ? 'row-current' : '',
          onClick: () => { currentRowKey = record.rowKey }
        })"
        :scroll="{ x: scrollX, y: bodyHeight }"
      >
        <template #headerCell="{ column }">
          <a-checkbox
            v-if="column.key === 'pick'"
            :checked="allPageChecked"
            :indeterminate="pageIndeterminate"
            @click.stop
            @change="toggleAllPage"
          />
          <span v-else-if="(column as ProductColumn).filterable" class="sg-th-filter">
            <button type="button" class="sg-th-name" @click.stop="toggleSort(String(column.key))">{{ column.title }}</button>
            <a-dropdown
              :open="thFilterOpen === thKey(String(column.key))"
              :trigger="['hover']"
              overlay-class-name="sg-excel-filter-overlay"
              @open-change="(open: boolean) => onThFilterOpen(String(column.key), open)"
            >
              <button
                type="button"
                class="sg-excel-filter-btn"
                :class="{ on: isThFilterActive(String(column.key)) }"
                :title="'筛选' + column.title"
                @click.stop
              ><FilterOutlined /></button>
              <template #overlay>
                <div class="sg-col-filter" @click.stop>
                  <a-input
                    :value="draftColQueries[thKey(String(column.key))]"
                    allow-clear
                    size="small"
                    placeholder="按回车筛选"
                    @update:value="draftColQueries[thKey(String(column.key))] = String($event || '')"
                    @press-enter="applyThFilter(String(column.key))"
                  />
                  <div class="sg-col-filter-actions">
                    <button type="button" @click="applyThFilter(String(column.key))">筛选</button>
                    <button type="button" @click="resetThFilter(String(column.key))">重置</button>
                  </div>
                </div>
              </template>
            </a-dropdown>
            <button
              type="button"
              class="sg-th-sort"
              :class="{
                asc: sortKey === column.key && sortOrder === 'asc',
                desc: sortKey === column.key && sortOrder === 'desc'
              }"
              title="排序"
              @click.stop="toggleSort(String(column.key))"
            >
              <CaretUpOutlined />
              <CaretDownOutlined />
            </button>
          </span>
          <span v-else>{{ column.title }}</span>
        </template>
        <template #bodyCell="{ column, record }">
          <a-checkbox
            v-if="column.key === 'pick'"
            :checked="checkedKeys.includes((record as ProductRow).rowKey)"
            @click.stop
            @change="toggleCheck(record as ProductRow)"
          />
          <template v-else-if="column.key === 'seq'">{{ rowNo(record as ProductRow) }}</template>
          <template v-else-if="column.key === 'action'">
            <a-popover
              :open="deletePopKey === (record as ProductRow).rowKey"
              placement="leftTop"
              :trigger="[]"
              overlay-class-name="sg-del-pop"
            >
              <template #title>
                <span class="sg-del-pop-title">
                  <ExclamationCircleFilled />
                  删除确认
                </span>
              </template>
              <template #content>
                <div class="sg-del-pop-body">
                  确认要删除商品 “{{ (record as ProductRow).name || (record as ProductRow).sku || (record as ProductRow).id }}” 吗？
                </div>
                <div class="sg-del-pop-ft">
                  <button type="button" class="sg-del-cancel" @click.stop="cancelRowDelete">取消</button>
                  <button type="button" class="sg-del-ok" @click.stop="confirmRowDelete(record as ProductRow)">确认</button>
                </div>
              </template>
              <a-dropdown
                :open="rowMenuOpenKey === (record as ProductRow).rowKey || deletePopKey === (record as ProductRow).rowKey"
                :trigger="['hover']"
                placement="bottomRight"
                overlay-class-name="sg-row-more-overlay"
                @openChange="(open: boolean) => onRowMenuOpen(record as ProductRow, open)"
              >
                <button type="button" class="sg-row-more" title="更多操作" @click.stop="currentRowKey = (record as ProductRow).rowKey">
                  <EllipsisOutlined />
                </button>
                <template #overlay>
                  <a-menu @click="(info: { key: string | number }) => onRowMenuClick(info, record as ProductRow)">
                    <a-menu-item key="view">
                      <EyeOutlined /> 查看
                    </a-menu-item>
                    <a-menu-item key="edit">
                      <EditOutlined /> 编辑
                    </a-menu-item>
                    <a-menu-item key="copy">
                      <CopyOutlined /> 复制商品
                    </a-menu-item>
                    <a-menu-item key="delete" danger>
                      <DeleteOutlined /> 删除
                    </a-menu-item>
                  </a-menu>
                </template>
              </a-dropdown>
            </a-popover>
          </template>
          <template v-else>{{ catalogCellText(record as ProductRow, String(column.key)) }}</template>
        </template>
      </a-table>
      </div>
      </section>
    </div>

    <a-modal
      :open="reqOpen"
     
      :footer="null"
      :width="720"
      @cancel="reqOpen = false"
    >
      <div class="sg-req-doc">
        <h3>本次的需求内容</h3>
        1 进入系统需要获取系统有没有隐形眼镜 有隐形眼镜就展示隐形眼镜的类目
        2 
      </div>
    </a-modal>

    <a-modal
      :open="priceOpen"
      title="批量修改零售价"
      ok-text="保存"
      cancel-text="取消"
      :confirm-loading="priceSaving"
      :width="360"
      @ok="submitBatchPrice"
      @cancel="priceOpen = false"
    >
      <a-form layout="vertical">
        <a-form-item label="零售价" required>
          <a-input-number v-model:value="batchPrice" :min="0" :precision="2" :controls="false" placeholder="0.00" style="width: 100%" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      :open="degreeOpen"
      :title="degreeRecord?.name ? `度数详情 · ${degreeRecord.name}` : '度数详情'"
      :footer="null"
      :width="1080"
      :z-index="1100"
      wrap-class-name="sg-degree-modal"
      destroy-on-close
      @cancel="closeDegree"
    >
      <div class="sg-degree-bar">
        <span class="sg-degree-bar-l">切换 球镜/柱镜 符号</span>
        <a-select
          v-model:value="sign"
          :options="signOptions"
          size="small"
          class="sg-degree-sign"
          :get-popup-container="signPopupParent"
        />
      </div>
      <div class="sg-degree-wrap" @mouseleave="hoverSph = ''; hoverCyl = ''">
        <table class="sg-degree-grid">
          <thead>
            <tr>
              <th class="sg-degree-corner">柱镜 \ 球镜</th>
              <th
                v-for="sph in grid.sphs"
                :key="'h-' + sph"
                class="sg-degree-axis"
                :class="{ 'sg-degree-hi-head': hoverSph === sph }"
              >{{ formatDegree(sph) }}</th>
              <th class="sg-degree-corner sg-degree-cyl-r">柱镜</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in grid.rows" :key="'r-' + row.cyl">
              <th class="sg-degree-axis sg-degree-cyl" :class="{ 'sg-degree-hi-head': hoverCyl === row.cyl }">
                {{ formatDegree(row.cyl) }}
              </th>
              <td
                v-for="cell in row.cells"
                :key="cell.sph + '|' + row.cyl"
                :class="{
                  'sg-degree-has': cell.qty !== 0,
                  'sg-degree-hi-row': hoverCyl === row.cyl,
                  'sg-degree-hi-col': hoverSph === cell.sph
                }"
                @mouseenter="hoverSph = cell.sph; hoverCyl = row.cyl"
              >{{ cell.qty !== 0 ? cell.qty : "" }}</td>
              <th class="sg-degree-axis sg-degree-cyl sg-degree-cyl-r" :class="{ 'sg-degree-hi-head': hoverCyl === row.cyl }">
                {{ formatDegree(row.cyl) }}
              </th>
            </tr>
          </tbody>
        </table>
      </div>
    </a-modal>

    <a-modal
      :open="exportOpen"
      title="导出商品"
      :width="920"
      centered
      :mask-closable="false"
      ok-text="导出"
      cancel-text="取消"
      wrap-class-name="sg-export-modal"
      @update:open="(open: boolean) => (open ? openExport() : closeExport())"
      @ok="exportList"
    >
      <a-form layout="vertical" class="sg-export-form" :colon="false">
        <div class="sg-excel-toolbar">
          <a-checkbox :checked="exportAllChecked" :indeterminate="exportIndeterminate" @click.prevent="toggleAllExportCols">
            全选列
          </a-checkbox>
          <span class="sg-excel-count">已选 {{ exportColKeys.length }} / {{ EXPORT_FIELDS.length }} 列 · 筛选后 {{ exportFiltered.length }} 条</span>
          <span class="sg-excel-hint">勾选表头导出该列；点列名旁的 ▾ 可筛选该列，与是否导出该列互不影响。</span>
          <span v-if="exportKw" class="sg-excel-kw">关键词：{{ exportKw }}</span>
          <a-button v-if="hasAnyColFilter" type="link" size="small" @click="clearAllColFilters">清除筛选</a-button>
        </div>
        <div class="sg-excel">
          <table>
            <thead>
              <tr>
                <th class="sg-excel-corner" @click="toggleAllExportCols">
                  <a-checkbox :checked="exportAllChecked" :indeterminate="exportIndeterminate" @click.prevent.stop="toggleAllExportCols" />
                </th>
                <th
                  v-for="col in EXPORT_FIELDS"
                  :key="col.key"
                  class="sg-excel-th"
                  :class="[isExportColOn(col.key) ? 'on' : 'off', { filtered: isColFilterActive(col.key) }]"
                  @click="toggleExportCol(col.key)"
                >
                  <span class="sg-excel-letter">{{ col.letter }}</span>
                  <span class="sg-excel-h">
                    <a-checkbox :checked="isExportColOn(col.key)" @click.prevent.stop="toggleExportCol(col.key)" />
                    {{ col.title }}
                    <a-dropdown
                      :open="filterOpenKey === col.key"
                      :trigger="['hover']"
                      overlay-class-name="sg-excel-filter-overlay"
                      @open-change="(open: boolean) => onFilterOpenChange(col.key, open)"
                    >
                      <span class="sg-excel-filter-btn" :class="{ on: isColFilterActive(col.key) }" :title="'按' + col.title + '筛选'" @click.stop>▾</span>
                      <template #overlay>
                        <div class="sg-excel-filter-panel" @click.stop>
                          <div class="sg-excel-filter-title">筛选{{ col.title }}</div>
                          <a-input :value="filterQ" allow-clear size="small" placeholder="搜索" @update:value="filterQ = String($event || '')" />
                          <label class="sg-excel-filter-item all">
                            <a-checkbox
                              :checked="isColFilterAllChecked(col.key)"
                              :indeterminate="isColFilterIndeterminate(col.key)"
                              @click.prevent="toggleAllColFilter(col.key)"
                            />
                            全选
                          </label>
                          <div class="sg-excel-filter-list">
                            <label v-for="opt in visibleFilterOptions(col.key)" :key="String(opt.value)" class="sg-excel-filter-item">
                              <a-checkbox
                                :checked="isFilterValueOn(col.key, opt.value)"
                                @click.prevent="toggleFilterValue(col.key, opt.value)"
                              />
                              {{ opt.label }}
                            </label>
                            <div v-if="!visibleFilterOptions(col.key).length" class="sg-excel-filter-empty">无匹配项</div>
                          </div>
                          <div class="sg-excel-filter-foot">
                            <button type="button" class="sg-excel-filter-clear" @click="clearColFilter(col.key)">清除筛选</button>
                          </div>
                        </div>
                      </template>
                    </a-dropdown>
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(r, i) in exportPreviewRows" :key="r.id">
                <td class="sg-excel-rn">{{ i + 1 }}</td>
                <td
                  v-for="col in EXPORT_FIELDS"
                  :key="col.key"
                  :class="{ off: !isExportColOn(col.key) }"
                  :style="{ textAlign: col.align }"
                >{{ formatExportCell(r, col) }}</td>
              </tr>
              <tr v-if="!exportPreviewRows.length">
                <td class="sg-excel-empty" :colspan="EXPORT_FIELDS.length + 1">当前列表没有可预览的数据</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="sg-export-triple">
          <a-form-item label="启用状态">
            <a-radio-group v-model:value="exportForm.enabled">
              <a-radio value="all">不限</a-radio>
              <a-radio value="1">启用</a-radio>
              <a-radio value="0">禁用</a-radio>
            </a-radio-group>
          </a-form-item>
          <a-form-item label="消耗金额获得积分">
            <div class="sg-export-range">
              <a-input-number v-model:value="exportForm.scoreMin" :controls="false" placeholder="最小值" style="width: 100%" />
              <span class="sg-export-dash">至</span>
              <a-input-number v-model:value="exportForm.scoreMax" :controls="false" placeholder="最大值" style="width: 100%" />
            </div>
          </a-form-item>
        </div>
        <div class="sg-export-triple">
          <a-form-item label="库存摆放位置">
            <a-select v-model:value="exportForm.stockLoc" allow-clear placeholder="请选择" :options="locOptions" />
          </a-form-item>
          <a-form-item label="标签">
            <a-select v-model:value="exportForm.tag" allow-clear placeholder="请选择" :options="tagOptions" />
          </a-form-item>
          <a-form-item label="供应商">
            <a-select
              v-model:value="exportForm.supplier"
              mode="multiple"
              allow-clear
              show-search
              placeholder="请选择"
              :options="supplierOptions"
              :max-tag-count="2"
              option-filter-prop="label"
            />
          </a-form-item>
        </div>
      </a-form>
    </a-modal>
  </div>
</template>
