<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue"
import { useRoute, useRouter } from "vue-router"
import { message } from "ant-design-vue"
import {
  UserOutlined,
  LockOutlined,
  MobileOutlined,
  SafetyOutlined,
  ShopOutlined,
  EyeOutlined
} from "@ant-design/icons-vue"
import { getBrandStatsAPI, getStoreListAPI, sendSmsCodeAPI } from "@/api/auth"
import type { StoreItem } from "@/mock/data"
import { useUserStore } from "@/stores/user"

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const activeTab = ref<"password" | "sms">("password")
const loading = ref(false)

const stores = ref<StoreItem[]>([])
const storeOptions = computed(() =>
  stores.value.map((s) => ({ value: s.storeCode, label: `${s.storeName}（${s.city}）` }))
)

const stats = ref({ storeCount: 0, optometristCount: 0, monthlyExams: 0, satisfaction: 0 })

const passwordForm = reactive({
  account: "",
  password: "",
  storeCode: undefined as string | undefined,
  remember: true
})

const smsForm = reactive({
  phone: "",
  code: "",
  storeCode: undefined as string | undefined
})

const passwordRules = {
  account: [{ required: true, message: "请输入账号" }],
  password: [{ required: true, message: "请输入密码" }],
  storeCode: [{ required: true, message: "请选择登录门店" }]
}

const smsRules = {
  phone: [
    { required: true, message: "请输入手机号" },
    { pattern: /^1\d{10}$/, message: "手机号格式不正确" }
  ],
  code: [{ required: true, message: "请输入验证码" }],
  storeCode: [{ required: true, message: "请选择登录门店" }]
}

/** 验证码倒计时 */
const countdown = ref(0)
let timer: number | undefined

const sendCode = async () => {
  if (!/^1\d{10}$/.test(smsForm.phone)) {
    message.warning("请先输入正确的手机号")
    return
  }
  const res = await sendSmsCodeAPI(smsForm.phone)
  if (!res.success) {
    message.error(res.message)
    return
  }
  message.success("验证码已发送（演示验证码：1234）")
  countdown.value = 60
  timer = window.setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      window.clearInterval(timer)
    }
  }, 1000)
}

const afterLogin = () => {
  message.success(`欢迎回来，${userStore.userInfo?.userName}`)
  const redirect = (route.query.redirect as string) || "/home"
  router.replace(redirect)
}

const onPasswordLogin = async () => {
  loading.value = true
  try {
    await userStore.loginByPassword(
      {
        account: passwordForm.account,
        password: passwordForm.password,
        storeCode: passwordForm.storeCode!
      },
      passwordForm.remember
    )
    afterLogin()
  } catch (e) {
    message.error((e as Error).message)
  } finally {
    loading.value = false
  }
}

const onSmsLogin = async () => {
  loading.value = true
  try {
    await userStore.loginBySms({
      phone: smsForm.phone,
      code: smsForm.code,
      storeCode: smsForm.storeCode!
    })
    afterLogin()
  } catch (e) {
    message.error((e as Error).message)
  } finally {
    loading.value = false
  }
}

/** 一键填入演示账号 */
const fillDemo = (account: string) => {
  activeTab.value = "password"
  passwordForm.account = account
  passwordForm.password = "123456"
  passwordForm.storeCode = account === "dianzhang" ? "S003" : "S001"
}

const formatNumber = (n: number) => n.toLocaleString("zh-CN")

onMounted(async () => {
  passwordForm.account = userStore.rememberedAccount()
  const [storeRes, statsRes] = await Promise.all([getStoreListAPI(), getBrandStatsAPI()])
  if (storeRes.success) stores.value = storeRes.data
  if (statsRes.success) stats.value = statsRes.data
})

onBeforeUnmount(() => {
  if (timer) window.clearInterval(timer)
})
</script>

