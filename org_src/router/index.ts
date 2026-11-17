import { createRouter, createWebHistory } from "vue-router"
import type { RouteRecordRaw } from "vue-router"
import BasicLayout from "@/layouts/BasicLayout.vue"
import { useUserStore } from "@/stores/user"
import { menuLeaves } from "@/config/menu"

// 除首页外的菜单页面先统一指向占位页，后续逐个替换成真实页面
// 已开发的真实页面，其余菜单仍走占位页
const pageComponents: Record<string, RouteRecordRaw["component"]> = {
  "/base/brand": () => import("@/views/base/BrandView.vue"),
  "/base/supplier": () => import("@/views/base/SupplierView.vue"),
  "/base/warehouse-info": () => import("@/views/base/WarehouseInfoView.vue"),
  "/product/product-info": () => import("@/views/product/ProductInfoView.vue"),
  "/mall/home-decor": () => import("@/views/mall/HomeDecorView.vue"),
  "/mall/goods": () => import("@/views/mall/MallGoodsView.vue"),
  "/region/manager": () => import("@/views/region/RegionManagerView.vue")
}

const menuRoutes: RouteRecordRaw[] = menuLeaves
  .filter((leaf) => leaf.key !== "/home")
  .map((leaf) => ({
    path: leaf.key.slice(1),
    component: pageComponents[leaf.key] ?? (() => import("@/views/common/PlaceholderView.vue")),
    meta: { title: leaf.title }
  }))

const routes: RouteRecordRaw[] = [
  {
    path: "/login",
    name: "login",
    component: () => import("@/views/LoginView.vue"),
    meta: { title: "登录", public: true }
  },
  {
    path: "/",
    component: BasicLayout,
    redirect: "/home",
    children: [
      {
        path: "home",
        name: "home",
        component: () => import("@/views/HomeView.vue"),
        meta: { title: "首页" }
      },
      ...menuRoutes
    ]
  },
  {
    path: "/:pathMatch(.*)*",
    redirect: "/home"
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

// 登录守卫：没 token 跳登录页，已登录访问登录页则回首页
router.beforeEach((to) => {
  const userStore = useUserStore()
  if (to.meta.public) {
    if (to.name === "login" && userStore.isLoggedIn) return "/home"
    return true
  }
  if (!userStore.isLoggedIn) {
    return { path: "/login", query: { redirect: to.fullPath } }
  }
  return true
})

router.afterEach((to) => {
  const title = to.meta.title as string | undefined
  document.title = title ? `${title} - GSS后台管理端` : "GSS后台管理端"
})

export default router
