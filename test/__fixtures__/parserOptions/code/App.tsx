// @ts-nocheck
import { useTranslate } from '@tolgee/react';
export default function HelloWorld() {
  t('key1');
  t('key2', { ns: 'custom' });
  const { t } = useTranslate('namespace');
  return (
    <>
      <h3>{t('key3')}</h3>
    </>
  );
}
