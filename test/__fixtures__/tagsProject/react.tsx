import { useTranslate } from '@tolgee/react';

export const TestComponent = () => {
  const { t } = useTranslate();
  return <div>{t('controller')}</div>;
};
