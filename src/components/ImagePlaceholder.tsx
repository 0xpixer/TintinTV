// 图片占位符组件 - 实现骨架屏效果（支持暗色模式）
const ImagePlaceholder = ({ aspectRatio }: { aspectRatio: string }) => (
  <div
    className={`w-full overflow-hidden rounded-2xl ${aspectRatio}`}
    style={{
      background:
        'linear-gradient(90deg, var(--skeleton-color) 25%, var(--skeleton-highlight) 50%, var(--skeleton-color) 75%)',
      backgroundSize: '200% 100%',
      animation: 'shine 1.5s infinite',
    }}
  >
    <style>{`
      @keyframes shine {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      
      /* 亮色模式变量 */
      :root {
        --skeleton-color: #e2e8f0;
        --skeleton-highlight: #f8fafc;
      }
      
      /* 暗色模式变量 */
      @media (prefers-color-scheme: dark) {
        :root {
          --skeleton-color: #111827;
          --skeleton-highlight: #1f2937;
        }
      }
      
      .dark {
        --skeleton-color: #111827;
        --skeleton-highlight: #1f2937;
      }
    `}</style>
  </div>
);

export { ImagePlaceholder };
