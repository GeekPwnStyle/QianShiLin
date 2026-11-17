<script setup lang="ts">
import { useRoute, useRouter } from "vue-router"

const route = useRoute()
const router = useRouter()
const path = route.params.path
const target = "/" + (Array.isArray(path) ? path.join("/") : String(path ?? ""))
router.replace(target)
</script>

<template>
  <span />
</template>
