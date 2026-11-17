<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from "vue"
import {
  AlignCenterOutlined,
  AlignLeftOutlined,
  AlignRightOutlined,
  BoldOutlined,
  CloudUploadOutlined,
  CodeOutlined,
  FontColorsOutlined,
  HighlightOutlined,
  ItalicOutlined,
  LinkOutlined,
  OrderedListOutlined,
  PictureOutlined,
  QuestionCircleOutlined,
  RedoOutlined,
  SaveOutlined,
  StrikethroughOutlined,
  TableOutlined,
  UnderlineOutlined,
  UndoOutlined,
  UnorderedListOutlined
} from "@ant-design/icons-vue"
import { message } from "ant-design-vue"
import { pinyin } from "pinyin-pro"
import { getBrandPageAPI, type Brand } from "@/api/brand"
import type { ProductSaveInput } from "@/api/product"
import {
  DEGREE_SIGN_OPTIONS,
  LOCS,
  PRODUCT_CAT_CHILDREN,
  SUPPLIERS,
  supplierOptions,
  createCatOfTree,
  formatDegree,
  lensWarnAxes,
  treeKeyOfRow,
  type DegreeSignPair,
  type LensStockWarnItem,
  type PowerRangeItem,
  type ProductRow
} from "./productUi"

const props = defineProps<{
  seed: ProductRow | null
  editing: boolean
  saving: boolean
  viewOnly?: boolean
  defaultType: string
  defaultBrand: string
  defaultSeries: string
}>()

const emit = defineEmits<{
  close: []
  save: [input: ProductSaveInput, sync: boolean]
}>()

type DictName = "series" | "material" | "style" | "attr" | "unit" | "frameType"
type ImageKind = "images" | "designImages"

type FormModel = {
  typeKey: string
  brand: string
  series: string
  enabled: boolean
  model: string
  spec: string
  index: string
  coating: string
  polarized: string
  degree: string
  focalType: string
  addPower: string
  channel: string
  clType: string
  clExpireDate: string
  axis: string
  shelfLifeYears: string
  waterContent: string
  dia: string
  baseCurve: string
  centerThickness: string
  packSpec: string
  clMaterial: string
  udiCode: string
  warnDays: string
  diCode: string
  packageLevel: string
  regCertNo: string
  regCertExpire: string
  registrant: string
  filer: string
  manufacturer: string
  creditCode: string
  produceLicense: string
  filingNo: string
  origin: string
  produceLicenseExpire: string
  sku: string
  year: string
  yearFlag: boolean
  name: string
  stockLoc: string
  externalCode: string
  supplierPrice: string
  homeProcess: boolean
  settleLoc: string
  material: string
  style: string
  attr: string
  unit: string
  gauge: string
  size: string
  supplierModel: string
  supplierColor: string
  barcode: string
  specialPrice: boolean
  customMade: boolean
  isGift: boolean
  frameType: string
  detail: string
  purchasePrice: number | undefined
  wholesalePrice: number | undefined
  price: number | undefined
  employeePrice: number | undefined
  maxStock: number | undefined
  minStock: number | undefined
  images: string[]
  designImages: string[]
  powerRanges: PowerRangeItem[]
  lensStockWarn: LensStockWarnItem[]
}

const DICT_KEY = "sg-product-field-dicts"
const INDEX_OPTIONS = ["1.56", "1.60", "1.67", "1.71", "1.74"].map((v) => ({ label: v, value: v }))
const CL_TYPE_OPTIONS = ["日抛", "月抛", "季抛", "半年抛", "年抛"].map((v) => ({ label: v, value: v }))
const FOCAL_OPTIONS = ["单光", "渐进", "双光"].map((v) => ({ label: v, value: v }))
const ADD_POWER_OPTIONS = ["无", "+0.75", "+1.00", "+1.25", "+1.50", "+1.75", "+2.00", "+2.25", "+2.50", "+2.75", "+3.00"].map((v) => ({ label: v, value: v }))
const CHANNEL_OPTIONS = ["短通道", "标准通道", "长通道"].map((v) => ({ label: v, value: v }))
const COATING_OPTIONS = ["钻立方铂金膜", "钻晶膜", "莲花膜", "防蓝光膜", "加硬膜"].map((v) => ({ label: v, value: v }))

const DICT_LABEL: Record<DictName, string> = {
  series: "产品系列",
  material: "产品材质",
  style: "产品款式",
  attr: "产品标签",
  unit: "产品单位",
  frameType: "镜框类型"
}

const defaultDicts: Record<DictName, string[]> = {
  series: ["A+系列", "经典系列", "商务系列", "轻盈系列", "儿童系列", "青少年系列", "钛架系列", "飞行员系列", "俱乐部大师", "镜架系列"],
  material: ["TR90", "板材", "钛合金", "纯钛", "金属", "醋酸纤维"],
  style: ["商务", "休闲", "时尚", "运动", "复古", "儿童"],
  attr: ["热销", "新品", "团购", "学生", "联营", "医保"],
  unit: ["副", "片", "只", "盒", "瓶", "个", "套", "支"],
  frameType: ["全框", "半框", "无框", "眉线"]
}

function loadDicts() {
  const next = {
    series: defaultDicts.series.slice(),
    material: defaultDicts.material.slice(),
    style: defaultDicts.style.slice(),
    attr: defaultDicts.attr.slice(),
    unit: defaultDicts.unit.slice(),
    frameType: defaultDicts.frameType.slice()
  }
  try {
    const raw = JSON.parse(localStorage.getItem(DICT_KEY) || "{}") as Partial<Record<DictName, string[]>>
    ;(Object.keys(next) as DictName[]).forEach((key) => {
      const list = raw[key]
      if (Array.isArray(list) && list.length) next[key] = list.map((item) => String(item)).filter(Boolean)
    })
  } catch {
    /* 使用默认字典 */
  }
  return next
}

const dicts = reactive(loadDicts())
const editorTab = ref("base")
watch(() => props.seed, () => { editorTab.value = "base" })
const warnSign = ref<DegreeSignPair>("-/-")
const warnMaxFill = ref<number | null>(null)
const warnMinFill = ref<number | null>(null)
const warnPaintKind = ref<"max" | "min">("max")
const LENS_EDITOR_TABS = new Set(["power", "degree"])
const richFull = ref(false)
const detailRef = ref<HTMLDivElement | null>(null)
const fileRef = ref<HTMLInputElement | null>(null)
const fileKind = ref<ImageKind>("images")
const brands = ref<Brand[]>([])
const dictOpen = ref(false)
const dictName = ref<DictName>("series")
const dictDraft = ref<string[]>([])
const dictInput = ref("")


function blankPowerRange(): PowerRangeItem {
  return {
    sphMin: undefined,
    sphMax: undefined,
    cylMin: undefined,
    cylMax: undefined,
    combinedPower: undefined,
    purchasePrice: undefined,
    retailPrice: undefined,
    wholesalePrice: undefined,
    employeePrice: undefined,
  }
}

function normalizePowerRanges(list?: PowerRangeItem[] | null): PowerRangeItem[] {
  if (!Array.isArray(list) || !list.length) return [blankPowerRange()]
  return list.map((row) => ({
    sphMin: row.sphMin == null || (row.sphMin as unknown) === "" ? undefined : Number(row.sphMin),
    sphMax: row.sphMax == null || (row.sphMax as unknown) === "" ? undefined : Number(row.sphMax),
    cylMin: row.cylMin == null || (row.cylMin as unknown) === "" ? undefined : Number(row.cylMin),
    cylMax: row.cylMax == null || (row.cylMax as unknown) === "" ? undefined : Number(row.cylMax),
    combinedPower: (row as any).combinedPower == null || (row as any).combinedPower === "" ? undefined : Number((row as any).combinedPower),
    purchasePrice: row.purchasePrice == null || (row.purchasePrice as unknown) === "" ? undefined : Number(row.purchasePrice),
    retailPrice: row.retailPrice == null || (row.retailPrice as unknown) === "" ? undefined : Number(row.retailPrice),
    wholesalePrice: row.wholesalePrice == null || (row.wholesalePrice as unknown) === "" ? undefined : Number(row.wholesalePrice),
    employeePrice: row.employeePrice == null || (row.employeePrice as unknown) === "" ? undefined : Number(row.employeePrice)
  }))
}

function addPowerRange() {
  if (props.viewOnly) return
  form.powerRanges.push(blankPowerRange())
}

function removePowerRange(index: number) {
  if (props.viewOnly) return
  if (form.powerRanges.length <= 1) {
    form.powerRanges.splice(0, 1, blankPowerRange())
    return
  }
  form.powerRanges.splice(index, 1)
}

function normalizeLensStockWarn(list?: LensStockWarnItem[] | null): LensStockWarnItem[] {
  if (!Array.isArray(list) || !list.length) return []
  return list.map((row) => ({
    sph: Number(row.sph),
    cyl: Number(row.cyl),
    max: row.max == null || (row.max as unknown) === "" ? null : Number(row.max),
    min: row.min == null || (row.min as unknown) === "" ? null : Number(row.min)
  })).filter((row) => Number.isFinite(row.sph) && Number.isFinite(row.cyl))
}

function lensWarnKey(sph: number | string, cyl: number | string) {
  return `${Number(sph).toFixed(2)}|${Number(cyl).toFixed(2)}`
}

