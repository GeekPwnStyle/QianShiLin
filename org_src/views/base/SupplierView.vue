<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from "vue"
import { Modal, message } from "ant-design-vue"
import { CloudUploadOutlined, DownloadOutlined, HolderOutlined, IdcardOutlined, PlusOutlined, SafetyCertificateOutlined, UploadOutlined } from "@ant-design/icons-vue"
import { pinyin } from "pinyin-pro"
import ColumnSetting from "@/components/ColumnSetting.vue"
import { tablePageSizeOptions, tableShowTotal } from "@/components/tablePagination"
import { useColumnSetting } from "@/components/columnSetting"
import { supplierRegions, type SupplierRegion } from "./supplierRegions"
import { getBrandPageAPI } from "@/api/brand"
import {
  deleteSupplierAPI,
  getSupplierBillsAPI,
  getSupplierPageAPI,
  importSuppliersAPI,
  reorderSuppliersAPI,
  parseSupplierCsv,
  saveSupplierAPI,
  supplierCategories,
  suppliersToCsv,
  type Supplier,
  type SupplierBill,
  type SupplierCategory
} from "@/api/supplier"

const moreActions = ["往来单据", "授权查看", "绑定第三方"]
const moreOpenId = ref("")

const categoryColors: Record<SupplierCategory, string> = {
  镜架: "blue",
  镜片: "green",
  成镜: "purple",
  配件: "orange",
  护理: "cyan",
  医疗器械: "red"
}

const loading = ref(false)
const dataSource = ref<Supplier[]>([])
const query = reactive({
  keyword: "",
  enabled: "" as "" | "1" | "0"
})

const loadData = async (silent = false) => {
  if (!silent) loading.value = true
  try {
    const res = await getSupplierPageAPI({ ...query, page: 1, pageSize: 100000 })
    dataSource.value = res.data.list
  } finally {
    if (!silent) loading.value = false
  }
}

const onSearch = () => {
  loadData()
}

const onReset = () => {
  query.keyword = ""
  query.enabled = ""
  onSearch()
}

const dragId = ref("")
const overId = ref("")

const onDragStart = (record: Supplier, event: DragEvent) => {
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
  dataSource.value = nextIds.map((id) => byId.get(id)).filter((item): item is Supplier => Boolean(item))
  await reorderSuppliersAPI(nextIds)
  await loadData(true)
}

const currentId = ref("")
const customRow = (record: Supplier) => ({
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
    void onDropRow(record.id)
  }
})

const { columns, tableColumns, scrollX, storageKey } = useColumnSetting("zyb_cols_supplier_v2", [
  { key: "name", title: "供应商名称", width: 200, ellipsis: true },
  { key: "alias", title: "供应商别名", width: 160, ellipsis: true },
  { key: "contact", title: "联系人", width: 120 },
  { key: "phone", title: "手机号", width: 150 },
  { key: "categories", title: "供应品类", width: 220 },
  { key: "brands", title: "供应品牌", width: 200, ellipsis: true },
  { key: "isDefault", title: "是否默认供应商", width: 140, visible: false },
  { key: "franchiseStore", title: "绑定加盟批发门店", width: 200, ellipsis: true, visible: false },
  { key: "scope", title: "经营范围", width: 140, ellipsis: true, visible: false },
  { key: "province", title: "省份", width: 100, visible: false },
  { key: "city", title: "城市", width: 100, visible: false },
  { key: "district", title: "区县", width: 100, visible: false },
  { key: "storeType", title: "归属门店类型", width: 120, visible: false },
  { key: "storeName", title: "归属门店", width: 180, ellipsis: true, visible: false },
  { key: "detailAddress", title: "详细地址", width: 220, ellipsis: true, visible: false },
  { key: "licenseExpire", title: "医疗器械经营许可证过期时间", width: 220, visible: false },
  { key: "supplyChain", dataIndex: "supplierEnabled", title: "供应链", width: 140, visible: false },
  { key: "enabled", title: "是否启用", width: 110, visible: false },
  { key: "reportStatus", title: "上报状态", width: 110, visible: false },
  { key: "ops", dataIndex: "action", title: "操作", width: 220, fixed: "right" }
])

const textOf = (value: string | number | undefined | null) => {
  if (value === 0) return "0"
  return value ? String(value) : "-"
}

const modalOpen = ref(false)
const saving = ref(false)
const editingId = ref<string>()
const form = reactive({
  name: "",
  contact: "",
  phone: "",
  categories: [] as SupplierCategory[],
  brands: [] as string[],
  isDefault: false,
  franchiseStore: "",
  sort: 0,
  scope: "",
  province: "",
  city: "",
  district: "",
  storeType: "总店",
  storeName: "holyes合力思（总店）",
  detailAddress: "",
  address: "",
  licenseExpire: "",
  supplyChain: "",
  supplierEnabled: false,
  remark: "",
  enabled: true,
  reportStatus: "",
  alias: "",
  aliasInitial: "",
  tel: "",
  wechat: "",
  qq: "",
  creditCode: "",
  shipCode: "",
  bankHolder: "",
  bankBranch: "",
  bankAccount: "",
  businessLicenseImage: "",
  businessLicenseExpire: "",
  deviceLicenseImage: "",
  deviceLicenseNo: "",
  deviceLicenseIssueDate: "",
  deviceLicenseIssuer: "",
  deviceLicenseStart: ""
})