<template>
  <div class="login-page">
    <!-- 左侧品牌区 -->
    <section class="brand">
      <div class="lens lens-1" />
      <div class="lens lens-2" />
      <div class="lens lens-3" />

      <div class="brand-inner">
        <div class="brand-logo">
          <EyeOutlined />
          <span>GSS后台管理端</span>
        </div>
        <h1 class="brand-title">眼镜视光门店管理系统</h1>
        <p class="brand-desc">
          验光档案 · 配镜订单 · 镜片库存 · 会员复查，一站式管理，让每一次看见都更清晰。
        </p>

        <!-- 视力表装饰 -->
        <div class="eye-chart" aria-hidden="true">
          <div class="row r1">E</div>
          <div class="row r2"><span>Ш</span><span>E</span></div>
          <div class="row r3"><span>E</span><span>Ш</span><span>m</span></div>
          <div class="row r4"><span>Ш</span><span>E</span><span>m</span><span>E</span></div>
        </div>

        <div class="stats">
          <div class="stat">
            <div class="num">{{ formatNumber(stats.storeCount) }}</div>
            <div class="label">合作门店</div>
          </div>
          <div class="stat">
            <div class="num">{{ formatNumber(stats.optometristCount) }}</div>
            <div class="label">专业验光师</div>
          </div>
          <div class="stat">
            <div class="num">{{ formatNumber(stats.monthlyExams) }}</div>
            <div class="label">月验光人次</div>
          </div>
          <div class="stat">
            <div class="num">{{ stats.satisfaction }}%</div>
            <div class="label">顾客满意度</div>
          </div>
        </div>
        <div class="mock-tip">* 页面数据均为演示用 mock 数据</div>
      </div>
    </section>

    <!-- 右侧登录区 -->
    <section class="panel">
      <div class="card">
        <h2 class="card-title">欢迎登录</h2>
        <p class="card-sub">请选择门店并登录您的工作账号</p>

        <a-tabs v-model:activeKey="activeTab" :animated="false">
          <a-tab-pane key="password" tab="账号密码登录">
            <a-form
              :model="passwordForm"
              :rules="passwordRules"
              layout="vertical"
              size="large"
              @finish="onPasswordLogin"
            >
              <a-form-item name="storeCode">
                <a-select
                  v-model:value="passwordForm.storeCode"
                  :options="storeOptions"
                  placeholder="选择登录门店"
                >
                  <template #suffixIcon><ShopOutlined /></template>
                </a-select>
              </a-form-item>
              <a-form-item name="account">
                <a-input v-model:value="passwordForm.account" placeholder="账号" allow-clear>
                  <template #prefix><UserOutlined class="ico" /></template>
                </a-input>
              </a-form-item>
              <a-form-item name="password">
                <a-input-password v-model:value="passwordForm.password" placeholder="密码">
                  <template #prefix><LockOutlined class="ico" /></template>
                </a-input-password>
              </a-form-item>
              <div class="row-between">
                <a-checkbox v-model:checked="passwordForm.remember">记住账号</a-checkbox>
                <a @click.prevent="message.info('请联系门店管理员重置密码')">忘记密码？</a>
              </div>
              <a-button type="primary" html-type="submit" block :loading="loading" class="submit">
                登 录
              </a-button>
            </a-form>
          </a-tab-pane>

          <a-tab-pane key="sms" tab="手机验证码登录">
            <a-form
              :model="smsForm"
              :rules="smsRules"
              layout="vertical"
              size="large"
              @finish="onSmsLogin"
            >
              <a-form-item name="storeCode">
                <a-select
                  v-model:value="smsForm.storeCode"
                  :options="storeOptions"
                  placeholder="选择登录门店"
                >
                  <template #suffixIcon><ShopOutlined /></template>
                </a-select>
              </a-form-item>
              <a-form-item name="phone">
                <a-input v-model:value="smsForm.phone" placeholder="手机号" :maxlength="11" allow-clear>
                  <template #prefix><MobileOutlined class="ico" /></template>
                </a-input>
              </a-form-item>
              <a-form-item name="code">
                <div class="code-row">
                  <a-input v-model:value="smsForm.code" placeholder="验证码" :maxlength="6">
                    <template #prefix><SafetyOutlined class="ico" /></template>
                  </a-input>
                  <a-button :disabled="countdown > 0" @click="sendCode">
                    {{ countdown > 0 ? `${countdown}s 后重发` : "获取验证码" }}
                  </a-button>
                </div>
              </a-form-item>
              <a-button type="primary" html-type="submit" block :loading="loading" class="submit">
                登 录
              </a-button>
            </a-form>
          </a-tab-pane>
        </a-tabs>

        <div class="demo">
          <div class="demo-title">演示账号（密码均为 123456）</div>
          <a-space wrap>
            <a-tag color="blue" class="demo-tag" @click="fillDemo('admin')">admin · 管理员</a-tag>
            <a-tag color="cyan" class="demo-tag" @click="fillDemo('yanguang')">yanguang · 验光师</a-tag>
            <a-tag color="geekblue" class="demo-tag" @click="fillDemo('dianzhang')">dianzhang · 店长</a-tag>
          </a-space>
          <div class="demo-sub">验证码登录可用手机号 13900000001，验证码 1234</div>
        </div>
      </div>
      <div class="footer">© 2026 GSS后台管理端 · 演示项目</div>
    </section>
  </div>
