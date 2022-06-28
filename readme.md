# 应用于小程序中的dva 全局状态存储插件

## 目的
为了解决
* 父组件<->子组件<->孙组件
* 兄弟组件
* 页面与页面
多重套娃的数据处理

## 使用
1. 在app.js 中引用
```
import dva from 'applets-dva'

const app = new dva()
app.start()

App({
  ...
})
```

2. 导入modal
```
import dva from 'applets-dva'
import xxx from 'xxx'

const app = new dva()

app.model(xxx)
app.start()

App({
  ...
})
```

3. 在page或者component中连接仓库
在生命周期函数中
```
import { connect } 'applets-dva'

onReady() {
  connect('仓库model的namespace', this)
}

attached() {
  connect('仓库model的namespace', this)
}
```

4. 目前抛出的有dispatch和connect的方法；注意reducer和dva不太一样，不能用generator函数

5. Demo
```
const testModal = {
  namespace: 'test',
  state: {
    num: 0,
  },
  effects: {
    asyncAdd({ payload }, { select, put }) {
      put({
        type: 'test/add',
      })

      put({
        type: 'test/asyncReduce',
        payload: {
          test: 1
        }
      })
    },
    asyncReduce(_, { select, put }) {
      const num = select(state => state.test.num)
      put({
        type: 'test/reduce1',
      })

    }
  },
  reducers: {
    add(state, action) {
      return {
        ...state,
        num: state.num + 1
      }
    },
    saveNum(state, action) {
      return {
        ...state,
        num: action.payload
      }
    },
    reduce(state, action) {
      return {
        ...state,
        num: state.num - 1
      }
    },
    reduce1(state, action) {
      return {
        ...state,
        num: state.num - 2
      }
    },
    mulit(state) {
      return {
        ...state,
        num: state.num * state.num
      }
    }
  }
}

export default testModal
```

6. Git地址：https://github.com/Ricardom520/applet-dva