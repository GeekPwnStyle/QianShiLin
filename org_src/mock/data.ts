/** 以下全部为 mock 示例数据 */

export type StoreItem = {
  storeCode: string
  storeName: string
  city: string
}

export type MockUser = {
  userCode: string
  account: string
  password: string
  phone: string
  userName: string
  role: "店长" | "验光师" | "配镜顾问" | "管理员"
  avatar: string
  /** 可登录的门店，空数组表示全部门店 */
  storeCodes: string[]
}

export const mockStores: StoreItem[] = [
  { storeCode: "S001", storeName: "万象城店", city: "深圳" },
  { storeCode: "S002", storeName: "天河旗舰店", city: "广州" },
  { storeCode: "S003", storeName: "西湖银泰店", city: "杭州" },
  { storeCode: "S004", storeName: "静安嘉里店", city: "上海" }
]

export const mockUsers: MockUser[] = [
  {
    userCode: "U0001",
    account: "admin",
    password: "123456",
    phone: "13800000000",
    userName: "系统管理员",
    role: "管理员",
    avatar: "",
    storeCodes: []
  },
  {
    userCode: "U1001",
    account: "yanguang",
    password: "123456",
    phone: "13900000001",
    userName: "李验光",
    role: "验光师",
    avatar: "",
    storeCodes: ["S001", "S002"]
  },
  {
    userCode: "U1002",
    account: "dianzhang",
    password: "123456",
    phone: "13900000002",
    userName: "王店长",
    role: "店长",
    avatar: "",
    storeCodes: ["S003"]
  }
]

/** 登录页左侧展示用的品牌数据（mock） */
export const mockBrandStats = {
  storeCount: 128,
  optometristCount: 460,
  monthlyExams: 36580,
  satisfaction: 98.6
}

/** mock 短信验证码，任何手机号都用这个 */
export const MOCK_SMS_CODE = "1234"