</template>

<style scoped>
.login-page {
  display: flex;
  min-height: 100vh;
  background: #f3f7f6;
}

/* ===== 左侧品牌区 ===== */
.brand {
  position: relative;
  flex: 1.2;
  overflow: hidden;
  color: #fff;
  background: linear-gradient(135deg, #083d37 0%, #0e7c6b 55%, #02bfa1 100%);
}

.lens {
  position: absolute;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.18);
  background: radial-gradient(circle at 35% 35%, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0.02) 60%);
  box-shadow: inset 0 0 40px rgba(255, 255, 255, 0.12);
}
.lens-1 { width: 420px; height: 420px; right: -120px; top: -100px; }
.lens-2 { width: 260px; height: 260px; right: 160px; bottom: -80px; }
.lens-3 { width: 140px; height: 140px; left: 60%; top: 42%; }

.brand-inner {
  position: relative;
  z-index: 1;
  max-width: 560px;
  padding: 72px 64px;
}

.brand-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 22px;
  font-weight: 600;
  letter-spacing: 2px;
}
.brand-logo :deep(.anticon) {
  font-size: 30px;
}

.brand-title {
  margin: 48px 0 12px;
  color: #fff;
  font-size: 34px;
  font-weight: 600;
  line-height: 1.3;
}

.brand-desc {
  margin: 0;
  font-size: 15px;
  line-height: 1.8;
  opacity: 0.88;
}

.eye-chart {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  margin: 40px 0;
  padding: 18px 28px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.1);
  font-family: "Arial Black", Arial, sans-serif;
  backdrop-filter: blur(4px);
}
.eye-chart .row { display: flex; gap: 14px; line-height: 1; }
.eye-chart .r1 { font-size: 44px; }
.eye-chart .r2 { font-size: 30px; }
.eye-chart .r3 { font-size: 20px; }
.eye-chart .r4 { font-size: 13px; opacity: 0.8; }

.stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.stat .num {
  font-size: 24px;
  font-weight: 600;
}
.stat .label {
  margin-top: 4px;
  font-size: 13px;
  opacity: 0.8;
}

.mock-tip {
  margin-top: 28px;
  font-size: 12px;
  opacity: 0.6;
}

/* ===== 右侧登录区 ===== */
.panel {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
}

.card {
  width: 100%;
  max-width: 420px;
  padding: 40px 36px 28px;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 12px 40px rgba(8, 61, 55, 0.1);
}

.card-title {
  margin: 0;
  color: #1f2a44;
  font-size: 26px;
  font-weight: 600;
}

.card-sub {
  margin: 6px 0 16px;
  color: #8792a8;
}

.ico {
  color: #a0aec0;
}

.row-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: -4px 0 20px;
}

.code-row {
  display: flex;
  gap: 12px;
}
.code-row .ant-btn {
  width: 128px;
  flex-shrink: 0;
}

.submit {
  height: 44px;
  font-size: 16px;
  letter-spacing: 4px;
}

.demo {
  margin-top: 24px;
  padding-top: 18px;
  border-top: 1px dashed #e5e9f2;
}
.demo-title {
  margin-bottom: 8px;
  color: #5b667d;
  font-size: 13px;
}
.demo-tag {
  cursor: pointer;
}
.demo-sub {
  margin-top: 8px;
  color: #a0aec0;
  font-size: 12px;
}

.footer {
  margin-top: 24px;
  color: #a0aec0;
  font-size: 12px;
}

@media (max-width: 960px) {
  .brand { display: none; }
}
</style>
