<script setup lang="ts">
</script>

<template>
  <div class="sg-page mall-home-decor">
    <div class="sg-actbar">
      <div class="sg-actbar-left">
        <h2 class="mall-hd-title">首页装修</h2>
       
      </div>
    </div>
    <div class="mall-hd-body">
      <a-result status="info" title="首页装修沿用 SCS，无需重新开发">
        
      </a-result>
    </div>

    
  </div>
</template>

<style scoped>
.mall-home-decor {
  position: absolute;
  inset: 16px 24px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: #fff;
  border: 1px solid #eceff1;
  overflow: auto;
}
.mall-hd-title {
  margin: 0;
  font-size: 16px;
  font-weight: 650;
  color: #243332;
}
.mall-hd-body {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.sg-actbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 40px;
  padding: 8px 12px;
  border-bottom: 1px solid #eceff1;
}
.sg-actbar-left {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.sg-act {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 30px;
  padding: 0 12px;
  border: 1px solid #13c2c2;
  border-radius: 4px;
  background: #fff;
  color: #13c2c2;
  font-size: 13px;
  cursor: pointer;
}
.sg-act:hover {
  background: #e8faf6;
}
.sg-req-doc h3 {
  margin: 0 0 12px;
  font-size: 15px;
}
.sg-req-doc p {
  margin: 0;
  line-height: 1.7;
  color: #333;
}
</style>
