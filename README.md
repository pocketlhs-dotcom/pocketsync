# Pocket Sync

공유 보드. https://pocketlhs-dotcom.github.io/pocketsync/

- 보드: A 이현성·권중선 / B 이현성·정규진 / C 이현성·디자인팀(강승연·안은지)
- 화면: `index.html`, `app.js`, `platform.js` (GitHub Pages로 배포)
- 기록·로그인: Firebase (Firestore + Google 로그인). 허용된 구글 계정만 들어올 수 있습니다.
- 접근 규칙: `firestore.rules.example` 형식으로 Firebase 콘솔 > Firestore > 규칙에 등록 (실제 이메일은 저장소에 두지 않음)
- 인수인계·구조 설명: `HANDOVER.md`

## 수정 방법
`src/`의 파일을 고친 뒤 `sh build.sh` 로 `index.html`, `app.js`, `platform.js`를 다시 만듭니다.
- `src/part1-head.html` 스타일
- `src/icons.js` 아이콘 데이터
- `src/part2-core.js` 데이터 규칙·공용 컴포넌트
- `src/part3-app.js` A·B 보드 화면
- `src/part4-team.js` C 디자인팀 보드 화면, A·B의 디자인팀 탭(보기 전용), 보드별 진입점
- `src/platform-firebase.js` Firebase 연결·로그인·보드 구분
- `src/seat-hashes.json` 허용 이메일의 SHA-256 → 자리
- `vendor/` Preact 10.29.8, htm 3.1.1, Firebase 10.14.1 (compat)