function lensWarnAbsFromRanges(ranges: PowerRangeItem[]) {
  let sphAbs = 8
  let cylAbs = 6
  for (const row of ranges || []) {
    for (const v of [row.sphMin, row.sphMax]) {
      const n = Math.abs(Number(v))
      if (Number.isFinite(n)) sphAbs = Math.max(sphAbs, Math.ceil(n / 0.25) * 0.25)
    }
    for (const v of [row.cylMin, row.cylMax]) {
      const n = Math.abs(Number(v))
      if (Number.isFinite(n)) cylAbs = Math.max(cylAbs, Math.ceil(n / 0.25) * 0.25)
    }
  }
  return { sphAbs, cylAbs }
}

function upsertLensWarn(sph: number, cyl: number, patch: Partial<Pick<LensStockWarnItem, "max" | "min">>) {
  const key = lensWarnKey(sph, cyl)
  const idx = form.lensStockWarn.findIndex((row) => lensWarnKey(row.sph, row.cyl) === key)
  if (idx < 0) {
    form.lensStockWarn.push({
      sph: Number(Number(sph).toFixed(2)),
      cyl: Number(Number(cyl).toFixed(2)),
      max: patch.max === undefined ? null : patch.max,
      min: patch.min === undefined ? null : patch.min
    })
    return
  }
  const cur = form.lensStockWarn[idx]
  if (patch.max !== undefined) cur.max = patch.max
  if (patch.min !== undefined) cur.min = patch.min
  if (cur.max == null && cur.min == null) form.lensStockWarn.splice(idx, 1)
}

function lensWarnCellValue(sph: string, cyl: string, kind: "max" | "min") {
  const row = form.lensStockWarn.find((item) => lensWarnKey(item.sph, item.cyl) === lensWarnKey(sph, cyl))
  if (!row) return undefined
  const v = kind === "max" ? row.max : row.min
  return v == null ? undefined : v
}

function setLensWarnCell(sph: string, cyl: string, kind: "max" | "min", value: number | null) {
  upsertLensWarn(Number(sph), Number(cyl), { [kind]: value })
}



function paintLensWarnCell(sph: string, cyl: string) {
  if (warnPaintKind.value === "max") {
    if (warnMaxFill.value == null) {
      message.warning("请先填写最大库存数量")
      return
    }
    upsertLensWarn(Number(sph), Number(cyl), { max: warnMaxFill.value })
    return
  }
  if (warnMinFill.value == null) {
    message.warning("请先填写最小库存数量")
    return
  }
  upsertLensWarn(Number(sph), Number(cyl), { min: warnMinFill.value })
}
const yearOptions = Array.from({ length: 16 }, (_, index) => {
  const year = String(2018 + index)
  return { label: year, value: year }
})
const blockOptions = [
  { label: "正文", value: "p" },
  { label: "标题", value: "h3" },
  { label: "小标题", value: "h4" }
]
const blockValue = ref("p")

function clean(value?: string) {
  if (!value || value === "—") return ""
  return value
}

function inferType(row: ProductRow) {
  if (row.typeKey) return row.typeKey
  const key = treeKeyOfRow(row)
  return key === "all" ? "frame" : key
}

function blankForm(): FormModel {
  return {
    typeKey: props.defaultType || "frame",
    brand: props.defaultBrand || "",
    series: props.defaultSeries || "",
    enabled: true,
    model: "",
    spec: "",
    index: "",
    coating: "",
    polarized: "否",
    degree: "",
    focalType: "",
    addPower: "",
    channel: "",
    clType: "",
    clExpireDate: "",
    axis: "",
    shelfLifeYears: "",
    waterContent: "",
    dia: "",
    baseCurve: "",
    centerThickness: "",
    packSpec: "",
    clMaterial: "",
    udiCode: "",
    warnDays: "",
    diCode: "",
    packageLevel: "",
    regCertNo: "",
    regCertExpire: "",
    registrant: "",
    filer: "",
    manufacturer: "",
    creditCode: "",
    produceLicense: "",
    filingNo: "",
    origin: "",
    produceLicenseExpire: "",
    sku: "",
    year: "",
    yearFlag: false,
    name: "",
    stockLoc: "",
    externalCode: "",
    supplierPrice: "",
    homeProcess: false,
    settleLoc: "",
    material: "",
    style: "",
    attr: "",
    unit: "副",
    gauge: "",
    size: "",
    supplierModel: "",
    supplierColor: "",
    barcode: "",
    specialPrice: false,
    customMade: false,
    isGift: false,
    frameType: "",
    detail: "",
    purchasePrice: undefined,
    wholesalePrice: undefined,
    price: undefined,
    employeePrice: undefined,
    maxStock: undefined,
    minStock: undefined,
    images: [],
    designImages: [],
    powerRanges: [blankPowerRange()],
    lensStockWarn: []
  }
}

function fromSeed(row: ProductRow): FormModel {
  return {
    typeKey: inferType(row),
    brand: clean(row.brand),
    series: clean(row.series),
    enabled: row.enabled,
    model: clean(row.model),
    spec: clean(row.spec),
    index: clean(row.index),
    coating: clean(row.coating),
    polarized: clean(row.polarized),
    degree: clean(row.degree),
    focalType: clean(row.focalType),
    addPower: clean(row.addPower),
    channel: clean(row.channel),
    clType: clean(row.clType),
    clExpireDate: clean(row.clExpireDate),
    axis: clean(row.axis),
    shelfLifeYears: clean(row.shelfLifeYears),
    waterContent: clean(row.waterContent),
    dia: clean(row.dia),
    baseCurve: clean(row.baseCurve),
    centerThickness: clean(row.centerThickness),
    packSpec: clean(row.packSpec),
    clMaterial: clean(row.clMaterial),
    udiCode: clean(row.udiCode),
    warnDays: clean(row.warnDays),
    diCode: clean(row.diCode),
    packageLevel: clean(row.packageLevel),
    regCertNo: clean(row.regCertNo),
    regCertExpire: clean(row.regCertExpire),
    registrant: clean(row.registrant),
    filer: clean(row.filer),
    manufacturer: clean(row.manufacturer),
    creditCode: clean(row.creditCode),
    produceLicense: clean(row.produceLicense),
    filingNo: clean(row.filingNo),
    origin: clean(row.origin),
    produceLicenseExpire: clean(row.produceLicenseExpire),
    sku: clean(row.sku),
    year: clean(row.year),
    yearFlag: !!row.yearFlag,
    name: clean(row.name),
    stockLoc: clean(row.stockLoc),
    externalCode: clean(row.externalCode),
    supplierPrice: (() => { const raw = clean(row.supplierPrice); const hit = SUPPLIERS.find((item) => raw === item || raw.startsWith(item + " ") || raw.startsWith(item)); return hit || raw; })(),
    homeProcess: !!row.homeProcess,
    settleLoc: clean(row.settleLoc),
    material: clean(row.material),
    style: clean(row.style),
    attr: clean(row.attr),
    unit: clean(row.unit) || "副",
    gauge: [clean(row.gauge), clean(row.size)].filter(Boolean).join(" / "),
    size: "",
    supplierModel: clean(row.supplierModel),
    supplierColor: clean(row.supplierColor),
    barcode: clean(row.barcode),
    specialPrice: !!row.specialPrice,
    customMade: !!row.customMade,
    isGift: !!row.isGift,
    frameType: clean(row.frameType),
    detail: row.detail || "",
    purchasePrice: row.purchasePrice == null || (row.purchasePrice as unknown) === "" ? undefined : Number(row.purchasePrice),
    wholesalePrice: row.wholesalePrice == null || (row.wholesalePrice as unknown) === "" ? undefined : Number(row.wholesalePrice),
    price: row.price == null || (row.price as unknown) === "" ? undefined : Number(row.price),
    employeePrice: row.employeePrice == null || (row.employeePrice as unknown) === "" ? undefined : Number(row.employeePrice),
    maxStock: row.maxStock == null ? undefined : Number(row.maxStock),
    minStock: row.minStock == null ? undefined : Number(row.minStock),
    images: [...(row.images || [])],
    designImages: [...(row.designImages || [])],
    powerRanges: normalizePowerRanges(row.powerRanges),
    lensStockWarn: normalizeLensStockWarn(row.lensStockWarn)
  }
}

function initialForm() {
  if (!props.seed) return blankForm()
  const data = fromSeed(props.seed)
  if (!props.editing && !props.viewOnly) {
    data.sku = ""
    data.barcode = ""
  }
  return data
}

const form = reactive<FormModel>(initialForm())

const isLens = computed(() => form.typeKey === "lens")
const isReading = computed(() => form.typeKey === "read")
const isFrame = computed(() => form.typeKey === "frame")
const isGift = computed(() => form.typeKey === "gift")
watch(isGift, (v) => { if (v) form.specialPrice = false })
const isCL = computed(() => form.typeKey === "cl")

const lensWarnAbs = computed(() => lensWarnAbsFromRanges(form.powerRanges))
const lensWarnGrid = computed(() => lensWarnAxes(warnSign.value, lensWarnAbs.value.sphAbs, lensWarnAbs.value.cylAbs))
const lensWarnSphs = computed(() => lensWarnGrid.value.sphs)
const lensWarnCyls = computed(() => lensWarnGrid.value.cyls)

watch(isLens, (v) => {
  if (!v && LENS_EDITOR_TABS.has(editorTab.value)) editorTab.value = "base"
})

const typeOptions = PRODUCT_CAT_CHILDREN.map((item) => ({ label: item.title, value: item.key }))
const brandOptions = computed(() => {
  const names = brands.value.map((item) => item.name)
  const list = form.brand && !names.includes(form.brand) ? [form.brand, ...names] : names
  return list.map((name) => ({ label: name, value: name }))
})
const locOptions = computed(() => {
  const extra = [form.stockLoc, form.settleLoc].filter((item) => item && !LOCS.includes(item))
  return [...new Set([...extra, ...LOCS])].map((item) => ({ label: item, value: item }))
})

