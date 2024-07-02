import { extractTreeAndReport } from '../../../../extractor/extractor.js';
import { ExtractOptions, ParserType } from '../../../../extractor/index.js';

const VERBOSE = false;

async function getReport(
  input: string,
  fileName: string,
  parserType: ParserType,
  options?: Partial<ExtractOptions>
) {
  const { report } = await extractTreeAndReport(input, fileName, parserType, {
    strictNamespace: false,
    defaultNamespace: undefined,
    verbose: VERBOSE ? ['extractor'] : undefined,
    ...options,
  });

  return report;
}

describe('report not influenced by surrounding block', () => {
  describe.each(['js', 'ts', 'jsx', 'tsx'])('JavaScript (.%s)', (ext) => {
    const FILE_NAME = `test.${ext}`;

    it('does not get confused by if block', async () => {
      const report = await getReport(
        `
        if (a < 10) {
          test = t('keyName')
        }
        `,
        FILE_NAME,
        'react'
      );

      expect(report.keys).toEqual([{ keyName: 'keyName', line: 3 }]);
    });

    it('does not get confused by do while block', async () => {
      const report = await getReport(
        `
        do {
          test = t('keyName')
        } while (true)
        `,
        FILE_NAME,
        'react'
      );

      expect(report.keys).toEqual([{ keyName: 'keyName', line: 3 }]);
    });

    it('does not get confused by outer object', async () => {
      const report = await getReport(
        `
        {
          [test]: t('keyName')
        }
        `,
        FILE_NAME,
        'react'
      );

      expect(report.keys).toEqual([{ keyName: 'keyName', line: 3 }]);
    });

    it('respects default namespace in magic comments', async () => {
      const report = await getReport(
        `
        // @tolgee-key key-override
        t('keyName')
        `,
        FILE_NAME,
        'react',
        { defaultNamespace: 'namespace' }
      );

      expect(report.keys).toEqual([
        { keyName: 'key-override', namespace: 'namespace', line: 2 },
      ]);
    });
  });
});
