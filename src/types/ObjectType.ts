import AnyType, { AnyTypeConfig } from './AnyType';
import AnyOfType from './AnyOfType';
import SetContext from '../SetContext';
import ValueContext from '../ValueContext';
import Validator from '../validators/Validator';
import ObjectValidator from '../validators/ObjectValidator';
import MultipleValidator from '../validators/MultipleValidator';

export interface ValidatorConfig {
  errorMessageType?: string;
  errorMessageFields?: string;
  warningMessage?: string;
}

export interface ObjectTypeConfig extends AnyTypeConfig {
  properties: { [key: string]: AnyType | (AnyType | (() => AnyType))[] | (() => AnyType) };
  additionalProperties?: AnyType | (AnyType | (() => AnyType))[] | (() => AnyType);
  // todo add patternProperties
  validatorConfig?: ValidatorConfig;
}

export default class ObjectType extends AnyType {
  protected properties: {
    [key: string]: AnyType | (AnyType | (() => AnyType))[] | (() => AnyType),
  };
  protected validatorConfig: ValidatorConfig;
  protected additionalProperties?: AnyType | (AnyType | (() => AnyType))[] | (() => AnyType);

  constructor(config: ObjectTypeConfig) {
    super(config);

    this.properties = config.properties;
    this.additionalProperties = config.additionalProperties;
    this.validatorConfig = config.validatorConfig || {};
    this.normalizeType = this.normalizeType.bind(this);
  }

  private getProperties(): { [key: string]: AnyType } {
    const rules = {};

    for (const k in this.properties) {
      rules[k] = this.normalizeType(this.properties[k]);
    }

    return rules;
  }

  private getAdditionalPropertiesType(): AnyType | undefined {
    return this.additionalProperties && this.normalizeType(this.additionalProperties);
  }

  private normalizeType(type: AnyType | (AnyType | (() => AnyType))[] | (() => AnyType)): AnyType {
    if (typeof type === 'function') {
      return this.normalizeType(type());
    } else if (Array.isArray(type)) {
      const types = [...type].map(this.normalizeType);

      return new AnyOfType({ types });
    } else if (type instanceof AnyType) {
      return type;
    }

    throw new Error('ObjectType:normalizeType - Invalid type description.');
  }

  protected applyImpl(setContext: SetContext) {
    // смотрим правила и записываем по полям
    const rules = this.getProperties();
    const additionalPropertiesType = this.getAdditionalPropertiesType();
    const valueContext = setContext.get();
    let { value } = valueContext;
    const { model, path } = valueContext;

    if (this.filter) {
      value = this.filter(value);
    }

    model.setValue(path, {});

    for (const k in value) {
      if (value.hasOwnProperty(k)) {
        const v = value[k];
        const rule = rules[k] || additionalPropertiesType;

        if (rule) {
          const nextSetContext = setContext.push(k, v);
          rule.apply(nextSetContext);
        }
      }
    }

    // значение установлено, сообщаем об этом
    model.dispatchValue(path);
  }

  protected setImpl(setContext: SetContext) {
    const { attribute } = setContext.get();
    const rule = this.getProperties()[attribute] || this.getAdditionalPropertiesType();

    const nextSetContext = setContext.shift();

    if (nextSetContext) {
      rule.set(nextSetContext);
    } else {
      rule.apply(setContext);
    }
  }

  /**
   * Проверка типа для вложенного значения
   * @param {SetContext} setContext
   * @throws {Error}
   */
  setCheck(setContext: SetContext) {
    const valueContext = setContext.get();
    const { attribute } = valueContext;
    const rule = this.getProperties()[attribute] || this.getAdditionalPropertiesType();

    if (!rule) {
      throw new Error(`ObjectType:setCheck - unknown attribute "${attribute}"`);
    }

    const nextSetContext = setContext.shift();

    if (nextSetContext) {
      rule.setCheck(nextSetContext);
    } else {
      rule.applyCheck(setContext);
    }
  }

  // protected canSetImpl(setContext: SetContext): boolean {
  //   const { attribute } = setContext.get();
  //   const rule = this.getProperties()[attribute];
  //
  //   const nextSetContext = setContext.shift();
  //
  //   return nextSetContext
  //     ? rule.canSet(nextSetContext)
  //     : rule.canApply(setContext);
  // }

  protected getTypeImpl(setContext: SetContext): AnyType | void {
    const { attribute } = setContext.get();
    const rule = this.getProperties()[attribute] || this.getAdditionalPropertiesType();

    const nextSetContext = setContext.shift();

    if (nextSetContext) {
      return rule.getType(nextSetContext);
    } else {
      return rule;
    }
  }

  /**
   * Проверка типа
   * @param {SetContext} setContext
   * @throws {Error}
   */
  protected typeCheck(setContext: SetContext) {
    const { value } = setContext.get();

    if (value !== undefined && (value.constructor !== Object)) {
      throw new Error('ObjectType:typeCheck - the value must be an instance of object');
    }
  }

  getValidator(setContext: SetContext): Validator | void {
    if (!this.canApply(setContext)) {
      return;
    }

    let validator = this.validator;

    if (validator) {
      validator = new MultipleValidator({
        validators: [
          new ObjectValidator({
            setContext,
            additionalProperties: this.getAdditionalPropertiesType(),
            properties: this.getProperties(),
            ...this.validatorConfig,
          }),
          validator,
        ],
      });
    } else {
      validator = new ObjectValidator({
        setContext,
        additionalProperties: this.getAdditionalPropertiesType(),
        properties: this.getProperties(),
        ...this.validatorConfig,
      });
    }

    return validator;
  }
}
