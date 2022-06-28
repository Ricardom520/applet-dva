import { Modal, Reducer, State, AnyAction, Effect, Dispatch } from './interface'

// store
const createStore = (
  reducer: Reducer,
  initialState: {
    [props: string]: State
  }
) => {
  let currentReducer = reducer
  let currentState = initialState

  return {
    getState() {
      return currentState
    },
    dispatch(action: AnyAction) {
      currentState = currentReducer(currentState, action)
      return action
    }
  }
}

// applyMiddleware
const compose = (...funcs: Function[]) => {
  if (funcs.length === 0) return (arg: Function) => arg

  if (funcs.length === 1) return funcs[0]

  const last = funcs[funcs.length - 1]
  const rest = funcs.slice(0, -1)

  return (...args: Function[]) => rest.reduceRight((composed, f) => f(composed), last(...args))
}

const applyMiddleware = (...middlewares: Function[]) => {
  return (createStore: Function) =>
    (
      reducer: Reducer,
      initialState: {
        [props: string]: State
      },
      enhancer?: Function
    ) => {
      var store = createStore(reducer, initialState, enhancer)
      var dispatch = store.dispatch

      var chain = []
      var middlewareAPI = {
        getState: store.getState,
        dispatch: (action: AnyAction) => store.dispatch(action)
      }

      chain = middlewares.map((middleware) => middleware(middlewareAPI))
      dispatch = compose(...chain)(store.dispatch)
      return {
        ...store,
        dispatch
      }
    }
}

// logger
const logger =
  (store: { getState: Function; dispatch: Dispatch }) =>
  (next: Function) =>
  (action: AnyAction) => {
    let result = next(action)

    return result
  }

// thunk
const thunk =
  ({ dispatch, getState }: { dispatch: Dispatch; getState: Function }) =>
  (next: Function) =>
  (action: Function) => {
    if (typeof action === 'function') {
      return action(dispatch, getState)
    }

    return next(action)
  }

// combineReducer
const combineReducer =
  (
    reducers: {
      [props: string]: {
        [props: string]: Reducer
      }
    },
    _thiss: { [props: string]: any }
  ) =>
  (state: { [props: string]: State } = {}, action: AnyAction) => {
    let { type } = action
    let stateKey = type.split('/')[0]

    if (reducers[stateKey]) {
      implementReducer(reducers, action, state, _thiss)
    }

    return state
  }

const implementReducer = (
  reducers: {
    [props: string]: {
      [props: string]: Reducer
    }
  },
  action: AnyAction,
  state: { [props: string]: State },
  _thiss: { [props: string]: any }
) => {
  const { type } = action
  const stateKey = type.split('/')[0]
  const reducer = type.split('/')[1]

  if (reducers[stateKey] && reducers[stateKey][reducer]) {
    const current = reducers[stateKey][reducer]
    const newState = current(state[stateKey], action)
    state[stateKey] = newState

    Object.keys(_thiss[stateKey]).forEach((key) => {
      _thiss[stateKey][key].setData({
        [stateKey]: newState
      })
    })
  }
}

class dva {
  private _models: Modal[]
  private _effects: {
    [props: string]: {
      [props: string]: Effect
    }
  }
  private _reducers: {
    [props: string]: {
      [props: string]: Reducer
    }
  }
  private _states: {
    [props: string]: State
  }
  private _thiss: {
    [props: string]: any
  }
  private _isInit: boolean
  public _store: any | undefined

  constructor() {
    this._models = []
    this._effects = {}
    this._reducers = {}
    this._states = {}
    this._thiss = {}
    this._isInit = false
  }

  model(model: Modal) {
    this._models.push(model)

    if (this._isInit) {
      this.start()
    }
  }

  start() {
    for (var i = 0; i < this._models.length; i++) {
      const model = this._models[i]
      const namespace = model.namespace

      this._states[namespace] = {
        ...model.state
      }

      Object.keys(model.reducers || {}).map((key) => {
        if (!this._reducers.hasOwnProperty(namespace)) {
          this._reducers[namespace] = {}
        }
        const func = model.reducers[key]
        this._reducers[namespace][func.name] = func
      })

      Object.keys(model.effects || {}).map((key) => {
        if (!this._effects.hasOwnProperty(namespace)) {
          this._effects[namespace] = {}
        }
        const func = model.effects[key]
        this._effects[namespace][func.name] = func
      })
    }

    var rootReducer = combineReducer(this._reducers, this._thiss)
    let createStoreWithMiddleware = applyMiddleware(thunk, logger)(createStore)

    this._store = createStoreWithMiddleware(rootReducer, this._states)

    this._isInit = true
  }
}

const ProxyCreateDva = (function () {
  let instance: any

  return function () {
    if (instance) {
      return instance
    }

    return (instance = new dva())
  }
})()

export const connect = async function (type: string, _this: any) {
  const app = ProxyCreateDva()

  if (!type) {
    console.error('model节点不能为空')
    return
  } else if (!app._states[type]) {
    console.error('model节点不存在')
    return
  }

  _this.setData({
    [type]: app._states[type]
  })

  if (!app._thiss[type]) {
    app._thiss[type] = {}
  }

  if (_this.__wxExparserNodeId__) {
    // 为微信小程序
    app._thiss[type][_this.__wxExparserNodeId__] = _this
  } else {
    // 其他小程序（如百度小程序）
    if (_this.properties) {
      // 为组件模块
      app._thiss[type][`component_${_this.id}`] = _this
    } else {
      app._thiss[type][`page_${_this.uri}`] = _this
    }
  }
}

export const dispatch = async function (params: AnyAction) {
  const { type, payload = {} } = params
  const stateKey = type.split('/')[0]
  const func = type.split('/')[1]
  const app = ProxyCreateDva()
  const { _effects, _states, _thiss, _reducers } = app

  if (_effects[stateKey] && _effects[stateKey][func]) {
    const current = _effects[stateKey][func]
    const result = current(
      {
        payload
      },
      {
        call: async (func: Function, params: any) => {
          const res = await func(params)

          return res
        },
        put: async (put_action: AnyAction) => {
          if (!put_action || !put_action.type) {
            console.error('action 方法不能为空')
            return
          }
          const { type } = put_action
          const other_func = type.split('/')[1]

          if (!other_func) {
            console.error('方法名称不能为空')
            return
          }

          if (_effects[stateKey] && _effects[stateKey][other_func]) {
            dispatch(put_action)

            return
          }

          await implementReducer(_reducers, put_action, _states, _thiss)
        },
        select: (func: Function) => {
          const res = func(_states)

          return res
        }
      }
    )
    return result
  }

  app._store.dispatch(params)
}

export const states = ProxyCreateDva()._states

export default ProxyCreateDva