function optionList(name: DictName, current: string) {
  const list = current && !dicts[name].includes(current) ? [current, ...dicts[name]] : dicts[name]
  return list.map((item) => ({ label: item, value: item }))
}

function filterSeries(input: string, option?: { value?: unknown }) {
  return String(option?.value ?? "").toLowerCase().includes(input.trim().toLowerCase())
}

function onHomeProcessChange(value: boolean | string | number) {
  const next = value === true || value === 'true'
  form.homeProcess = next
  if (!next) form.settleLoc = ''
}

function onDetailInput() {
  form.detail = detailRef.value?.innerHTML || ""
}

function exec(command: string, value?: string) {
  detailRef.value?.focus()
  document.execCommand(command, false, value)
  onDetailInput()
}

function onBlock(value: string) {
  blockValue.value = value
  exec("formatBlock", value)
}

function pickColor(event: Event, command: string) {
  const value = (event.target as HTMLInputElement).value
  exec(command, value)
}

function addLink() {
  const url = window.prompt("请输入链接地址", "https://")
  if (!url) return
  exec("createLink", url)
}

function addRichImage() {
  const url = window.prompt("请输入图片地址", "https://")
  if (!url) return
  exec("insertImage", url)
}

function addTable() {
  exec("insertHTML", "<table border='1' style='border-collapse:collapse;width:100%'><tr><td>&nbsp;</td><td>&nbsp;</td></tr><tr><td>&nbsp;</td><td>&nbsp;</td></tr></table>")
}

function genSku() {
  const head = pinyin(form.brand.trim(), {
    pattern: "first",
    toneType: "none",
    type: "string",
    separator: "",
    nonZh: "consecutive"
  }).toUpperCase()
  const body = `${head}${form.model}${form.spec}`.replace(/\s+/g, "")
  if (!body) {
    message.warning("请先填写品牌、型号或色号")
    return
  }
  form.sku = body
}

function genName() {
  const parts = [form.brand, form.series, form.model, form.spec]
  if (form.yearFlag && form.year) parts.push(form.year)
  if (form.specialPrice) parts.push("特价")
  const name = parts.map((item) => item.trim()).filter(Boolean).join(" ")
  if (!name) {
    message.warning("请先填写品牌、系列、型号或色号")
    return
  }
  form.name = name
}

function validate() {
  const rules: [boolean, string][] = [
    [!!form.typeKey, "请选择产品品类"],
    [!!form.brand.trim(), "请选择产品品牌"],
    [isReading.value ? !!form.degree.trim() : (isLens.value ? !!form.series.trim() : true), isReading.value ? "请填写光度" : "请选择产品系列"],
    [!!form.model.trim(), "请填写产品型号"],
    [!isFrame.value || !!form.spec.trim(), "请填写产品色号"],
    [!isLens.value || !!form.index.trim(), "请选择折射率"],
    [!isCL.value || !!form.clType.trim(), "请选择隐形眼镜类型"],
    [!isLens.value || !!form.coating.trim(), "请选择镀膜类型"],
    [!!form.sku.trim(), "请填写产品代号"],
    [!!form.name.trim(), "请填写产品名称"],
    [Number.isFinite(Number(form.purchasePrice)), "请填写采购价"],
    
    [Number.isFinite(Number(form.price)), "请填写零售价"],
  ]
  const miss = rules.find((item) => !item[0])
  if (miss) {
    message.warning(miss[1])
    return false
  }
  if (form.maxStock != null && form.maxStock > 0 && form.minStock != null && form.minStock > form.maxStock) {
    message.warning("最小库存不能大于最大库存")
    return false
  }
  return true
}

function payload(): ProductSaveInput {
  return {
    cat: createCatOfTree(form.typeKey),
    typeKey: form.typeKey,
    name: form.name,
    brand: form.brand,
    series: form.series,
    model: form.model,
    spec: form.spec,
    index: form.index,
    coating: form.coating,
    polarized: form.polarized,
    degree: form.degree,
    focalType: form.focalType,
    addPower: form.addPower,
    channel: form.channel,
    clType: form.clType,
    clExpireDate: form.clExpireDate,
    axis: form.axis,
    shelfLifeYears: form.shelfLifeYears,
    waterContent: form.waterContent,
    dia: form.dia,
    baseCurve: form.baseCurve,
    centerThickness: form.centerThickness,
    packSpec: form.packSpec,
    clMaterial: form.clMaterial,
    udiCode: form.udiCode,
    warnDays: form.warnDays,
    diCode: form.diCode,
    packageLevel: form.packageLevel,
    regCertNo: form.regCertNo,
    regCertExpire: form.regCertExpire,
    registrant: form.registrant,
    filer: form.filer,
    manufacturer: form.manufacturer,
    creditCode: form.creditCode,
    produceLicense: form.produceLicense,
    filingNo: form.filingNo,
    origin: form.origin,
    produceLicenseExpire: form.produceLicenseExpire,
    sku: form.sku,
    year: form.year,
    yearFlag: form.yearFlag,
    enabled: form.enabled,
    stockLoc: form.stockLoc,
    settleLoc: form.settleLoc,
    externalCode: form.externalCode,
    supplierPrice: form.supplierPrice,
    homeProcess: form.homeProcess,
    material: form.material,
    style: form.style,
    attr: form.attr,
    unit: form.unit,
    gauge: form.gauge,
    size: "",
    supplierModel: form.supplierModel,
    supplierColor: form.supplierColor,
    barcode: form.barcode,
    specialPrice: form.specialPrice,
    customMade: form.customMade,
    isGift: form.isGift,
    frameType: form.frameType,
    detail: form.detail,
    purchasePrice: Number(form.purchasePrice) || 0,
    wholesalePrice: Number(form.wholesalePrice) || 0,
    price: Number(form.price) || 0,
    employeePrice: Number(form.employeePrice) || 0,
    maxStock: Number(form.maxStock) || 0,
    minStock: Number(form.minStock) || 0,
    images: form.images.slice(),
    designImages: form.designImages.slice(),
    powerRanges: form.powerRanges.map((row) => ({
      sphMin: row.sphMin,
      sphMax: row.sphMax,
      cylMin: row.cylMin,
      cylMax: row.cylMax,
      combinedPower: row.combinedPower,
      purchasePrice: row.purchasePrice,
      retailPrice: row.retailPrice,
      wholesalePrice: row.wholesalePrice,
      employeePrice: row.employeePrice
    })),
    lensStockWarn: form.lensStockWarn.map((row) => ({
      sph: row.sph,
      cyl: row.cyl,
      max: row.max,
      min: row.min
    }))
  }
}

function save() {
  if (props.viewOnly) return
  if (!validate()) return
  emit("save", payload(), false)
}

function requestClose() {
  emit("close")
}

function openDict(name: DictName) {
  if (props.viewOnly) return
  dictName.value = name
  dictDraft.value = dicts[name].slice()
  dictInput.value = ""
  dictOpen.value = true
}

function addDictItem() {
  const text = dictInput.value.trim()
  if (!text) return
  if (dictDraft.value.includes(text)) {
    message.warning("已存在相同选项")
    return
  }
  dictDraft.value = [...dictDraft.value, text]
  dictInput.value = ""
}

function saveDict() {
  dicts[dictName.value] = dictDraft.value.slice()
  localStorage.setItem(DICT_KEY, JSON.stringify(dicts))
  const current = form[dictName.value]
  if (current && !dictDraft.value.includes(current)) form[dictName.value] = ""
  dictOpen.value = false
}

function filterBrand(input: string, option?: { value?: unknown }) {
  const q = input.trim().toLowerCase()
  if (!q) return true
  const name = String(option?.value ?? "")
  const brand = brands.value.find((item) => item.name === name)
  return name.toLowerCase().includes(q) || (brand?.alias || "").toLowerCase().includes(q)
}

function onBrandChange(value: unknown) {
  const name = String(value || "")
  form.brand = name
  const item = brands.value.find((brand) => brand.name === name)
  if (!item) return
  item.series
    .split(/[、,，]/)
    .map((text) => text.trim())
    .filter(Boolean)
    .forEach((text) => {
      if (!dicts.series.includes(text)) dicts.series.push(text)
    })
}


function readImage(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error("read"))
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, 960 / Math.max(img.width, img.height))
        const canvas = document.createElement("canvas")
        canvas.width = Math.max(1, Math.round(img.width * scale))
        canvas.height = Math.max(1, Math.round(img.height * scale))
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          resolve(String(reader.result || ""))
          return
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL("image/jpeg", 0.82))
      }
      img.onerror = () => reject(new Error("image"))
      img.src = String(reader.result || "")
    }
    reader.readAsDataURL(file)
  })
}

async function addImages(kind: ImageKind, files: File[]) {
  const limit = kind === "images" ? 1 : 8
  const room = limit - form[kind].length
  if (room <= 0) {
    message.warning(kind === "images" ? "产品图片最多 1 张" : "产品设计图片最多 8 张")
    return
  }
  const picked = files.filter((file) => file.type.startsWith("image/")).slice(0, room)
  if (!picked.length) {
    message.warning("请选择图片文件")
    return
  }
  if (picked.length < files.length) message.warning(`已按上限保留 ${picked.length} 张`)
  for (const file of picked) {
    if (file.size > 8 * 1024 * 1024) {
      message.warning(`${file.name} 超过 8MB`)
      continue
    }
    try {
      form[kind].push(await readImage(file))
    } catch {
      message.error(`${file.name} 无法读取`)
    }
  }
}

