import { computed, ref } from "vue"
import { defineStore } from "pinia"
import {
  loginByPasswordAPI,
  loginBySmsAPI,
  type LoginResult,
  type PasswordLoginParams,
  type SmsLoginParams,
  type UserInfo
} from "@/api/auth"

const TOKEN_KEY = "zyb_token"
const USER_KEY = "zyb_user"
const REMEMBER_KEY = "zyb_remember_account"

export const useUserStore = defineStore("user", () => {
  const token = ref<string>(localStorage.getItem(TOKEN_KEY) || "")
  const userInfo = ref<UserInfo | null>(
    JSON.parse(localStorage.getItem(USER_KEY) || "null")
  )

  const isLoggedIn = computed(() => !!token.value)

  const saveLogin = (result: LoginResult) => {
    token.value = result.token
    userInfo.value = result.userInfo
    localStorage.setItem(TOKEN_KEY, result.token)
    localStorage.setItem(USER_KEY, JSON.stringify(result.userInfo))
  }

  async function loginByPassword(params: PasswordLoginParams, remember: boolean) {
    const res = await loginByPasswordAPI(params)
    if (!res.success) throw new Error(res.message)
    saveLogin(res.data)
    if (remember) {
      localStorage.setItem(REMEMBER_KEY, params.account)
    } else {
      localStorage.removeItem(REMEMBER_KEY)
    }
  }

  async function loginBySms(params: SmsLoginParams) {
    const res = await loginBySmsAPI(params)
    if (!res.success) throw new Error(res.message)
    saveLogin(res.data)
  }

  function logout() {
    token.value = ""
    userInfo.value = null
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }

  const rememberedAccount = () => localStorage.getItem(REMEMBER_KEY) || ""

  return { token, userInfo, isLoggedIn, loginByPassword, loginBySms, logout, rememberedAccount }
})
