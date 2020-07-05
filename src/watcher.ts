import { useEffect } from 'react';

import { Controller } from './controller';
import { DISPATCH, ensureDispatch, getDispatch } from './dispatch';
import { useManualRefresh } from './hook';
import { ensurePeerControllers } from './peers';
import { createSubscription, getSubscriber } from './subscription';
import { Callback } from './types';

export function useWatcher(control: Controller){
  const [ cache, onDidUpdate ] = useManualRefresh<any>();

  let { current } = cache;
  
  if(!current){
    ensureDispatch(control);
    current = cache.current = 
      createSubscription(control, onDidUpdate);
  }

  useEffect(() => {
    const subscription = getSubscriber(current);

    subscription.start();
    return () => subscription.stop();
  }, []);

  return current;
}

export function useWatchedProperty<T extends Controller>(
  parent: T, key: string, required?: boolean){

  let value = (parent as any)[key];
  let releaseHooks: Callback | undefined;

  if(value === undefined && required)
    throw new Error(`${parent.constructor.name}.${key} must be defined this render.`)

  const [ cache, onDidUpdate ] = useManualRefresh<{ current: Controller | null }>();

  if(typeof value == "object" && value !== null){
    if(value instanceof Controller){
      ensureDispatch(value);
      //TODO: Changing out instance breaks this.
      releaseHooks = ensurePeerControllers(value);

      const { didFocus } = value;

      if(didFocus)
        didFocus.call(value, parent, key);
    }
  
    if(!cache.current && value[DISPATCH])
      value = cache.current = 
        createSubscription(value, childDidUpdate);
  }

  useEffect(() => {
    const removeListener = 
      getDispatch(parent).addListener(key, parentDidUpdate);

    return () => {
      resetSubscription()
      removeListener()
      
      if(releaseHooks)
        releaseHooks()
    }
  }, []);

  useEffect(() => {
    if(cache.current)
      getSubscriber(cache.current).start();
  }, [value])

  return value;

  /* Subroutines */

  function childDidUpdate(){
    onDidUpdate();
  }

  function parentDidUpdate(){
    resetSubscription();
    onDidUpdate();
  };

  function resetSubscription(){
    const instance = cache.current;

    if(!instance)
      return;

    if(instance.willLoseFocus)
      instance.willLoseFocus(parent, key);

    getSubscriber(instance).stop();
    cache.current = null;
  }
}