function openFile(kind: ImageKind) {
  fileKind.value = kind
  fileRef.value?.click()
}

function onFile(event: Event) {
  const input = event.target as HTMLInputElement
  const files = [...(input.files || [])]
  input.value = ""
  addImages(fileKind.value, files)
}

function onDrop(event: DragEvent, kind: ImageKind) {
  addImages(kind, [...(event.dataTransfer?.files || [])])
}

function onPaste(event: ClipboardEvent, kind: ImageKind) {
  const files = [...(event.clipboardData?.files || [])]
  if (!files.length) return
  event.preventDefault()
  addImages(kind, files)
}

function onKey(event: KeyboardEvent) {
  if (event.key !== "Escape") return
  if (dictOpen.value) return
  event.preventDefault()
  requestClose()
}

async function loadBrands() {
  const res = await getBrandPageAPI({ enabled: "1", page: 1, pageSize: 1000 })
  if (res.success) brands.value = res.data.list
}

onMounted(() => {
  if (detailRef.value) detailRef.value.innerHTML = form.detail
  window.addEventListener("keydown", onKey)
  loadBrands()
})


type ViewCell = { label: string; value: string; kind?: "text" | "badge" | "money" | "images" | "html"; full?: boolean; cols?: 1 | 2 | 3 | 4; span?: 1 | 2 }
type ViewRow = { full?: boolean; cols: 1 | 2 | 3 | 4; cells: ViewCell[] }

function viewDash(v: unknown) {
  if (v == null || v === "") return "—"
  if (typeof v === "number" && Number.isNaN(v)) return "—"
  return String(v)
}

function viewMoney(v: unknown) {
  if (v == null || v === "") return "—"
  const n = Number(v)
  if (Number.isNaN(n)) return "—"
  return `¥${n.toFixed(2)}`
}

function viewYn(v: boolean) {
  return v ? "是" : "否"
}

function chunkViewRows(cells: ViewCell[], defaultCols: 1 | 2 | 3 | 4 = 4): ViewRow[] {
  const rows: ViewRow[] = []
  let buf: ViewCell[] = []
  let used = 0
  const flush = () => {
    if (!buf.length) return
    rows.push({ cols: defaultCols, cells: buf, full: false })
    buf = []
    used = 0
  }
  for (const cell of cells) {
    if (cell.full) {
      flush()
      rows.push({ full: true, cols: 1, cells: [cell] })
      continue
    }
    const span = cell.span || 1
    if (used + span > defaultCols) flush()
    buf.push(cell)
    used += span
    if (used >= defaultCols) flush()
  }
  flush()
  return rows
}

const typeLabel = computed(() => typeOptions.find((o) => o.value === form.typeKey)?.label || viewDash(form.typeKey))

const viewBaseInfoCells = computed(() => {
  const cells: ViewCell[] = []
  cells.push({ label: "产品品类", value: typeLabel.value })
  cells.push({ label: "产品品牌", value: viewDash(form.brand) })
  if (isReading.value) cells.push({ label: "光度", value: viewDash(form.degree) })
  else cells.push({ label: "产品系列", value: viewDash(form.series) })
  cells.push({ label: "产品型号", value: viewDash(form.model) })
  if (isLens.value) {
    cells.push({ label: "折射率", value: viewDash(form.index) })
    cells.push({ label: "镀膜类型", value: viewDash(form.coating) })
    cells.push({ label: "产品代号", value: viewDash(form.sku) })
  } else {
    cells.push({ label: "产品色号", value: viewDash(form.spec) })
    cells.push({ label: "产品代号", value: viewDash(form.sku) })
  }
  cells.push({ label: "产品名称", value: viewDash(form.name), span: 2 })
  cells.push({ label: "产品年份", value: viewDash(form.year) })
  cells.push({ label: "产品标签", value: viewDash(form.attr) })
  cells.push({ label: "产品单位", value: viewDash(form.unit) })
  cells.push({ label: "规格/尺寸", value: viewDash(form.gauge) })
  cells.push({ label: "产品款式", value: viewDash(form.style) })
  cells.push({ label: isLens.value ? "镜片材质" : "产品材质", value: viewDash(form.material) })
  if (isFrame.value) cells.push({ label: "镜框类型", value: viewDash(form.frameType) })
  if (isLens.value) {
    cells.push({ label: "焦型", value: viewDash(form.focalType) })
    cells.push({ label: "下加光", value: viewDash(form.addPower) })
    cells.push({ label: "通道", value: viewDash(form.channel) })
  }
  return cells
})

const viewFlagCells = computed(() => {
  const cells: ViewCell[] = []
  cells.push({ label: "启用状态", value: form.enabled ? "启用" : "停用", kind: "badge" })
  cells.push({ label: "来料加工", value: viewYn(!!form.homeProcess) })
  if (!isGift.value) cells.push({ label: "特价商品", value: viewYn(!!form.specialPrice) })
  if (isLens.value) cells.push({ label: "是否偏光", value: viewDash(form.polarized) })
  return cells
})

const viewPriceCells = computed(() => [
  { label: "采购价", value: viewMoney(form.purchasePrice), kind: "money" as const },
  { label: "零售价", value: viewMoney(form.price), kind: "money" as const },
  { label: "批发价", value: viewMoney(form.wholesalePrice), kind: "money" as const },
  { label: "员工价", value: viewMoney(form.employeePrice), kind: "money" as const }
])

const viewStockCells = computed(() => [
  { label: "最大库存", value: form.maxStock == null || (form.maxStock as any) === "" ? "—" : String(form.maxStock) },
  { label: "最小库存", value: form.minStock == null || (form.minStock as any) === "" ? "—" : String(form.minStock) }
])

const viewClCells = computed(() => {
  const cells: ViewCell[] = []
  if (!isCL.value) return cells
  cells.push({ label: "扫描UDI码", value: viewDash(form.udiCode), full: true })
  cells.push({ label: "隐形眼镜类型", value: viewDash(form.clType) })
  cells.push({ label: "保质期提前预警天数", value: form.warnDays ? form.warnDays + "天" : "—" })
  cells.push({ label: "商品DI码 (医疗器械追溯必填)", value: viewDash(form.diCode) })
  cells.push({ label: "包装层级 (医疗器械追溯必填)", value: viewDash(form.packageLevel) })
  cells.push({ label: "生产企业 (医疗器械追溯必填)", value: viewDash(form.manufacturer) })
  cells.push({ label: "生产厂家信用代号 (医疗器械追溯必填)", value: viewDash(form.creditCode) })
  cells.push({ label: "生产许可证号 (医疗器械追溯必填)", value: viewDash(form.produceLicense) })
  cells.push({ label: "备案凭证号 (医疗器械追溯必填)", value: viewDash(form.filingNo) })
  return cells
})

const viewBaseInfoRows = computed(() => chunkViewRows(viewBaseInfoCells.value, 4))
const viewFlagRows = computed(() => chunkViewRows(viewFlagCells.value, 4))
const viewPriceRows = computed(() => chunkViewRows(viewPriceCells.value, 4))
const viewStockRows = computed(() => chunkViewRows(viewStockCells.value, 4))
const viewClRows = computed(() => chunkViewRows(viewClCells.value, 4))

const viewMoreCells = computed(() => {
  const cells: ViewCell[] = [
    { label: "第三方系统外接编号", value: viewDash(form.externalCode) },
    { label: "库存位置", value: viewDash(form.stockLoc) },
    { label: "库存结算账套", value: viewDash(form.settleLoc) },
    { label: "产品条码", value: viewDash(form.barcode) },
    { label: "绑定供应商", value: viewDash(form.supplierPrice) },
    { label: "供应商型号", value: viewDash(form.supplierModel) },
    { label: "供应商色号", value: viewDash(form.supplierColor) }
  ]
  if (isCL.value) {
    cells.push(
      { label: "轴位", value: viewDash(form.axis) },
      { label: "含水量", value: form.waterContent ? form.waterContent + "%" : "—" },
      { label: "总直径", value: viewDash(form.dia) },
      { label: "基弧半径", value: viewDash(form.baseCurve) },
      { label: "中心厚度", value: viewDash(form.centerThickness) },
      { label: "包装规格", value: viewDash(form.packSpec) },
      { label: "材质", value: viewDash(form.clMaterial) },
      { label: "医疗器械注册证号", value: viewDash(form.regCertNo) },
      { label: "医疗器械注册证过期时间", value: viewDash(form.regCertExpire) },
      { label: "医疗器械注册人", value: viewDash(form.registrant) },
      { label: "医疗器械备案人", value: viewDash(form.filer) },
      { label: "商品产地", value: viewDash(form.origin) },
      { label: "生产许可证过期时间", value: viewDash(form.produceLicenseExpire) }
    )
  }
  return cells
})

const viewMoreRows = computed(() => chunkViewRows(viewMoreCells.value, 4))



defineExpose({ requestClose })

onUnmounted(() => window.removeEventListener("keydown", onKey))
</script>

