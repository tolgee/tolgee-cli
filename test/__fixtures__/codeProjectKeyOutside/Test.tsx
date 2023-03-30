// @ts-nocheck
import { useTranslate } from '@tolgee/react';

function renderTranslation(t) {
  return t('key-out');
}

export function Component() {
  const { t } = useTranslate();
  return (
    <>
      {t(dynamic)}
      {t('key-in')}
      {renderTranslation(t)}
    </>
  );
}
