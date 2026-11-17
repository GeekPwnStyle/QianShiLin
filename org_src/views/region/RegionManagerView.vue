<script setup lang="ts">
import { onMounted, reactive, ref } from "vue"
import { message } from "ant-design-vue"
import type { FormInstance } from "ant-design-vue"
import { PlusOutlined } from "@ant-design/icons-vue"
import { tablePageSizeOptions, tableShowTotal } from "@/components/tablePagination"
import {
  deleteRegionManagerAPI,
  getRegionManagerPageAPI,
  saveRegionManagerAPI,
  type RegionManager
} from "@/api/regionManager"
import { formatRegionPath, regionCascaderOptions } from "./regionOptions"

const loading = ref(false)
const dataSource = ref<RegionManager[]>([])
const total = ref(0)
const currentId = ref("")
const query = reactive({ page: 1, pageSize: 50 })

const columns = [
  { title: "姓名", dataIndex: "name", width: 140 },
  { title: "电话", dataIndex: "phone", width: 160 },
  { title: "负责区域", dataIndex: "regions" },
  { title: "操作", dataIndex: "action", width: 140, fixed: "right" as const }
]

const loadData = async (silent = false) => {
  if (!silent) loading.value = true
  try {
    const res = await getRegionManagerPageAPI({ ...query })
    dataSource.value = res.data.list
    total.value = res.data.total
  } finally {
    if (!silent) loading.value = false
  }
}

const modalOpen = ref(false)
const saving = ref(false)
const editingId = ref<string>()
const formRef = ref<FormInstance>()
const form = reactive({
  name: "",
  phone: "",
  regions: [] as string[][]
})

const rules = {
  name: [{ required: true, whitespace: true, message: "请输入姓名" }],
  phone: [
    { required: true, message: "请输入电话" },
    { pattern: /^1\d{10}$/, message: "请输入 11 位手机号" }
  ],
  regions: [
    {
      validator: async (_rule: unknown, value: string[][]) => {
        if (!value?.length) return Promise.reject("请选择负责区域")
      }
    }
  ]
}

const renderRegion = ({ labels }: { labels: string[] }) => formatRegionPath(labels)

const openCreate = () => {
  editingId.value = undefined
  form.name = ""
  form.phone = ""
  form.regions = []
  modalOpen.value = true
}

const openEdit = (record: RegionManager) => {
  editingId.value = record.id
  form.name = record.name
  form.phone = record.phone
  form.regions = record.regions.map((path) => [...path])
  modalOpen.value = true
}

const onSave = async () => {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }
  saving.value = true
  try {
    const res = await saveRegionManagerAPI({
      id: editingId.value,
      name: form.name,
      phone: form.phone,
      regions: form.regions
    })
    if (!res.success) {
      message.error(res.message)
      return
    }
    message.success(editingId.value ? "已保存" : "已新增区域负责人")
    modalOpen.value = false
    if (!editingId.value) query.page = 1
    await loadData(true)
  } finally {
    saving.value = false
  }
}

const onDelete = async (record: RegionManager) => {
  const res = await deleteRegionManagerAPI(record.id)
  if (!res.success) {
    message.error(res.message)
    return
  }
  message.success("已删除")
  if (currentId.value === record.id) currentId.value = ""
  if (dataSource.value.length === 1 && query.page > 1) query.page -= 1
  loadData()
}

onMounted(loadData)
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <a-button type="primary" @click="openCreate"><PlusOutlined /> 新增区域负责人</a-button>
    </div>

    <a-table
      row-key="id"
      size="small"
      :columns="columns"
      :data-source="dataSource"
      :loading="loading"
      :scroll="{ x: 760 }"
      :custom-row="(record: RegionManager) => ({
        class: currentId === record.id ? 'row-current' : '',
        onClick: () => { currentId = record.id }
      })"
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
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'regions'">
          <a-space :size="4" wrap>
            <a-tag v-for="(path, index) in (record as RegionManager).regions" :key="index">
              {{ formatRegionPath(path) }}
            </a-tag>
          </a-space>
        </template>
        <template v-else-if="column.dataIndex === 'action'">
          <a-space>
            <a-button type="link" size="small" @click.stop="openEdit(record as RegionManager)">编辑</a-button>
            <a-popconfirm
              :title="`确认删除「${record.name}」？`"
              description="删除后不可恢复"
              ok-text="删除"
              cancel-text="取消"
              ok-type="danger"
              placement="topRight"
              @confirm="onDelete(record as RegionManager)"
            >
              <a-button type="link" size="small" danger @click.stop>删除</a-button>
            </a-popconfirm>
          </a-space>
        </template>
      </template>
    </a-table>

    <a-modal
      v-model:open="modalOpen"
      :title="editingId ? '编辑区域负责人' : '新增区域负责人'"
      :confirm-loading="saving"
      :width="640"
      ok-text="保存"
      cancel-text="取消"
      destroy-on-close
      @ok="onSave"
    >
      <a-form
        ref="formRef"
        :model="form"
        :rules="rules"
        :label-col="{ span: 5 }"
        :wrapper-col="{ span: 18 }"
        style="margin-top: 16px"
      >
        <a-form-item label="姓名" name="name">
          <a-input v-model:value="form.name" :maxlength="20" placeholder="请输入姓名" />
        </a-form-item>
        <a-form-item label="电话" name="phone">
          <a-input v-model:value="form.phone" :maxlength="11" placeholder="请输入手机号" />
        </a-form-item>
        <a-form-item label="负责区域" name="regions" extra="可多选。可以直接选华东、华南，也可以选到省、市、区。">
          <a-cascader
            v-model:value="form.regions"
            multiple
            change-on-select
            show-search
            show-checked-strategy="SHOW_PARENT"
            :display-render="renderRegion"
            :options="regionCascaderOptions"
            popup-class-name="region-cascader-popup"
            placeholder="请选择负责区域"
            style="width: 100%"
          />
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
</style>

<style>
.region-cascader-popup .ant-cascader-menu {
  height: 280px;
}
</style>