<template>
  <div class="sg-editor" :class="{ 'sg-editor-readonly': viewOnly }">
    <div class="sg-editor-scroll">
      <div class="sg-editor-tabs-row">
      <div class="sg-editor-tabs" role="tablist">
        <button type="button" class="sg-editor-tab" :class="{ active: editorTab === 'base' }" role="tab" @click="editorTab = 'base'">
          <span class="sg-sec-mark">◎</span>基本资料
        </button>
        <button v-if="isLens" type="button" class="sg-editor-tab" :class="{ active: editorTab === 'power' }" role="tab" @click="editorTab = 'power'">
          <span class="sg-sec-mark">◎</span>光度设置
        </button>
        <button type="button" class="sg-editor-tab" :class="{ active: editorTab === 'detail' }" role="tab" @click="editorTab = 'detail'">
          <span class="sg-sec-mark">◎</span>产品详情
        </button>
        <button type="button" class="sg-editor-tab" :class="{ active: editorTab === 'more' }" role="tab" @click="editorTab = 'more'">
          <span class="sg-sec-mark">◎</span>更多信息
        </button>
      </div>
      <button v-if="!viewOnly" type="button" class="sg-save-btn" :disabled="saving" @click="save"><SaveOutlined /> 保存</button>
      <button v-else type="button" class="sg-save-btn sg-close-btn" @click="requestClose">关闭</button>
      </div>
      <section v-show="editorTab === 'base'" class="sg-card sg-tab-pane">
      <template v-if="viewOnly">
        <div class="sg-desc-block">
          <div class="sg-sec-hd sg-sec-hd-static sg-desc-sec-hd">
            <span class="sg-sec-mark">▍</span>
            <span class="sg-sec-title">基本信息</span>
          </div>
          <div class="sg-desc-grid">
            <div
              v-for="(row, ri) in viewBaseInfoRows"
              :key="'bi'+ri"
              class="sg-desc-row"
              :class="row.full || row.cols === 1 ? 'sg-desc-row-1' : (row.cols === 2 ? 'sg-desc-row-2' : (row.cols === 3 ? 'sg-desc-row-3' : 'sg-desc-row-4'))"
            >
              <template v-for="(cell, ci) in row.cells" :key="ci">
                <div class="sg-desc-label" :class="{ 'sg-desc-span-2': cell.span === 2 }">{{ cell.label }}</div>
                <div class="sg-desc-value" :class="{ 'sg-desc-span-2': cell.span === 2 }">
                  <span v-if="cell.kind === 'badge'" class="sg-desc-badge" :class="{ off: cell.value === '停用' }">{{ cell.value }}</span>
                  <template v-else>{{ cell.value }}</template>
                </div>
              </template>
            </div>
          </div>
          <div class="sg-desc-grid sg-desc-flags">
            <div
              v-for="(row, ri) in viewFlagRows"
              :key="'fl'+ri"
              class="sg-desc-row"
              :class="row.full || row.cols === 1 ? 'sg-desc-row-1' : (row.cols === 2 ? 'sg-desc-row-2' : (row.cols === 3 ? 'sg-desc-row-3' : 'sg-desc-row-4'))"
            >
              <template v-for="(cell, ci) in row.cells" :key="ci">
                <div class="sg-desc-label" :class="{ 'sg-desc-span-2': cell.span === 2 }">{{ cell.label }}</div>
                <div class="sg-desc-value" :class="{ 'sg-desc-span-2': cell.span === 2 }">
                  <span v-if="cell.kind === 'badge'" class="sg-desc-badge" :class="{ off: cell.value === '停用' }">{{ cell.value }}</span>
                  <template v-else>{{ cell.value }}</template>
                </div>
              </template>
            </div>
          </div>
          <div class="sg-sec-hd sg-sec-hd-static sg-desc-sec-hd">
            <span class="sg-sec-mark">▍</span>
            <span class="sg-sec-title">价格信息</span>
          </div>
          <div class="sg-desc-grid">
            <div
              v-for="(row, ri) in viewPriceRows"
              :key="'pr'+ri"
              class="sg-desc-row"
              :class="row.cols === 1 ? 'sg-desc-row-1' : (row.cols === 2 ? 'sg-desc-row-2' : (row.cols === 3 ? 'sg-desc-row-3' : 'sg-desc-row-4'))"
            >
              <template v-for="(cell, ci) in row.cells" :key="ci">
                <div class="sg-desc-label">{{ cell.label }}</div>
                <div class="sg-desc-value">{{ cell.value }}</div>
              </template>
            </div>
          </div>
          <div class="sg-sec-hd sg-sec-hd-static sg-desc-sec-hd">
            <span class="sg-sec-mark">▍</span>
            <span class="sg-sec-title">库存预警</span>
          </div>
          <div class="sg-desc-grid">
            <div
              v-for="(row, ri) in viewStockRows"
              :key="'st'+ri"
              class="sg-desc-row"
              :class="row.cols === 1 ? 'sg-desc-row-1' : (row.cols === 2 ? 'sg-desc-row-2' : (row.cols === 3 ? 'sg-desc-row-3' : 'sg-desc-row-4'))"
            >
              <template v-for="(cell, ci) in row.cells" :key="ci">
                <div class="sg-desc-label">{{ cell.label }}</div>
                <div class="sg-desc-value">{{ cell.value }}</div>
              </template>
            </div>
          </div>
          <template v-if="isCL">
            <div class="sg-sec-hd sg-sec-hd-static sg-desc-sec-hd">
              <span class="sg-sec-mark">▍</span>
              <span class="sg-sec-title">隐形眼镜</span>
            </div>
            <div class="sg-desc-grid">
              <div
                v-for="(row, ri) in viewClRows"
                :key="'cl'+ri"
                class="sg-desc-row"
                :class="row.full || row.cols === 1 ? 'sg-desc-row-1' : (row.cols === 2 ? 'sg-desc-row-2' : (row.cols === 3 ? 'sg-desc-row-3' : 'sg-desc-row-4'))"
              >
                <template v-for="(cell, ci) in row.cells" :key="ci">
                  <div class="sg-desc-label" :class="{ 'sg-desc-span-2': cell.span === 2 }">{{ cell.label }}</div>
                  <div class="sg-desc-value" :class="{ 'sg-desc-span-2': cell.span === 2 }">{{ cell.value }}</div>
                </template>
              </div>
            </div>
          </template>
        </div>
      </template>
      <template v-else>
        <div class="sg-base-block">
          <div class="sg-sec-hd sg-sec-hd-static">
            <span class="sg-sec-mark">〇</span>
            <span class="sg-sec-title">基本信息</span>
          </div>
          <div class="sg-form-grid sg-base-fields">
          

          <div class="sg-field">
            <label class="sg-field-label"><i>*</i>产品品类</label>
            <div class="sg-field-ctrl">
              <a-select
                :value="form.typeKey || undefined"
                placeholder="请选择产品品类"
                :options="typeOptions"
                @update:value="form.typeKey = String($event || '')"
              />
            </div>
          </div>
          <div class="sg-field">
            <label class="sg-field-label"><i>*</i>产品品牌</label>
            <div class="sg-field-ctrl">
              <a-select
                :value="form.brand || undefined"
                allow-clear
                show-search
                placeholder="请选择产品品牌"
                :options="brandOptions"
                :filter-option="filterBrand"
                @update:value="onBrandChange"
              />
            </div>
          </div>
          <div v-if="!isReading" class="sg-field">
            <label class="sg-field-label"><i v-if="isLens">*</i>产品系列</label>
            <div class="sg-field-ctrl">
              <a-auto-complete
                :value="form.series"
                allow-clear
                placeholder="请选择或输入系列"
                :options="optionList('series', form.series)"
                :filter-option="filterSeries"
                @update:value="form.series = String($event || '')"
              />
              <button type="button" class="sg-mini-btn" @click="openDict('series')">设置</button>
            </div>
          </div>
          <div v-else class="sg-field">
            <label class="sg-field-label"><i>*</i>光度</label>
            <div class="sg-field-ctrl">
              <a-input v-model:value="form.degree" allow-clear placeholder="请输入光度" />
            </div>
          </div>
          <div class="sg-field">
            <label class="sg-field-label"><i>*</i>产品型号</label>
            <div class="sg-field-ctrl">
              <a-input v-model:value="form.model" allow-clear placeholder="请输入产品型号" />
            </div>
          </div>
          <div v-if="!isLens" class="sg-field">
            <label class="sg-field-label"><i v-if="isFrame">*</i>产品色号</label>
            <div class="sg-field-ctrl">
              <a-input v-model:value="form.spec" allow-clear placeholder="请输入产品色号" />
            </div>
</div>
          <div v-else class="sg-field">
            <label class="sg-field-label"><i>*</i>折射率</label>
            <div class="sg-field-ctrl">
              <a-select
                :value="form.index || undefined"
                allow-clear
                show-search
                placeholder="请选择折射率"
                option-filter-prop="label"
                :options="INDEX_OPTIONS"
                @update:value="form.index = String($event || '')"
              />
            </div>
          </div>
          <div v-if="isLens" class="sg-field">
            <label class="sg-field-label"><i>*</i>镀膜类型</label>
            <div class="sg-field-ctrl">
              <a-select
                :value="form.coating || undefined"
                allow-clear
                show-search
                placeholder="请选择镀膜类型"
                option-filter-prop="label"
                :options="COATING_OPTIONS"
                @update:value="form.coating = String($event || '')"
              />
            </div>
          </div>
          <div v-if="!isLens" class="sg-field">
            <label class="sg-field-label"><i>*</i>产品代号</label>
            <div class="sg-field-ctrl">
              <a-input v-model:value="form.sku" allow-clear placeholder="请输入/生成产品代号" />
              <button type="button" class="sg-mini-btn" @click="genSku">智能生成</button>
            </div>
          </div>
            <div v-if="isLens" class="sg-field">
            <label class="sg-field-label"><i>*</i>产品代号</label>
            <div class="sg-field-ctrl">
              <a-input v-model:value="form.sku" allow-clear placeholder="请输入/生成产品代号" />
              <button type="button" class="sg-mini-btn" @click="genSku">智能生成</button>
            </div>
          </div>
                    <div class="sg-field sg-span-2">
            <label class="sg-field-label"><i>*</i>产品名称</label>
            <div class="sg-field-ctrl">
              <a-input
                v-model:value="form.name"
                allow-clear
                placeholder="请输入产品名称，可点击智能生成（品牌+系列+型号+色号+是否特价）"
              />
              <button type="button" class="sg-mini-btn" @click="genName">智能生成</button>
            </div>
          </div>
          <div v-if="!isLens" class="sg-field">
            <label class="sg-field-label">产品年份</label>
            <div class="sg-field-ctrl">
              <a-select
                :value="form.year || undefined"
                allow-clear
                placeholder="请选择年份"
                :options="yearOptions"
                @update:value="form.year = String($event || '')"
              />
            </div>
          </div>
          <div v-if="isLens" class="sg-field">
            <label class="sg-field-label">产品年份</label>
            <div class="sg-field-ctrl">
              <a-select
                :value="form.year || undefined"
                allow-clear
                placeholder="请选择年份"
                :options="yearOptions"
                @update:value="form.year = String($event || '')"
              />
            </div>
          </div>
