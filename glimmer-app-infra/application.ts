import { UpdatableReference } from 'glimmer-object-reference';
import {
  DynamicScope as IDynamicScope,
  Environment,
  Helper as GlimmerHelper,
  ModifierManager,
  PartialDefinition,
  Layout,
  ComponentLayoutBuilder,
  DOMHelper,
  IDOMHelper,
  EvaluatedArgs,
  Template
} from "glimmer-runtime";
import { Dict, dict } from "glimmer-util/lib/collections";
import { OpaqueIterable } from "glimmer-reference/lib/iterable";
import { Opaque, InternedString } from "glimmer-util/lib/platform-utils";
import {
  Reference,
  PathReference,
  VOLATILE_TAG,
  OpaqueIterator,
  OpaqueIterable,
  AbstractIterable,
  IterationItem
} from "glimmer-reference";
import { assign } from "glimmer-util/lib/object-utils";
import { SerializedTemplate } from 'glimmer-wire-format';

type Attrs = Dict<any>;

import Component from "./component";
import ComponentDefinition from "./component-definition";
import ComponentManager from "./component-manager";
import template from "../../templates/app.hbs";

class DynamicScope implements IDynamicScope {
  view: PathReference<Opaque>;

  constructor(view: PathReference<Opaque>) {
    this.view = view;
  }

  set(assignment: Dict<PathReference<Opaque>>) {
    assign(this, assignment);
  }

  child(): DynamicScope {
    return new DynamicScope(this.view);
  }
}

interface ComponentFactory {
  new(attrs: Dict<any>): Component;
  layoutSpec: SerializedTemplate
}

const componentManager = new ComponentManager();

export default class Application extends Environment {
  private scope: DynamicScope;
  private app: Template;
  private components = dict<ComponentDefinition<any>>();

  constructor(dom?: IDOMHelper) {
    super(dom || new DOMHelper(document));
    this.scope = new DynamicScope(null);
  }

  model(model: any) {
    return new UpdatableReference(model);
  }

  render(model: UpdatableReference<any>, appendTo: HTMLElement) {
    this.begin();
    this.app = Template.fromSpec(template, this);
    let result = this.app.render(model, this, { dynamicScope: this.scope, appendTo });
    this.commit();
    return result;
  }

  registerComponent(name: string, ComponentClass: ComponentFactory) {
    let definition = new ComponentDefinition(name, componentManager, ComponentClass);
    this.components[name] = definition;
    return definition;
  }

  hasComponentDefinition(name: InternedString[]): boolean {
    return !!this.components[<string>name[0]];
  }

  getComponentDefinition(name: InternedString[]): ComponentDefinition<any> {
    return this.components[<string>name[0]];
  }

  hasHelper() {
    return false;
  }

  hasModifier() {
    return false;
  }

  hasPartial() {
    return false;
  }

  iterableFor(ref: Reference<Opaque>, args: EvaluatedArgs): OpaqueIterable {
    let keyPath = args.named.get("key" as InternedString).value();
    let keyFor: KeyFor<Opaque>;

    if (!keyPath) {
      throw new Error('Must specify a key for #each');
    }

    switch (keyPath) {
      case '@index':
        keyFor = (_, index: number) => String(index);
        break;
      case '@primitive':
        keyFor = (item: Opaque) => String(item);
        break;
      default:
        keyFor = (item: Opaque) => item[<string>keyPath];
        break;
    }

    return new Iterable(ref, keyFor);
  }
};

class ArrayIterator implements OpaqueIterator {
  private array: Opaque[];
  private keyFor: KeyFor<number>;
  private position = 0;

  constructor(array: Opaque[], keyFor: KeyFor<number>) {
    this.array = array;
    this.keyFor = keyFor;
  }

  isEmpty(): boolean {
    return this.array.length === 0;
  }

  next(): IterationItem<Opaque, number> {
    let { position, array, keyFor } = this;

    if (position >= array.length) return null;

    let value = array[position];
    let key = keyFor(value, position);
    let memo = position;

    this.position++;

    return { key, value, memo };
  }
}

class ObjectKeysIterator implements OpaqueIterator {
  private keys: string[];
  private values: Opaque[];
  private keyFor: KeyFor<string>;
  private position = 0;

  constructor(keys: string[], values: Opaque[], keyFor: KeyFor<string>) {
    this.keys = keys;
    this.values = values;
    this.keyFor = keyFor;
  }

  isEmpty(): boolean {
    return this.keys.length === 0;
  }

  next(): IterationItem<Opaque, string> {
    let { position, keys, values, keyFor } = this;

    if (position >= keys.length) return null;

    let value = values[position];
    let memo = keys[position];
    let key = keyFor(value, memo);

    this.position++;

    return { key, value, memo };
  }
}

class EmptyIterator implements OpaqueIterator {
  isEmpty(): boolean {
    return true;
  }

  next(): IterationItem<Opaque, Opaque> {
    throw new Error(`Cannot call next() on an empty iterator`);
  }
}

const EMPTY_ITERATOR = new EmptyIterator();

class Iterable implements AbstractIterable<Opaque, Opaque, IterationItem<Opaque, Opaque>, UpdatableReference<Opaque>, UpdatableReference<Opaque>> {
  private ref: Reference<Opaque>;
  private keyFor: KeyFor<Opaque>;

  constructor(ref: Reference<Opaque>, keyFor: KeyFor<Opaque>) {
    this.ref = ref;
    this.keyFor = keyFor;
  }

  iterate(): OpaqueIterator {
    let { ref, keyFor } = this;

    let iterable = ref.value() as any;

    if (Array.isArray(iterable)) {
      return iterable.length > 0 ? new ArrayIterator(iterable, keyFor) : EMPTY_ITERATOR;
    } else if (iterable.forEach !== undefined) {
      let array = [];
      iterable.forEach(function(item) {
        array.push(item);
      });
      return array.length > 0 ? new ArrayIterator(array, keyFor) : EMPTY_ITERATOR;
    } else if (iterable === undefined || iterable === null) {
      return EMPTY_ITERATOR;
    } else if (typeof iterable === 'object') {
       let keys = Object.keys(iterable);
      return keys.length > 0 ? new ObjectKeysIterator(keys, keys.map(key => iterable[key]), keyFor) : EMPTY_ITERATOR;
     } else {
      throw new Error(`Dont know how to {{#each ${iterable}}}`);
    }
  }

  valueReferenceFor(item: IterationItem<Opaque, Opaque>): UpdatableReference<Opaque> {
    return new UpdatableReference(item.value);
  }

  updateValueReference(reference: UpdatableReference<Opaque>, item: IterationItem<Opaque, Opaque>) {
    reference.update(item.value);
  }

  memoReferenceFor(item: IterationItem<Opaque, Opaque>): UpdatableReference<Opaque> {
    return new UpdatableReference(item.memo);
  }

  updateMemoReference(reference: UpdatableReference<Opaque>, item: IterationItem<Opaque, Opaque>) {
    reference.update(item.memo);
  }
}