const brandOptions = ref<string[]>([])
const brandSelectOptions = computed(() => [...new Set([...brandOptions.value, ...form.brands])])

const loadBrands = async () => {
  const res = await getBrandPageAPI({ enabled: "1", page: 1, pageSize: 1000 })
  brandOptions.value = res.data.list.map((item) => item.name)
}

const regionKey = ref("")
const aliasInitialManual = ref(false)
const medicalSectionRef = ref<HTMLElement>()

const toInitials = (value: string) =>
  pinyin(value.trim(), { pattern: "first", toneType: "none", type: "string", separator: "", nonZh: "consecutive" })
    .replace(/\s+/g, "")
    .toUpperCase()

const regionOptions = computed(() => {
  if (!regionKey.value || supplierRegions.some((item) => item.value === regionKey.value)) return supplierRegions
  const [province = "", city = "", district = ""] = regionKey.value.split("|")
  const current: SupplierRegion = {
    label: `${city || province}${district}`,
    value: regionKey.value,
    province,
    city,
    district
  }
  return [current, ...supplierRegions]
})

const filterRegion = (input: string, option?: { label?: string }) =>
  String(option?.label ?? "").toLowerCase().includes(input.trim().toLowerCase())

const syncAddress = () => {
  form.address = [form.province, form.city, form.district, form.detailAddress].filter(Boolean).join("")
}

const makeShipCode = () => {
  const city = form.city.replace(/市$/, "")
  const district = form.district.replace(/区$|县$|市$/, "")
  return toInitials(`${city}${district}`) || toInitials(form.province)
}

const onRegionChange = (value?: string) => {
  const found = regionOptions.value.find((item) => item.value === value)
  form.province = found?.province ?? ""
  form.city = found?.city ?? ""
  form.district = found?.district ?? ""
  form.shipCode = value ? makeShipCode() : ""
  syncAddress()
}

const asDate = (value: string | string[]) => (Array.isArray(value) ? value[0] : value) || ""

const readImage = (file: File, key: "businessLicenseImage" | "deviceLicenseImage") => {
  if (!file.type.startsWith("image/")) {
    message.warning("请上传图片")
    return false
  }
  if (file.size > 2 * 1024 * 1024) {
    message.warning("图片不能超过 2MB")
    return false
  }
  const reader = new FileReader()
  reader.onload = () => {
    form[key] = String(reader.result || "")
  }
  reader.readAsDataURL(file)
  return false
}

watch(
  () => form.alias,
  (value) => {
    if (aliasInitialManual.value) return
    form.aliasInitial = toInitials(value)
  }
)

watch(() => form.detailAddress, syncAddress)

const fillForm = (record?: Supplier) => {
  Object.assign(form, {
    name: record?.name ?? "",
    contact: record?.contact ?? "",
    phone: record?.phone ?? "",
    categories: record?.categories ? [...record.categories] : [],
    brands: record?.brands ? [...record.brands] : [],
    isDefault: record?.isDefault ?? false,
    franchiseStore: record?.franchiseStore ?? "",
    sort: record?.sort ?? 0,
    scope: record?.scope ?? "",
    province: record?.province ?? "",
    city: record?.city ?? "",
    district: record?.district ?? "",
    storeType: record?.storeType || "总店",
    storeName: record?.storeName || "holyes合力思（总店）",
    detailAddress: record?.detailAddress ?? "",
    address: record?.address ?? "",
    licenseExpire: record?.licenseExpire ?? "",
    supplyChain: record?.supplyChain ?? "",
    supplierEnabled: record?.supplierEnabled ?? false,
    remark: record?.remark ?? "",
    enabled: record?.enabled ?? true,
    reportStatus: record?.reportStatus ?? "",
    alias: record?.alias ?? "",
    aliasInitial: record?.aliasInitial ?? "",
    tel: record?.tel ?? "",
    wechat: record?.wechat ?? "",
    qq: record?.qq ?? "",
    creditCode: record?.creditCode ?? "",
    shipCode: record?.shipCode ?? "",
    bankHolder: record?.bankHolder ?? "",
    bankBranch: record?.bankBranch ?? "",
    bankAccount: record?.bankAccount ?? "",
    businessLicenseImage: record?.businessLicenseImage ?? "",
    businessLicenseExpire: record?.businessLicenseExpire ?? "",
    deviceLicenseImage: record?.deviceLicenseImage ?? "",
    deviceLicenseNo: record?.deviceLicenseNo ?? "",
    deviceLicenseIssueDate: record?.deviceLicenseIssueDate ?? "",
    deviceLicenseIssuer: record?.deviceLicenseIssuer ?? "",
    deviceLicenseStart: record?.deviceLicenseStart ?? ""
  })
  regionKey.value = record?.city || record?.district ? `${record.province}|${record.city}|${record.district}` : ""
  if ((form.city || form.district) && !form.shipCode) form.shipCode = makeShipCode()
  aliasInitialManual.value = Boolean(record?.aliasInitial)
}

