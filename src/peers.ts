import { Context, useContext } from 'react';

import { Controller } from './controller';
import { CONTEXT_MULTIPROVIDER } from './provider';
import { useSubscriber } from './subscriber';
import { define } from './util';

export const ACTIVE_CONTEXT = Symbol("maintain_hooks");

type PeerContext = [string, Context<Controller>];

export class PeerController {
  constructor(
    public type: typeof Controller
  ){}
}

export function getPeerController(
  from: Controller | typeof Controller,
  ...args: any[]){

  if(from instanceof Controller)
    return useSubscriber(from, args, false)
  else
    return new PeerController(from)
}

export function ensurePeerControllers(instance: Controller){
  if(ACTIVE_CONTEXT in instance){
    if(typeof instance[ACTIVE_CONTEXT] == "function")
      instance[ACTIVE_CONTEXT]();
    return;
  }

  const pending = [] as PeerContext[];
  const properties = Object.getOwnPropertyDescriptors(instance);
  const entries = Object.entries(properties);

  for(const [key, { value }] of entries)
    if(value instanceof PeerController)
      pending.push([key, value.type.context!])

  if(pending.length)
    return attachPeersFromContext(instance, pending);
  else 
    instance[ACTIVE_CONTEXT] = undefined as any;
}

function attachPeersFromContext(
  subject: Controller,
  peers: PeerContext[]){

  const multi = useContext(CONTEXT_MULTIPROVIDER);
  const expected = [ CONTEXT_MULTIPROVIDER ] as Context<any>[];

  for(const [name, context] of peers)
    if(multi && multi[name])
      define(subject, name, multi[name])
    else {
      expected.push(context)
      define(subject, name, useContext(context))
    }

  subject[ACTIVE_CONTEXT] = () => {
    expected.forEach(useContext);
  }

  return function reset(){
    subject[ACTIVE_CONTEXT] = undefined as any;
  }
}