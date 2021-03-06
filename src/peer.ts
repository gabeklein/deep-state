import { useLookup } from './context';
import { set, Stateful } from './controller';
import { issues } from './issues';
import { Model } from './model';
import { Lookup } from './register';
import { Singleton } from './singleton';
import { define, defineLazy } from './util';

export const Oops = issues({
  CantAttachGlobal: (parent, child) =>
    `Singleton '${parent}' attempted to attach '${child}' but it is not also a singleton.`,

  AmbientRequired: (requested, requester, key) =>
    `Attempted to find an instance of ${requested} in context. It is required for [${requester}.${key}], but one could not be found.`
})

type Peer = typeof Model | typeof Singleton;
type ApplyPeer = (context: Lookup) => void;

const PendingContext = new WeakMap<Stateful, ApplyPeer[]>();
const ContextWasUsed = new WeakMap<Model, boolean>();

export function setPeer<T extends Peer>
  (type: T, required?: boolean): InstanceOf<T> {

  return set(({ subject }, key) => {
    const Self = subject.constructor.name;

    if("current" in type)
      defineLazy(subject, key, () => (type as typeof Singleton).current);
    else if("current" in subject.constructor)
      throw Oops.CantAttachGlobal(Self, type.name);
    else {
      let pending = PendingContext.get(subject);

      if(!pending)
        PendingContext.set(subject, pending = []);

      pending.push((context: Lookup) => {
        const remote = context.get(type);

        if(!remote && required)
          throw Oops.AmbientRequired(type.name, Self, key);

        define(subject, key, remote);
      });
    }
  })
}

export function usePeers(subject: Model){
  if(ContextWasUsed.has(subject)){
    if(ContextWasUsed.get(subject))
      useLookup();

    return;
  }

  const pending = PendingContext.get(subject);

  if(pending){
    const local = useLookup();
  
    for(const init of pending)
      init(local);

    PendingContext.delete(subject);
  }

  ContextWasUsed.set(subject, !!pending);
}