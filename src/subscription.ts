import { ModelController } from './controller';
import { BunchOf, UpdateTrigger } from './types';
import { SpyController } from './subscriber';
import { Set } from './polyfill';

declare const setTimeout: (callback: () => void, ms: number) => number;

const { 
  defineProperty: define,
  defineProperties: defineThese, 
  getOwnPropertyDescriptor: describe,
  getOwnPropertyNames: keysOf
} = Object;

const { random } = Math;

const TOGGLEABLE = /^is[A-Z]/;

export const NEW_SUB = "__init_subscription__";
export const UNSUBSCRIBE = "__delete_subscription__";
export const SUBSCRIBE = "__activate_subscription__";

export function applyDispatch(control: ModelController){
  const mutable = {} as BunchOf<any>;
  const register = {} as BunchOf<Set<UpdateTrigger>>;

  const pending = new Set<string>();
  let isPending = false;

  defineThese(control, {
    [NEW_SUB]: { value: startSpying },
    get: { value: control },
    set: { value: control },
    refresh: { value: refreshSubscribersOf },
    export: { value: exportCurrentValues },
    hold: {
      get: () => isPending,
      set: to => isPending = to
    }
  })

  for(const key of keysOf(control)){
    const d = describe(control, key)!;

    if(d.get || d.set || typeof d.value === "function" || key[0] === "_")
      continue;

    mutable[key] = d.value;
    register[key] = new Set();

    define(control, key, {
      get: () => mutable[key],
      set: enqueue(key),
      enumerable: true,
      configurable: false
    })

    defineToggle(key, d);
  }

  function refreshSubscribersOf(...watching: string[]){
    for(const x of watching)
      pending.add(x)
    refresh();
  }

  function exportCurrentValues(this: BunchOf<any>){
    const acc = {} as BunchOf<any>;
    for(const key in this){
        const { value } = describe(this, key)!;
        if(value)
          acc[key] = value;
    }
    for(const key in mutable)
      acc[key] = mutable[key]

    return acc;
  }

  function startSpying(hook: UpdateTrigger){
    return SpyController(control, hook, mutable, register)
  }

  function refresh(){
    if(isPending)
        return;
    isPending = true;
    setTimeout(dispatch, 0)
  }

  function defineToggle(key: string, desc: PropertyDescriptor){
    if(typeof desc.value !== "boolean") return;
    if(TOGGLEABLE.test(key) === false) return;

    define(control, key.replace(/is/, "toggle"), { value: toggle })

    function toggle(){
      mutable[key] = !mutable[key]
      pending.add(key);
      refresh();
    }
  }

  function enqueue(to: string){
    return (value: any) => {
      if(mutable[to] === value) 
          return;

      mutable[to] = value;
      pending.add(to);

      refresh();
    }
  }

  function dispatch(){
    const inform = new Set<UpdateTrigger>();
    for(const key of pending)
      for(const sub of register[key] || [])
        inform.add(sub);

    for(const refresh of inform)
      refresh(random());

    pending.clear();
    isPending = false;
  }
}