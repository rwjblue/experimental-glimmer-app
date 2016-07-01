export default class Component {
  public attrs: any;
  public element: Element = null;
  public static layoutSpec: any;

  static create({ attrs }: { attrs: any }): Component {
    return new this(attrs);
  }

  constructor(attrs: any) {
    this.attrs = attrs;
  }

  set(key: string, value: any) {
    this[key] = value;
  }

  didInitAttrs() {}
  didUpdateAttrs() {}
  didReceiveAttrs() {}
  willInsertElement() {}
  willUpdate() {}
  willRender() {}
  didInsertElement() {}
  didUpdate() {}
  didRender() {}
};
