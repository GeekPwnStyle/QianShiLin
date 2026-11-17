import { mockReject, mockResolve } from "@/mock"
import { MOCK_SMS_CODE, mockBrandStats, mockStores, mockUsers } from "@/mock/data"
import type { MockUser, StoreItem } from "@/mock/data"

export type UserInfo = Omit<MockUser, "password"> & {
  storeCode: string
  storeName: string
}

export type LoginResult = {
  token: string
  userInfo: UserInfo
}

export type PasswordLoginParams = {
  account: string
  password: string
  storeCode: string
}

export type SmsLoginParams = {
  phone: string
  code: string
  storeCode: string
}

const buildLoginResult = (user: MockUser, storeCode: string): LoginResult => {
  const store = mockStores.find((s) => s.storeCode === storeCode)
  const { password: _password, ...rest } = user
  return {
    token: `mock-token-${user.userCode}-${Date.now()}`,
    userInfo: {
      ...rest,
      storeCode,
      storeName: store?.storeName ?? ""
    }
  }
}

const canLoginStore = (user: MockUser, storeCode: string) =>
  user.storeCodes.length === 0 || user.storeCodes.includes(storeCode)

/** 获取门店列表 */
export function getStoreListAPI() {
  return mockResolve<StoreItem[]>(mockStores, 300)
}

/** 获取品牌数据 */
export function getBrandStatsAPI() {
  return mockResolve(mockBrandStats, 300)
}

/** 账号密码登录 */
export function loginByPasswordAPI(params: PasswordLoginParams) {
  const user = mockUsers.find((u) => u.account === params.account.trim())
  if (!user || user.password !== params.password) {
    return mockReject<LoginResult>("账号或密码错误")
  }
  if (!canLoginStore(user, params.storeCode)) {
    return mockReject<LoginResult>("该账号无权登录所选门店")
  }
  return mockResolve(buildLoginResult(user, params.storeCode))
}

/** 发送短信验证码 */
export function sendSmsCodeAPI(phone: string) {
  if (!/^1\d{10}$/.test(phone)) {
    return mockReject<null>("手机号格式不正确", 300)
  }
  return mockResolve<null>(null, 500)
}

/** 手机验证码登录 */
export function loginBySmsAPI(params: SmsLoginParams) {
  const user = mockUsers.find((u) => u.phone === params.phone.trim())
  if (!user) {
    return mockReject<LoginResult>("该手机号未注册")
  }
  if (params.code !== MOCK_SMS_CODE) {
    return mockReject<LoginResult>("验证码错误")
  }
  if (!canLoginStore(user, params.storeCode)) {
    return mockReject<LoginResult>("该账号无权登录所选门店")
  }
  return mockResolve(buildLoginResult(user, params.storeCode))
}
