declare const jest;
declare const describe;
declare const it;
declare const expect;
declare const require;

import ObjectValidator from './ObjectValidator';
import PresenceValidator from './PresenceValidator';
import StringValidator from './StringValidator';

import Model from '../Model';
import SetContext from '../SetContext';
import ValueContext from '../ValueContext';
import * as t from '../types';
import * as v from '../validators';

function getTestModel(attributes?) {
  return Model.object(
    {
      object: t.object({
        properties: {
          foo: t.string({
            validator: [new PresenceValidator(), new StringValidator()],
          }),
          bar: t.string(),
        },
      }),
      boolean: t.boolean(),
    },
    attributes,
  );
}

describe('validate', () => {
  it('Should reject with "object has invalid fields" error', async () => {
    const model = getTestModel();
    const validator = new ObjectValidator({
      setContext: new SetContext({
        model,
        path: [],
      }),
      properties: {
        object: t.object({
          properties: {
            foo: t.string({
              validator: [new PresenceValidator(), new StringValidator()],
            }),
            bar: t.string(),
          },
        }),
      },
    });

    await expect(validator.validate(new ValueContext({
      model,
      attribute: 'test',
      path: [],
      value: {
        object: { foo: '' },
      },
    }))).rejects.toMatchObject({
      bindings: { attribute: 'test' },
      message: '{attribute} - object has invalid fields',
    });
  });

  it('Should reject with "object has an invalid type" error', async () => {
    const model = getTestModel();
    const validator = new ObjectValidator({
      setContext: new SetContext({
        model,
        path: [],
      }),
      properties: {
        object: t.object({
          properties: {
            foo: t.string({
              validator: [new PresenceValidator(), new StringValidator()],
            }),
            bar: t.string(),
          },
        }),
      },
    });

    await expect(validator.validate(new ValueContext({
      model,
      attribute: 'test',
      path: [],
      value: 'not an object',
    }))).rejects.toMatchObject({
      bindings: { attribute: 'test' },
      message: '{attribute} - object has an invalid type',
    });
  });

  it('Should reject.', async () => {
    const model = getTestModel({
      object: { foo: '' },
    });


    await expect(model.validate()).rejects.toMatchObject({
      bindings: { attribute: undefined },
      message: '{attribute} - object has invalid fields',
    });
    expect(model.getErrors()).toHaveLength(3);
  });

  it('Should resolve.', async () => {
    const model = getTestModel({
      object: { foo: 'foo', bar: 'bar' },
    });

    await expect(model.validate()).resolves.toBe(undefined);
    expect(model.getErrors()).toHaveLength(0);
  });
});

describe('validate with additionalProperties', () => {
  it('Should resolve.', async () => {
    const model = new Model({
      type: t.object({
        additionalProperties: t.number({
          validator: new PresenceValidator(),
        }),
        properties: {
          foo: t.string({
            validator: new PresenceValidator(),
          }),
        },
      }),
      value: {
        foo: 'bar',
        unknownProp: 1,
      },
    });

    await expect(model.validate()).resolves.toBe(undefined);
    expect(model.getErrors()).toHaveLength(0);
  });

  it('Should reject.', async () => {
    const model = new Model({
      type: t.object({
        additionalProperties: t.number({
          validator: v.number({
            greaterThan: 5,
          }),
        }),
        properties: {
          foo: t.string({
            validator: new PresenceValidator(),
          }),
        },
      }),
      value: {
        foo: 'bar',
        unknownProp: 1,
      },
    });

    await expect(model.validate()).rejects.toMatchObject({
      bindings: { attribute: undefined },
      message: '{attribute} - object has invalid fields',
    });
  });
});
