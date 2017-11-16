import SetContext from '../SetContext';
import ValueContext from '../ValueContext';
import MultipleFilter from '../filters/MultipleFilter';
import MultiplePermission from '../permissions/MultiplePermission';
import SetValueEvent from '../events/SetValueEvent';

export interface AnyTypeConfig {
  permission?: ((context: ValueContext) => void) | [(context: ValueContext) => void];
  validator?: [any];
  filter?: ((value: any) => any) | [(value: any) => any];
}

export default class AnyType {
  protected permission?: (context: ValueContext) => void;
  protected validator?: [any];
  protected filter?: (value: any) => any;

  constructor(config: AnyTypeConfig) {
    this.permission = Array.isArray(config.permission)
      ? MultiplePermission(config.permission)
      : config.permission;
    this.validator = config.validator;
    this.filter = Array.isArray(config.filter)
      ? MultipleFilter(config.filter)
      : config.filter;
  }

  set(setContext: SetContext) {
    const valueContext = setContext.get();

    this.permissionCheck(valueContext);

    const next = setContext.shift();

    if (next) {
      // forward
      const nestedValueContext = next.get();

      this.typeCheckNested(nestedValueContext);

      this.setValueNested(next);
    } else {
      if (this.filter) {
        valueContext.newValue = this.filter(valueContext.newValue);
      }

      this.typeCheck(valueContext);

      this.setValue(setContext);
    }



    // if (currentContext.value !== value) {
    //   // this.setValue(new ValueContext({
    //   //   ...currentContext,
    //   //   value,
    //   // }));
    //
    //   currentContext.value = value;
    //
    //   this.setValue(currentContext);
    // }

    // if (nextContext) {
    //   this.deepAttributeCheck(nextContext.attribute);
    //   setContext.shift();
    //   this.setValueNested(setContext);
    // }

    // if (this.permissionCheck(setContext)) {
    //   const traversePath = targetPath.slice(currentPath.length);
    //
    //   const [nestedAttribute, ...nestedPath] = traversePath;
    //   if (nestedAttribute) {  // deep setting
    //     if (this.canSetNestedValue(nestedAttribute)) {
    //       this.presetValue(setContext);
    //
    //       setContext.currentPath.push(nestedAttribute);
    //       this.setDeepValue(nestedAttribute, setContext);
    //     } else {
    //       console.warn('Deep value setting is unsupported.');
    //     }
    //   } else {
    //     if (this.canSetValue(setContext)) {
    //       this.setValue(setContext);
    //     }
    //   }
    // }
  }

  canSet(setContext: SetContext): boolean {
    // const [currentContext, nextContext] = setContext.get();

    // if (this.filter) {
    //   currentContext.value = this.filter(currentContext.value);
    // }

    try {
      const valueContext = setContext.get();

      this.permissionCheck(valueContext);

      const next = setContext.shift();

      if (next) {
        // forward
        const nestedValueContext = next.get();

        this.typeCheckNested(nestedValueContext);

        return this.canSetNested(next);
      } else {
        this.typeCheck(valueContext);
      }

      // this.typeCheck(currentContext.value);
      //
      // this.permissionCheck(currentContext);
      //
      // if (nextContext) {
      //   this.deepAttributeCheck(nextContext.attribute);
      //   setContext.shift();
      //
      //   return this.canDeepSet(setContext);
      // }

      return true;
    } catch (error) {
      return false;
    }
  }

  protected canSetNested(setContext: SetContext): boolean {
    return false;
  }

  protected setValue(setContext: SetContext) {
    const { model, path, newValue } = setContext.get();

    model.dispatch(new SetValueEvent(path, newValue));
  }

  protected setValueNested(setContext: SetContext) {
    throw new Error('This value type don\'t support nested value setting.');
  }

  /** Checks **/

  // /**
  //  * Можно ли записать вложенное значение
  //  * @param {string | number} attribute
  //  * @throws Error
  //  */
  // protected deepAttributeCheck(attribute: string|number) {}

  /**
   * Проверка типа
   * @param valueContext ValueContext
   * @throws {Error}
   */
  protected typeCheck(valueContext: ValueContext) {}

  /**
   * Проверка типа для вложенного значения
   * @param valueContext ValueContext
   * @throws {Error}
   */
  protected typeCheckNested(valueContext: ValueContext) {
    throw new Error('This value type can\'t set nested values.');
  }

  /**
   * Запускаем кастомные проверки
   * @param {Context} valueContext
   * @throws {Error}
   */
  protected permissionCheck(valueContext: ValueContext) {
    if (this.permission) {
      // if (!this.permission(valueContext)) {
      //   throw new Error('You try to set a value without having permissions for that');
      // }
      this.permission(valueContext);
    }
  }

  getFilter() {
    return this.filter;
  }

  validate(setContext: SetContext) {

  }

  getValidator(setContext: SetContext) {
    //
  }
}