<div class="sg-field">
            <label class="sg-field-label">产品标签</label>
            <div class="sg-field-ctrl">
              <a-select
                :value="form.attr || undefined"
                allow-clear
                show-search
                placeholder="请选择"
                option-filter-prop="label"
                :options="optionList('attr', form.attr)"
                @update:value="form.attr = String($event || '')"
              />
              <button type="button" class="sg-mini-btn" @click="openDict('attr')">设置</button>
            </div>
          </div>
<div class="sg-field">
            <label class="sg-field-label">产品单位</label>
            <div class="sg-field-ctrl">
              <a-select
                :value="form.unit || undefined"
                allow-clear
                show-search
                placeholder="请选择"
                option-filter-prop="label"
                :options="optionList('unit', form.unit)"
                @update:value="form.unit = String($event || '')"
              />
              <button type="button" class="sg-mini-btn" @click="openDict('unit')">设置</button>
            </div>
          </div>
<div class="sg-field">
            <label class="sg-field-label">规格/尺寸</label>
            <div class="sg-field-ctrl"><a-input v-model:value="form.gauge" allow-clear placeholder="规格/尺寸" /></div>
          </div>
<div class="sg-field">
            <label class="sg-field-label">产品款式</label>
            <div class="sg-field-ctrl">
              <a-select
                :value="form.style || undefined"
                allow-clear
                show-search
                placeholder="请选择"
                option-filter-prop="label"
                :options="optionList('style', form.style)"
                @update:value="form.style = String($event || '')"
              />
              <button type="button" class="sg-mini-btn" @click="openDict('style')">设置</button>
            </div>
          </div>

          <div class="sg-field">
            <label class="sg-field-label">{{ isLens ? '镜片材质' : '产品材质' }}</label>
            <div class="sg-field-ctrl">
              <a-select
                :value="form.material || undefined"
                allow-clear
                show-search
                placeholder="请选择"
                option-filter-prop="label"
                :options="optionList('material', form.material)"
                @update:value="form.material = String($event || '')"
              />
              <button type="button" class="sg-mini-btn" @click="openDict('material')">设置</button>
            </div>
          </div>
<div v-if="isFrame" class="sg-field">
            <label class="sg-field-label">镜框类型</label>
            <div class="sg-field-ctrl">
              <a-select
                :value="form.frameType || undefined"
                allow-clear
                show-search
                placeholder="请选择"
                option-filter-prop="label"
                :options="optionList('frameType', form.frameType)"
                @update:value="form.frameType = String($event || '')"
              />
              <button type="button" class="sg-mini-btn" @click="openDict('frameType')">设置</button>
            </div>
          </div>

          <div v-if="isLens" class="sg-field">
            <label class="sg-field-label">焦型</label>
            <div class="sg-field-ctrl">
              <a-select
                :value="form.focalType || undefined"
                allow-clear
                placeholder="请选择"
                :options="FOCAL_OPTIONS"
                @update:value="form.focalType = String($event || '')"
              />
            </div>
          </div>
          <div v-if="isLens" class="sg-field">
            <label class="sg-field-label">下加光</label>
            <div class="sg-field-ctrl">
              <a-select
                :value="form.addPower || undefined"
                allow-clear
                show-search
                placeholder="请选择"
                :options="ADD_POWER_OPTIONS"
                @update:value="form.addPower = String($event || '')"
              />
            </div>
          </div>
                    <div v-if="isLens" class="sg-field">
            <label class="sg-field-label">通道</label>
            <div class="sg-field-ctrl">
              <a-select
                :value="form.channel || undefined"
                allow-clear
                placeholder="请选择"
                :options="CHANNEL_OPTIONS"
                @update:value="form.channel = String($event || '')"
              />
            </div>
          </div>
          </div>
          <div class="sg-flag-col">
            <div class="sg-field">
              <label class="sg-field-label">启用状态</label>
              <div class="sg-field-ctrl">
                <a-radio-group v-model:value="form.enabled" class="sg-radio-align">
                  <a-radio :value="true">是</a-radio>
                  <a-radio :value="false">否</a-radio>
                </a-radio-group>
              </div>
            </div>
            <div class="sg-field">
              <label class="sg-field-label">来料加工</label>
              <div class="sg-field-ctrl">
                <a-radio-group :value="form.homeProcess" class="sg-radio-align" @update:value="onHomeProcessChange">
                  <a-radio :value="true">是</a-radio>
                  <a-radio :value="false">否</a-radio>
                </a-radio-group>
              </div>
            </div>
            <div v-if="!isGift" class="sg-field">
              <label class="sg-field-label">特价商品</label>
              <div class="sg-field-ctrl">
                <a-radio-group v-model:value="form.specialPrice" class="sg-radio-align">
                  <a-radio :value="true">是</a-radio>
                  <a-radio :value="false">否</a-radio>
                </a-radio-group>
              </div>
            </div>
            <div v-if="isLens" class="sg-field">
              <label class="sg-field-label">是否偏光</label>
              <div class="sg-field-ctrl">
                <a-radio-group v-model:value="form.polarized" class="sg-radio-align">
                  <a-radio value="是">是</a-radio>
                  <a-radio value="否">否</a-radio>
                </a-radio-group>
              </div>
            </div>
          
          </div>
        </div>
        <div class="sg-form-grid">
<div class="sg-sec-hd sg-sec-hd-static">
            <span class="sg-sec-mark">▍</span>
            <span class="sg-sec-title">价格信息</span>
          </div>
<div class="sg-field sg-row-start">
            <label class="sg-field-label"><i>*</i>采购价</label>
            <div class="sg-field-ctrl">
              <div class="sg-money">
                <a-input-number v-model:value="form.purchasePrice" :min="0" :precision="4" :controls="false" />
                <span>元</span>
              </div>
            </div>
          </div>
          <div class="sg-field">
            <label class="sg-field-label"><i>*</i>零售价</label>
            <div class="sg-field-ctrl">
              <div class="sg-money">
                <a-input-number v-model:value="form.price" :min="0" :precision="2" :controls="false" />
                <span>元</span>
              </div>
            </div>
          </div>
<div class="sg-field">
            <label class="sg-field-label">批发价</label>
            <div class="sg-field-ctrl">
              <div class="sg-money">
                <a-input-number v-model:value="form.wholesalePrice" :min="0" :precision="2" :controls="false" />
                <span>元</span>
              </div>
            </div>
          </div>

          <div class="sg-field">
            <label class="sg-field-label">员工价</label>
            <div class="sg-field-ctrl">
              <div class="sg-money">
                <a-input-number v-model:value="form.employeePrice" :min="0" :precision="2" :controls="false" />
                <span>元</span>
              </div>
            </div>
          </div>

          <div class="sg-sec-hd sg-sec-hd-static">
            <span class="sg-sec-mark">〇</span>
            <span class="sg-sec-title">库存预警</span>
          </div>
          <div class="sg-field">
            <label class="sg-field-label">最大库存</label>
            <div class="sg-field-ctrl">
              <a-input-number v-model:value="form.maxStock" :min="0" :precision="0" :controls="false" />
            </div>
          </div>
          <div class="sg-field">
            <label class="sg-field-label">最小库存</label>
            <div class="sg-field-ctrl">
              <a-input-number v-model:value="form.minStock" :min="0" :precision="0" :controls="false" />
            </div>
          </div>
        </div>
      
        <div v-if="isCL" class="sg-cl-in-base">
          <div class="sg-form-grid sg-cl-grid">
          <div class="sg-sec-hd sg-sec-hd-static">
            <span class="sg-sec-mark">〇</span>
            <span class="sg-sec-title">隐形眼镜</span>
          </div>
          <div class="sg-field sg-span-2 sg-row-start">
            <div class="sg-field-ctrl sg-udi-row">
              <a-input v-model:value="form.udiCode" allow-clear placeholder="扫描UDI码，可以快速填充部分资料" />
              <button type="button" class="sg-mini-btn">扫码</button>
            </div>
          </div>
          <div class="sg-field">
            <label class="sg-field-label"><i>*</i>隐形眼镜类型</label>
            <div class="sg-field-ctrl">
              <a-select :value="form.clType || undefined" allow-clear placeholder="请选择" :options="CL_TYPE_OPTIONS" @update:value="form.clType = String($event || '')" />
            </div>
          </div>
