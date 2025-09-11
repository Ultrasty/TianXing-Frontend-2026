<script setup>
import bannerImg from '@/assets/light.jpg'; 
import redirectImg from '@/assets/globleweather.png'; 
const newUrl = "http://aimfdp.nmc.cn/"; 
</script>

<template>
  <div class="pageContent">
    <div class="banner">
      <img :src="bannerImg" alt="背景图" />
    </div>

    <div class="redirect-box">
      <!-- 新增的图片 -->
      <img :src="redirectImg" alt="迁移提示图" class="redirect-img" />
      <h1>本页面已迁移</h1>
      <p>天行气象大模型已参加中国气象局人工智能天气预报模型示范计划</p>
      <p>详情请访问：</p>
      <a :href="newUrl" target="_blank" rel="noopener">{{ newUrl }}</a>
    </div>
  </div>
</template>

<style scoped lang="scss">
.pageContent {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.banner {
  position: relative;
  width: 100%;
  height: 300px;
  overflow: hidden;
}

.banner img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 50% -35px;
  z-index: 0;
}

.redirect-box {
  margin-top: 40px;
  background: rgba(255, 255, 255, 0.9);
  padding: 40px 60px;
  border-radius: 15px;
  box-shadow: 0 8px 20px rgba(0,0,0,0.15);
  max-width: 600px;
  text-align: center;
  font-family: "Microsoft YaHei", sans-serif;
}

.redirect-img {
  max-width: 100%;
  height: auto;
  margin-bottom: 20px;
}

.redirect-box h1 {
  font-size: 2.8rem;
  color: #1e40af;
  margin-bottom: 20px;
  font-weight: 600;
}

.redirect-box p {
  font-size: 1.2rem;
  color: #374151;
  margin-bottom: 15px;
}

.redirect-box a {
  font-size: 1.1rem;
  color: #2563eb;
  text-decoration: none;
  word-break: break-word;
  user-select: all;
}

.redirect-box a:hover {
  text-decoration: underline;
  color: #1d4ed8;
}
</style>
