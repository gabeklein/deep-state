import { FunctionComponentElement, ProviderProps } from 'react';

import { DISPATCH, NEW_SUB, SOURCE } from './dispatch';
import { Set } from './polyfill';
import { SUBSCRIBE, UNSUBSCRIBE } from './subscriber';
import { RENEW_CONSUMERS } from './use_hook';

export type BunchOf<T> = { [key: string]: T }

export type State = LiveState & BunchOf<any>

export type Class = new(...args: any[]) => any;

export type UpdateTrigger = (beat: number) => void;

export interface LiveState<State = any> {
  refresh(): void;
  add(key: string, initial?: any): void;
  export(): State;
}

export interface SpyController extends ModelController {
  [UNSUBSCRIBE]: () => void;
  [SUBSCRIBE]: () => void;
}

export declare class ModelController { 

  static global: boolean;

  local: BunchOf<any>;

  toggle(key: string): boolean;

  didFocus?(parent: ModelController, as: string): void;
  didInit?(): void;
  didMount?(...args: any[]): void;
  willDestroy(callback?: () => void): void;
  willMount?(...args: any[]): void;
  willLoseFocus?(parent: ModelController, as: string): void;
  willRender?(...args: any[]): void;
  willUnmount?(...args: any[]): void;
  willUpdate?(...args: any[]): void;

  elementDidFocus?(parent: ModelController, as: string): void;
  elementDidMount?(...args: any[]): void;
  elementWillLoseFocus?(parent: ModelController, as: string): void;
  elementWillMount?(...args: any[]): void;
  elementWillRender?(...args: any[]): void;
  elementWillUnmount?(...args: any[]): void;
  elementWillUpdate?(...args: any[]): void;

  componentDidMount?(...args: any[]): void;
  componentWillMount?(...args: any[]): void;
  componentWillRender?(...args: any[]): void;
  componentWillUnmount?(...args: any[]): void;
  componentWillUpdate?(...args: any[]): void;

  not(...args: string[]): this;
  on(...args: string[]): this;
  once(): this;
  only(...args: string[]): this;

  watch(props: BunchOf<any>): this;
  refresh(keys: string[]): void;
  
  [NEW_SUB]: (hook: UpdateTrigger) => SpyController;
  [SOURCE]: BunchOf<any>;
  [DISPATCH]: BunchOf<Set<UpdateTrigger>>;
  [RENEW_CONSUMERS]?: () => void;
  
  Provider: FunctionComponentElement<ProviderProps<this>>;
}