import Vue from 'vue'
import router from './router'
import store from './store'
import NProgress from 'nprogress' // progress bar
import 'nprogress/nprogress.css' // progress bar style
import notification from 'ant-design-vue/es/notification'
import { ACCESS_TOKEN,INDEX_MAIN_PAGE_PATH } from '@/store/mutation-types'
import { generateIndexRouter } from "@/utils/util"

NProgress.configure({ showSpinner: false }) // NProgress Configuration

//路由生成的白名单
const whiteList = ['/user/login', '/user/register', '/user/register-result','/user/alteration'] // no redirect whitelist

router.beforeEach((to, from, next) => {
  //路由开始，进度条进入启动状态
  NProgress.start()

  if (Vue.ls.get(ACCESS_TOKEN)) {
    /* 如果存在Token，访问登录页默认进入首页 */
    if (to.path === '/user/login') {
      next({ path: INDEX_MAIN_PAGE_PATH })
      NProgress.done()
    } else {
      //访问其他页面，则首先从store中获取用户权限列表
      if (store.getters.permissionList.length === 0) {
        store.dispatch('GetPermissionList').then(res => {
          //store中不存在权限列表，则通过store的action方法请求后台接口，获取权限列表
              const menuData = res.result.menu;
              //菜单数据不存在，则返回
              if (menuData === null || menuData === "" || menuData === undefined) {
                return;
              }
              let constRoutes = [];
              // 菜单数据存在，则调用util中，根据菜单生成动态路由
              constRoutes = generateIndexRouter(menuData);

              // 根据生成的路由，更新本地的路由表
              store.dispatch('UpdateAppRouter',  { constRoutes }).then(() => {
                // 根据roles权限生成可访问的路由表
                // 动态添加可访问路由表
                router.addRoutes(store.getters.addRouters)
                const redirect = decodeURIComponent(from.query.redirect || to.path)
                if (to.path === redirect) {
                  //如果是前往一个新的路由
                  next({ ...to, replace: true })
                } else {
                  // 如果是重定向到一个组件
                  next({ path: redirect })
                }
              })
            })
          .catch(() => {
           notification.error({
              message: '系统提示',
              description: '请求用户信息失败，请重试！'
            })
            store.dispatch('Logout').then(() => {
              next({ path: '/user/login', query: { redirect: to.fullPath } })
            })
          })
      } else {
        //本地已存在路由表，直接进入下一个路由
        next()
      }
    }
  } else {
    if (whiteList.indexOf(to.path) !== -1) {
      // 在免登录白名单，直接进入
      next()
    } else {
      //由于ACCESS_TOKEN不存在，所以跳到登录页面
      next({ path: '/user/login', query: { redirect: to.fullPath } })
      NProgress.done() // if current page is login will not trigger afterEach hook, so manually handle it
    }
  }
})

router.afterEach(() => {
  //路由结束后进度条改为完成状态
  NProgress.done() // finish progress bar
})
