/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps, no-console, @next/next/no-img-element */

'use client';

import Hls from 'hls.js';
import {
  ArrowLeft,
  CircleAlert,
  Heart,
  LoaderCircle,
  PanelRightClose,
  PanelRightOpen,
  RotateCcw,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';

import {
  deleteFavorite,
  deletePlayRecord,
  generateStorageKey,
  getAllPlayRecords,
  isFavorited,
  saveFavorite,
  savePlayRecord,
  subscribeToDataUpdates,
} from '@/lib/db.client';
import { readPlayItemsFromSearchParams } from '@/lib/play-handoff';
import { rankSourceTestResults } from '@/lib/source-ranking';
import { SearchResult } from '@/lib/types';
import { getVideoResolutionFromM3u8, processImageUrl } from '@/lib/utils';

import EpisodeSelector from '@/components/EpisodeSelector';
import PageLayout from '@/components/PageLayout';

// 扩展 HTMLVideoElement 类型以支持 hls 属性
declare global {
  interface HTMLVideoElement {
    hls?: any;
  }
}

function PlayPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // -----------------------------------------------------------------------------
  // 状态变量（State）
  // -----------------------------------------------------------------------------
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('正在搜索播放源...');
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<SearchResult | null>(null);

  // 收藏状态
  const [favorited, setFavorited] = useState(false);

  // 去广告开关（从 localStorage 继承，默认 true）
  const [blockAdEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const v = localStorage.getItem('enable_blockad');
      if (v !== null) return v === 'true';
    }
    return true;
  });
  const blockAdEnabledRef = useRef(blockAdEnabled);

  // 视频基本信息
  const [videoTitle, setVideoTitle] = useState(
    searchParams.get('title') || searchParams.get('q') || ''
  );
  const [videoYear, setVideoYear] = useState(searchParams.get('year') || '');
  const [videoCover, setVideoCover] = useState('');
  // 当前源和ID
  const [currentSource, setCurrentSource] = useState(
    searchParams.get('source') || ''
  );
  const [currentId, setCurrentId] = useState(searchParams.get('id') || '');

  // 搜索所需信息
  const [searchTitle] = useState(searchParams.get('stitle') || '');
  const [searchType] = useState(searchParams.get('stype') || '');
  const [searchQueryParam] = useState(searchParams.get('q') || '');
  const [preloadedItems] = useState<SearchResult[] | null>(() => {
    return readPlayItemsFromSearchParams(searchParams);
  });

  // 是否需要优选
  const [needPrefer, setNeedPrefer] = useState(
    searchParams.get('prefer') === 'true'
  );
  const needPreferRef = useRef(needPrefer);
  useEffect(() => {
    needPreferRef.current = needPrefer;
  }, [needPrefer]);
  // 集数相关
  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState(0);

  const currentSourceRef = useRef(currentSource);
  const currentIdRef = useRef(currentId);
  const videoTitleRef = useRef(videoTitle);
  const videoYearRef = useRef(videoYear);
  const detailRef = useRef<SearchResult | null>(detail);
  const currentEpisodeIndexRef = useRef(currentEpisodeIndex);

  // 同步最新值到 refs
  useEffect(() => {
    currentSourceRef.current = currentSource;
    currentIdRef.current = currentId;
    detailRef.current = detail;
    currentEpisodeIndexRef.current = currentEpisodeIndex;
    videoTitleRef.current = videoTitle;
    videoYearRef.current = videoYear;
  }, [
    currentSource,
    currentId,
    detail,
    currentEpisodeIndex,
    videoTitle,
    videoYear,
  ]);

  // 视频播放地址
  const [videoUrl, setVideoUrl] = useState('');

  // 总集数
  const totalEpisodes = detail?.episodes?.length || 0;

  // 用于记录是否需要在播放器 ready 后跳转到指定进度
  const resumeTimeRef = useRef<number | null>(null);
  // 上次使用的音量，默认 0.7
  const lastVolumeRef = useRef<number>(0.7);

  // 换源相关状态
  const [availableSources, setAvailableSources] = useState<SearchResult[]>([]);
  const [sourceSearchLoading, setSourceSearchLoading] = useState(false);
  const [sourceSearchError, setSourceSearchError] = useState<string | null>(
    null
  );

  // 优选和测速开关
  const [optimizationEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('enableOptimization');
      if (saved !== null) {
        try {
          return JSON.parse(saved);
        } catch {
          /* ignore */
        }
      }
    }
    return true;
  });

  // 保存优选时的测速结果，避免EpisodeSelector重复测速
  const [precomputedVideoInfo, setPrecomputedVideoInfo] = useState<
    Map<string, { quality: string; loadSpeed: string; pingTime: number }>
  >(new Map());

  // 折叠状态（仅在 lg 及以上屏幕有效）
  const [isEpisodeSelectorCollapsed, setIsEpisodeSelectorCollapsed] =
    useState(false);

  // 换源加载状态
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [videoLoadingStage, setVideoLoadingStage] = useState<
    'initing' | 'sourceChanging'
  >('initing');

  // 播放进度保存相关
  const saveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveTimeRef = useRef<number>(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  // -----------------------------------------------------------------------------
  // 工具函数（Utils）
  // -----------------------------------------------------------------------------

  // 播放源优选函数
  const preferBestSource = async (
    sources: SearchResult[]
  ): Promise<SearchResult> => {
    if (sources.length === 1) return sources[0];

    // 将播放源均分为两批，并发测速各批，避免一次性过多请求
    const batchSize = Math.ceil(sources.length / 2);
    const allResults: Array<{
      source: SearchResult;
      testResult: { quality: string; loadSpeed: string; pingTime: number };
    } | null> = [];

    for (let start = 0; start < sources.length; start += batchSize) {
      const batchSources = sources.slice(start, start + batchSize);
      const batchResults = await Promise.all(
        batchSources.map(async (source) => {
          try {
            // 检查是否有第一集的播放地址
            if (!source.episodes || source.episodes.length === 0) {
              console.warn(`播放源 ${source.source_name} 没有可用的播放地址`);
              return null;
            }

            const episodeUrl =
              source.episodes.length > 1
                ? source.episodes[1]
                : source.episodes[0];
            const testResult = await getVideoResolutionFromM3u8(episodeUrl);

            return {
              source,
              testResult,
            };
          } catch (error) {
            return null;
          }
        })
      );
      allResults.push(...batchResults);
    }

    // 等待所有测速完成，包含成功和失败的结果
    // 保存所有测速结果到 precomputedVideoInfo，供 EpisodeSelector 使用（包含错误结果）
    const newVideoInfoMap = new Map<
      string,
      {
        quality: string;
        loadSpeed: string;
        pingTime: number;
        hasError?: boolean;
      }
    >();
    allResults.forEach((result, index) => {
      const source = sources[index];
      const sourceKey = `${source.source}-${source.id}`;

      if (result) {
        // 成功的结果
        newVideoInfoMap.set(sourceKey, result.testResult);
      }
    });

    // 过滤出成功的结果用于优选计算
    const successfulResults = allResults.filter(Boolean) as Array<{
      source: SearchResult;
      testResult: { quality: string; loadSpeed: string; pingTime: number };
    }>;

    setPrecomputedVideoInfo(newVideoInfoMap);

    if (successfulResults.length === 0) {
      console.warn('所有播放源测速都失败，使用第一个播放源');
      return sources[0];
    }

    // 按综合评分排序，选择最佳播放源
    const resultsWithScore = rankSourceTestResults(successfulResults);

    console.log('播放源评分排序结果:');
    resultsWithScore.forEach((result, index) => {
      console.log(
        `${index + 1}. ${
          result.source.source_name
        } - 评分: ${result.score.toFixed(2)} (${result.testResult.quality}, ${
          result.testResult.loadSpeed
        }, ${result.testResult.pingTime}ms)`
      );
    });

    return resultsWithScore[0].source;
  };

  // 更新视频地址
  const updateVideoUrl = (
    detailData: SearchResult | null,
    episodeIndex: number
  ) => {
    if (
      !detailData ||
      !detailData.episodes ||
      episodeIndex >= detailData.episodes.length
    ) {
      setVideoUrl('');
      return;
    }
    const newUrl = detailData?.episodes[episodeIndex] || '';
    if (newUrl !== videoUrl) {
      setVideoUrl(newUrl);
    }
  };

  const ensureVideoSource = (video: HTMLVideoElement | null, url: string) => {
    if (!video || !url) return;
    const sources = Array.from(video.getElementsByTagName('source'));
    const existed = sources.some((s) => s.src === url);
    if (!existed) {
      // 移除旧的 source，保持唯一
      sources.forEach((s) => s.remove());
      const sourceEl = document.createElement('source');
      sourceEl.src = url;
      video.appendChild(sourceEl);
    }

    // 始终允许远程播放（AirPlay / Cast）
    video.disableRemotePlayback = false;
    // 如果曾经有禁用属性，移除之
    if (video.hasAttribute('disableRemotePlayback')) {
      video.removeAttribute('disableRemotePlayback');
    }
  };

  // 去广告相关函数
  function filterAdsFromM3U8(m3u8Content: string): string {
    if (!m3u8Content) return '';

    // 按行分割M3U8内容
    const lines = m3u8Content.split('\n');
    const filteredLines = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // 只过滤#EXT-X-DISCONTINUITY标识
      if (!line.includes('#EXT-X-DISCONTINUITY')) {
        filteredLines.push(line);
      }
    }

    return filteredLines.join('\n');
  }

  class CustomHlsJsLoader extends Hls.DefaultConfig.loader {
    constructor(config: any) {
      super(config);
      const load = this.load.bind(this);
      this.load = function (context: any, config: any, callbacks: any) {
        // 拦截manifest和level请求
        if (
          (context as any).type === 'manifest' ||
          (context as any).type === 'level'
        ) {
          const onSuccess = callbacks.onSuccess;
          callbacks.onSuccess = function (
            response: any,
            stats: any,
            context: any
          ) {
            // 如果是m3u8文件，处理内容以移除广告分段
            if (response.data && typeof response.data === 'string') {
              // 过滤掉广告段 - 实现更精确的广告过滤逻辑
              response.data = filterAdsFromM3U8(response.data);
            }
            return onSuccess(response, stats, context, null);
          };
        }
        // 执行原始load方法
        load(context, config, callbacks);
      };
    }
  }

  // 当集数索引变化时自动更新视频地址
  useEffect(() => {
    updateVideoUrl(detail, currentEpisodeIndex);
  }, [detail, currentEpisodeIndex]);

  // 进入页面时直接获取全部源信息
  useEffect(() => {
    const fetchSourceDetail = async (
      source: string,
      id: string
    ): Promise<SearchResult[]> => {
      try {
        const detailResponse = await fetch(
          `/api/detail?source=${source}&id=${id}`
        );
        if (!detailResponse.ok) {
          throw new Error('获取视频详情失败');
        }
        const detailData = (await detailResponse.json()) as SearchResult;
        setAvailableSources([detailData]);
        return [detailData];
      } catch (err) {
        console.error('获取视频详情失败:', err);
        return [];
      } finally {
        setSourceSearchLoading(false);
      }
    };
    const normalizeTitle = (t: string) =>
      (t || '')
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[\p{P}\p{S}·・：:———_-]/gu, '');

    const titlesLooselyMatch = (a: string, b: string) => {
      const na = normalizeTitle(a);
      const nb = normalizeTitle(b);
      if (!na || !nb) return false;
      return na === nb || na.includes(nb) || nb.includes(na);
    };

    const fetchSourcesData = async (query: string): Promise<SearchResult[]> => {
      // 根据搜索词获取全部源信息
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(query.trim())}`
        );
        if (!response.ok) {
          throw new Error('搜索失败');
        }
        const data = await response.json();

        const all: SearchResult[] = data.results || [];

        // 优先规则：
        // 1) 标题宽松匹配且集数有效
        // 2) 年份匹配优先，但不作为硬性条件
        // 3) 若无匹配，退化为标题包含关系 + 集数有效
        // 4) 若仍无，选择集数最多的若干项

        const byLooseTitle = all.filter((r: SearchResult) =>
          titlesLooselyMatch(r.title, videoTitleRef.current)
        );
        const withEpisodes = byLooseTitle.filter(
          (r: SearchResult) =>
            Array.isArray(r.episodes) && r.episodes.length > 0
        );

        // 应用类型约束（tv/movie）
        const applyTypeConstraint = (list: SearchResult[]) =>
          list.filter((r) =>
            searchType
              ? (searchType === 'tv' && r.episodes.length > 1) ||
                (searchType === 'movie' && r.episodes.length === 1)
              : true
          );

        // 年份加权排序：匹配给定年份的排前面
        const sortByYearPreference = (list: SearchResult[]) => {
          const targetYear = (videoYearRef.current || '').toLowerCase();
          return [...list].sort((a, b) => {
            const ay = (a.year || '').toLowerCase();
            const by = (b.year || '').toLowerCase();
            const aMatch = targetYear && ay === targetYear ? 1 : 0;
            const bMatch = targetYear && by === targetYear ? 1 : 0;
            if (aMatch !== bMatch) return bMatch - aMatch;
            // 次级依据：集数多的优先
            return (b.episodes?.length || 0) - (a.episodes?.length || 0);
          });
        };

        let results: SearchResult[] = applyTypeConstraint(
          sortByYearPreference(withEpisodes)
        );

        if (results.length === 0) {
          const fallbackLoose = all.filter(
            (r: SearchResult) =>
              titlesLooselyMatch(r.title, videoTitleRef.current) ||
              titlesLooselyMatch(r.title, query)
          );
          const fallbackWithEpisodes = fallbackLoose.filter(
            (r: SearchResult) =>
              Array.isArray(r.episodes) && r.episodes.length > 0
          );
          results = applyTypeConstraint(
            sortByYearPreference(fallbackWithEpisodes)
          );
        }

        if (results.length === 0) {
          // 最终兜底：按集数多少排序选前若干个
          results = [...all]
            .filter((r) => Array.isArray(r.episodes))
            .sort(
              (a, b) => (b.episodes?.length || 0) - (a.episodes?.length || 0)
            )
            .slice(0, 8);
        }

        setAvailableSources(results);
        return results;
      } catch (err) {
        setSourceSearchError(err instanceof Error ? err.message : '搜索失败');
        setAvailableSources([]);
        return [];
      } finally {
        setSourceSearchLoading(false);
      }
    };

    const initAll = async () => {
      if (
        !currentSource &&
        !currentId &&
        !videoTitle &&
        !searchTitle &&
        !searchQueryParam
      ) {
        setError('缺少必要参数');
        setLoading(false);
        return;
      }
      setLoading(true);
      setLoadingMessage(
        currentSource && currentId ? '正在获取视频详情...' : '正在搜索播放源...'
      );

      let sourcesInfo: SearchResult[] = [];

      if (preloadedItems && preloadedItems.length > 0) {
        // 直接使用预加载结果（来自聚合卡片），优先选择有集数的数据
        const preWithEpisodes = preloadedItems.filter(
          (r) => Array.isArray(r.episodes) && r.episodes.length > 0
        );
        const chosen =
          preWithEpisodes.length > 0 ? preWithEpisodes : preloadedItems;
        setAvailableSources(chosen);
        // 若初始没有标题，则用第一项的标题和年份做兜底
        if (!videoTitleRef.current) {
          setVideoTitle(chosen[0].title);
        }
        if (!videoYearRef.current && chosen[0].year) {
          setVideoYear(chosen[0].year);
        }
        sourcesInfo = chosen;
      } else {
        // 根据搜索词获取全部源信息
        sourcesInfo = await fetchSourcesData(
          searchTitle || videoTitle || searchQueryParam
        );
      }

      if (
        currentSource &&
        currentId &&
        !sourcesInfo.some(
          (source) => source.source === currentSource && source.id === currentId
        )
      ) {
        sourcesInfo = await fetchSourceDetail(currentSource, currentId);
      }
      if (sourcesInfo.length === 0) {
        setError('未找到匹配结果');
        setLoading(false);
        return;
      }

      let detailData: SearchResult = sourcesInfo[0];
      // 指定源和id且无需优选
      if (currentSource && currentId && !needPreferRef.current) {
        const target = sourcesInfo.find(
          (source) => source.source === currentSource && source.id === currentId
        );
        if (target) {
          detailData = target;
        } else {
          setError('未找到匹配结果');
          setLoading(false);
          return;
        }
      }

      // 未指定源和 id 或需要优选，且开启优选开关
      if (
        (!currentSource || !currentId || needPreferRef.current) &&
        optimizationEnabled
      ) {
        setLoadingMessage('正在选择播放源...');

        detailData = await preferBestSource(sourcesInfo);
      }

      console.log(detailData.source, detailData.id);

      // 如果所选详情没有有效集数，尝试直接拉取详情数据作为兜底
      if (!detailData.episodes || detailData.episodes.length === 0) {
        const enriched = await fetchSourceDetail(
          detailData.source,
          detailData.id
        );
        if (enriched.length > 0) {
          detailData = enriched[0];
        }
      }

      setNeedPrefer(false);
      setCurrentSource(detailData.source);
      setCurrentId(detailData.id);
      setVideoYear(detailData.year);
      setVideoTitle(detailData.title || videoTitleRef.current);
      setVideoCover(detailData.poster);
      setDetail(detailData);
      if (currentEpisodeIndex >= detailData.episodes.length) {
        setCurrentEpisodeIndex(0);
      }

      // 规范URL参数
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('source', detailData.source);
      newUrl.searchParams.set('id', detailData.id);
      newUrl.searchParams.set('year', detailData.year);
      newUrl.searchParams.set('title', detailData.title);
      newUrl.searchParams.delete('prefer');
      window.history.replaceState({}, '', newUrl.toString());

      setLoadingMessage('即将开始播放...');

      // 短暂延迟让用户看到完成状态
      setTimeout(() => {
        setLoading(false);
      }, 1000);
    };

    initAll();
  }, []);

  // 播放记录处理
  useEffect(() => {
    // 仅在初次挂载时检查播放记录
    const initFromHistory = async () => {
      if (!currentSource || !currentId) return;

      try {
        const allRecords = await getAllPlayRecords();
        const key = generateStorageKey(currentSource, currentId);
        const record = allRecords[key];

        if (record) {
          const targetIndex = record.index - 1;
          const targetTime = record.play_time;

          // 更新当前选集索引
          if (targetIndex !== currentEpisodeIndex) {
            setCurrentEpisodeIndex(targetIndex);
          }

          // 保存待恢复的播放进度，待播放器就绪后跳转
          resumeTimeRef.current = targetTime;
        }
      } catch (err) {
        console.error('读取播放记录失败:', err);
      }
    };

    initFromHistory();
  }, []);

  // 处理换源
  const handleSourceChange = async (
    newSource: string,
    newId: string,
    newTitle: string
  ) => {
    try {
      // 显示换源加载状态
      setVideoLoadingStage('sourceChanging');
      setIsVideoLoading(true);

      // 记录当前播放进度（仅在同一集数切换时恢复）
      const currentPlayTime = videoRef.current?.currentTime || 0;
      console.log('换源前当前播放时间:', currentPlayTime);

      // 清除前一个历史记录
      if (currentSourceRef.current && currentIdRef.current) {
        try {
          await deletePlayRecord(
            currentSourceRef.current,
            currentIdRef.current
          );
          console.log('已清除前一个播放记录');
        } catch (err) {
          console.error('清除播放记录失败:', err);
        }
      }

      const newDetail = availableSources.find(
        (source) => source.source === newSource && source.id === newId
      );
      if (!newDetail) {
        setError('未找到匹配结果');
        return;
      }

      // 尝试跳转到当前正在播放的集数
      let targetIndex = currentEpisodeIndex;

      // 如果当前集数超出新源的范围，则跳转到第一集
      if (!newDetail.episodes || targetIndex >= newDetail.episodes.length) {
        targetIndex = 0;
      }

      // 如果仍然是同一集数且播放进度有效，则在播放器就绪后恢复到原始进度
      if (targetIndex !== currentEpisodeIndex) {
        resumeTimeRef.current = 0;
      } else if (
        (!resumeTimeRef.current || resumeTimeRef.current === 0) &&
        currentPlayTime > 1
      ) {
        resumeTimeRef.current = currentPlayTime;
      }

      // 更新URL参数（不刷新页面）
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('source', newSource);
      newUrl.searchParams.set('id', newId);
      newUrl.searchParams.set('year', newDetail.year);
      window.history.replaceState({}, '', newUrl.toString());

      setVideoTitle(newDetail.title || newTitle);
      setVideoYear(newDetail.year);
      setVideoCover(newDetail.poster);
      setCurrentSource(newSource);
      setCurrentId(newId);
      setDetail(newDetail);
      setCurrentEpisodeIndex(targetIndex);
    } catch (err) {
      // 隐藏换源加载状态
      setIsVideoLoading(false);
      setError(err instanceof Error ? err.message : '换源失败');
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyboardShortcuts);
    return () => {
      document.removeEventListener('keydown', handleKeyboardShortcuts);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // 集数切换
  // ---------------------------------------------------------------------------
  // 处理集数切换
  const handleEpisodeChange = (episodeNumber: number) => {
    if (episodeNumber >= 0 && episodeNumber < totalEpisodes) {
      // 在更换集数前保存当前播放进度
      if (videoRef.current && videoRef.current.paused) {
        saveCurrentPlayProgress();
      }
      setCurrentEpisodeIndex(episodeNumber);
    }
  };

  const handlePreviousEpisode = () => {
    const d = detailRef.current;
    const idx = currentEpisodeIndexRef.current;
    if (d && d.episodes && idx > 0) {
      saveCurrentPlayProgress();
      setCurrentEpisodeIndex(idx - 1);
    }
  };

  const handleNextEpisode = () => {
    const d = detailRef.current;
    const idx = currentEpisodeIndexRef.current;
    if (d && d.episodes && idx < d.episodes.length - 1) {
      saveCurrentPlayProgress();
      setCurrentEpisodeIndex(idx + 1);
    }
  };

  // ---------------------------------------------------------------------------
  // 键盘快捷键
  // ---------------------------------------------------------------------------
  // 处理全局快捷键
  const handleKeyboardShortcuts = (e: KeyboardEvent) => {
    // 忽略输入框中的按键事件
    if (
      (e.target as HTMLElement).tagName === 'INPUT' ||
      (e.target as HTMLElement).tagName === 'TEXTAREA'
    )
      return;

    // Alt + 左箭头 = 上一集
    if (e.altKey && e.key === 'ArrowLeft') {
      if (detailRef.current && currentEpisodeIndexRef.current > 0) {
        handlePreviousEpisode();
        e.preventDefault();
      }
    }

    // Alt + 右箭头 = 下一集
    if (e.altKey && e.key === 'ArrowRight') {
      const d = detailRef.current;
      const idx = currentEpisodeIndexRef.current;
      if (d && idx < d.episodes.length - 1) {
        handleNextEpisode();
        e.preventDefault();
      }
    }

    // 左箭头 = 快退
    if (!e.altKey && e.key === 'ArrowLeft') {
      if (videoRef.current && videoRef.current.currentTime > 5) {
        videoRef.current.currentTime -= 10;
        e.preventDefault();
      }
    }

    // 右箭头 = 快进
    if (!e.altKey && e.key === 'ArrowRight') {
      if (
        videoRef.current &&
        (videoRef.current.duration || 0) - videoRef.current.currentTime > 5
      ) {
        videoRef.current.currentTime += 10;
        e.preventDefault();
      }
    }

    // 上箭头 = 音量+
    if (e.key === 'ArrowUp') {
      if (videoRef.current && videoRef.current.volume < 1) {
        videoRef.current.volume =
          Math.round((videoRef.current.volume + 0.1) * 10) / 10;
        e.preventDefault();
      }
    }

    // 下箭头 = 音量-
    if (e.key === 'ArrowDown') {
      if (videoRef.current && videoRef.current.volume > 0) {
        videoRef.current.volume =
          Math.round((videoRef.current.volume - 0.1) * 10) / 10;
        e.preventDefault();
      }
    }

    // 空格 = 播放/暂停
    if (e.key === ' ') {
      if (videoRef.current) {
        if (videoRef.current.paused) {
          videoRef.current.play().catch((err) => {
            console.warn('play() failed:', err);
          });
        } else {
          videoRef.current.pause();
        }
        e.preventDefault();
      }
    }

    // f 键 = 切换全屏
    if (e.key === 'f' || e.key === 'F') {
      const el = videoRef.current as any;
      if (!el) return;
      const d = document as any;
      const isFs =
        d.fullscreenElement ||
        d.webkitFullscreenElement ||
        d.msFullscreenElement;
      if (!isFs) {
        (
          el.requestFullscreen ||
          el.webkitRequestFullscreen ||
          el.msRequestFullscreen
        )?.call(el);
      } else {
        (
          d.exitFullscreen ||
          d.webkitExitFullscreen ||
          d.msExitFullscreen
        )?.call(d);
      }
      e.preventDefault();
    }
  };

  // ---------------------------------------------------------------------------
  // 播放记录相关
  // ---------------------------------------------------------------------------
  // 保存播放进度
  const saveCurrentPlayProgress = async () => {
    if (
      !videoRef.current ||
      !currentSourceRef.current ||
      !currentIdRef.current ||
      !videoTitleRef.current ||
      !detailRef.current?.source_name
    ) {
      return;
    }

    const player = videoRef.current;
    const currentTime = player.currentTime || 0;
    const duration = player.duration || 0;

    // 如果播放时间太短（少于5秒）或者视频时长无效，不保存
    if (currentTime < 1 || !duration) {
      return;
    }

    try {
      await savePlayRecord(currentSourceRef.current, currentIdRef.current, {
        title: videoTitleRef.current,
        source_name: detailRef.current?.source_name || '',
        year: detailRef.current?.year,
        cover: detailRef.current?.poster || '',
        index: currentEpisodeIndexRef.current + 1, // 转换为1基索引
        total_episodes: detailRef.current?.episodes.length || 1,
        play_time: Math.floor(currentTime),
        total_time: Math.floor(duration),
        save_time: Date.now(),
        search_title: searchTitle,
      });

      lastSaveTimeRef.current = Date.now();
      console.log('播放进度已保存:', {
        title: videoTitleRef.current,
        episode: currentEpisodeIndexRef.current + 1,
        year: detailRef.current?.year,
        progress: `${Math.floor(currentTime)}/${Math.floor(duration)}`,
      });
    } catch (err) {
      console.error('保存播放进度失败:', err);
    }
  };

  useEffect(() => {
    // 页面即将卸载时保存播放进度
    const handleBeforeUnload = () => {
      saveCurrentPlayProgress();
    };

    // 页面可见性变化时保存播放进度
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveCurrentPlayProgress();
      }
    };

    // 添加事件监听器
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      // 清理事件监听器
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentEpisodeIndex, detail]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
      }
    };
  }, []);

  // ---------------------------------------------------------------------------
  // 收藏相关
  // ---------------------------------------------------------------------------
  // 每当 source 或 id 变化时检查收藏状态
  useEffect(() => {
    if (!currentSource || !currentId) return;
    (async () => {
      try {
        const fav = await isFavorited(currentSource, currentId);
        setFavorited(fav);
      } catch (err) {
        console.error('检查收藏状态失败:', err);
      }
    })();
  }, [currentSource, currentId]);

  // 监听收藏数据更新事件
  useEffect(() => {
    if (!currentSource || !currentId) return;

    const unsubscribe = subscribeToDataUpdates(
      'favoritesUpdated',
      (favorites: Record<string, any>) => {
        const key = generateStorageKey(currentSource, currentId);
        const isFav = !!favorites[key];
        setFavorited(isFav);
      }
    );

    return unsubscribe;
  }, [currentSource, currentId]);

  // 切换收藏
  const handleToggleFavorite = async () => {
    if (
      !videoTitleRef.current ||
      !detailRef.current ||
      !currentSourceRef.current ||
      !currentIdRef.current
    )
      return;

    try {
      if (favorited) {
        // 如果已收藏，删除收藏
        await deleteFavorite(currentSourceRef.current, currentIdRef.current);
        setFavorited(false);
      } else {
        // 如果未收藏，添加收藏
        await saveFavorite(currentSourceRef.current, currentIdRef.current, {
          title: videoTitleRef.current,
          source_name: detailRef.current?.source_name || '',
          year: detailRef.current?.year,
          cover: detailRef.current?.poster || '',
          total_episodes: detailRef.current?.episodes.length || 1,
          save_time: Date.now(),
          search_title: searchTitle,
        });
        setFavorited(true);
      }
    } catch (err) {
      console.error('切换收藏失败:', err);
    }
  };

  useEffect(() => {
    if (!videoUrl || loading) return;

    // 确保选集索引有效
    if (
      !detail ||
      !detail.episodes ||
      currentEpisodeIndex >= detail.episodes.length ||
      currentEpisodeIndex < 0
    ) {
      setError(`选集索引无效，当前共 ${totalEpisodes} 集`);
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    // 清理旧 HLS
    if (hlsRef.current) {
      try {
        hlsRef.current.destroy();
      } catch (_) {
        /* ignore */
      }
      hlsRef.current = null;
    }

    // 设置基础属性
    video.setAttribute('playsinline', 'true');
    (video as any).webkitPlaysInline = true;
    video.poster = videoCover || '';
    video.crossOrigin = 'anonymous';

    const canNativeHls =
      video.canPlayType('application/vnd.apple.mpegurl') === 'probably' ||
      video.canPlayType('application/vnd.apple.mpegurl') === 'maybe';

    // 监听
    const onCanPlay = () => {
      if (resumeTimeRef.current && resumeTimeRef.current > 0) {
        try {
          const duration = video.duration || 0;
          let target = resumeTimeRef.current;
          if (duration && target >= duration - 2) {
            target = Math.max(0, duration - 5);
          }
          video.currentTime = target;
          console.log('成功恢复播放进度到:', resumeTimeRef.current);
        } catch (err) {
          console.warn('恢复播放进度失败:', err);
        }
      }
      resumeTimeRef.current = null;
      setIsVideoLoading(false);
    };
    const onVolume = () => {
      lastVolumeRef.current = video.volume;
    };
    const onTimeUpdate = () => {
      const now = Date.now();
      let interval = 5000;
      if (process.env.NEXT_PUBLIC_STORAGE_TYPE === 'd1') interval = 10000;
      if (process.env.NEXT_PUBLIC_STORAGE_TYPE === 'upstash') interval = 20000;
      if (now - lastSaveTimeRef.current > interval) {
        saveCurrentPlayProgress();
        lastSaveTimeRef.current = now;
      }
    };
    const onEnded = () => {
      const d = detailRef.current;
      const idx = currentEpisodeIndexRef.current;
      if (d && d.episodes && idx < d.episodes.length - 1) {
        setTimeout(() => setCurrentEpisodeIndex(idx + 1), 1000);
      }
    };
    const onPause = () => {
      saveCurrentPlayProgress();
    };

    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('volumechange', onVolume);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('ended', onEnded);
    video.addEventListener('pause', onPause);

    // 加载源
    if (canNativeHls || !Hls.isSupported()) {
      ensureVideoSource(video, videoUrl);
      video.src = videoUrl;
      video.load();
    } else {
      const hls = new Hls({
        debug: false,
        enableWorker: true,
        lowLatencyMode: true,
        maxBufferLength: 30,
        backBufferLength: 30,
        maxBufferSize: 60 * 1000 * 1000,
        loader: blockAdEnabledRef.current
          ? CustomHlsJsLoader
          : Hls.DefaultConfig.loader,
      });
      hlsRef.current = hls;
      hls.attachMedia(video);
      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        hls.loadSource(videoUrl);
      });
      hls.on(Hls.Events.ERROR, function (_event: any, data: any) {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              try {
                hls.destroy();
              } catch (_) {
                /* ignore */
              }
              break;
          }
        }
      });
    }

    return () => {
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('volumechange', onVolume);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('pause', onPause);
      if (hlsRef.current) {
        try {
          hlsRef.current.destroy();
        } catch (_) {
          /* ignore */
        }
        hlsRef.current = null;
      }
    };
  }, [videoUrl, loading, blockAdEnabled]);

  // 当组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
      }
    };
  }, []);

  if (loading) {
    return (
      <PageLayout activePath='/play'>
        <div className='flex min-h-[70vh] items-center justify-center px-6'>
          <div
            role='status'
            aria-live='polite'
            className='w-full max-w-md text-center'
          >
            <LoaderCircle
              className='mx-auto h-9 w-9 animate-spin text-brand-600 dark:text-brand-300'
              aria-hidden='true'
            />
            <h1 className='mt-6 break-words text-2xl font-semibold text-slate-950 dark:text-white'>
              {videoTitle || '正在准备播放'}
            </h1>
            <p className='mt-3 text-sm text-slate-600 dark:text-slate-300'>
              {loadingMessage}
            </p>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout activePath='/play'>
        <div className='flex min-h-[70vh] items-center justify-center px-6'>
          <div role='alert' className='w-full max-w-md text-center'>
            <CircleAlert
              className='mx-auto h-10 w-10 text-rose-600 dark:text-rose-400'
              aria-hidden='true'
            />
            <h1 className='mt-5 text-2xl font-semibold text-slate-950 dark:text-white'>
              暂时无法播放
            </h1>
            <p className='mt-3 break-words text-sm leading-6 text-slate-600 dark:text-slate-300'>
              {error}
            </p>
            <div className='mt-7 flex flex-wrap justify-center gap-3'>
              <button
                onClick={() =>
                  videoTitle
                    ? router.push(`/search?q=${encodeURIComponent(videoTitle)}`)
                    : router.back()
                }
                className='inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-white/20 dark:text-slate-200 dark:hover:bg-white/10'
              >
                <ArrowLeft className='h-4 w-4' />
                {videoTitle ? '返回搜索' : '返回上页'}
              </button>
              <button
                onClick={() => window.location.reload()}
                className='inline-flex min-h-11 items-center gap-2 rounded-lg bg-slate-950 px-5 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-brand-100'
              >
                <RotateCcw className='h-4 w-4' />
                重新尝试
              </button>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout activePath='/play'>
      <div className='tv-play flex flex-col gap-3'>
        {/* 第一行：影片标题 */}
        <div className='flex items-center gap-3 py-1'>
          <button
            type='button'
            onClick={() => router.back()}
            aria-label='返回上一页'
            className='tv-back-button hidden h-9 w-9 items-center justify-center rounded-md md:inline-flex'
          >
            <ArrowLeft className='h-5 w-5' />
          </button>
          <h1 className='tv-now-playing text-xl font-semibold'>
            {videoTitle || '影片标题'}
            {totalEpisodes > 1 && (
              <span className='text-gray-500 dark:text-gray-400'>
                {` > 第 ${currentEpisodeIndex + 1} 集`}
              </span>
            )}
          </h1>
        </div>
        {/* 第二行：播放器和选集 */}
        <div className='space-y-2'>
          {/* 折叠控制 - 仅在 lg 及以上屏幕显示 */}
          <div className='hidden lg:flex justify-end'>
            <button
              onClick={() =>
                setIsEpisodeSelectorCollapsed(!isEpisodeSelectorCollapsed)
              }
              className='tv-panel-toggle group relative flex items-center space-x-1.5 px-3 py-1.5 rounded-md transition-all duration-200'
              title={
                isEpisodeSelectorCollapsed ? '显示选集面板' : '隐藏选集面板'
              }
            >
              {isEpisodeSelectorCollapsed ? (
                <PanelRightOpen className='h-4 w-4' />
              ) : (
                <PanelRightClose className='h-4 w-4' />
              )}
              <span className='text-xs font-medium text-gray-600 dark:text-gray-300'>
                {isEpisodeSelectorCollapsed ? '显示' : '隐藏'}
              </span>
            </button>
          </div>

          <div
            className={`play-content-grid grid gap-4 lg:items-stretch transition-all duration-300 ease-in-out ${
              isEpisodeSelectorCollapsed ? 'play-content-grid--collapsed' : ''
            }`}
          >
            {/* 播放器 */}
            <div className='tv-player-frame min-w-0 transition-all duration-300 ease-in-out'>
              <div
                className='relative w-full overflow-hidden bg-black'
                style={{
                  aspectRatio: '16 / 9',
                  maxHeight: 'calc(100vh - 12rem)',
                }}
              >
                <video
                  ref={videoRef}
                  className='bg-black w-full h-full object-contain overflow-hidden'
                  controls
                  playsInline
                  webkit-playsinline='true'
                  x-webkit-airplay='allow'
                  preload='metadata'
                />

                {/* 换源加载蒙层 */}
                {isVideoLoading && (
                  <div className='absolute inset-0 z-[500] flex items-center justify-center rounded-xl bg-black/85 px-5 text-white'>
                    <div
                      role='status'
                      aria-live='polite'
                      className='flex items-center gap-3 text-sm font-medium'
                    >
                      <LoaderCircle
                        className='h-5 w-5 animate-spin text-brand-300'
                        aria-hidden='true'
                      />
                      {videoLoadingStage === 'sourceChanging'
                        ? '正在切换播放源...'
                        : '视频加载中...'}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 选集和换源 - 在移动端始终显示，在 lg 及以上可折叠 */}
            <div
              className={`tv-episode-panel min-w-0 transition-all duration-300 ease-in-out md:overflow-hidden ${
                isEpisodeSelectorCollapsed
                  ? 'lg:hidden lg:opacity-0 lg:scale-95'
                  : 'lg:opacity-100 lg:scale-100'
              }`}
            >
              <EpisodeSelector
                totalEpisodes={totalEpisodes}
                value={currentEpisodeIndex + 1}
                onChange={handleEpisodeChange}
                onSourceChange={handleSourceChange}
                currentSource={currentSource}
                currentId={currentId}
                videoTitle={searchTitle || videoTitle}
                availableSources={availableSources}
                sourceSearchLoading={sourceSearchLoading}
                sourceSearchError={sourceSearchError}
                precomputedVideoInfo={precomputedVideoInfo}
              />
            </div>
          </div>
        </div>

        {/* 详情展示 */}
        <div className='tv-detail-grid grid grid-cols-1 md:grid-cols-4 gap-4'>
          {/* 文字区 */}
          <div className='md:col-span-3'>
            <div className='tv-detail-copy flex flex-col min-h-0'>
              {/* 标题 */}
              <h2 className='text-3xl font-semibold mb-2 flex items-center flex-shrink-0 text-left w-full'>
                {videoTitle || '影片标题'}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleFavorite();
                  }}
                  className='ml-3 flex-shrink-0 hover:opacity-80 transition-opacity'
                >
                  <FavoriteIcon filled={favorited} />
                </button>
              </h2>

              {/* 关键信息行 */}
              <div className='flex flex-wrap items-center gap-3 text-base mb-4 opacity-80 flex-shrink-0'>
                {detail?.class && (
                  <span className='tv-detail-type font-semibold'>
                    {detail.class}
                  </span>
                )}
                {(detail?.year || videoYear) && (
                  <span>{detail?.year || videoYear}</span>
                )}
                {detail?.source_name && (
                  <span className='border border-gray-500/60 px-2 py-[1px] rounded'>
                    {detail.source_name}
                  </span>
                )}
                {detail?.type_name && <span>{detail.type_name}</span>}
              </div>
              {/* 剧情简介 */}
              {detail?.desc && (
                <div
                  className='mt-0 text-base leading-relaxed opacity-90 overflow-y-auto pr-2 flex-1 min-h-0 scrollbar-hide'
                  style={{ whiteSpace: 'pre-line' }}
                >
                  {detail.desc}
                </div>
              )}
            </div>
          </div>

          {/* 封面展示 */}
          <div className='hidden md:block md:col-span-1 md:order-first'>
            <div className='tv-detail-poster-wrap'>
              <div className='aspect-[2/3] flex items-center justify-center overflow-hidden'>
                {videoCover ? (
                  <img
                    src={processImageUrl(videoCover)}
                    alt={videoTitle}
                    className='w-full h-full object-cover'
                  />
                ) : (
                  <span className='text-gray-600 dark:text-gray-400'>
                    封面图片
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

// FavoriteIcon 组件
const FavoriteIcon = ({ filled }: { filled: boolean }) => {
  if (filled) {
    return (
      <svg
        className='h-7 w-7'
        viewBox='0 0 24 24'
        xmlns='http://www.w3.org/2000/svg'
      >
        <path
          d='M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'
          fill='#ef4444' /* Tailwind red-500 */
          stroke='#ef4444'
          strokeWidth='2'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
      </svg>
    );
  }
  return (
    <Heart className='h-7 w-7 stroke-[1] text-gray-600 dark:text-gray-300' />
  );
};

export default function PlayPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PlayPageClient />
    </Suspense>
  );
}
