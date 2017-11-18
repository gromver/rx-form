import AnyType, { AnyTypeConfig } from './AnyType';
import OneOfType from './OneOfType';
import SetContext from '../SetContext';
import ValueContext from '../ValueContext';

export interface ArrayTypeConfig extends AnyTypeConfig {
  rules: AnyType | (AnyType | (() => AnyType))[] | (() => AnyType);
}

export default class ArrayType extends AnyType {
  protected rules: AnyType | (AnyType | (() => AnyType))[] | (() => AnyType);

  constructor(config: ArrayTypeConfig) {
    super(config);

    this.rules = config.rules;
    this.normalizeRule = this.normalizeRule.bind(this);
  }

  private getRule(): AnyType {
    return this.normalizeRule(this.rules);
  }

  private normalizeRule(rule: AnyType | (AnyType | (() => AnyType))[] | (() => AnyType)): AnyType {
    if (typeof rule === 'function') {
      return this.normalizeRule(rule());
    } else if (Array.isArray(rule)) {
      const rules = [...rule].map(this.normalizeRule);

      return new OneOfType({ rules });
    } else if (rule instanceof AnyType) {
      return rule;
    }

    throw new Error('ArrayType:normalizeRule - Invalid rule description.');
  }

  protected applyValue(setContext: SetContext) {
    const rule = this.getRule();
    const { value } = setContext.get();

    for (const k in value) {
      const v = value[k];

      const nextSetContext = setContext.push(k, v);
      rule.apply(nextSetContext);
    }
  }

  protected setValue(setContext: SetContext) {
    const { attribute } = setContext.get();
    const rule = this.getRule();

    const nextSetContext = setContext.shift();

    if (nextSetContext) {
      rule.set(nextSetContext);
    } else {
      rule.apply(setContext);
    }
  }

  /**
   * Проверка типа для вложенного значения
   * @param valueContext ValueContext
   * @throws {Error}
   */
  protected setCheck(valueContext: ValueContext) {
    const { attribute } = valueContext;

    if (typeof attribute !== 'number') {
      throw new Error('ArrayType:setCheck - nested attribute key must be a number');
    }
  }

  protected canSetValue(setContext: SetContext): boolean {
    const { attribute } = setContext.get();
    const rule = this.getRule();

    const nextSetContext = setContext.shift();

    return nextSetContext
      ? rule.canSet(nextSetContext)
      : rule.canApply(setContext);
  }

  /**
   * Проверка типа
   * @param valueContext ValueContext
   * @throws {Error}
   */
  protected typeCheck(valueContext: ValueContext) {
    const value = valueContext.value;

    if (value !== undefined && !Array.isArray(value)) {
      throw new Error('ObjectType:typeCheck - the value must be an array');
    }
  }
}