const openEdit = (record: Supplier) => {
  editingId.value = record.id
  fillForm(record)
  modalOpen.value = true
}

const medicalDeviceRequired = computed(() => form.categories.includes("医疗器械"))

watch(medicalDeviceRequired, (value) => {
  if (!value || !modalOpen.value) return
  nextTick(() => medicalSectionRef.value?.scrollIntoView({ block: "nearest" }))
})

const openCreate = () => {
  editingId.value = undefined
  fillForm()
  modalOpen.value = true
}

const onSave = async () => {
  const name = form.name.trim()
  const contact = form.contact.trim()
  const phone = form.phone.trim()
  if (!name) {
    message.warning("请填写供应商名称")
    return
  }
  if (!contact) {
    message.warning("请填写联系人")
    return
  }
  if (!phone) {
    message.warning("请填写联系电话")
    return
  }
  if (medicalDeviceRequired.value) {
    if (!form.creditCode.trim()) {
      message.warning("供应品类包含医疗器械时，请填写统一社会信用代号")
      return
    }
    if (!form.city || !form.shipCode.trim()) {
      message.warning("供应品类包含医疗器械时，请选择城市")
      return
    }
    if (!form.detailAddress.trim()) {
      message.warning("供应品类包含医疗器械时，请填写详细地址")
      return
    }
  }
  const alias = form.alias.trim() || name
  const aliasInitial = form.aliasInitial.trim() || toInitials(alias)
  saving.value = true
  try {
    await saveSupplierAPI({
      id: editingId.value,
      ...form,
      name,
      contact,
      phone,
      alias,
      aliasInitial,
      categories: [...form.categories],
      brands: [...form.brands],
      sort: Number(form.sort) || 0
    })
    message.success(editingId.value ? "已保存" : "已新增")
    if (detailRecord.value && detailRecord.value.id === editingId.value) {
      Object.assign(detailRecord.value, {
        ...form,
        name,
        contact,
        phone,
        alias,
        aliasInitial,
        categories: [...form.categories],
        brands: [...form.brands]
      })
    }
    modalOpen.value = false
    loadData()
  } finally {
    saving.value = false
  }
}

const drawerOpen = ref(false)
const detailRecord = ref<Supplier>()
const detailFocus = ref<"info" | "bills">("info")
const bills = ref<SupplierBill[]>([])
const billsLoading = ref(false)
const drawerTitle = computed(() => {
  if (!detailRecord.value) return ""
  return detailFocus.value === "info" ? `${detailRecord.value.name} 详情` : `${detailRecord.value.name} 往来单据`
})

const onMoreAction = (record: Supplier, action: string) => {
  moreOpenId.value = ""
  if (action === "往来单据") openDetail(record, "bills")
}

const onAskDelete = (record: Supplier) => {
  moreOpenId.value = ""
  nextTick(() => {
    Modal.confirm({
      title: `确认删除供应商「${record.name}」？`,
      content: "删除后不可恢复",
      okText: "删除",
      cancelText: "取消",
      okType: "danger",
      onOk: () => onDelete(record)
    })
  })
}

const openDetail = async (record: Supplier, focus: "info" | "bills") => {
  detailRecord.value = { ...record, categories: [...record.categories], brands: [...(record.brands ?? [])] }
  detailFocus.value = focus
  drawerOpen.value = true
  if (focus !== "bills") return
  billsLoading.value = true
  bills.value = []
  try {
    const res = await getSupplierBillsAPI(record.id)
    bills.value = res.data
  } finally {
    billsLoading.value = false
  }
}

const onDelete = async (record: Supplier) => {
  await deleteSupplierAPI(record.id)
  message.success("已删除")
  loadData()
}

const exporting = ref(false)
const fileRef = ref<HTMLInputElement>()

