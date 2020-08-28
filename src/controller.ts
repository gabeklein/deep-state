import { Context, createContext, FunctionComponent, ProviderProps, useContext } from 'react';

import { ControlledInput, ControlledValue } from './components';
import { ControllerDispatch } from './dispatch';
import { Observable, OBSERVER, Observer } from './observer';
import { TEMP_CONTEXT } from './peers';
import { CONTEXT_MULTIPROVIDER, ControlProvider, createWrappedComponent } from './provider';
import { useActiveSubscriber, useNewController, usePassiveSubscriber } from './subscriber';
import { define, defineAtNeed, Issues, within } from './util';

const Oops = Issues({
  ContextNotFound: (name) =>
    `Can't subscribe to controller; this accessor can` +
    `only be used within a Provider keyed to ${name}.`,

  HasPropertyUndefined: (control, property) =>
    `${control}.${property} is marked as required for this render.`
})

export interface ModelController {
  [TEMP_CONTEXT]: Callback;

  didCreate?(): void;
  didFocus?(parent: ModelController, as: string): void;
  didMount?(...args: any[]): void;
  didRender?(...args: any[]): void;

  willReset?(...args: any[]): void;
  willDestroy?(callback?: Callback): void;
  willLoseFocus?(parent: ModelController, as: string): void;
  willMount?(...args: any[]): void;
  willRender?(...args: any[]): void;
  willUnmount?(...args: any[]): void;
  willUpdate?(...args: any[]): void;
  willCycle?(...args: any[]): Callback;

  elementDidMount?(...args: any[]): void;
  elementWillMount?(...args: any[]): void;
  elementWillRender?(...args: any[]): void;
  elementWillUnmount?(...args: any[]): void;
  elementWillUpdate?(...args: any[]): void;
  elementWillCycle?(...args: any[]): Callback;

  componentDidMount?(...args: any[]): void;
  componentWillMount?(...args: any[]): void;
  componentWillRender?(...args: any[]): void;
  componentWillUnmount?(...args: any[]): void;
  componentWillUpdate?(...args: any[]): void;
  componentWillCycle?(...args: any[]): Callback;
}

export interface Controller 
  extends Observable, ModelController {

  [OBSERVER]: ControllerDispatch;

  get: this;
  set: this;

  Input: FunctionComponent<{ to: string }>;
  Value: FunctionComponent<{ of: string }>;
  Provider: FunctionComponent<ProviderProps<this>>;

  assign(props: BunchOf<any>): this;
  assign(key: string, props?: BunchOf<any>): any;

  tap(): this;
  tap<K extends keyof this>(key?: K): this[K];
}

export class Controller {
  constructor(){
    define(this, {
      get: this,
      set: this
    })
  }

  tap(key?: string){
    const self = usePassiveSubscriber(this);
    return within(self, key);
  }

  sub(...args: any[]){
    return useActiveSubscriber(this, args);
  }
  
  assign(
    a: string | BunchOf<any>, 
    b?: BunchOf<any>){
  
    if(typeof a == "string")
      return within(this, a, b);
    else
      return Object.assign(this, a) as this;
  }

  toggle = (key: string) => {
    const self = this as any;
    return self[key] = !self[key];
  }

  export = (
    subset?: string[] | Callback, 
    onChange?: Callback | boolean,
    initial?: boolean) => {

    const dispatch = this[OBSERVER];

    if(typeof subset == "function"){
      initial = onChange as boolean;
      onChange = subset;
      subset = dispatch.managed;
    }
  
    if(typeof onChange == "function")
      return dispatch.feed(subset!, onChange, initial);
    else 
      return dispatch.pick(subset);
  }

  attach(key: string, type: typeof Controller){
    if(!type.context)
      defineAtNeed(this, key, () => type.find());
  }

  destroy(){
    const dispatch = this[OBSERVER];

    if(dispatch)
      dispatch.trigger("willDestroy");
    
    if(this.willDestroy)
      this.willDestroy();
  }

  private integrate(
    source: BunchOf<any>, 
    only?: string[]){

    const pull = only || Object.keys(source);
    const setters: string[] = [];
    const values = within(this);

    for(const key of pull){
      const desc = Object.getOwnPropertyDescriptor(
        this.constructor.prototype, key
      );
      if(desc && desc.set)
        setters.push(key)
      else
        values[key] = source[key];
    }

    for(const key of setters)
      values[key] = source[key];
  }

  static context?: Context<Controller>;
  static find: () => Controller;
  static meta: <T>(this: T) => T & Observable;

  static create<T extends Class>(
    this: T,
    args?: any[],
    prepare?: (self: InstanceType<T>) => void){

    const instance: InstanceType<T> = 
      new (this as any)(...args || []);

    if(prepare)
      prepare(instance);

    instance[OBSERVER];
    
    return instance;
  }

  static use(...args: any[]){
    return useNewController(this, args);
  }

  static uses(
    props: BunchOf<any>, 
    only?: string[]){
      
    return useNewController(this, undefined, (instance) => {
      instance.integrate(props, only);
    })
  }

  static using(
    props: BunchOf<any>, 
    only?: string[]){

    function assignTo(instance: Controller){
      instance.integrate(props, only);
    }

    const subscriber = useNewController(this, undefined, assignTo);

    assignTo(subscriber);
        
    return subscriber;
  }

  static get(): Controller;
  static get(key?: string){
    return within(this.find(), key);
  }

  static tap(): Controller;
  static tap(key?: string){
    return this.find().tap(key);
  }

  static has(key: string){
    const value = this.find().tap(key);

    if(value === undefined)
      throw Oops.HasPropertyUndefined(this.name, key);

    return value;
  }

  static sub(...args: any[]){
    const instance = this.find();
    return useActiveSubscriber(instance, args);
  }

  static hoc = createWrappedComponent;

  static assign(a: string | BunchOf<any>, b?: BunchOf<any>){
    const instance = this.find();
    instance.assign(a, b);
    return instance.tap();
  }

  static get Provider(){
    return useNewController(this).Provider;
  }
}

defineAtNeed(Controller, "context", () => {
  return createContext<any>(null);
});

defineAtNeed(Controller, "find", function(){
  const { name, context } = this;

  return function useWithinContext(){
    const instance = 
      useContext(context!) || 
      useContext(CONTEXT_MULTIPROVIDER)[name];

    if(!instance)
      throw Oops.ContextNotFound(name);

    return instance;
  }
});

defineAtNeed(Controller, "meta", function(){
  const self = this as unknown as Observable;
  const observer = new Observer(self);

  observer.monitorValues([
    "prototype", "length", "name"
  ]);
  observer.monitorComputed([
    "context", "find", "meta",
    "Provider", "caller", "arguments"
  ]);

  define(self, OBSERVER, observer);
  define(self, {
    get: self,
    set: self
  });

  return function(){
    return usePassiveSubscriber(self);
  };
});

defineAtNeed(Controller.prototype, "Provider", ControlProvider);
defineAtNeed(Controller.prototype, "Value", ControlledValue);
defineAtNeed(Controller.prototype, "Input", ControlledInput);
defineAtNeed(Controller.prototype, OBSERVER, function(){
  const dispatch = new ControllerDispatch(this);

  dispatch.monitorValues(["get", "set"]);
  dispatch.monitorComputed(["Provider", "Input", "Value"]);

  define(this, {
    on: dispatch.on.bind(dispatch),
    once: dispatch.once.bind(dispatch),
    watch: dispatch.watch.bind(dispatch),
    refresh: dispatch.trigger.bind(dispatch)
  })

  if(this.didCreate)
    this.didCreate();

  return dispatch;
});