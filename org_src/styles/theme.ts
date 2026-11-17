import type { ThemeConfig } from "ant-design-vue/es/config-provider/context"

/** 品牌主色 */
export const BRAND = "#02bfa1"

/**
 * 系统配色：以 #02bfa1 为主色，白底侧栏、浅灰页面底，
 * 以及成功 / 警告 / 错误三个语义色
 */
export const theme: ThemeConfig = {
  token: {
    colorPrimary: BRAND,
    colorSuccess: "#16b364",
    colorWarning: "#f79009",
    colorError: "#f04438",
    colorInfo: BRAND,
    colorLink: BRAND,
    borderRadius: 6,
    colorBgLayout: "#f3f7f6",
    colorText: "#1c2b2a",
    colorTextSecondary: "#5e7370",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Microsoft YaHei', sans-serif"
  },
  components: {
    Layout: {
      colorBgHeader: "#ffffff"
    },
    Menu: {
      colorItemBg: "#ffffff",
      colorSubItemBg: "#ffffff",
      colorItemBgSelected: "#e7f7f1",
      colorItemBgHover: "#f5f7fa",
      colorItemText: "#333333",
      colorItemTextHover: "#333333",
      colorItemTextSelected: BRAND
    }
  }
}