const onExport = async () => {
  exporting.value = true
  try {
    const res = await getSupplierPageAPI({ ...query, page: 1, pageSize: 100000 })
    const blob = new Blob([suppliersToCsv(res.data.list)], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "供应商资料.csv"
    link.click()
    URL.revokeObjectURL(url)
    message.success(`已导出 ${res.data.list.length} 条供应商资料`)
  } finally {
    exporting.value = false
  }
}

const onImportPick = () => fileRef.value?.click()

const onDownloadTemplate = () => {
  const blob = new Blob([suppliersToCsv([])], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = "供应商资料导入模版.csv"
  link.click()
  URL.revokeObjectURL(url)
}

const onImportFile = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ""
  if (!file) return
  const parsed = parseSupplierCsv(await file.text())
  if (parsed.error) {
    message.error(parsed.error)
    return
  }
  const count = await importSuppliersAPI(parsed.rows)
  message.success(`已导入 ${count.data} 条供应商资料`)
  loadData()
}

onMounted(() => {
  loadData()
  loadBrands()
})
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <a-form layout="inline">
        <a-form-item>
          <a-space :size="12" align="center">
            <a-button type="primary" @click="openCreate"><PlusOutlined /> 新增供应商</a-button>
            </a-space>
        </a-form-item>
        <a-form-item>
          <a-input
            v-model:value="query.keyword"
            allow-clear
            placeholder="请输入供应商名称或供应商别名"
            style="width: 280px"
            @press-enter="onSearch"
          />
        </a-form-item>
        <a-form-item label="启用状态">
          <a-select v-model:value="query.enabled" style="width: 120px">
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
        <a-popover trigger="hover" placement="left" overlay-class-name="import-template-popover">
          <template #content>
            <p class="template-tip">
              逐个输入累了吧？试试
              <button type="button" class="template-link" @click="onDownloadTemplate">下载供应商模版</button>
              ，进行批量导入
            </p>
          </template>
          <a-button @click="onImportPick"><UploadOutlined /> 导入供应商资料</a-button>
        </a-popover>
        <a-button :loading="exporting" @click="onExport"><DownloadOutlined /> 导出供应商资料</a-button>
        <ColumnSetting v-model="columns" :storage-key="storageKey" />
        <input ref="fileRef" type="file" accept=".csv,text/csv" hidden @change="onImportFile" />
      </div>
    </div>

    <a-table
      class="supplier-table"
      row-key="id"
      size="small"
      :columns="[{ key: 'drag', dataIndex: 'drag', title: '', width: 42, fixed: 'left' }, ...tableColumns]"
      :data-source="dataSource"
      :loading="loading"
      :pagination="{
        pageSize: 50,
        showSizeChanger: true,
        showQuickJumper: true,
        pageSizeOptions: tablePageSizeOptions,
        showTotal: tableShowTotal
      }"
      :scroll="{ x: scrollX + 42 }"
      :custom-row="customRow"
    >
      <template #bodyCell="{ column, record, text }">
        <template v-if="column.dataIndex === 'drag'">
          <span
            class="drag-handle"
            draggable="true"
            role="button"
            aria-label="拖动排序"
            title="拖动排序"
            @dragstart="onDragStart(record as Supplier, $event)"
            @dragend="onDragEnd"
          >
            <HolderOutlined />
          </span>
        </template>
        <template v-else-if="column.dataIndex === 'categories'">
          <a-space v-if="record.categories.length" :size="4" wrap>
            <a-tag v-for="item in record.categories" :key="item" :color="categoryColors[item as SupplierCategory]">{{ item }}</a-tag>
          </a-space>
          <span v-else>-</span>
        </template>
        <template v-else-if="column.dataIndex === 'brands'">
          <a-space v-if="record.brands?.length" :size="4" wrap>
            <a-tag v-for="item in record.brands" :key="item">{{ item }}</a-tag>
          </a-space>
          <span v-else>-</span>
        </template>
        <template v-else-if="column.dataIndex === 'enabled' || column.dataIndex === 'supplierEnabled'">
          <a-tag :color="text ? 'success' : 'error'">{{ text ? "启用" : "禁用" }}</a-tag>
        </template>
        <template v-else-if="column.dataIndex === 'isDefault'">{{ record.isDefault ? "是" : "否" }}</template>
        <template v-else-if="column.dataIndex === 'action'">
          <a-space :size="0">
            <a-button type="link" size="small" @click="openDetail(record as Supplier, 'info')">详情</a-button>
            <a-button type="link" size="small" @click="openEdit(record as Supplier)">编辑</a-button>
            <a-popover
              :open="moreOpenId === record.id"
              trigger="click"
              placement="bottomRight"
              overlay-class-name="supplier-more-popover"
              @openChange="(open: boolean) => (moreOpenId = open ? (record as Supplier).id : '')"
            >
              <template #content>
                <div class="supplier-more-actions">
                  <button
                    v-for="item in moreActions"
                    :key="item"
                    type="button"
                    class="more-item"
                    @click="onMoreAction(record as Supplier, item)"
                  >
                    {{ item }}
                  </button>
                  <button type="button" class="more-item more-item-danger" @click="onAskDelete(record as Supplier)">删除</button>
                </div>
              </template>
              <a-button type="link" size="small">更多</a-button>
            </a-popover>
          </a-space>
        </template>
        <template v-else>{{ textOf(text) }}</template>
      </template>
    </a-table>

    <a-drawer v-model:open="drawerOpen" :title="drawerTitle" placement="right" :width="720">
      <div v-if="detailRecord && detailFocus === 'info'" class="detail-body">
        <div class="section-title">基本信息</div>
        <a-descriptions size="small" :column="2" bordered>
          <a-descriptions-item label="供应商名称">{{ textOf(detailRecord.name) }}</a-descriptions-item>
          <a-descriptions-item label="联系人">{{ textOf(detailRecord.contact) }}</a-descriptions-item>
          <a-descriptions-item label="联系电话">{{ textOf(detailRecord.phone) }}</a-descriptions-item>
          <a-descriptions-item label="供应商别名">{{ textOf(detailRecord.alias) }}</a-descriptions-item>
          <a-descriptions-item label="别名拼音首字母">{{ textOf(detailRecord.aliasInitial) }}</a-descriptions-item>
          <a-descriptions-item label="固定电话">{{ textOf(detailRecord.tel) }}</a-descriptions-item>
          <a-descriptions-item label="微信">{{ textOf(detailRecord.wechat) }}</a-descriptions-item>
          <a-descriptions-item label="QQ号">{{ textOf(detailRecord.qq) }}</a-descriptions-item>
          <a-descriptions-item label="是否启用">
            <a-tag :color="detailRecord.enabled ? 'success' : 'error'">{{ detailRecord.enabled ? "启用" : "禁用" }}</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="经营范围" :span="2">{{ textOf(detailRecord.scope) }}</a-descriptions-item>
          <a-descriptions-item label="供应品类" :span="2">
            <a-space v-if="detailRecord.categories.length" :size="4" wrap>
              <a-tag v-for="item in detailRecord.categories" :key="item" :color="categoryColors[item]">{{ item }}</a-tag>
            </a-space>
            <span v-else>-</span>
          </a-descriptions-item>
          <a-descriptions-item label="供应品牌" :span="2">
            <a-space v-if="detailRecord.brands?.length" :size="4" wrap>
              <a-tag v-for="item in detailRecord.brands" :key="item">{{ item }}</a-tag>
            </a-space>
            <span v-else>-</span>
          </a-descriptions-item>
          <a-descriptions-item label="是否默认供应商">{{ detailRecord.isDefault ? "是" : "否" }}</a-descriptions-item>
          <a-descriptions-item label="绑定加盟批发门店">{{ textOf(detailRecord.franchiseStore) }}</a-descriptions-item>
          <a-descriptions-item label="归属门店">{{ textOf(detailRecord.storeName) }}</a-descriptions-item>
          <a-descriptions-item label="上报状态">{{ textOf(detailRecord.reportStatus) }}</a-descriptions-item>
          <a-descriptions-item label="备注" :span="2">{{ textOf(detailRecord.remark) }}</a-descriptions-item>
        </a-descriptions>
        <div class="section-title">银行资料</div>
        <a-descriptions size="small" :column="2" bordered>
          <a-descriptions-item label="银行户名">{{ textOf(detailRecord.bankHolder) }}</a-descriptions-item>
          <a-descriptions-item label="开户行">{{ textOf(detailRecord.bankBranch) }}</a-descriptions-item>
          <a-descriptions-item label="银行账号" :span="2">{{ textOf(detailRecord.bankAccount) }}</a-descriptions-item>
        </a-descriptions>
        <template v-if="detailRecord.categories.includes('医疗器械')">
        <div class="section-title">医疗器械追溯</div>
        <a-descriptions size="small" :column="2" bordered>
          <a-descriptions-item label="统一社会信用代号">{{ textOf(detailRecord.creditCode) }}</a-descriptions-item>
          <a-descriptions-item label="发货地址编号">{{ textOf(detailRecord.shipCode) }}</a-descriptions-item>
          <a-descriptions-item label="城市">{{ textOf([detailRecord.city, detailRecord.district].filter(Boolean).join("")) }}</a-descriptions-item>
          <a-descriptions-item label="详细地址">{{ textOf(detailRecord.detailAddress) }}</a-descriptions-item>
        </a-descriptions>
        <div class="section-title">营业执照</div>
        <a-descriptions size="small" :column="2" bordered>
          <a-descriptions-item label="营业执照">
            <img v-if="detailRecord.businessLicenseImage" class="license-thumb" :src="detailRecord.businessLicenseImage" alt="营业执照" />
            <span v-else>-</span>
          </a-descriptions-item>
          <a-descriptions-item label="营业执照过期时间">{{ textOf(detailRecord.businessLicenseExpire) }}</a-descriptions-item>
          <a-descriptions-item label="医疗器械经营许可证">
            <img v-if="detailRecord.deviceLicenseImage" class="license-thumb" :src="detailRecord.deviceLicenseImage" alt="医疗器械经营许可证" />
            <span v-else>-</span>
          </a-descriptions-item>
          <a-descriptions-item label="许可证过期时间">{{ textOf(detailRecord.licenseExpire) }}</a-descriptions-item>
          <a-descriptions-item label="许可证号" :span="2">{{ textOf(detailRecord.deviceLicenseNo) }}</a-descriptions-item>
          <a-descriptions-item label="签发日期">{{ textOf(detailRecord.deviceLicenseIssueDate) }}</a-descriptions-item>
          <a-descriptions-item label="签发机构">{{ textOf(detailRecord.deviceLicenseIssuer) }}</a-descriptions-item>
          <a-descriptions-item label="有效期开始时间" :span="2">{{ textOf(detailRecord.deviceLicenseStart) }}</a-descriptions-item>
        </a-descriptions>
        </template>
      </div>
      <a-table
        v-else-if="detailRecord"
        row-key="id"
        size="small"
        :loading="billsLoading"
        :data-source="bills"
        :pagination="false"
        :columns="[
          { title: '单据类型', dataIndex: 'type', width: 120 },
          { title: '单据编号', dataIndex: 'billNo', width: 140 },
          { title: '单据日期', dataIndex: 'date', width: 120 },
          { title: '金额', dataIndex: 'amount', width: 120 },
          { title: '状态', dataIndex: 'status', width: 100 }
        ]"
      >
        <template #bodyCell="{ column, text }">
          <template v-if="column.dataIndex === 'amount'">{{ Number(text).toFixed(2) }}</template>
          <template v-else-if="column.dataIndex === 'status'">
            <a-tag :color="text === '已完成' ? 'success' : 'warning'">{{ text }}</a-tag>
          </template>
          <template v-else>{{ text }}</template>
        </template>
      </a-table>
    </a-drawer>

    <a-modal
      v-model:open="modalOpen"
      :title="editingId ? '编辑 供应商资料' : '新增 供应商资料'"
      :confirm-loading="saving"
      :width="1040"
      centered
      ok-text="保存"
      cancel-text="取消"
      @ok="onSave"
    >
      <div class="supplier-form">
        <section class="license-card form-block">
          <div class="license-card-title">基本信息</div>
          <div class="grid-4">
          <div class="field">
            <label class="req">供应商名称</label>
            <a-input v-model:value="form.name" :maxlength="40" />
          </div>
          <div class="field">
            <label class="req">联系人</label>
            <a-input v-model:value="form.contact" :maxlength="20" />
          </div>
          <div class="field">
            <label class="req">联系电话</label>
            <a-input v-model:value="form.phone" :maxlength="20" />
          </div>
          <div class="field">
            <label>是否启用</label>
            <a-radio-group v-model:value="form.enabled">
              <a-radio :value="true">启用</a-radio>
              <a-radio :value="false">禁用</a-radio>
            </a-radio-group>
          </div>
          <div class="field">
            <label>供应商别名</label>
            <a-input v-model:value="form.alias" :maxlength="40" placeholder="若不填，则默认为 供应商名称" />
          </div>
          <div class="field">
            <label>别名拼音首字母</label>
            <a-input
              v-model:value="form.aliasInitial"
              :maxlength="20"
              placeholder="默认为 别名 的拼音首字母"
              @input="aliasInitialManual = Boolean(form.aliasInitial)"
            />
          </div>
          <div class="field">
            <label>固定电话</label>
            <a-input v-model:value="form.tel" :maxlength="20" />
          </div>
          <div class="field">
            <label>微信</label>
            <a-input v-model:value="form.wechat" :maxlength="40" />
          </div>
          <div class="field">
            <label>QQ号</label>
            <a-input v-model:value="form.qq" :maxlength="20" />
          </div>
          <div class="field">
            <label>供应品类</label>
            <a-select v-model:value="form.categories" mode="multiple" allow-clear placeholder="请选择">
              <a-select-option v-for="item in supplierCategories" :key="item" :value="item">{{ item }}</a-select-option>
            </a-select>
          </div>
          <div class="field">
            <label>供应品牌</label>
            <a-select
              v-model:value="form.brands"
              mode="multiple"
              allow-clear
              show-search
              placeholder="请选择"
              :options="brandSelectOptions.map((item) => ({ label: item, value: item }))"
            />
          </div>
          <div class="field">
            <label>备注</label>
            <a-input v-model:value="form.remark" :maxlength="500" />
          </div>
          </div>
        </section>

        <section class="license-card form-block">
          <div class="license-card-title">银行资料</div>
          <div class="grid-4">
          <div class="field">
            <label>银行户名</label>
            <a-input v-model:value="form.bankHolder" :maxlength="40" placeholder="如 深圳市*****有限公司" />
          </div>
          <div class="field">
            <label>开户行</label>
            <a-input v-model:value="form.bankBranch" :maxlength="40" placeholder="如 中国建设银行XXX支行" />
          </div>
          <div class="field">
            <label>银行账号</label>
            <a-input v-model:value="form.bankAccount" :maxlength="30" />
          </div>
          </div>
        </section>

        <template v-if="medicalDeviceRequired">
        <section ref="medicalSectionRef" class="license-card form-block">
          <div class="license-card-title trace-heading">
            医疗器械追溯
            <span class="trace-tip">统一社会信用代号、发货地址编号、城市、详细地址为必填。</span>
          </div>
          <div class="grid-4">
          <div class="field">
            <label class="req">统一社会信用代号</label>
            <a-input v-model:value="form.creditCode" :maxlength="18" />
          </div>
          <div class="field">
            <label class="req">发货地址编号</label>
            <a-input v-model:value="form.shipCode" readonly placeholder="选城市后自动生成" />
          </div>
          <div class="field">
            <label class="req">城市</label>
            <a-select
              v-model:value="regionKey"
              show-search
              allow-clear
              :options="regionOptions"
              :filter-option="filterRegion"
              placeholder="可直接搜索 市或区"
              @change="(value: unknown) => onRegionChange(typeof value === 'string' ? value : undefined)"
            />
          </div>
          <div class="field">
            <label class="req">详细地址</label>
            <a-input v-model:value="form.detailAddress" :maxlength="120" />
          </div>
          </div>
        </section>

        <div class="license-cards">
          <section class="license-card">
            <div class="license-card-title"><IdcardOutlined /> 营业执照</div>
            <div class="license-card-body">
              <a-upload :show-upload-list="false" accept="image/*" :before-upload="(file: File) => readImage(file, 'businessLicenseImage')">
                <div class="uploader">
                  <img v-if="form.businessLicenseImage" :src="form.businessLicenseImage" alt="营业执照" />
                  <template v-else>
                    <CloudUploadOutlined />
                    <span>上传图片</span>
                  </template>
                </div>
              </a-upload>
              <div class="license-card-fields">
                <div class="field">
                  <label>营业执照过期时间</label>
                  <a-date-picker
                    :value="form.businessLicenseExpire || undefined"
                    value-format="YYYY-MM-DD"
                    placeholder="请选择日期"
                    @change="(_date: unknown, dateString: string | string[]) => (form.businessLicenseExpire = asDate(dateString))"
                  />
                </div>
                <div class="field">
                  <label>营业执照号</label>
                  <a-input v-model:value="form.creditCode" :maxlength="18" placeholder="请输入营业执照号" />
                </div>
              </div>
            </div>
            <div class="field license-scope">
              <label>经营范围</label>
              <a-input v-model:value="form.scope" :maxlength="1000" />
            </div>
          </section>
          <section class="license-card">
            <div class="license-card-title"><SafetyCertificateOutlined /> 医疗器械经营许可证</div>
            <div class="license-card-body">
              <a-upload :show-upload-list="false" accept="image/*" :before-upload="(file: File) => readImage(file, 'deviceLicenseImage')">
                <div class="uploader">
                  <img v-if="form.deviceLicenseImage" :src="form.deviceLicenseImage" alt="医疗器械经营许可证" />
                  <template v-else>
                    <CloudUploadOutlined />
                    <span>上传图片</span>
                  </template>
                </div>
              </a-upload>
              <div class="license-card-fields">
                <div class="field">
                  <label>签发机构</label>
                  <a-input v-model:value="form.deviceLicenseIssuer" :maxlength="40" placeholder="请输入签发机构" />
                </div>
                <div class="field">
                  <label>医疗器械经营许可证号</label>
                  <a-input v-model:value="form.deviceLicenseNo" :maxlength="40" placeholder="请输入许可证号" />
                </div>
              </div>
            </div>
            <div class="license-card-foot">
              <div class="field">
                <label>签发日期</label>
                <a-date-picker
                  :value="form.deviceLicenseIssueDate || undefined"
                  value-format="YYYY-MM-DD"
                  placeholder="请选择日期"
                  @change="(_date: unknown, dateString: string | string[]) => (form.deviceLicenseIssueDate = asDate(dateString))"
                />
              </div>
              <div class="field">
                <label>过期时间</label>
                <a-date-picker
                  :value="form.licenseExpire || undefined"
                  value-format="YYYY-MM-DD"
                  placeholder="请选择日期"
                  @change="(_date: unknown, dateString: string | string[]) => (form.licenseExpire = asDate(dateString))"
                />
              </div>
              <div class="field">
                <label>生效日期</label>
                <a-date-picker
                  :value="form.deviceLicenseStart || undefined"
                  value-format="YYYY-MM-DD"
                  placeholder="请选择日期"
                  @change="(_date: unknown, dateString: string | string[]) => (form.deviceLicenseStart = asDate(dateString))"
                />
              </div>
            </div>
          </section>
        </div>
        </template>
      </div>
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

