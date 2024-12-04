import { MachineType } from '../../parser/mergerMachine.js';
import { VueMappedTokenType } from '../ParserVue.js';

export const enum S {
  Idle,
  ExpectT,
}

// <T key-name="my_key" /> -> <T keyName="my_key" />
//    ^^^^^^^^                   ^^^^^^^
export const hyphenPropsMerger = {
  initial: S.Idle,
  step: (state, t, end) => {
    const type = t.customType;

    switch (state) {
      case S.Idle:
        if (type === 'tag.attribute.name') {
          return end.MERGE_ALL;
        }
        break;
    }
  },
  resultToken: (tokens) =>
    tokens.map((t) => ({
      ...t,
      token: t.token.replace(/-([a-z])/g, (g) => g[1].toUpperCase()),
    }))[0],
  customType: 'tag.attribute.name',
} as const satisfies MachineType<VueMappedTokenType, S>;
