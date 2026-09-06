/// <reference types="vite/client" />
// import.meta.glob / import.meta.env 같은 Vite 전용 import.meta 확장의 타입.
// Vite 기본 스캐폴드에 들어 있는 파일이며, 없으면 tsc가 이 둘을 모른다.

// vite.config.ts의 define이 빌드 시점에 문자열로 바꿔 넣는 값들.
// 지금 열린 페이지가 어느 커밋으로 만들어졌는지 화면에 찍는 데 쓴다(components/Footer.tsx).
declare const __BUILD_VERSION__: string;
declare const __BUILD_TIME__: string;
