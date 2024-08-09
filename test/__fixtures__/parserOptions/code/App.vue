<script setup>
import { useTranslate } from '@tolgee/vue';

t('key1');
t('key2', { ns: 'custom' });
const { t } = useTranslate('namespace');
</script>
<template>
  <h3>{{ t('key3') }}</h3>
</template>
