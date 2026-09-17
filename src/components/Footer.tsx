export function Footer() {
  return (
    <footer>
      {/* 배포본에서 옛 화면이 캐시로 남아 있는지 바로 가려내려고 둔 줄이다. */}
      <span className="build-stamp">
        버전 <code>{__BUILD_VERSION__}</code> · 빌드 {__BUILD_TIME__}
      </span>
    </footer>
  );
}
