import { ComponentManager as IComponentManager} from "glimmer-runtime/lib/component/interfaces";
import { UpdatableReference } from 'glimmer-object-reference';
import { EvaluatedArgs } from 'glimmer-runtime/lib/compiled/expressions/args';
import Component from "./component";
import ComponentDefinition from "./component-definition";

export default class ComponentManager<Component> implements IComponentManager<Component> {
  create(definition: ComponentDefinition<Component>, args: EvaluatedArgs, dynamicScope, hasDefaultBlock: boolean): Component {
    let klass = definition.ComponentClass;
    let attrs = args.named.value();
    let component = klass.create({ attrs });

    component.didInitAttrs({ attrs });
    component.didReceiveAttrs({ oldAttrs: null, newAttrs: attrs });
    component.willInsertElement();
    component.willRender();

    return component;
  }

  ensureCompilable(definition: ComponentDefinition<Component>, component: Component): ComponentDefinition<Component> {
    return definition;
  }

  getSelf(component: Component): PathReference<Opaque> {
    return new UpdatableReference(component);
  }

  didCreateElement(component: Component, element: Element) {
    component.element = element;
  }

  didCreate(component: Component) {
    component.didInsertElement();
    component.didRender();
  }

  getTag(component: Component) {
    return component.dirtinessTag;
  }

  update(component: Component, args: EvaluatedArgs) {
    let oldAttrs = component.attrs;
    let newAttrs = args.named.value();

    component.set('attrs', newAttrs);
    component.didUpdateAttrs({ oldAttrs, newAttrs });
    component.didReceiveAttrs({ oldAttrs, newAttrs });
    component.willUpdate();
    component.willRender();
  }

  didUpdate(component: Component) {
    component.didUpdate();
    component.didRender();
  }

  getDestructor(component: Component): Destroyable {
    return component;
  }
}