.supplier-help {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  border: 0;
  background: transparent;
  color: rgba(0, 0, 0, 0.88);
  font-size: 14px;
  line-height: 22px;
  cursor: pointer;
}

.supplier-help :deep(.anticon) {
  color: #faad14;
}

.supplier-help-body {
  width: 720px;
  color: rgba(0, 0, 0, 0.88);
  font-size: 13px;
  line-height: 22px;
}

.supplier-help-body p {
  margin: 0 0 6px;
}

.supplier-help-body .help-label {
  font-weight: 600;
}

.supplier-help-body .help-em {
  color: #02bfa1;
  font-weight: 600;
}

.template-tip {
  max-width: 360px;
  margin: 0;
  color: rgba(0, 0, 0, 0.88);
  font-size: 13px;
  line-height: 22px;
}

.template-link {
  padding: 0;
  border: 0;
  background: transparent;
  color: #02bfa1;
  font-size: inherit;
  line-height: inherit;
  cursor: pointer;
}

.template-link:hover {
  color: #018a74;
}

.drag-handle {
  display: inline-flex;
  color: #8aa19d;
  cursor: grab;
}

.drag-handle:active {
  cursor: grabbing;
}

.supplier-table :deep(tr.row-dragging) {
  opacity: 0.45;
}

.supplier-table :deep(tr.row-drag-over > td) {
  background: #e7f6f2 !important;
}

