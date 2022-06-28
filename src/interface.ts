export interface Modal {
  namespace: string
  state: State
  effects: {
    [props: string]: Effect
  }
  reducers: {
    [props: string]: Reducer
  }
}

export interface State {
  [props: string]: any
}

export type Reducer<S = any, A extends Action = AnyAction> = (state: S | undefined, action: A) => S

export type Effect = (action: AnyAction, effects: EffectsCommandMap) => void

export interface EffectsCommandMap {
  put: <A extends AnyAction>(action: A) => any
  call: Function
  select: Function
  take: Function
  cancel: Function
  [key: string]: any
}

export interface Action<T = any> {
  type: T
}

export type Dispatch = <P = any, C = (payload: P) => void>(action: {
  type: string
  payload?: P
  callback?: C
  [key: string]: any
}) => any

export interface AnyAction extends Action {
  [extraProps: string]: any
}