<div class="sg-field">
              <label class="sg-field-label">保质期提前预警天数</label>
              <div class="sg-field-ctrl"><div class="sg-money"><a-input v-model:value="form.warnDays" allow-clear /><span>天</span></div></div>
            </div>

          <div class="sg-field">
            <label class="sg-field-label sg-req-red">商品DI码 (医疗器械追溯必填)</label>
            <div class="sg-field-ctrl"><a-input v-model:value="form.diCode" allow-clear /></div>
          </div>
          <div class="sg-field">
            <label class="sg-field-label sg-req-red">包裹层级 (医疗器械追溯必填)</label>
            <div class="sg-field-ctrl"><a-input v-model:value="form.packageLevel" allow-clear /></div>
          </div>
          <div class="sg-field">
            <label class="sg-field-label sg-req-red">生产企业 (医疗器械追溯必填)</label>
            <div class="sg-field-ctrl"><a-input v-model:value="form.manufacturer" allow-clear /></div>
          </div>
          <div class="sg-field">
            <label class="sg-field-label sg-req-red">生产厂家信用代号 (医疗器械追溯必填)</label>
            <div class="sg-field-ctrl"><a-input v-model:value="form.creditCode" allow-clear /></div>
          </div>
          <div class="sg-field">
            <label class="sg-field-label sg-req-red">生产许可证号 (医疗器械追溯必填)</label>
            <div class="sg-field-ctrl"><a-input v-model:value="form.produceLicense" allow-clear /></div>
          </div>
          <div class="sg-field">
            <label class="sg-field-label sg-req-red">备案凭证号 (医疗器械追溯必填)</label>
            <div class="sg-field-ctrl"><a-input v-model:value="form.filingNo" allow-clear /></div>
          </div>
        </div>
        </div>