.supplier-form {
  max-height: calc(100vh - 240px);
  padding-right: 4px;
  overflow: auto;
}

.supplier-form .section-title {
  display: block;
  margin: 18px 0 12px;
  color: rgba(0, 0, 0, 0.88);
  font-size: 14px;
  font-weight: 600;
  line-height: 22px;
}

.supplier-form .section-title::before,
.supplier-form .section-title::after {
  content: none;
}

.supplier-form .trace-heading {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.trace-tip {
  color: #f04438;
  font-size: 12px;
  font-weight: 400;
  line-height: 20px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 18px 0 14px;
  color: #02bfa1;
  font-weight: 600;
}

.section-title::before,
.section-title::after {
  content: "";
  flex: 1;
  height: 1px;
  background: #8fd9cc;
}

.grid-2,
.grid-4 {
  display: grid;
  gap: 14px 18px;
}

.grid-2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.grid-4 {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.license-card-title :deep(.anticon) {
  color: #3b82c4;
}

.license-cards {
  display: grid;
  grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
  gap: 12px;
  margin-top: 12px;
}

.license-card {
  min-width: 0;
  padding: 12px;
  border: 1px solid #d7e6f2;
  border-radius: 8px;
  background: #f4f8fb;
}

.form-block + .form-block {
  margin-top: 12px;
}

.form-block .license-card-title.trace-heading {
  align-items: baseline;
  font-size: 14px;
}

.license-card-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
  color: rgba(0, 0, 0, 0.88);
  font-weight: 600;
  line-height: 22px;
}

.license-card-body {
  display: flex;
  gap: 12px;
  align-items: stretch;
}

.license-card-body :deep(.ant-upload) {
  flex: none;
  align-self: stretch;
}

.license-card-fields {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.license-card-foot {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px 12px;
  margin-top: 12px;
}

.license-scope {
  margin-top: 12px;
}

.switch-row {
  margin-bottom: 14px;
}

.switch-row .field :deep(.ant-radio-group) {
  align-items: center;
  min-height: 32px;
}

.field {
  min-width: 0;
}

.field label {
  display: block;
  margin-bottom: 6px;
  color: rgba(0, 0, 0, 0.88);
  line-height: 20px;
}

.field :deep(.ant-input[readonly]) {
  background: #f3f7f6;
  color: #5e7370;
}

.field :deep(.ant-select),
.field :deep(.ant-picker),
.field :deep(.ant-input-number) {
  width: 100%;
}

.field :deep(.ant-radio-group) {
  display: flex;
  flex-wrap: nowrap;
  gap: 8px 16px;
}

.field :deep(.ant-radio-wrapper) {
  display: inline-flex;
  margin-inline-end: 0;
}

.with-tip {
  display: flex;
  align-items: center;
  gap: 4px;
}

.tip-icon {
  color: #faad14;
  font-size: 14px;
  cursor: help;
}

.field label.req::before {
  margin-right: 4px;
  color: #f04438;
  content: "*";
}

.field label.trace {
  color: #f04438;
}

.span-2 {
  grid-column: span 2;
}

.span-4 {
  grid-column: span 4;
}

.uploader {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 118px;
  height: 100%;
  min-height: 132px;
  overflow: hidden;
  border: 1px dashed #c5d7e8;
  border-radius: 8px;
  background: #fff;
  color: rgba(0, 0, 0, 0.45);
  cursor: pointer;
}

.uploader:hover {
  border-color: #02bfa1;
  color: #02bfa1;
}

.uploader img,
.license-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.license-thumb {
  width: 72px;
  height: 72px;
  border-radius: 4px;
}

.detail-body {
  padding-bottom: 8px;
}

.supplier-more-actions {
  display: flex;
  flex-direction: column;
  min-width: 112px;
  margin: -4px -8px;
}

.more-item {
  padding: 6px 12px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: rgba(0, 0, 0, 0.88);
  font-size: 14px;
  line-height: 22px;
  text-align: left;
  cursor: pointer;
}

.more-item:hover {
  background: #f3f7f6;
}

.more-item-danger {
  margin-top: 4px;
  border-top: 1px solid #f0f0f0;
  border-radius: 0 0 4px 4px;
  color: #f04438;
}

.more-item-danger:hover {
  background: #fff1f0;
}
</style>
