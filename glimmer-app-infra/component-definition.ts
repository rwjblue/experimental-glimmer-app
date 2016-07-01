import { ComponentDefinition as IComponentDefinition, ComponentLayoutBuilder } from "glimmer-runtime/lib/component/interfaces";
import { Layout } from "glimmer-runtime/lib/compiled/blocks";
import { SerializedTemplate } from 'glimmer-wire-format';
import { Environment } from "glimmer-runtime";
import { Dict } from "glimmer-util/lib/collections";
import Template from "glimmer-runtime/lib/template";
import ComponentManager from "./component-manager";
import Component from "./component";

interface ComponentFactory {
  new(attrs: Dict<any>): Component;
  layoutSpec: SerializedTemplate;
}

export default class ComponentDefinition<T> extends IComponentDefinition<T> {
  public foo: string = "bar";
  public manager: ComponentManager<T>;
  public ComponentClass: ComponentFactory;

  compile(builder: ComponentLayoutBuilder) {
    return builder.fromLayout(Template.layoutFromSpec(this.ComponentClass.layoutSpec, builder.env));
  }
}