</template>
    </section>

      <section v-show="editorTab === 'power' && isLens" class="sg-card sg-tab-pane sg-power-card">
        <div v-if="viewOnly" class="sg-desc-title sg-desc-title-inline">光度设置</div>
        <div class="sg-sec-hd sg-sec-hd-static">
          <span class="sg-sec-mark">◎</span>
          <span class="sg-sec-title">根据光度范围设置产品价格</span>
        </div>
        <div class="sg-power-wrap">
          <table class="sg-power-table">
            <thead>
              <tr>
                <th colspan="2">球镜</th>
                <th colspan="2">柱镜</th>
                <th rowspan="2">
                  联合光度
                  <a-tooltip title="联合光度 = |球镜| + |柱镜|（绝对值相加）">
                    <QuestionCircleOutlined class="sg-power-tip" />
                  </a-tooltip>
                </th>
                <th rowspan="2">
                  采购价
                  <a-tooltip title="该光度区间对应的采购价">
                    <QuestionCircleOutlined class="sg-power-tip" />
                  </a-tooltip>
                </th>
                <th rowspan="2">
                  零售价
                  <a-tooltip title="该光度区间对应的零售价">
                    <QuestionCircleOutlined class="sg-power-tip" />
                  </a-tooltip>
                </th>
                <th rowspan="2">
                  批发价
                  <a-tooltip title="该光度区间对应的批发价">
                    <QuestionCircleOutlined class="sg-power-tip" />
                  </a-tooltip>
                </th>
                <th rowspan="2">
                  员工价
                  <a-tooltip title="该光度区间对应的员工价">
                    <QuestionCircleOutlined class="sg-power-tip" />
                  </a-tooltip>
                </th>
                <th v-if="!viewOnly" rowspan="2" class="sg-power-op">操作</th>
              </tr>
              <tr>
                <th>最小</th>
                <th>最大</th>
                <th>最小</th>
                <th>最大</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, index) in form.powerRanges" :key="index">
                <td><a-input-number v-model:value="row.sphMin" :controls="false" :precision="2" placeholder="" /></td>
                <td><a-input-number v-model:value="row.sphMax" :controls="false" :precision="2" placeholder="" /></td>
                <td><a-input-number v-model:value="row.cylMin" :controls="false" :precision="2" placeholder="" /></td>
                <td><a-input-number v-model:value="row.cylMax" :controls="false" :precision="2" placeholder="" /></td>
                <td><a-input-number v-model:value="row.combinedPower" :min="0" :precision="2" :controls="false" :disabled="viewOnly" /></td>
                <td><a-input-number v-model:value="row.purchasePrice" :min="0" :controls="false" :precision="4" placeholder="" /></td>
                <td><a-input-number v-model:value="row.retailPrice" :min="0" :controls="false" :precision="2" placeholder="" /></td>
                <td><a-input-number v-model:value="row.wholesalePrice" :min="0" :controls="false" :precision="2" placeholder="" /></td>
                <td><a-input-number v-model:value="row.employeePrice" :min="0" :controls="false" :precision="2" placeholder="" /></td>
                <td v-if="!viewOnly" class="sg-power-op">
                  <button type="button" class="sg-power-del" @click="removePowerRange(index)">删除</button>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-if="!viewOnly" class="sg-power-actions">
            <button type="button" class="sg-mini-btn" @click="addPowerRange">添加范围</button>
          </div>
        </div>
      
        <div class="sg-sec-hd sg-sec-hd-static sg-lens-warn-hd">
          <span class="sg-sec-mark">◎</span>
          <span class="sg-sec-title">光度度数库存预警</span>
        </div>
        <div class="sg-lens-warn-block">
        <div class="sg-lens-warn-toolbar">
          <div class="sg-lens-warn-tools">
            <label class="sg-lens-warn-label">切换 球镜/柱镜 符号</label>
            <a-select
              v-model:value="warnSign"
              :options="DEGREE_SIGN_OPTIONS.map((item) => ({ label: item.label, value: item.value }))"
              style="width: 88px"
            />
            <span class="sg-lens-warn-tip">请输入该光度下的最大库存数（max）和最小库存预警数(min)</span>
          </div>
        </div>
        <div class="sg-lens-warn-scroll">
          <table class="sg-lens-warn-grid">
            <thead>
              <tr>
                <th class="sg-lens-warn-corner">球\柱</th>
                <th v-for="cyl in lensWarnCyls" :key="'c-' + cyl">{{ formatDegree(cyl) }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="sph in lensWarnSphs" :key="'s-' + sph">
                <th>{{ formatDegree(sph) }}</th>
                <td
                  v-for="cyl in lensWarnCyls"
                  :key="sph + '|' + cyl"
                  class="sg-lens-warn-cell"
                  @click="paintLensWarnCell(sph, cyl)"
                >
                  <div class="sg-lens-warn-cell-inner" @click.stop>
                    <a-input-number
                      :value="lensWarnCellValue(sph, cyl, 'max')"
                      :min="0"
                      :precision="0"
                      :controls="false"
                      placeholder="max"
                      size="small"
                      @update:value="setLensWarnCell(sph, cyl, 'max', $event == null || $event === '' ? null : Number($event))"
                    />
                    <a-input-number
                      :value="lensWarnCellValue(sph, cyl, 'min')"
                      :min="0"
                      :precision="0"
                      :controls="false"
                      placeholder="min"
                      size="small"
                      @update:value="setLensWarnCell(sph, cyl, 'min', $event == null || $event === '' ? null : Number($event))"
                    />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
              </div>
</section>

<section v-show="editorTab === 'more'" class="sg-card sg-tab-pane">
      <template v-if="viewOnly">
        <div class="sg-desc-block">
          <div class="sg-desc-grid">
            <div
              v-for="(row, ri) in viewMoreRows"
              :key="ri"
              class="sg-desc-row"
              :class="row.full || row.cols === 1 ? 'sg-desc-row-1' : (row.cols === 2 ? 'sg-desc-row-2' : (row.cols === 3 ? 'sg-desc-row-3' : 'sg-desc-row-4'))"
            >
              <template v-for="(cell, ci) in row.cells" :key="ci">
                <div class="sg-desc-label">{{ cell.label }}</div>
                <div class="sg-desc-value">
                  <span v-if="cell.kind === 'badge'" class="sg-desc-badge" :class="{ off: cell.value === '停用' }">{{ cell.value }}</span>
                  <template v-else>{{ cell.value }}</template>
                </div>
              </template>
            </div>
          </div>
        </div>
      </template>
      <template v-else>
        <div class="sg-form-grid">
          <div class="sg-field">
            <label class="sg-field-label">第三方系统外接编号</label>
            <div class="sg-field-ctrl">
              <a-input v-model:value="form.externalCode" allow-clear />
            </div>
          </div>
          <div class="sg-field">
            <label class="sg-field-label">库存位置</label>
            <div class="sg-field-ctrl">
              <a-select
                :value="form.stockLoc || undefined"
                allow-clear
                show-search
                placeholder="请选择库存位置"
                option-filter-prop="label"
                :options="locOptions"
                @update:value="form.stockLoc = String($event || '')"
              />
            </div>
          </div>
          <div class="sg-field">
            <label class="sg-field-label">
              库存结算账套
              <a-tooltip title="如果是来料加工，才能选择库存结算账套">
                <QuestionCircleOutlined class="sg-field-tip" />
              </a-tooltip>
            </label>
            <div class="sg-field-ctrl">
              <a-select
                :value="form.settleLoc || undefined"
                allow-clear
                show-search
                :disabled="!form.homeProcess"
                placeholder="请选择"
                option-filter-prop="label"
                :options="locOptions"
                @update:value="form.settleLoc = String($event || '')"
              />
            </div>
          </div>


          <div class="sg-field">
            <label class="sg-field-label">产品条码</label>
            <div class="sg-field-ctrl"><a-input v-model:value="form.barcode" allow-clear /></div>
          </div>
<div class="sg-field">
            <label class="sg-field-label">绑定供应商</label>
            <div class="sg-field-ctrl">
              <a-select
                :value="form.supplierPrice || undefined"
                allow-clear
                show-search
                placeholder="请选择绑定供应商"
                option-filter-prop="label"
                :options="supplierOptions"
                @update:value="form.supplierPrice = String($event || '')"
              />
            </div>
          </div>
<div class="sg-field">
            <label class="sg-field-label">供应商型号</label>
            <div class="sg-field-ctrl"><a-input v-model:value="form.supplierModel" allow-clear /></div>
          </div>
          <div class="sg-field">
            <label class="sg-field-label">供应商色号</label>
            <div class="sg-field-ctrl"><a-input v-model:value="form.supplierColor" allow-clear /></div>
          </div>

          <template v-if="isCL">
            <div class="sg-field">
              <label class="sg-field-label">轴位</label>
              <div class="sg-field-ctrl"><a-input v-model:value="form.axis" allow-clear /></div>
            </div>
            <div class="sg-field">
              <label class="sg-field-label">含水量</label>
              <div class="sg-field-ctrl"><div class="sg-money"><a-input v-model:value="form.waterContent" allow-clear /><span>%</span></div></div>
            </div>
            <div class="sg-field">
              <label class="sg-field-label">总直径</label>
              <div class="sg-field-ctrl"><a-input v-model:value="form.dia" allow-clear /></div>
            </div>
            <div class="sg-field">
              <label class="sg-field-label">基弧半径</label>
              <div class="sg-field-ctrl"><a-input v-model:value="form.baseCurve" allow-clear /></div>
            </div>
            <div class="sg-field">
              <label class="sg-field-label">中心厚度</label>
              <div class="sg-field-ctrl"><a-input v-model:value="form.centerThickness" allow-clear /></div>
            </div>
            <div class="sg-field">
              <label class="sg-field-label">包装规格</label>
              <div class="sg-field-ctrl"><a-input v-model:value="form.packSpec" allow-clear :maxlength="100" /></div>
            </div>
            <div class="sg-field">
              <label class="sg-field-label">材质</label>
              <div class="sg-field-ctrl"><a-input v-model:value="form.clMaterial" allow-clear :maxlength="100" /></div>
            </div>
            <div class="sg-field">
              <label class="sg-field-label">医疗器械注册证号</label>
              <div class="sg-field-ctrl"><a-input v-model:value="form.regCertNo" allow-clear /></div>
            </div>
            <div class="sg-field">
              <label class="sg-field-label">医疗器械注册证过期时间</label>
              <div class="sg-field-ctrl"><a-date-picker v-model:value="form.regCertExpire" value-format="YYYY-MM-DD" style="width: 100%" placeholder="请选择日期" /></div>
            </div>
            <div class="sg-field">
              <label class="sg-field-label">医疗器械注册人</label>
              <div class="sg-field-ctrl"><a-input v-model:value="form.registrant" allow-clear /></div>
            </div>
            <div class="sg-field">
              <label class="sg-field-label">医疗器械备案人</label>
              <div class="sg-field-ctrl"><a-input v-model:value="form.filer" allow-clear /></div>
            </div>
            <div class="sg-field">
              <label class="sg-field-label">商品产地</label>
              <div class="sg-field-ctrl"><a-input v-model:value="form.origin" allow-clear :maxlength="100" /></div>
            </div>
            <div class="sg-field">
              <label class="sg-field-label">生产许可证过期时间</label>
              <div class="sg-field-ctrl"><a-date-picker v-model:value="form.produceLicenseExpire" value-format="YYYY-MM-DD" style="width: 100%" placeholder="请选择日期" /></div>
            </div>
          </template>
          </div>
      </template>
    </section>

      <section v-show="editorTab === 'detail'" class="sg-card sg-tab-pane">
      <template v-if="viewOnly">
        <div class="sg-desc-block">
          <div class="sg-desc-grid">
            <div class="sg-desc-row sg-desc-row-1">
              <div class="sg-desc-label">产品图片</div>
              <div class="sg-desc-value">
                <div v-if="form.images.length" class="sg-desc-imgs">
                  <img v-for="(src, index) in form.images" :key="'vi' + index" :src="src" alt="" />
                </div>
                <template v-else>—</template>
              </div>
            </div>
            <div class="sg-desc-row sg-desc-row-1">
              <div class="sg-desc-label">详情内容</div>
              <div class="sg-desc-value">
                <div v-if="form.detail" class="sg-desc-html" v-html="form.detail"></div>
                <template v-else>—</template>
              </div>
            </div>
          </div>
        </div>
      </template>
      <template v-else>
        <div class="sg-form-grid">
<div class="sg-field">
            <label class="sg-field-label">产品图片</label>
            <div class="sg-field-ctrl sg-upload-ctrl">
              <button type="button" class="sg-upload" @click="openFile('images')" @dragover.prevent @drop.prevent="onDrop($event, 'images')" @paste="onPaste($event, 'images')">
                <CloudUploadOutlined />
                <span>点击/拖拽/粘贴 上传 ({{ form.images.length }}/1)</span>
              </button>
              <div v-for="(src, index) in form.images" :key="'m' + index" class="sg-thumb">
                <img :src="src" alt="" />
                <button type="button" @click="form.images.splice(index, 1)">×</button>
              </div>
            </div>
          </div>

          <div class="sg-field sg-span-4 sg-detail-field">
            <div class="sg-detail-layout" :class="{ full: richFull }">
            <div class="sg-rich" :class="{ full: richFull }">
              <div v-if="!viewOnly" class="sg-rich-bar">
                <a-select size="small" class="sg-rich-style" :value="blockValue" :options="blockOptions" @update:value="onBlock(String($event || 'p'))" />
                <button type="button" title="左对齐" @mousedown.prevent="exec('justifyLeft')"><AlignLeftOutlined /></button>
                <button type="button" title="居中" @mousedown.prevent="exec('justifyCenter')"><AlignCenterOutlined /></button>
                <button type="button" title="右对齐" @mousedown.prevent="exec('justifyRight')"><AlignRightOutlined /></button>
                <button type="button" title="加粗" @mousedown.prevent="exec('bold')"><BoldOutlined /></button>
                <button type="button" title="斜体" @mousedown.prevent="exec('italic')"><ItalicOutlined /></button>
                <button type="button" title="下划线" @mousedown.prevent="exec('underline')"><UnderlineOutlined /></button>
                <button type="button" title="删除线" @mousedown.prevent="exec('strikeThrough')"><StrikethroughOutlined /></button>
                <label class="sg-rich-color" title="文字颜色">
                  <FontColorsOutlined />
                  <input type="color" @input="pickColor($event, 'foreColor')" />
                </label>
                <label class="sg-rich-color" title="背景色">
                  <HighlightOutlined />
                  <input type="color" value="#fff3bf" @input="pickColor($event, 'hiliteColor')" />
                </label>
                <button type="button" title="无序列表" @mousedown.prevent="exec('insertUnorderedList')"><UnorderedListOutlined /></button>
                <button type="button" title="有序列表" @mousedown.prevent="exec('insertOrderedList')"><OrderedListOutlined /></button>
                <button type="button" title="引用" @mousedown.prevent="exec('formatBlock', 'blockquote')">“</button>
                <button type="button" title="表格" @mousedown.prevent="addTable"><TableOutlined /></button>
                <button type="button" title="图片" @mousedown.prevent="addRichImage"><PictureOutlined /></button>
                <button type="button" title="链接" @mousedown.prevent="addLink"><LinkOutlined /></button>
                <button type="button" title="代码" @mousedown.prevent="exec('formatBlock', 'pre')"><CodeOutlined /></button>
                <button type="button" title="撤销" @mousedown.prevent="exec('undo')"><UndoOutlined /></button>
                <button type="button" title="重做" @mousedown.prevent="exec('redo')"><RedoOutlined /></button>
                <button type="button" title="全屏" @mousedown.prevent="richFull = !richFull">{{ richFull ? "退出" : "全屏" }}</button>
              </div>
              <div
                ref="detailRef"
                class="sg-rich-body"
                :contenteditable="!viewOnly"
                data-placeholder="请输入内容，或直接粘贴设计"
                @input="onDetailInput"
              ></div>
              </div>
              <aside class="sg-detail-preview" aria-label="商品预览">
                <div class="sg-phone">
                  <div class="sg-phone-screen">
                    <div v-if="form.images.length" class="sg-preview-gallery">
                      <img v-for="(src, index) in form.images" :key="'pv' + index" :src="src" alt="" />
                    </div>
                    <div v-if="form.name || form.price" class="sg-preview-meta">
                      <div v-if="form.name" class="sg-preview-name">{{ form.name }}</div>
                      <div v-if="form.price" class="sg-preview-price">¥{{ Number(form.price).toFixed(2) }}</div>
                    </div>
                    <div v-if="form.detail" class="sg-preview-detail" v-html="form.detail"></div>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </template>
    </section>
    </div>

    <input ref="fileRef" type="file" accept="image/*" multiple hidden @change="onFile" />

    <a-modal :open="dictOpen" :title="'设置' + DICT_LABEL[dictName]" ok-text="确定" cancel-text="取消" :width="420" @ok="saveDict" @cancel="dictOpen = false">
      <div class="sg-dict-add">
        <a-input v-model:value="dictInput" allow-clear placeholder="输入后回车添加" @press-enter="addDictItem" />
        <button type="button" class="sg-mini-btn" @click="addDictItem">添加</button>
      </div>
      <div class="sg-pick-list">
        <div v-for="(item, index) in dictDraft" :key="item" class="sg-dict-row">
          <span>{{ item }}</span>
          <button type="button" @click="dictDraft.splice(index, 1)">删除</button>
        </div>
        <div v-if="!dictDraft.length" class="sg-pick-empty">还没有选项</div>
      </div>
    </a-modal>
  </div>
          </template>
