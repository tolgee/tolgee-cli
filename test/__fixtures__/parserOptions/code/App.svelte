<script>
  import { getTranslate } from '@tolgee/svelte';

  $t('key1')
  $t('key2', { ns: 'custom' })
  const { t } = getTranslate('namespace');
</script>
<h3>
  {$t('key3')}
</h3>
