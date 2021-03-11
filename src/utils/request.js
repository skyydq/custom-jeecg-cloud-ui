import Vue from 'vue'
import axios from 'axios'
import store from '@/store'
import { VueAxios } from './axios'
import {Modal, notification} from 'ant-design-vue'
import { ACCESS_TOKEN, TENANT_ID } from "@/store/mutation-types"

let apiBaseUrl = window._CONFIG['domianURL'] || "/jeecg-boot";
// 创建axios实例
const service = axios.create({
  //请求地址，基础路径
  baseURL: apiBaseUrl,
  // 请求超时时间
  timeout: 9000
})

//请求错误时处理方式
const err = (error) => {
  if (error.response) {
    let that=this;
    let data = error.response.data
    const token = Vue.ls.get(ACCESS_TOKEN)
    //根据相应的不同状态码，发出不同的提示信息
    switch (error.response.status) {
      case 403:
        notification.error({ message: '系统提示', description: '拒绝访问',duration: 4})
        break
      case 500:
        let type=error.response.request.responseType;
        if(type === 'blob'){
          blobToJson(data);
          break;
        }
        if(token && data.message.includes("Token失效")){
         //如果Token失效，则弹窗
          Modal.error({
            title: '登录已过期',
            content: '很抱歉，登录已过期，请重新登录',
            okText: '重新登录',
            mask: false,
            onOk: () => {
              //弹窗点击确认后，调用store的退出登录
              store.dispatch('Logout').then(() => {
                //清空本地存储的ACCESS_TOKEN
                Vue.ls.remove(ACCESS_TOKEN)
                try {
                  let path = window.document.location.pathname
                  if(path!="/" && path.indexOf('/user/login')==-1){
                    //如果没在根路径，并且没在登录页，则重载当前页面，触发身份校验
                    window.location.reload()
                  }
                }catch (e) {
                  window.location.reload()
                }
              })
            }
          })
        }
        break
      case 404:
          notification.error({ message: '系统提示', description:'很抱歉，资源未找到!',duration: 4})
        break
      case 504:
        notification.error({ message: '系统提示', description: '网络超时'})
        break
      case 401:
        notification.error({ message: '系统提示', description:'未授权，请重新登录',duration: 4})
        if (token) {
          store.dispatch('Logout').then(() => {
            setTimeout(() => {
              window.location.reload()
            }, 1500)
          })
        }
        break
      default:
        notification.error({
          message: '系统提示',
          description: data.message,
          duration: 4
        })
        break
    }
  }
  return Promise.reject(error)
};

// axios全局请求拦截器
service.interceptors.request.use(config => {
  const token = Vue.ls.get(ACCESS_TOKEN)
  if (token) {
    //在请求头中携带同行Token
    config.headers[ 'X-Access-Token' ] = token
  }
  //获取租户ID
  let tenantid = Vue.ls.get(TENANT_ID)
  if (!tenantid) {
    tenantid = 0;
  }
  //在请求头携带租户ID
  config.headers[ 'tenant_id' ] = tenantid

  if(config.method=='get'){
    //如果是GET方法
    if(config.url.indexOf("sys/dict/getDictItems")<0){
      //如果不是查询字典的请求，则将时间戳_t加入请求参数中
      config.params = {
        //携带时间戳
        _t: Date.parse(new Date())/1000,
        //将GET请求参数展开
        ...config.params
      }
    }
  }
  return config
},(error) => {
  //请求错误
  return Promise.reject(error)
})

// 响应拦截器
service.interceptors.response.use((response) => {
    //正常响应，则响应请求数据
    return response.data
  },
  //否则传入前边定义的响应错误的reject要回调的函数
  err)

const installer = {
  vm: {},
  install (Vue, router = {}) {
    Vue.use(VueAxios, router, service)
  }
}
/**
 * Blob解析
 * @param data
 */
function blobToJson(data) {
  let fileReader = new FileReader();
  let token = Vue.ls.get(ACCESS_TOKEN);
  fileReader.onload = function() {
    try {
      let jsonData = JSON.parse(this.result);  // 说明是普通对象数据，后台转换失败
      console.log("jsonData",jsonData)
      if (jsonData.status === 500) {
        console.log("token----------》",token)
        if(token && jsonData.message.includes("Token失效")){
          Modal.error({
            title: '登录已过期',
            content: '很抱歉，登录已过期，请重新登录',
            okText: '重新登录',
            mask: false,
            onOk: () => {
              store.dispatch('Logout').then(() => {
                Vue.ls.remove(ACCESS_TOKEN)
                window.location.reload()
              })
            }
          })
        }
      }
    } catch (err) {
      // 解析成对象失败，说明是正常的文件流
      console.log("blob解析fileReader返回err",err)
    }
  };
  fileReader.readAsText(data)
}

export {
  installer as VueAxios,
  service as axios
}
