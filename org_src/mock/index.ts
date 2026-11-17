/**
 * 简易 mock 请求：模拟网络延迟，统一返回结构
 * 以后接真实后端时，只需把 src/api 下的函数换成 axios 请求即可
 */
export type ApiResponse<T> = {
  success: boolean
  message: string
  data: T
}

export function mockResolve<T>(data: T, delay = 600): Promise<ApiResponse<T>> {
  return new Promise((resolve) => {
    setTimeout(() => resolve({ success: true, message: "ok", data }), delay)
  })
}

export function mockReject<T = null>(message: string, delay = 600): Promise<ApiResponse<T>> {
  return new Promise((resolve) => {
    setTimeout(() => resolve({ success: false, message, data: null as T }), delay)
  })
}
