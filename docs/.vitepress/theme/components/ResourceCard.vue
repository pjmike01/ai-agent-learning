<template>
  <div class="resource-card">
    <div class="rc-title">
      <a :href="url" target="_blank" rel="noopener noreferrer">{{ title }}</a>
    </div>
    <div class="rc-meta">{{ source }}</div>
    <p class="rc-desc">{{ desc }}</p>
    <div v-if="tagList.length" class="rc-tags">
      <span v-for="tag in tagList" :key="tag" class="rc-tag">{{ tag }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  title: string
  source: string
  desc: string
  url: string
  tags?: string
}>()

const tagList = computed(() => {
  if (!props.tags) return []
  try {
    return JSON.parse(props.tags.replace(/'/g, '"'))
  } catch {
    return props.tags.split(',').map(t => t.trim()).filter(Boolean)
  }
})
</script>
