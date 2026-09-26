#!/usr/bin/env node
/* eslint-disable */
// 根据 SITE_NAME 动态生成 manifest.json

const fs = require('fs');
const path = require('path');

// 获取项目根目录
const projectRoot = path.resolve(__dirname, '..');
const publicDir = path.join(projectRoot, 'public');
const manifestPath = path.join(publicDir, 'manifest.json');

// 从环境变量获取站点名称
const siteName = process.env.SITE_NAME || 'TintinTV';

// manifest.json 模板
const manifestTemplate = {
  name: siteName,
  short_name: siteName,
  description: '影视聚合 - 现代流媒体平台',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  background_color: '#101114',
  theme_color: '#101114',
  'apple-mobile-web-app-capable': 'yes',
  'apple-mobile-web-app-status-bar-style': 'black-translucent',
  'apple-mobile-web-app-title': siteName,
  categories: ['entertainment', 'video'],
  lang: 'zh-CN',
  dir: 'ltr',
  icons: [
    {
      src: '/icons/icon-72x72.png',
      sizes: '72x72',
      type: 'image/png',
      purpose: 'any maskable',
    },
    {
      src: '/icons/icon-96x96.png',
      sizes: '96x96',
      type: 'image/png',
      purpose: 'any maskable',
    },
    {
      src: '/icons/icon-128x128.png',
      sizes: '128x128',
      type: 'image/png',
      purpose: 'any maskable',
    },
    {
      src: '/icons/icon-144x144.png',
      sizes: '144x144',
      type: 'image/png',
      purpose: 'any maskable',
    },
    {
      src: '/icons/icon-152x152.png',
      sizes: '152x152',
      type: 'image/png',
      purpose: 'any maskable',
    },
    {
      src: '/icons/icon-192x192.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any maskable',
    },
    {
      src: '/icons/icon-384x384.png',
      sizes: '384x384',
      type: 'image/png',
      purpose: 'any maskable',
    },
    {
      src: '/icons/icon-512x512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any maskable',
    },
  ],
  shortcuts: [
    {
      name: '搜索影视',
      short_name: '搜索',
      description: '搜索电影、电视剧和综艺节目',
      url: '/search',
      icons: [
        {
          src: '/icons/icon-96x96.png',
          sizes: '96x96',
        },
      ],
    },
    {
      name: '我的收藏',
      short_name: '收藏',
      description: '查看收藏的影视作品',
      url: '/?tab=favorites',
      icons: [
        {
          src: '/icons/icon-96x96.png',
          sizes: '96x96',
        },
      ],
    },
  ],
  screenshots: [
    {
      src: '/screenshot1.png',
      sizes: '1280x720',
      type: 'image/png',
      form_factor: 'wide',
      label: '首页展示',
    },
    {
      src: '/screenshot2.png',
      sizes: '750x1334',
      type: 'image/png',
      form_factor: 'narrow',
      label: '移动端界面',
    },
  ],
};

try {
  // 确保 public 目录存在
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // 写入 manifest.json
  fs.writeFileSync(manifestPath, JSON.stringify(manifestTemplate, null, 2));
  console.log(`✅ Generated manifest.json with site name: ${siteName}`);
} catch (error) {
  console.error('❌ Error generating manifest.json:', error);
  process.exit(1);
}
